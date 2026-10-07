// Compare the actual source calculators, including table payloads and state values.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch10.json'), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
function restoreSource(current, record) {
  const chars = Array.from(current);
  for (const edit of [...record.edits].reverse()) {
    assert.equal(chars.slice(edit.afterOffset, edit.afterOffset + Array.from(edit.after).length).join(''), edit.after);
    chars.splice(edit.afterOffset, Array.from(edit.after).length, ...Array.from(edit.before));
  }
  const source = chars.join('');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), record.sourceSha256);
  return source;
}
function load(source) {
  const registry = new Map();
  vm.runInNewContext(source, { TextEncoder, TextDecoder, window: { AIFSProjectFigures: { register: (id, config) => registry.set(id, config) } } }, { timeout: 2000 });
  return registry;
}
function projection(value, reverseDisplay, key = '') {
  if (typeof value === 'function') return '<function>';
  if (key === 'receipt') return value;
  if (['title', 'caption', 'question', 'label', 'explanation', 'detail', 'formula'].includes(key)) return '<display>';
  if (key === 'summary' && typeof value === 'string') {
    const status = value.match(/^(blocked|budget-exhausted|complete|visual-mismatch)(?=[;；])/);
    return status ? { state: status[1] } : '<summary>';
  }
  if (key === 'columns') return value.map(label => reverseDisplay.get(label) || label);
  if (key === 'rows') return value.map(row => row.map((cell, i) => i === 0 && typeof cell === 'string' ? (reverseDisplay.get(cell) || cell) : cell));
  if (Array.isArray(value)) return value.map(child => projection(child, reverseDisplay));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, projection(child, reverseDisplay, name)]));
  return value;
}
function evaluate(lab, values, step, reverseDisplay) {
  try { return { ok: true, output: plain(projection(lab.calculate(Object.freeze({ ...values }), step), reverseDisplay)) }; }
  catch (error) { return { ok: false, error: error.name }; }
}
for (const record of fixture.figures) {
  const current = fs.readFileSync(path.join(ROOT, record.path), 'utf8');
  const before = load(restoreSource(current, record));
  const after = load(current);
  const reverseDisplay = new Map(record.displayPairs.map(([english, chinese]) => [chinese, english]));
  assert.deepEqual([...after.keys()], [...before.keys()]);
  for (const [id, original] of before) {
    const translated = after.get(id);
    test(`${id}: translated controls retain exact machine schema and defaults`, () => {
      assert.deepEqual(plain(projection(translated, reverseDisplay)), plain(projection(original, new Map())));
      assert.match(translated.title, /[\u3400-\u9fff]/);
      for (const control of translated.lab.controls) assert.match(control.label, /[\u3400-\u9fff]/);
    });
    test(`${id}: actual calculations preserve numeric values, states and table evidence`, () => {
      const defaults = Object.fromEntries(original.lab.controls.map(control => [control.key, control.value]));
      const samples = [defaults];
      for (const control of original.lab.controls) {
        const values = control.type === 'checkbox' ? [false, true] : control.type === 'text' ? ['Read, then write', '中文，含换行\n的标题', 'é'.repeat(90), '<script>x</script>', '', null] : [control.min, control.max, 0, 1, 5, 6, 10, 40, 100, -1, 1.5, true, null, Infinity];
        for (const value of values) samples.push({ ...defaults, [control.key]: value });
      }
      for (const sample of samples) for (const step of [0, 1, 2]) {
        assert.deepEqual(evaluate(translated.lab, sample, step, reverseDisplay), evaluate(original.lab, sample, step, new Map()), JSON.stringify(sample));
      }
    });
  }
}

test('browser translated labels cannot change complete, blocked, budget or visual decisions', () => {
  const registry = load(fs.readFileSync(path.join(ROOT, 'site/figures/projects/browser-agent.js'), 'utf8'));
  const lab = registry.get('pj-browser-agent-1').lab;
  const defaults = Object.fromEntries(lab.controls.map(c => [c.key, c.value]));
  for (const [change, expected] of [[{}, 'complete'], [{ origin: true }, 'blocked'], [{ dangerous: true }, 'blocked'], [{ budget: 3 }, 'budget-exhausted'], [{ green: 5 }, 'visual-mismatch'], [{ green: 6 }, 'complete']]) {
    assert.ok(lab.calculate({ ...defaults, ...change }, 0).summary.startsWith(expected + '；'));
  }
});

test('calendar escaping evidence remains exact for Chinese text and UTF-8 folding', () => {
  const registry = load(fs.readFileSync(path.join(ROOT, 'site/figures/projects/calendar-focus-planner.js'), 'utf8'));
  const lab = registry.get('pj-calendar-focus-planner-4').lab;
  const title = '读书,再写\n内容;\\' + '中'.repeat(30);
  const result = lab.calculate({ title }, 0);
  const escaped = title.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  assert.equal(result.rows[0][1], title);
  assert.equal(result.rows[1][1], 'SUMMARY:' + escaped);
  assert.equal(result.metrics[0].value, new TextEncoder().encode('SUMMARY:' + escaped).length);
  assert.equal(result.metrics[1].value, 'yes');
});
