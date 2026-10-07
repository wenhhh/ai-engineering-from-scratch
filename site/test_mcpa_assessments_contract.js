// Source-derived MCPA contracts and the reader's existing pure scoring functions.
// No browser, network, subprocess or change to the production reader is involved.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = relative => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const source = read('site/fixtures/mcpa-assessment-contracts.json');
const sync = read('i18n/zh-upstream-sync.json');
const track = read('certifications/mcpa/tracks/mcpa-f.json');
const TEXT = '<translation-prose>';
const CJK = /[\u3400-\u9fff]/;
const plain = value => JSON.parse(JSON.stringify(value));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
const digest = value => sha(JSON.stringify(ordered(value)));
function objective(text) {
  assert.equal(typeof text, 'string');
  const matches = source.objectives.filter(english => text.endsWith('（' + english + '）') && CJK.test(text.slice(0, -english.length - 2)));
  assert.equal(matches.length, 1, text);
  return matches[0];
}
function bankProjection(bank) {
  const value = plain(bank);
  value.title = TEXT;
  for (const q of value.questions) {
    for (const field of ['prompt', 'explanation']) { assert.equal(typeof q[field], 'string'); q[field] = TEXT; }
    q.options = q.options.map(text => { assert.equal(typeof text, 'string'); return TEXT; });
    q.objective = objective(q.objective);
  }
  return value;
}
function trackProjection(manifest) {
  const value = plain(manifest);
  for (const domain of value.domains) {
    domain.name = TEXT;
    domain.objectives = domain.objectives.map(objective);
  }
  for (const item of value.deepDives) item.label = item.reason = TEXT;
  for (const item of value.assessments) item.title = TEXT;
  return value;
}
function literalBlocks(text) {
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '{') { i++; continue; }
    const start = i;
    let depth = 0, quoted = false, escaped = false;
    while (i < text.length) {
      const ch = text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') quoted = false;
      } else if (ch === '"') quoted = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (!depth) { blocks.push(text.slice(start, i + 1)); i++; break; }
      }
      i++;
    }
  }
  return blocks;
}
// Evaluate only these existing pure functions, copied verbatim from the reader.
const readerSource = fs.readFileSync(path.join(__dirname, 'certifications.js'), 'utf8');
const functionNames = ['normalizeQuestion', 'isRecord', 'isFiniteNumber', 'sameAnswers', 'scoreAssessmentAnswers', 'validDraftForAssessment'];
const definitions = functionNames.map(name => {
  const marker = '  function ' + name + '(';
  assert.equal(readerSource.split(marker).length, 2, name);
  const start = readerSource.indexOf(marker);
  const end = readerSource.indexOf('\n  function ', start + marker.length);
  assert.ok(end > start, name);
  return readerSource.slice(start, end);
});
const scoring = vm.runInNewContext(definitions.join('\n') + '\n({normalizeQuestion,scoreAssessmentAnswers,validDraftForAssessment});', {}, {timeout: 1000});

