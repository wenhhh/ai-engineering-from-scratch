// Exercise the real calculators before/after display translation, not a copied algorithm.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch09.json'), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
function sourceText(current, record) {
  let chars = Array.from(current);
  for (const edit of [...record.edits].reverse()) {
    const next = Array.from(edit.after);
    assert.equal(chars.slice(edit.afterOffset, edit.afterOffset + next.length).join(''), edit.after);
    chars.splice(edit.afterOffset, next.length, ...Array.from(edit.before));
  }
  const text = chars.join('');
  assert.equal(crypto.createHash('sha256').update(text).digest('hex'), record.sourceSha256);
  return text;
}
function load(text) {
  const registry = new Map();
  vm.runInNewContext(text, { window: { AIFSProjectFigures: { register: (id, value) => registry.set(id, value) } } }, { timeout: 2000 });
  return registry;
}
function machine(value, key = '') {
  // Serialized receipts remain wholly exact, including strings and field names.
  if (key === 'receipt') return value;
  if (typeof value === 'function') return '<function>';
  if (['title', 'caption', 'question', 'label', 'explanation', 'summary', 'detail', 'formula'].includes(key)) return '<display>';
  if (Array.isArray(value)) return value.map(item => machine(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, child]) => [name, machine(child, name)]));
  // A value may be a formatted numeric label; protect its numerical content.
  if (key === 'value' && typeof value === 'string' && /\d/.test(value)) return { numbers: value.match(/-?\d+(?:\.\d+)?/g) };
  return value;
}
function evaluate(lab, values, step) {
  try { return { success: true, output: plain(machine(lab.calculate(Object.freeze(values), step))) }; }
  catch (error) { return { success: false, errorName: error.name }; }
}
for (const record of fixture.figures) {
  const current = fs.readFileSync(path.join(ROOT, record.path), 'utf8');
  const translated = load(current), upstream = load(sourceText(current, record));
  assert.deepEqual([...translated.keys()], [...upstream.keys()]);
  for (const [id, before] of upstream) {
    const after = translated.get(id);
    test(`${id}: controls, IDs, presets and structure retain source semantics`, () => {
      assert.deepEqual(plain(machine(after)), plain(machine(before)));
      assert.match(after.title, /[\u3400-\u9fff]/);
      for (const control of after.lab.controls) assert.match(control.label, /[\u3400-\u9fff]/);
    });
    test(`${id}: every preset and varied input preserves calculated evidence`, () => {
      const defaults = Object.fromEntries(before.lab.controls.map(control => [control.key, control.value]));
      const inputs = [defaults, ...(before.lab.scenarios || []).map(scenario => ({ ...defaults, ...scenario.values }))];
      for (const control of before.lab.controls) {
        const candidates = control.type === 'checkbox' ? [true, false] : control.type === 'text' ? ['', 'A', 'B', '__proto__', '中文请求'] : ['range', 'number'].includes(control.type) ? [0, 1, 20, 100, -1, 1.5, true, null, Infinity, Number.MAX_SAFE_INTEGER + 1] : [];
        for (const value of candidates) inputs.push({ ...defaults, [control.key]: value });
      }
      for (const values of inputs) {
        for (const step of [0, 1, 2]) {
          assert.deepEqual(evaluate(after.lab, values, step), evaluate(before.lab, values, step), JSON.stringify(values));
        }
      }
      assert.match(JSON.stringify(after.lab.calculate(defaults, 0)), /[\u3400-\u9fff]/);
    });
  }
}
