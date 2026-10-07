// Run the actual localized calculators and the exact pinned source restored from edit receipts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/projects-zh-batch11.json'), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
function restore(current, record) {
  const chars = Array.from(current);
  for (const edit of [...record.edits].reverse()) {
    const translated = Array.from(edit.after);
    assert.equal(chars.slice(edit.afterOffset, edit.afterOffset + translated.length).join(''), edit.after);
    chars.splice(edit.afterOffset, translated.length, ...Array.from(edit.before));
  }
  const source = chars.join('');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), record.sourceSha256);
  return source;
}
function load(source) {
  const registry = new Map();
  vm.runInNewContext(source, { window: { AIFSProjectFigures: { register: (id, value) => registry.set(id, value) } } }, { timeout: 2000 });
  return registry;
}
function translations(record) {
  const reverse = new Map();
  for (const edit of record.edits) {
    const after = vm.runInNewContext(edit.after, {}, { timeout: 100 });
    const before = vm.runInNewContext(edit.before, {}, { timeout: 100 });
    if (reverse.has(after)) assert.equal(reverse.get(after), before);
    reverse.set(after, before);
  }
  return reverse;
}
function canonical(value, reverse) {
  if (typeof value === 'function') return '<function>';
  if (typeof value === 'string') return reverse.get(value) ?? value;
  if (Array.isArray(value)) return value.map(item => canonical(item, reverse));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonical(item, reverse)]));
  return value;
}
function result(lab, input, step, reverse) {
  try { return { success: true, result: plain(canonical(lab.calculate(Object.freeze({ ...input }), step), reverse)) }; }
  catch (error) { return { success: false, errorName: error.name }; }
}
const registered = new Map();
for (const record of fixture.figures) {
  const text = fs.readFileSync(path.join(ROOT, record.path), 'utf8');
  const before = load(restore(text, record)), after = load(text), reverse = translations(record);
  assert.deepEqual([...before.keys()], [...after.keys()]);
  for (const [id, source] of before) {
    const target = after.get(id);
    registered.set(id, target);
    test(`${id}: all localized labels reverse and controls retain exact defaults`, () => {
      assert.deepEqual(plain(canonical(target, reverse)), plain(canonical(source, new Map())));
      assert.match(target.title, /[\u3400-\u9fff]/);
      for (const control of target.lab.controls) assert.match(control.label, /[\u3400-\u9fff]/);
    });
    test(`${id}: numeric evidence and decision strings match under varied inputs`, () => {
      const defaults = Object.fromEntries(source.lab.controls.map(control => [control.key, control.value]));
      const cases = [defaults];
      for (const control of source.lab.controls) {
        const values = control.type === 'checkbox' ? [false, true] : control.type === 'text'
          ? ['', '中文测试值', '<script>alert(1)</script>', 'abc1234,abc1234', 'bad hash', 'fix(api)!: 改名', 'a'.repeat(80)]
          : [0, 1, 2, 5, 10, 40, -1, 1.5, true, null, Infinity];
        for (const value of values) cases.push({ ...defaults, [control.key]: value });
      }
      for (const values of cases) for (const step of [0, 1, 2]) {
        assert.deepEqual(result(target.lab, values, step, reverse), result(source.lab, values, step, new Map()), JSON.stringify(values));
      }
    });
  }
}
test('the unchanged cloud calculator scope/cache discrepancy remains disclosed', () => {
  for (let stage = 1; stage <= 4; stage++) {
    const config = registered.get('pj-cloud-agent-with-aws-strands-' + stage);
    const values = Object.fromEntries(config.lab.controls.map(control => [control.key, control.value]));
    const calculation = plain(config.lab.calculate({ ...values, scope: true }, 0));
    assert.equal(calculation.metrics[0].value, 0, 'no provider calls');
    assert.equal(calculation.metrics[1].value, 2, 'pinned upstream still reports two cache hits');
    assert.equal(calculation.bars[0].value, 0, 'no retained output');
    assert.match(config.caption, /原图在资源超出范围时仍可能显示缓存命中/);
  }
});
