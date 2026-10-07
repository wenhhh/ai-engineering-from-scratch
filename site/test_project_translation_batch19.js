// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch19.json'), 'utf8'));
const registries = new Map();
const sha = s => createHash('sha256').update(s).digest('hex');
function restore(text, row) {
  const chars = Array.from(text);
  for (const e of [...row.edits].reverse()) {
    const after = Array.from(e.after);
    assert.equal(chars.slice(e.afterOffset, e.afterOffset + after.length).join(''), e.after);
    chars.splice(e.afterOffset, after.length, ...Array.from(e.before));
  }
  const restored = chars.join('');
  assert.equal(sha(restored), row.sourceSha256);
  return restored;
}
function registry(source) {
  const result = new Map();
  vm.runInNewContext(source, {URL, TextEncoder,
    window: {AIFSProjectFigures: {register: (id, value) => result.set(id, value)}}}, {timeout: 2000});
  return result;
}
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function displayRules(row) {
  return row.edits.map(e => {
    if (e.before.startsWith('`') && e.before.includes('${')) {
      const before = e.before.slice(1, -1).split(/\$\{[^}]*\}/g);
      const after = e.after.slice(1, -1).split(/\$\{[^}]*\}/g);
      assert.equal(before.length, after.length);
      return {template: true, before, matcher: new RegExp('^' + after.map(escapeRegex).join('([\\s\\S]*?)') + '$')};
    }
    return {before: vm.runInNewContext('(' + e.before + ')', {}, {timeout: 100}),
            after: vm.runInNewContext('(' + e.after + ')', {}, {timeout: 100})};
  });
}
function allowedDisplay(before, after, rules) {
  for (const r of rules) {
    if (r.template) {
      const m = after.match(r.matcher);
      if (m && r.before.map((p, i) => p + (m[i + 1] ?? '')).join('') === before) return true;
    } else if (typeof r.after === 'string' && r.after && after.includes(r.after)
               && after.split(r.after).join(r.before) === before) return true;
  }
  // Rendered summaries may concatenate several separately registered literals.
  // Reverse only those exact fragments; any unregistered or numeric change remains.
  let restored = after;
  const fragments = rules.filter(r => !r.template && typeof r.after === 'string' && r.after)
    .sort((a, b) => b.after.length - a.after.length);
  for (const r of fragments) restored = restored.split(r.after).join(r.before);
  return restored === before;
}
function compare(a, b, rules, where='root') {
  if (typeof a === 'function') { assert.equal(typeof b, 'function', where); return; }
  if (Array.isArray(a)) {
    assert.ok(Array.isArray(b), where); assert.equal(a.length, b.length, where);
    a.forEach((v, i) => compare(v, b[i], rules, where+'['+i+']')); return;
  }
  if (a && typeof a === 'object') {
    assert.ok(b && typeof b === 'object', where);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), where);
    for (const k of Object.keys(a)) compare(a[k], b[k], rules, where+'.'+k);
    return;
  }
  if (Object.is(a, b)) return;
  if (typeof a === 'string' && typeof b === 'string' && allowedDisplay(a, b, rules)) return;
  assert.deepEqual(b, a, where);
}
function inputs(lab) {
  const base = Object.fromEntries(lab.controls.map(c => [c.key, c.value]));
  const out = [base, ...(lab.scenarios || []).map(s => ({...base, ...s.values}))];
  for (const c of lab.controls) {
    const values = c.type === 'checkbox' ? [false, true]
      : c.type === 'select' ? c.options.map(o => o.value)
      : ['number', 'range'].includes(c.type) ? [c.min??0, c.max??100, 0, -1, 1.5]
      : [c.value, '', '中文', '😀 Please confirm.', '<script>literal</script>'];
    for (const value of values) out.push({...base, [c.key]: value});
  }
  return out;
}
async function evaluate(lab, input) {
  try {return {ok: true, value: await lab.calculate(Object.freeze({...input}), 0)};}
  catch (e) {return {ok: false, name: e.name, message: e.message};}
}
for (const row of fixture.figures) {
  const translated = fs.readFileSync(path.join(ROOT, row.path), 'utf8');
  assert.equal(sha(translated), row.localizedSha256);
  const before = registry(restore(translated, row)), after = registry(translated), rules = displayRules(row);
  assert.deepEqual([...before.keys()], [...after.keys()]);
  assert.equal(before.size, 4);
  registries.set(path.basename(row.path, '.js'), {before, after});
  for (const [id, original] of before) {
    const localized = after.get(id);
    test(`${id}: Chinese text preserves controls, values and machine keys`, () => {
      compare(original, localized, rules);
      assert.match(localized.title, /[\u3400-\u9fff]/);
      for (const c of localized.lab.controls) assert.match(c.label, /[\u3400-\u9fff]/);
    });
    test(`${id}: original and localized actual calculations agree`, async () => {
      for (const input of inputs(original.lab)) {
        const serialized = JSON.stringify(input);
        const left = await evaluate(original.lab, input), right = await evaluate(localized.lab, input);
        assert.equal(left.ok, right.ok, serialized);
        if (left.ok) compare(left.value, right.value, rules, serialized);
        else {assert.equal(right.name, left.name); assert.equal(right.message, left.message);}
        assert.equal(JSON.stringify(input), serialized);
      }
    });
  }
}


