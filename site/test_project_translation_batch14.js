// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch14.json'), 'utf8'));
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
  return false;
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
function python(script, input) {
  const proc = spawnSync('python3', ['-c', script], {
    cwd: path.join(ROOT, 'projects/inbox-triage-desk/solution'),
    input: JSON.stringify(input), encoding: 'utf8', timeout: 10000});
  assert.equal(proc.status, 0, proc.stderr); return JSON.parse(proc.stdout);
}
test('mail figure Unicode discrepancy is reproducible and explicitly disclosed', () => {
  const figure = registries.get('inbox-triage-desk').after.get('pj-inbox-triage-desk-2');
  for (const text of ['😀 Please confirm.', '中please']) {
    const web = figure.lab.calculate({text});
    const real = python('import json,sys\nfrom main import triage\ntext=json.load(sys.stdin)\nprint(json.dumps(triage({"id":"x","text":text})))', text);
    if (text.startsWith('😀')) {
      assert.equal(web.rows[0][2], '3'); assert.equal(real.evidence[0].start, 2);
    } else {
      assert.equal(web.metrics[0].value, 1); assert.equal(real.category, 'uncertain');
      assert.equal(real.evidence.length, 0);
    }
  }
  assert.match(figure.caption, /UTF-16/);
  assert.match(figure.caption, /Unicode/);
});
test('schema figure simplified ordering and missing byte guard stay visible', async () => {
  const mod = await import(require('node:url').pathToFileURL(path.join(ROOT, 'projects/json-schema-output-guard/solution/main.ts')).href);
  const figure = registries.get('json-schema-output-guard').after.get('pj-json-schema-output-guard-1');
  const display = figure.lab.calculate({raw: 'not JSON', keyword: true, maximum: 1, attempts: 2}, 0);
  assert.match(display.summary, /解析失败/);
  assert.throws(() => mod.guard('not JSON', {properties: {unused: {$ref: 'x'}}}), /unsupported schema keyword/);
  const oversized = JSON.stringify({answer: '中'.repeat(35000), confidence: 0.8});
  assert.equal(mod.guard(oversized, {type:'object'}).ok, false);
  assert.match(figure.lab.calculate({raw:oversized, keyword:false, maximum:1, attempts:2}, 0).summary, /已接受/);
  assert.match(figure.caption, /未执行完整递归、字节上限或实际修复循环/);
});
test('mail HTML escapes injected markup and exports real unsent MIME drafts', () => {
  const data = python(`import json,tempfile
from pathlib import Path
from email import policy
from email.parser import BytesParser
from main import export_desk
m={'id':'<x@example.invalid>','sender':'m@example.invalid','subject':'<script>alert(1)</script>','text':'😀 Please confirm.','references':[],'body_status':'plain'}
with tempfile.TemporaryDirectory() as temp:
 out=Path(temp);r=export_desk([m],out)
 eml=BytesParser(policy=policy.default).parsebytes((out/r['entries'][0]['draft_file']).read_bytes())
 print(json.dumps({'html':(out/'index.html').read_text(),'file':r['entries'][0]['draft_file'],'unsent':eml['X-Unsent'],'replyTo':eml['In-Reply-To'],'body':eml.get_content(),'category':r['entries'][0]['decision']['category']}))`, null);
  assert.match(data.html, /lang="zh-CN"/);
  assert.match(data.html, /下载未发送草稿/);
  assert.match(data.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(!data.html.includes('<script>alert(1)</script>'));
  assert.ok(data.html.includes(`href="${data.file}"`));
  assert.match(data.file, /^[a-f0-9]{16}\.eml$/);
  assert.equal(data.unsent, '1'); assert.equal(data.replyTo, '<x@example.invalid>');
  assert.equal(data.category, 'action'); assert.match(data.body, /\[Write and check your response here\.\]/);
});
