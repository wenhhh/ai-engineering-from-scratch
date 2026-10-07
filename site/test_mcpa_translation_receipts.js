// Translation completion must remain tied to the actual files and answer keys.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sync = JSON.parse(fs.readFileSync(path.join(root, 'i18n/zh-upstream-sync.json'), 'utf8'));

test('completed MCPA file receipts cover each lesson and match current bytes', () => {
  const entries = sync.completedLessonFiles;
  assert.ok(Array.isArray(entries) && entries.length > 0);
  const seen = new Set();
  for (const entry of entries) {
    const relative = entry.path;
    assert.equal(typeof relative, 'string');
    assert.equal(path.posix.normalize(relative), relative);
    assert.ok(!relative.startsWith('/') && !relative.split('/').includes('..'));
    assert.ok(sync.completedMCPALessons.some(lesson => relative.startsWith(lesson + '/')), relative);
    assert.ok(!seen.has(relative), 'duplicate receipt: ' + relative);
    seen.add(relative);
    assert.match(entry.upstreamSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.localizedSha256, /^[a-f0-9]{64}$/);
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
    assert.equal(actual, entry.localizedSha256, relative);
    assert.ok(['translated', 'contract-fixture-preserved'].includes(entry.status), relative);
    if (entry.status === 'contract-fixture-preserved') {
      assert.equal(entry.upstreamSha256, entry.localizedSha256, relative);
    }
  }
  for (const lesson of sync.completedMCPALessons) {
    for (const file of ['docs/en.md', 'quiz.json', 'code/main.py', 'code/figure.snippet.js']) {
      assert.ok(seen.has(lesson + '/' + file), 'missing receipt: ' + lesson + '/' + file);
    }
    const outputs = fs.readdirSync(path.join(root, lesson, 'outputs')).filter(name => name.endsWith('.md'));
    assert.ok(outputs.length > 0, lesson);
    for (const name of outputs) assert.ok(seen.has(lesson + '/outputs/' + name), lesson + '/' + name);
  }
});

test('MCPA 09-33 translated quizzes preserve the pinned source stages and answer positions', () => {
  // Copied from c02ca08d8a49ce24c3c1c1cf8e3b422f2c7393ca, not inferred from translations.
  const answers = {
    '09-reading-server-manifests': [2, 3, 0, 1, 2, 3],
    '10-model-interaction-flow': [2, 3, 0, 1, 2, 3],
    '11-the-tools-primitive': [0, 1, 2, 3, 0, 1],
    '12-the-resources-primitive': [0, 1, 2, 3, 0, 1],
    '13-prompts-and-completion': [0, 1, 2, 3, 0, 1],
    '14-multi-round-trip-requests-and-elicitation': [2, 3, 0, 1, 2, 3],
    '15-deprecated-client-features': [1, 2, 3, 0, 1, 2],
    '16-notifications-and-subscriptions': [2, 3, 0, 1, 2, 3],
    '17-tool-invocation-lifecycle': [1, 2, 3, 0, 1, 2],
    '18-error-handling': [1, 2, 3, 0, 1, 2],
    '19-transports-and-http-headers': [3, 0, 1, 2, 3, 0],
    '20-caching-and-pagination': [3, 0, 1, 2, 3, 0],
    '21-long-running-work-and-tasks': [0, 1, 2, 3, 0, 1],
    '22-trust-boundaries': [0, 1, 2, 3, 0, 1],
    '23-oauth-authorization': [1, 2, 3, 0, 1, 2],
    '24-client-registration-and-identity': [1, 2, 3, 0, 1, 2],
    '25-consent-and-least-privilege': [1, 2, 3, 0, 1, 2],
    '26-risk-and-safety-controls': [3, 0, 1, 2, 3, 0],
    "27-auditability-and-observability": [3, 0, 1, 2, 3, 0],
    "28-roles-and-adoption": [3, 0, 1, 2, 3, 0],
    "29-operational-use-cases": [1, 2, 3, 0, 1, 2],
    "30-the-extensions-framework": [2, 3, 0, 1, 2, 3],
    "31-mcp-apps": [0, 1, 2, 3, 0, 1],
    "32-registry-gateways-and-sdk-tiers": [3, 0, 1, 2, 3, 0],
    "33-mcpa-capstone-readiness": [3, 0, 1, 2, 3, 0],
  };
  for (const [slug, expected] of Object.entries(answers)) {
    const quiz = JSON.parse(fs.readFileSync(path.join(root, 'certifications/mcpa/lessons', slug, 'quiz.json'), 'utf8'));
    assert.equal(quiz.lesson, slug);
    assert.deepEqual(quiz.questions.map(question => question.correct), expected, slug);
    assert.deepEqual(quiz.questions.map(question => question.stage), ['pre', 'check', 'check', 'check', 'post', 'post'], slug);
    for (const question of quiz.questions) {
      assert.equal(question.options.length, 4);
      for (const text of [question.question, question.explanation, ...question.options]) {
        assert.equal(typeof text, 'string');
        assert.match(text, /[\u3400-\u9fff]/, slug);
      }
    }
  }
});

// Keep the known upstream grading defect visible; hash parity alone is not accuracy.
test('MCPA upstream answer-key conflict remains explicitly disclosed', () => {
  const issue = (sync.knownUpstreamIssues || []).find(entry => entry.id === 'mcpa-17-q03-upstream-answer-key');
  assert.ok(issue, 'known upstream defect must remain in the completion metadata');
  assert.equal(issue.status, 'unresolved-preserved-with-visible-warning');
  assert.equal(issue.upstreamCommit, sync.upstreamCommit);
  assert.equal(issue.questionIndex, 2);
  assert.equal(issue.preservedCorrectIndex, 3);
  assert.equal(issue.evidenceSupportedIndex, 1);
  const quiz = JSON.parse(fs.readFileSync(path.join(root, issue.path), 'utf8'));
  const question = quiz.questions[issue.questionIndex];
  assert.equal(question.correct, issue.preservedCorrectIndex);
  assert.match(question.question, /上游答案键存在勘误/);
  assert.match(question.explanation, /应选择第二项/);
  assert.match(question.explanation, /自动判分不应作为/);
  assert.match(question.options[1], /execute.*isError.*true/);
  assert.match(question.options[3], /validate.*-32602/);
});