const {pathToFileURL} = require('node:url');
const evidence = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/validation/2026-10-07-batch19.json'), 'utf8'));
const actual = async slug => import(pathToFileURL(path.join(ROOT, 'projects', slug, 'solution/main.ts')).href);
const resultFor = (slug, scenario) => evidence.cli.runs.find(r => r.variant === 'current' && r.project === slug && r.scenario === scenario);
function calculate(slug, stage, patch) {
  const config = registries.get(slug).after.get(`pj-${slug}-${stage}`);
  const values = Object.fromEntries(config.lab.controls.map(c => [c.key,c.value]));
  return config.lab.calculate({...values,...patch},stage-1);
}
test('installer source digest does not bind top-level metadata and stays disclosed', async () => {
  const m=await actual('skill-installer');
  const original={name:'example',description:'Original reviewed description',files:{'SKILL.md':'# Sample\nKeep original instructions.\n'}};
  const changed={...original,description:'Changed top-level description'};
  assert.equal(m.digest(original.files),m.digest(changed.files));
  assert.notEqual(m.digest(m.translate(original,'codex')),m.digest(m.translate(changed,'codex')));
  assert.equal(resultFor('skill-installer','metadata-only').exit,0);
  assert.match(fs.readFileSync(path.join(ROOT,'projects/skill-installer/README.md'),'utf8'),/不绑定顶层 name 和 description/);
});
test('installer figure omits reserved metadata and NUL path rejection', async () => {
  const m=await actual('skill-installer');
  for(const file of ['.installed.json','a\0b']) {
    const illustrated=calculate('skill-installer',1,{file});
    assert.equal(illustrated.metrics[1].value,true);
    assert.throws(()=>m.validate({name:'example',description:'test',files:{'SKILL.md':'text',[file]:'fixture'}}),/invalid bundle file/);
  }
  assert.match(registries.get('skill-installer').after.get('pj-skill-installer-1').caption,/未拒绝保留的/);
});
test('router graph Unicode matching is not actual ASCII token support', async () => {
  const m=await actual('skill-router');
  assert.deepEqual(m.tokens('中文'),[]);
  const skills=[{id:'sample',description:'fixture',keywords:['中文'],paths:[],priority:1,requires:[],permissions:[]}];
  assert.equal(m.route(skills,'中文',[],[]).status,'no-match');
  assert.equal(calculate('skill-router',1,{query:'中文',keywords:'中文',files:'',competitor:0,margin:1,permission:true}).metrics[0].value,2);
});
test('scanner CRLF evidence preserves native byte slices and shows graph boundary', () => {
  const native=JSON.parse(resultFor('skill-scanner','unicode-crlf').stdout);
  const finding=native.files[0].findings[0];
  assert.deepEqual([finding.start,finding.end,finding.quote],[7,11,'.env']);
  const graph=calculate('skill-scanner',1,{source:'café\r\n.env\r\n',duplicate:false,threshold:3});
  assert.equal(graph.rows[0][2],'[7,12)');
  assert.equal(graph.rows[0][3],'.env\r');
  assert.equal(resultFor('skill-scanner','symlink-child').exit,1);
  assert.equal(resultFor('skill-scanner','top-level-symlink').exit,0);
});
test('validator figure blank description differs from real native validation', () => {
  assert.equal(resultFor('skill-validator','blank').exit,1);
  assert.match(resultFor('skill-validator','blank').stderr,/invalid description/);
  const graph=calculate('skill-validator',2,{description:'',budget:1000});
  assert.match(graph.summary,/通过模拟检查/);
  assert.match(registries.get('skill-validator').after.get('pj-skill-validator-2').caption,/不检查描述非空/);
});
test('installed quoted Unicode metadata survives all three consumers without activation', () => {
  for(const variant of ['upstream','current']) {
    const rows=evidence.cli.auxiliaryExecutions.filter(r=>r.variant===variant&&r.project==='cross-project');
    assert.equal(rows.length,3);
    const validator=JSON.parse(rows.find(r=>r.scenario==='installed-validator').stdout);
    assert.ok(validator.context.includes('Review "quoted" 中文😀 evidence'));
    assert.equal(validator.activated,true);
    const router=JSON.parse(rows.find(r=>r.scenario==='installed-router').stdout);
    assert.equal(router.status,'ready');assert.deepEqual(router.plan,['orchard-release']);
    const scanner=JSON.parse(rows.find(r=>r.scenario==='installed-scanner').stdout);
    assert.equal(scanner.advisory,true);
  }
  assert.equal(evidence.limits.externalAgentsActivated,false);
  assert.equal(evidence.limits.realUserSkillDirectoriesModified,false);
});
test('display translation checks still reject changes to numeric and unknown values', () => {
  const rules=[{before:'Result: ',after:'结果：'},{before:'accepted',after:'已接受'}];
  compare({text:'Result: accepted',count:3},{text:'结果：已接受',count:3},rules);
  assert.throws(()=>compare({count:3},{count:4},rules));
  assert.throws(()=>compare({text:'Result: accepted'},{text:'结果：未登记文本'},rules));
});
