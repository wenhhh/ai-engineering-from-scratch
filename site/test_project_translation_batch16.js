// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch16.json'), 'utf8'));
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
async function moduleFor(slug) {
  return import(pathToFileURL(path.join(ROOT, 'projects', slug, 'solution/main.ts')).href);
}
test('panel unit-cost illustration does not hide real zero-cost reviewer behavior', async () => {
  const m = await moduleFor('multi-agent-code-review-panel');
  const finding = {file:'a.ts',line:1,quote:'eval(input)',rule:'dynamic-eval',severity:3};
  const run = await m.runPanel([
    {id:'first',cost:0,run:async()=>[finding]},
    {id:'second',cost:0,run:async()=>[{...finding,severity:2}]},
  ], 0, 1000);
  const result = m.aggregate(run.reviews, {'a.ts':['eval(input);']}, 2);
  assert.equal(run.spent, 0); assert.equal(run.reviews.length, 2);
  assert.equal(result.findings[0].status, 'consensus');
  assert.equal(result.findings[0].disagreement, true);
  const fig = registries.get('multi-agent-code-review-panel').after.get('pj-multi-agent-code-review-panel-3');
  const illustrated = fig.lab.calculate({votes:2,quorum:2,budget:0,predicted:1,expected:1,hits:1});
  assert.equal(illustrated.metrics[0].value, 0);
  assert.match(fig.caption, /成本为 1/);
  assert.match(fig.caption, /零成本评审者/);
});
test('panel keeps duplicate votes and invalid quote evidence out of support totals', async () => {
  const m = await moduleFor('multi-agent-code-review-panel');
  const good = {file:'a.ts',line:1,quote:'eval(input)',rule:'dynamic-eval',severity:3};
  const forged = {...good,line:99};
  const result = m.aggregate([
    {reviewer:'a',findings:[good,good,forged]},
    {reviewer:'b',findings:[{...good,severity:2}]},
  ], {'a.ts':['eval(input);']}, 2);
  assert.equal(result.rejected, 1);
  assert.deepEqual(result.findings[0].supporters, ['a','b']);
  assert.deepEqual(result.findings[0].severities, [3,2]);
  assert.throws(()=>m.aggregate([{reviewer:'a',findings:[]},{reviewer:'a',findings:[]}],{}),/duplicate reviewer/);
});
test('PR candidate rejection and English machine count survive Chinese report rendering', async () => {
  const m = await moduleFor('pr-review-reporter');
  const lines = [{file:'中文.ts',line:2,text:'eval(input); // <script>literal</script>'}];
  const good = {file:'中文.ts',line:2,quote:'eval(input)',rule:'dynamic-eval',severity:'high',message:'<img onerror=x>'};
  const invalid = [null,[],0,{...good,line:0},{...good,quote:'invented'}];
  const checked = m.verify([good,...invalid],lines);
  assert.equal(checked.accepted.length,1);assert.deepEqual(checked.rejected,invalid);
  const html = m.render(checked.accepted,checked.rejected.length);
  assert.match(html,/1 findings; 5 rejected/);
  assert.match(html,/计数中的 findings/);
  assert.match(html,/&lt;img onerror=x&gt;/);
  assert.ok(!html.includes('<img onerror=x>'));
  assert.match(html,/中文\.ts:2/);
  assert.throws(()=>m.verify({},lines),/candidates must be an array/);
});
test('PR quoted path and header-like additions keep their exact source positions', async () => {
  const m = await moduleFor('pr-review-reporter');
  const patch = '+++ "b/a file.ts"\n@@ -0,0 +1,2 @@\n+eval(input);\n+++ harmless\n';
  assert.deepEqual(m.parseDiff(patch),[
    {file:'a file.ts',line:1,text:'eval(input);'},
    {file:'a file.ts',line:2,text:'++ harmless'},
  ]);
});
test('prompt figure cannot substitute for the full release-gate threshold contract', () => {
  const fig = registries.get('prompt-regression-tester').after.get('pj-prompt-regression-tester-4');
  const result = fig.lab.calculate({baseline:'{"source":"source:x"}',candidate:'{"source":"source:x"}',required:'source:',minimum:2,budget:0});
  assert.equal(result.metrics.find(x=>x.label==='决策').value,'block');
  const p = spawnSync('python3',['-c',
    'from main import release_gate\ntry:\n release_gate({"cases":[{}],"pass_rate":1,"regressions":0},min_pass=2)\nexcept ValueError as e:\n print(str(e))\nelse:\n raise SystemExit(2)'],
    {cwd:path.join(ROOT,'projects/prompt-regression-tester/solution'),encoding:'utf8',timeout:10000});
  assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/pass threshold in \[0,1\] required/);
  assert.match(fig.caption,/阈值和空集检查/);
});

test('display-fragment composition still rejects altered metrics and unregistered text', () => {
  const rules = [{before:'Block',after:'阻止'}, {before:': paired checks',after:'：配对检查'}];
  compare({summary:'Block: paired checks',count:2},{summary:'阻止：配对检查',count:2},rules);
  assert.throws(()=>compare({count:2},{count:3},rules));
  assert.throws(()=>compare({summary:'Block: paired checks'},{summary:'阻止：未登记的改动'},rules));
});
