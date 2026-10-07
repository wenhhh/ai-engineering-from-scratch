// Execute the original and translated calculators; preserve keys, values and failure behavior.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const {spawnSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch21.json'), 'utf8'));
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


const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/validation/2026-10-07-batch21.json'), 'utf8'));
const {pathToFileURL} = require('node:url');
function pythonResult(slug, code) {
  const result = spawnSync('python3', ['-c', code], {
    cwd: path.join(ROOT, 'projects', slug, 'solution'), encoding: 'utf8', timeout: 10000,
    env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'},
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('visual lowercase illustration differs from real Unicode casefold', () => {
  const figure = registries.get('visual-evidence-library').after.get('pj-visual-evidence-library-2');
  const graphical = figure.lab.calculate({query: 'STRASSE', text: 'Straße'});
  const actual = pythonResult('visual-evidence-library',
    'import json\nfrom main import search\na=[{"id":"a","regions":[{"id":"r","text":"Straße","bbox":[0,0,1,1],"origin":"provided"}]}]\nprint(json.dumps(search(a,"STRASSE")))');
  assert.equal(graphical.metrics[0].value, '0%');
  assert.equal(actual[0].score, 1);
  assert.match(figure.caption, /casefold/);
});

test('visual coordinate slider is not full manifest validation', () => {
  const figure = registries.get('visual-evidence-library').after.get('pj-visual-evidence-library-1');
  assert.match(figure.lab.calculate({x:-1,y:0,width:2,height:2}).summary, /几何有效/);
  const result = pythonResult('visual-evidence-library',
    'import json\nfrom main import validate_proposal\ntry:\n validate_proposal({"regions":[{"text":"sample","bbox":[-1,0,2,2]}]},600,320)\nexcept ValueError as e:\n print(json.dumps({"error":str(e)}))');
  assert.match(result.error, /outside/);
  assert.match(figure.caption, /负的左上坐标/);
});

test('caption half-millisecond rounding remains disclosed', () => {
  const figure = registries.get('voice-note-transcriber-pipeline').after.get('pj-voice-note-transcriber-pipeline-4');
  const graphical = figure.lab.calculate({start:0.0005,end:1,duration:2});
  const actual = pythonResult('voice-note-transcriber-pipeline', 'import json\nfrom captions import stamp\nprint(json.dumps(stamp(0.0005)))');
  assert.match(graphical.summary, /^00:00:00\.001/);
  assert.equal(actual, '00:00:00.000');
  assert.match(figure.caption, /偶数舍入/);
});

test('saved cue script really updates time and invokes the local play handler', () => {
  assert.equal(receipt.pageProbe.executedPageScripts, 2);
  for (const row of receipt.pageProbe.runs) {
    assert.equal(sha(row.script), row.scriptSHA256);
    const handlers = [], observed = [];
    const audio = {currentTime:0, play() {observed.push(this.currentTime);}};
    const document = {
      querySelectorAll: () => row.seekPositions.map(start => ({dataset:{seek:String(start)},
        addEventListener: (event, callback) => {assert.equal(event,'click'); handlers.push(callback);}})),
      getElementById: id => {assert.equal(id,'audio'); return audio;},
    };
    vm.runInNewContext(row.script, {document}, {timeout:1000});
    handlers.forEach(fn => fn());
    assert.deepEqual(observed, row.invokedPlayPositions);
    assert.equal(row.actualAudioPlaybackPerformed, false);
  }
});

test('baseline alias reproduction is preserved without hiding the no-accept overwrite', () => {
  assert.equal(receipt.webBaselineProbe.totalLoopbackRequests, 4);
  for (const run of receipt.webBaselineProbe.runs) {
    assert.equal(run.exit,0);
    assert.match(run.stdout,/alias=false changed_without_accept=false/);
    assert.match(run.stdout,/alias=true changed_without_accept=true/);
    assert.match(run.stdout,/LOOPBACK_REQUESTS=2/);
  }
  const figure = registries.get('web-change-brief').after.get('pj-web-change-brief-3');
  assert.match(figure.caption,/没有 --accept/);
  assert.match(figure.caption,/覆盖/);
});

test('scratch workflow pause is checked by observed calls, not SDK claims', async () => {
  const m = await import(pathToFileURL(path.join(ROOT,'projects/typed-workflow-agent-with-mastra/solution/main.ts')).href);
  const calls = [];
  const tool = async (name,query) => {calls.push({name,query}); return 'Local fixture response';};
  const paused = await m.runTicket({id:'t',message:'Update local fixture'},tool);
  assert.equal(paused.status,'suspended'); assert.equal(calls.length,0);
  const result = await m.executePlan(paused.checkpoint,tool,{approved:true});
  assert.equal(result.status,'complete'); assert.deepEqual(calls,[{name:'update',query:'Update local fixture'}]);
  assert.equal(receipt.optionalSDK.frameworkExecuted,false);
});

test('hook figure cannot replace intake bounds or activate a real hook', async () => {
  const m = await import(pathToFileURL(path.join(ROOT,'projects/workflow-hooks/solution/main.ts')).href);
  const figure = registries.get('workflow-hooks').after.get('pj-workflow-hooks-1');
  const rule = 'x'.repeat(501);
  assert.match(figure.lab.calculate({rule,sessions:'a,b',scope:'local',activeScope:'local',state:'candidate',minimum:2}).summary,/保存规则/);
  assert.throws(()=>m.ingest({id:'a',session:'b',scope:'local',rule,source:'local fixture'}),/too large/);
  assert.match(figure.caption,/长度检查/);
  assert.equal(receipt.limits.hooksInstalledOrActivated,false);
});

test('translation comparator still rejects changed numeric output', () => {
  assert.throws(()=>compare({count:2},{count:3},[]));
  assert.throws(()=>compare({state:'ready'},{state:'approved'},[]));
});