test('MCPA track display translation preserves all other metadata and exactly 18 source objectives', () => {
  assert.equal(source.upstream, 'c02ca08d8a49ce24c3c1c1cf8e3b422f2c7393ca');
  assert.equal(source.objectives.length, 18);
  assert.equal(digest(trackProjection(track)), source.trackProtectedSha256);
  for (const domain of track.domains) assert.match(domain.name, CJK);
  for (const item of track.deepDives) { assert.match(item.label, CJK); assert.match(item.reason, CJK); }
});
test('four completed MCPA assessments account for all 210 questions and exact current file bytes', () => {
  assert.deepEqual([...sync.completedAssessments].sort(), Object.keys(source.banks).sort());
  assert.deepEqual(sync.pendingAssessments, []);
  assert.equal(sync.completedAssessmentQuestions, 210);
  assert.equal(sync.pendingAssessmentQuestions, 0);
  assert.equal(sync.completedAssessmentFiles.length, 4);
  let total = 0;
  for (const [file, expected] of Object.entries(source.banks)) {
    const found = sync.completedAssessmentFiles.filter(entry => entry.path === file);
    assert.equal(found.length, 1);
    assert.equal(found[0].upstreamSha256, expected.sourceSha256);
    assert.equal(found[0].localizedSha256, sha(fs.readFileSync(path.join(ROOT, file))));
    assert.equal(found[0].questions, expected.questions.length);
    total += found[0].questions;
  }
  assert.equal(total, 210);
});
for (const [file, expected] of Object.entries(source.banks)) {
  const bank = read(file);
  const current = bank.questions.map(scoring.normalizeQuestion);
  const original = expected.questions.map(q => scoring.normalizeQuestion({...q, options: Array(4).fill(TEXT)}));
  test(`${bank.id}: protected fields and all literal wire examples match source`, () => {
    assert.equal(digest(bankProjection(bank)), expected.protectedSha256);
    const hashes = bank.questions.map(q => [q.prompt, ...q.options, q.explanation].map(text => literalBlocks(text).map(sha)));
    assert.deepEqual(hashes, expected.literalHashes);
    assert.match(bank.title, CJK);
    for (const q of bank.questions) {
      for (const text of [q.prompt, ...q.options, q.explanation]) assert.match(text, CJK, q.id);
      const domain = track.domains.find(item => item.id === q.domain);
      assert.ok(domain && domain.objectives.includes(q.objective), q.id);
    }
  });
  test(`${bank.id}: real scorer agrees for every question and all 16 answer subsets`, () => {
    current.forEach((q, index) => {
      for (let mask = 0; mask < 16; mask++) {
        const answers = {[q.id]: [0, 1, 2, 3].filter(i => (mask & (1 << i)) !== 0)};
        assert.deepEqual(plain(scoring.scoreAssessmentAnswers([q], answers)),
                         plain(scoring.scoreAssessmentAnswers([original[index]], answers)), `${q.id}/${mask}`);
        const reversed = {[q.id]: answers[q.id].slice().reverse()};
        assert.deepEqual(plain(scoring.scoreAssessmentAnswers([q], reversed)), plain(scoring.scoreAssessmentAnswers([q], answers)));
      }
    });
  });
  test(`${bank.id}: prior draft answer ids, full marks, blanks and partial domain scores remain compatible`, () => {
    const answers = Object.fromEntries(original.map(q => [q.id, [...q.correct]]));
    const draft = {version: bank.version, answers, startedAt: 1700000000000, deadlineAt: 1700000000000 + bank.timeLimitMinutes * 60000};
    assert.equal(scoring.validDraftForAssessment(draft, bank.version, current, bank.timeLimitMinutes), true);
    assert.equal(scoring.validDraftForAssessment(draft, bank.version, original, bank.timeLimitMinutes), true);
    assert.equal(scoring.scoreAssessmentAnswers(current, answers).percent, 100);
    assert.equal(scoring.scoreAssessmentAnswers(current, {}).percent, 0);
    const partial = Object.fromEntries(original.filter((q, i) => i % 3 === 0).map(q => [q.id, [...q.correct]]));
    assert.deepEqual(plain(scoring.scoreAssessmentAnswers(current, partial)), plain(scoring.scoreAssessmentAnswers(original, partial)));
    assert.equal(scoring.validDraftForAssessment({...draft, answers: {unknown: [0]}}, bank.version, current, bank.timeLimitMinutes), false);
  });
  test(`${bank.id}: track metadata cannot overwrite the translated title in the fetch fallback`, () => {
    const meta = track.assessments.find(item => item.id === bank.id);
    assert.ok(meta && meta.path === file);
    assert.equal(meta.title, bank.title);
    const fallback = Object.assign({}, bank, meta, {id: bank.id});
    assert.equal(fallback.title, bank.title);
    assert.deepEqual(fallback.questions, bank.questions);
  });
}
