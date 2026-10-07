// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch18.json'), 'utf8'));
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


const receiptPath = path.join(ROOT,'docs/validation/2026-10-07-batch18.json');
function receipt() {return JSON.parse(fs.readFileSync(receiptPath,'utf8'));}
function python(slug,script,input) {
  const p=spawnSync('python3',['-c',script],{cwd:path.join(ROOT,'projects',slug,'solution'),input:JSON.stringify(input),encoding:'utf8',timeout:10000});
  assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);
}
test('native Rust rejects missing or extra arguments that the teaching figure simplifies',()=>{
  const figure=registries.get('rust-agent-shell').after.get('pj-rust-agent-shell-1');
  const runs=receipt().nativeProbes;assert.equal(runs.length,2);
  for(const run of runs) {
    assert.equal(run.exit,0);assert.equal(run.stdin,'read\npwd extra\nquit\n');
    assert.deepEqual(run.stdout.trim().split('\n').map(s=>JSON.parse(s).kind),['rejected','rejected','ok']);
  }
  for(const command of ['read','pwd extra']) {
    const result=figure.lab.calculate({command,content:'content',used:0,limit:3,byteLimit:64});
    assert.match(result.summary,/^accepted/);
  }
  assert.match(figure.caption,/read 缺参或 pwd 附参/);
});
test('sandbox manual observations do not become runtime or microVM verification',()=>{
  const figure=registries.get('sandbox-ladder').after.get('pj-sandbox-ladder-4');
  const result=figure.lab.calculate({untrusted:true,secrets:true,network:true,kernel:true,budget:1,observedReadOnly:true,observedNoRoute:true});
  assert.equal(result.metrics[0].value,'none');
  assert.equal(result.metrics[1].value,'仅为探针输入');
  assert.match(figure.caption,/手动开关/);
  const run=receipt().cli.runs.find(r=>r.variant==='current'&&r.project==='sandbox-ladder'&&r.scenario==='preview');
  const data=JSON.parse(run.stdout);assert.equal(data.runtime_verified,false);assert.equal(data.mode,'policy_simulation');
  for(const flag of ['--pull=never','--read-only','none','--cap-drop','--pids-limit']) assert.ok(data.command.includes(flag));
  assert.equal(receipt().limits.dockerExecuted,false);
});
test('duplicated development content still inflates proposer support and remains disclosed',()=>{
  const data=python('self-improving-skill-loop',`import json
from dataset import fingerprint
from cli import experiment
rows=[{'id':'a','text':'invoice wrong','label':'billing'},{'id':'b','text':'INVOICE wrong','label':'billing'}]
r=experiment({'development':rows,'holdout':[{'id':'c','text':'invoice missing','label':'billing'}]})
print(json.dumps({'distinctContent':len({fingerprint(c['text']) for c in rows}),'rules':r['rules'],'promote':r['gate']['promote']}))`,null);
  assert.equal(data.distinctContent,1);assert.ok(data.rules.some(r=>r.terms.includes('invoice')));assert.equal(data.promote,true);
  assert.ok(fs.readFileSync(path.join(ROOT,'projects/self-improving-skill-loop/stages/03-propose/docs/en.md'),'utf8').includes(fixture.supportWarning));
});
test('skill graph lowercasing discrepancy is reproducible against actual casefold audit',()=>{
  const figure=registries.get('self-improving-skill-loop').after.get('pj-self-improving-skill-loop-1');
  const result=figure.lab.calculate({development:'Straße',holdout:'STRASSE',groups:'a,b',baseline:'0',candidate:'1',minimum:0.05,approved:false});
  assert.equal(result.metrics[0].value,false);
  const actual=python('self-improving-skill-loop',`import json
from dataset import audit_partitions
print(json.dumps(audit_partitions([{'text':'Straße'}],[{'text':'STRASSE'}])))`,null);
  assert.equal(actual.usable,false);assert.equal(actual.content_leaks.length,1);
  assert.match(figure.caption,/casefold/);
});
test('notes graph unnormalized alias keys differ from complete Python normalization',()=>{
  const figure=registries.get('semantic-notes-search').after.get('pj-semantic-notes-search-4');
  for(const input of [{query:'release',notes:'deploy',alias:'RELEASE=DEPLOY'},{query:'Straße',notes:'strasse',alias:'x=y'}]) {
    const value=figure.lab.calculate({...input,k:1,expected:1});assert.equal(value.metrics[2].value,false);
    const actual=python('semantic-notes-search',`import json,sys
from main import build_index,search
x=json.load(sys.stdin);a,b=x['alias'].split('=');print(json.dumps(search(build_index({'note':x['notes']},{a:b}),x['query'],1)))`,input);
    assert.equal(actual.length,1);assert.equal(actual[0].id,'note');
  }
  assert.match(figure.caption,/别名键没有执行完整规范化/);
});
test('exported skill remains a draft and exact approval retains previous rules',()=>{
  const rows=receipt().cli.runs.filter(r=>r.variant==='current'&&r.project==='self-improving-skill-loop');
  const draft=rows.find(r=>r.scenario==='export-draft');
  assert.match(draft.files['orchard-routing/SKILL.md'].text,/require human review before installation/);
  assert.equal(JSON.parse(draft.stdout).export.state,'draft_exported');
  const good=rows.find(r=>r.scenario==='approve');assert.ok(good.files['rules.json.previous']);
  const bad=rows.find(r=>r.scenario==='wrong-approval');assert.equal(bad.exit,1);
  assert.equal(bad.files['rules.json'].text,good.files['rules.json.previous'].text);
  assert.equal(receipt().limits.skillInstalledOrActivated,false);
});
test('display reversal cannot accept changed numbers or unregistered prose',()=>{
  const rules=[{before:'Expected note ',after:'预期笔记 '},{before:' is retrieved',after:' 已检索到'}];
  compare({summary:'Expected note 1 is retrieved',count:1},{summary:'预期笔记 1 已检索到',count:1},rules);
  assert.throws(()=>compare({count:1},{count:2},rules));
  assert.throws(()=>compare({summary:'Expected note 1 is retrieved'},{summary:'预期笔记 2 已检索到'},rules));
});
