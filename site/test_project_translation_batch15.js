// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch15.json'), 'utf8'));
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
  assert.equal(before.size, row.path.endsWith('/mcp-at-scale.js') ? 5 : 4);
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
function python(slug, script, input=null) {
  const proc=spawnSync('python3',['-c',script],{cwd:path.join(ROOT,'projects',slug,'solution'),input:JSON.stringify(input),encoding:'utf8',timeout:10000});
  assert.equal(proc.status,0,proc.stderr);return JSON.parse(proc.stdout);
}
test('MCP graph estimated family count cannot masquerade as actual catalog coverage',()=>{
  const figure=registries.get('mcp-at-scale').after.get('pj-mcp-at-scale-1');
  const v={query:'clusters',families:50,budget:3000,initialized:true};
  const graph=figure.lab.calculate(v,0);
  const real=python('mcp-at-scale','import json\nfrom registry import catalog\nfrom discovery import discover\ntools=catalog()\nprint(json.dumps({"count":len(tools),"selected":discover(tools,"clusters",3000)["tools"]}))');
  assert.equal(graph.metrics[0].value,250);
  assert.equal(graph.rows.length,0);
  assert.equal(real.count,250);
  assert.equal(real.selected.length,5);
  assert.ok(real.selected.every(t=>t.name.startsWith('clusters_')));
  assert.match(figure.caption,/实际只生成前六类/);
});
test('memory ASCII token boundary is retained and visibly disclosed',async()=>{
  const mod=await import(require('node:url').pathToFileURL(path.join(ROOT,'projects/memory-server/solution/main.ts')).href);
  assert.deepEqual(mod.embed('缓存策略'),Array(32).fill(0));
  assert.ok(mod.embed('cache policy').some(x=>x>0));
  const figure=registries.get('memory-server').after.get('pj-memory-server-3');
  const r=figure.lab.calculate({query:'缓存策略',text:'缓存策略',revision:1,expected:1,namespace:false},0);
  assert.equal(r.metrics[2].value,'0.000');
  assert.match(figure.caption,/纯中文查询没有非零检索分数/);
});
test('meeting review executes the actual downloader and preserves selected machine values',async()=>{
  const data=python('meeting-notes-to-actions',`import json
from html.parser import HTMLParser
from cli import inbox
text='ACTION Mira | 2026-10-01 | Check <script>literal</script> & details\\nACTION Ravi | 2026-10-02 | Reply\\nACTION ? | ? | Investigate\\n'
initial=inbox(text,'2026-09-29',{})
complete=[r for r in initial['actions'] if not r['flags']]
choices={r['id']:('approved' if i==0 else 'rejected') for i,r in enumerate(complete)}
r=inbox(text,'2026-09-29',choices)
class Selections(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=None;self.selected=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='select':self.row={'id':a['data-id'],'disabled':'disabled' in a,'value':''}
  elif tag=='option':self.selected='selected' in a
 def handle_data(self,text):
  if self.row is not None and self.selected:self.row['value']+=text
 def handle_endtag(self,tag):
  if tag=='option':self.selected=False
  if tag=='select':self.rows.append(self.row);self.row=None
p=Selections();p.feed(r['html'])
print(json.dumps({'html':r['html'],'selects':p.rows,'expected':{x['id']:x['decision'] for x in r['actions']},'approvedCount':len(r['approved'])}))`);
  assert.equal(data.approvedCount,1);
  assert.match(data.html,/&lt;script&gt;literal&lt;\/script&gt;/);
  assert.ok(!data.html.includes('<script>literal</script>'));
  assert.match(data.html,/下载审阅决策/);
  assert.deepEqual(data.selects.map(s=>s.value),['approved','rejected','pending']);
  assert.equal(data.selects.filter(s=>s.disabled).length,1);
  const scripts=[...data.html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  const button={};let blob=null,clicked=false,download=null,revoked=false;
  const document={
    getElementById(id){assert.equal(id,'download');return button;},
    querySelectorAll(selector){assert.equal(selector,'select[data-id]');return data.selects.map(s=>({dataset:{id:s.id},value:s.value,disabled:s.disabled}));},
    createElement(tag){assert.equal(tag,'a');return {href:'',set download(v){download=v;},click(){clicked=true;}};}
  };
  vm.runInNewContext(scripts[0][1],{document,Blob,URL:{createObjectURL:b=>{blob=b;return 'blob:batch-fixture';},revokeObjectURL:()=>{revoked=true;}}},{timeout:2000});
  assert.equal(typeof button.onclick,'function');button.onclick();
  assert.ok(clicked&&revoked);assert.equal(download,'decisions.json');
  assert.deepEqual(JSON.parse(await blob.text()),data.expected);
});
