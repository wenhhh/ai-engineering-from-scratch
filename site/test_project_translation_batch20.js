// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch20.json'), 'utf8'));
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


const receipt = JSON.parse(fs.readFileSync(path.join(ROOT,'docs/validation/2026-10-07-batch20.json'),'utf8'));
const moduleFor = slug => import(require('node:url').pathToFileURL(path.join(ROOT,'projects',slug,'solution/main.ts')).href);
test('Chinese practice executes real local record and download handlers', async () => {
  const m=await moduleFor('source-grounded-study-coach');
  const text='😀 请使用绿色托盘。';
  const deck=m.validateDeck({sources:[{id:'s',title:'</script><script>fixture()</script>',text}],cards:[{id:'c',sourceId:'s',question:'<img>在哪里？',answer:'绿色托盘',accepted:[],start:0,end:text.length}]});
  const prior=[{id:'old',cardId:'c',date:'2026-09-01',answer:'绿色托盘'}];
  const html=m.renderPractice(deck,m.buildProgress(deck,prior,'2026-09-01'),'2026-09-02',prior,'2026-09-01');
  assert.match(html,/lang="zh-CN"/);assert.match(html,/检查并记录我的答案/);assert.ok(!html.includes('</script><script>fixture()'));
  const payload=html.match(/<script type="application\/json" id="practice-data">([\s\S]*?)<\/script>/)[1];
  const handlers={},feedback={textContent:''},answer={value:''};let blob;
  const download={disabled:true,addEventListener:(_,f)=>handlers.download=f};
  const elements={'practice-data':{textContent:payload},'attempt-date':{value:'2026-09-02'},'session-status':{textContent:''},'download-attempts':download};
  const article={dataset:{card:'c'},querySelector:s=>s==='[data-record]'?{addEventListener:(_,f)=>handlers.record=f}:s==='[data-feedback]'?feedback:answer};
  const document={getElementById:id=>elements[id],querySelectorAll:()=>[article],body:{appendChild(){}},createElement:()=>({click(){},remove(){}})};
  vm.runInNewContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1],{document,Blob,URL:{createObjectURL(v){blob=v;return 'blob:fixture'},revokeObjectURL(){}},crypto:{randomUUID:()=> 'stable'},setTimeout:f=>f()},{timeout:2000});
  handlers.record();assert.equal(download.disabled,true);assert.match(feedback.textContent,/请先输入/);
  answer.value='绿色托盘';handlers.record();handlers.download();let events=JSON.parse(await blob.text());
  assert.equal(events.length,2);assert.equal(events[1].answer,'绿色托盘');assert.equal(m.buildProgress(deck,events,'2026-09-01')[0].due,'2026-09-04');assert.match(feedback.textContent,/Accepted.*2026-09-04/);
  answer.value='红色';handlers.record();handlers.download();events=JSON.parse(await blob.text());
  assert.equal(events.length,2);assert.equal(events[1].id,'practice-stable');assert.equal(events[1].answer,'红色');assert.equal(m.buildProgress(deck,events,'2026-09-01')[0].due,'2026-09-03');
});
test('practice figure fixed due queue is not substituted for actual replay', async () => {
  const m=await moduleFor('source-grounded-study-coach');
  const d={sources:[{id:'s',title:'s',text:'answer'}],cards:[{id:'custom',sourceId:'s',question:'?',answer:'answer',accepted:[],start:0,end:6}]};
  const actual=m.dueCards(m.buildProgress(d,[],'2026-09-01'),'2026-09-03');assert.deepEqual(actual.map(x=>x.cardId),['custom']);
  const fig=registries.get('source-grounded-study-coach').after.get('pj-source-grounded-study-coach-4');assert.equal(fig.lab.calculate({day:3}).rows.length,3);assert.match(fig.caption,/固定三张/);
});
test('ADK route figure Unicode mismatch and missing optional SDK remain explicit', () => {
  const fig=registries.get('support-agent-with-google-adk').after.get('pj-support-agent-with-google-adk-2');
  assert.equal(fig.lab.calculate({text:'中文invoice',tool:'read_invoice'}).metrics[0].value,'billing');
  const p=require('node:child_process').spawnSync('python3',['-c','from routing import route\nprint(route("中文invoice"))'],{cwd:path.join(ROOT,'projects/support-agent-with-google-adk/solution'),encoding:'utf8',timeout:10000});
  assert.equal(p.status,0,p.stderr);assert.equal(p.stdout.trim(),'human');assert.match(fig.caption,/ASCII/);
  assert.equal(receipt.optionalSDK.exit,1);assert.equal(receipt.optionalSDK.frameworkExecuted,false);assert.match(receipt.optionalSDK.rawLog,/missing dependency python:google\.adk/);
});
test('meter Number illustration does not erase actual u64 overflow rejection', () => {
  const fig=registries.get('token-counter-and-cost-meter').after.get('pj-token-counter-and-cost-meter-3');
  const out=fig.lab.calculate({text:'x',ratio:4,input:2,cached:0,output:0,inputRate:Number(2n**64n-1n),cachedRate:0,outputRate:0,reservation:0});
  assert.ok(Number.isFinite(out.metrics[1].value));assert.ok(!Number.isSafeInteger(out.metrics[1].value));
  assert.ok(receipt.nativeProbes.every(p=>p.result.overflowRejected===true));assert.match(fig.caption,/u64/);
});
test('full-audit figure predictions are not actual dispatch or consumed approval', () => {
  const fig=registries.get('tool-call-firewall').after.get('pj-tool-call-firewall-4');
  const result=fig.lab.calculate({role:'editor',tool:'write',path:'notes.md',approvedText:'same',content:'same',approved:true,used:false,entries:4,cap:4});
  assert.match(result.summary,/审计已达上限/);assert.equal(result.metrics[2].value,true);assert.equal(result.metrics[3].value,'used=true');
  for(const p of receipt.nativeProbes){assert.equal(p.result.auditFullRejected,true);assert.equal(p.result.dispatchExecuted,false);assert.equal(p.result.approvalConsumed,false);assert.equal(p.result.file,'unchanged');}
  assert.match(fig.caption,/真实 CLI 在审计失败时不会执行/);
});
test('real patch and test trace records two executed tests rather than predicted success', () => {
  const runs=receipt.cli.runs.filter(r=>r.project==='tiny-coding-agent'&&r.scenario==='repair');assert.equal(runs.length,2);
  for(const r of runs){const data=JSON.parse(r.stdout);assert.equal(data.state,'completed');assert.deepEqual(data.trace.map(t=>t.tool),['test','patch','test']);assert.equal(data.trace[0].result.passed,false);assert.equal(data.trace[2].result.passed,true);assert.equal(data.trace[2].result.tests,2);assert.match(r.files['repair/basket.py'].text,/price \* quantity/);}
  for(const name of ['zero-tests','skipped-tests']) for(const r of receipt.cli.runs.filter(r=>r.project==='tiny-coding-agent'&&r.scenario===name)){assert.equal(r.exit,1);assert.notEqual(JSON.parse(r.stdout).state,'completed');}
});
test('display reversal still rejects numeric mutations and unregistered prose',()=>{
  compare({count:2,summary:'Source'},{count:2,summary:'来源'},[{before:'Source',after:'来源'}]);
  assert.throws(()=>compare({count:2},{count:3},[]));assert.throws(()=>compare({summary:'Source'},{summary:'未知'},[]));
});
