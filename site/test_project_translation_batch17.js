// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch17.json'), 'utf8'));
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
class Element {
  constructor(tag,text=''){this.tag=tag;this.text=text;this.attrs={};this.children=[];}
  setAttribute(k,v){this.attrs[k]=String(v);}
  appendChild(c){this.children.push(c);return c;}
  querySelector(selector){
    const match=n=>selector.startsWith('.') && (n.attrs?.class||'').split(' ').includes(selector.slice(1));
    const visit=n=>{if(match(n))return n;for(const c of n.children||[]){const found=visit(c);if(found)return found;}return null;};
    return visit(this);
  }
}
function registry(source) {
  const result=new Map();let captured;
  const make=(tag,attrs={},children=[])=>{const n=new Element(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);for(const c of children)n.appendChild(typeof c==='string'?new Element('#text',c):c);return n;};
  const text=n=>n.text+(n.children||[]).map(text).join(' ');
  const structure=n=>({tag:n.tag,attrs:n.attrs,children:(n.children||[]).map(structure)});
  const LF={el:make,svgEl:make,register:entries=>{for(const [id,fn] of Object.entries(entries))result.set(id,fn);}};
  const AIFS={register:(id,value)=>result.set(id,value),mountLab:(host,lab)=>{assert.ok(host);captured=lab;}};
  vm.runInNewContext(source,{URL,TextEncoder,window:{LF,AIFSProjectFigures:AIFS},document:{createTextNode:s=>new Element('#text',String(s))}},{timeout:2000});
  for(const [id,spec] of result){if(typeof spec!=='function')continue;captured=null;const host=new Element('host');spec(host);assert.ok(captured,id);result.set(id,{title:text(host),geometry:structure(host),lab:captured});}
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
  const slug = path.basename(row.path, '.js');
  assert.equal(before.size, slug === 'research-report-agent' ? 8 : 4);
  registries.set(slug, {before, after});
  for (const [id, original] of before) {
    const localized = after.get(id);
    test(`${id}: display translation keeps controls, SVG and animation attributes`, () => {
      compare(original, localized, rules);
      assert.match(localized.title, /[\u3400-\u9fff]/);
      for (const c of localized.lab.controls) assert.match(c.label, /[\u3400-\u9fff]/);
    });
    test(`${id}: real original and translated calculations agree`, async () => {
      for (const input of inputs(original.lab)) {
        const beforeInput = JSON.stringify(input);
        const a = await evaluate(original.lab, input), b = await evaluate(localized.lab, input);
        assert.equal(a.ok, b.ok, beforeInput);
        if (a.ok) compare(a.value,b.value,rules,beforeInput);
        else {assert.equal(a.name,b.name);assert.equal(a.message,b.message);}
        assert.equal(JSON.stringify(input),beforeInput);
      }
    });
  }
}
function python(slug, code, input=null) {
  const p = spawnSync('python3',['-c',code],{cwd:path.join(ROOT,'projects',slug,'solution'),encoding:'utf8',input:JSON.stringify(input),timeout:10000});
  assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);
}
test('research score illustration retains disclosed different weights and missing-label defaults',()=>{
  const fig=registries.get('research-report-agent').after.get('pj-rra-scorecard');
  const result=fig.lab.calculate({claims:10,supported:8,expected:4,found:3,facts:6,covered:4});
  const core=python('research-report-agent',`import json
from report_agent.evaluate import Scorecard,QuestionScore,source_recall,fact_coverage
from report_agent.writer import Report
c=Scorecard([QuestionScore('q','example',0.8,0.75,2/3,'completed')])
print(json.dumps({'score':c.score(),'recallWithoutLabels':source_recall(Report('q',[],{}),[]),'factsWithoutLabels':fact_coverage(Report('q',[],{}),[])}))`);
  assert.match(result.summary,/75\.42/);assert.equal(core.score,74.5);
  const missing=fig.lab.calculate({claims:1,supported:1,expected:0,found:0,facts:0,covered:0});
  assert.equal(missing.metrics[1].value,'unavailable');assert.equal(core.recallWithoutLabels,1);assert.equal(core.factsWithoutLabels,1);
  assert.match(fig.title,/0\.5／0\.25／0\.25/);assert.match(fig.title,/0\.4／0\.3／0\.3/);
});
test('research static dropped-sentence badge is not the actual terminal-state contract',()=>{
  const fig=registries.get('research-report-agent').after.get('pj-rra-critic');
  const state=python('research-report-agent',`import json
from types import SimpleNamespace
from report_agent.critic import decide_state
print(json.dumps(decide_state([SimpleNamespace(supported=True),SimpleNamespace(supported=False)])))`);
  assert.equal(state,'needs_review');assert.match(fig.title,/completed · 2 sentences dropped/);assert.match(fig.title,/与实际有删除项时的 needs_review 状态不符/);
});
test('judge review-only filter executes without changing data or source escaping',()=>{
  const result=python('report-judge',`import json
from cli import render,with_evidence
from metrics import score_report
e={'S1':'Worker A invokes Worker B <script>.'}
r=with_evidence(score_report('Worker A invokes Worker B <script> [S1]. No source.',e),e)
print(json.dumps({'html':render(r),'result':r}))`);
  assert.ok(!result.html.includes('<script>.'));
  assert.match(result.html,/&lt;script&gt;/);
  assert.match(result.html,/仅显示需要审阅的论断/);
  assert.equal(result.result.recall,null);assert.equal(result.result.coverage,null);
  const script=result.html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const checkbox={checked:false};const rows=[{dataset:{supported:'true'},hidden:false},{dataset:{supported:'false'},hidden:false}];let handler;
  const document={getElementById:id=>{assert.equal(id,'review');return {addEventListener:(event,fn)=>{assert.equal(event,'change');handler=fn;}}},querySelectorAll:selector=>{assert.equal(selector,'tr[data-supported]');return rows;}};
  vm.runInNewContext(script,{document});handler.call(checkbox);assert.deepEqual(rows.map(x=>x.hidden),[false,false]);
  checkbox.checked=true;handler.call(checkbox);assert.deepEqual(rows.map(x=>x.hidden),[true,false]);
  checkbox.checked=false;handler.call(checkbox);assert.deepEqual(rows.map(x=>x.hidden),[false,false]);
});
test('actual research viewer retains Unicode evidence, accessible footnotes and URL gate',async()=>{
  const m=await import(require('node:url').pathToFileURL(path.join(ROOT,'projects/research-report-agent/solution/viewer/render.ts')).href);
  const source='😀 前缀 Exact evidence. ';const quote='Exact evidence.';const start=Array.from(source).join('').indexOf('Exact')-1;
  const p={schema_version:1,question:'<script>literal</script>',sections:[{heading:'Review',sentences:[{text:quote,cites:['S1']},{text:quote,cites:['S1']}]}],snippets:{S1:{id:'S1',doc_id:'d',start,end:start+quote.length,text:quote,score:1}},documents:[{id:'d',title:'Source',published:'fixed',source_url:'javascript:bad()',text:source}],trace:null};
  const page=m.renderReport(p);assert.match(page,/lang="zh-CN"/);assert.match(page,/脚注/);assert.match(page,/来源/);assert.ok(!page.includes('javascript:'));
  assert.match(page,/&lt;script&gt;literal&lt;\/script&gt;/);assert.equal((page.match(/id="fn-1"/g)||[]).length,1);assert.match(page,/id="evidence-2"/);assert.match(page,/aria-describedby="evidence-1"/);
  p.snippets.S1.text='changed';assert.throws(()=>m.renderReport(p),/source span mismatch/);
});
test('display allowance cannot erase altered metrics or machine identifiers',()=>{
  assert.throws(()=>compare({score:1},{score:2},[]));
  assert.throws(()=>compare({id:'q'},{id:'other'},[]));
  const r=displayRules(fixture.figures[0]);assert.throws(()=>compare({value:1},{value:2},r));
});
