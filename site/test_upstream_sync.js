const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const sync = JSON.parse(fs.readFileSync(path.join(root, 'i18n/zh-upstream-sync.json'), 'utf8'));

function assertProjectTranslationCoverage() {
  const base = path.join(root, 'projects');
  const actual = fs.readdirSync(base).filter(name => {
    const file = path.join(base, name, 'project.json');
    return fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).status === 'ready';
  }).sort();
  const recorded = [...sync.pendingProjects, ...(sync.completedProjects || [])];
  assert.equal(new Set(recorded).size, recorded.length);
  assert.deepEqual([...recorded].sort(), actual);
  for (const item of sync.pendingProjectMedia || []) {
    assert.ok(sync.completedProjects.includes(item.project));
    const mediaDir = path.join(root, 'projects', item.project, 'media');
    const actualMedia = fs.readdirSync(mediaDir).filter(name => fs.statSync(path.join(mediaDir, name)).isFile()).map(name => 'projects/' + item.project + '/media/' + name).sort();
    assert.equal(new Set(item.sourceFiles).size, item.sourceFiles.length);
    assert.deepEqual([...item.sourceFiles].sort(), actualMedia, 'all original media must remain explicitly pending');
  }
}

const picker = fs.readFileSync(path.join(__dirname, 'lang-picker.js'), 'utf8');
function load(search, metadata = sync) {
  const document = { documentElement: {}, readyState: 'complete', getElementById: () => null };
  const window = { location: { search }, __AIFS_TRANSLATION: metadata };
  vm.runInNewContext(picker, { document, window });
  return { document, window };
}
test('Chinese remains default and never returns an implicit English fallback', () => {
  const {document, window} = load('');
  assert.equal(window.AIFS_currentLang(), 'zh-CN');
  assert.equal(document.documentElement.lang, 'zh-CN');
  assert.equal(window.AIFS_englishSourceUrl('phases/00-setup-and-tooling/01-dev-environment/docs/en.md'), null);
});
test('explicit English reads the pinned upstream, not a moving branch or translations branch', () => {
  const {window} = load('?path=abc&lang=en');
  const relative = 'certifications/mcpa/lessons/00-mcp-exam-strategy/docs/en.md';
  assert.equal(window.AIFS_currentLang(), 'en');
  assert.equal(window.AIFS_englishSourceUrl(relative), 'https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/' + sync.upstreamCommit + '/' + relative);
  assert.throws(() => load('?lang=en', null).window.AIFS_englishSourceUrl(relative), /missing-pinned-upstream/);
});
test('English source access rejects traversal and non-curriculum paths', () => {
  const {window} = load('?lang=en');
  for (const input of ['../README.md', 'phases/../secret', 'phases/x?url=external', '/etc/passwd', '.env']) {
    assert.throws(() => window.AIFS_englishSourceUrl(input), /invalid-source-path/);
  }
});
test('every new MCPA lesson has exactly one explicit translation status', () => {
  const actual = fs.readdirSync(path.join(root, 'certifications/mcpa/lessons')).map(name => 'certifications/mcpa/lessons/' + name).sort();
  const recorded = [...sync.completedMCPALessons, ...sync.pendingMCPALessons];
  assert.equal(new Set(recorded).size, recorded.length);
  assert.deepEqual(recorded.sort(), actual);
  assert.match(sync.upstreamCommit, /^[a-f0-9]{40}$/);
  assertProjectTranslationCoverage();
});
test('pending lessons have a visible notice and certification readers keep source selection', () => {
  const source = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
  assert.ok(source.includes('正文及测验仍为英文，尚未完成增量汉化'));
  assert.ok(source.includes('if (langPicker) langPicker.hidden = false;'));
  assert.ok(source.includes("currentLang() !== 'en' && certificationLesson"));
});

// An empty lesson backlog must not turn the whole fork into a completion claim.
test('completed lesson layer accounts for every assessment and retains other unfinished scope', () => {
  assert.equal(sync.completedMCPALessons.length, 34);
  assert.deepEqual(sync.pendingMCPALessons, []);
  const folder = 'certifications/mcpa/assessments/mcpa-f';
  const actual = fs.readdirSync(path.join(root, folder)).filter(name => name.endsWith('.json')).map(name => folder + '/' + name).sort();
  const completed = sync.completedAssessments || [];
  const recorded = [...completed, ...sync.pendingAssessments];
  assert.equal(actual.length, 4);
  assert.equal(new Set(recorded).size, recorded.length, 'no duplicate completion or pending entries');
  assert.deepEqual(recorded.sort(), actual, 'completion and pending lists cover the actual four banks');
  const questionCount = files => files.reduce((sum, file) => sum + JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).questions.length, 0);
  assert.equal(questionCount(actual), 210);
  assert.equal(sync.completedAssessmentQuestions || 0, questionCount(completed));
  assert.equal(sync.pendingAssessmentQuestions, questionCount(sync.pendingAssessments));
  assert.ok(sync.otherPendingScope.length > 0, 'supporting material has not been declared finished');
  assertProjectTranslationCoverage();
  const source = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
  const expression = source.match(/var pending = (currentLang\(\) !== 'en' && sync && Array\.isArray\(sync\.pendingMCPALessons\)[\s\S]*?);/);
  assert.ok(expression, 'evaluate the real reader notice expression');
  function pending(metadata, lessonPath, language) {
    return vm.runInNewContext(expression[1], { sync: metadata, lessonPath, currentLang: () => language });
  }
  for (const lesson of sync.completedMCPALessons) assert.equal(pending(sync, lesson, 'zh-CN'), false);
  const sample = sync.completedMCPALessons[0];
  const unfinished = { ...sync, pendingMCPALessons: [sample] };
  assert.equal(pending(unfinished, sample, 'zh-CN'), true);
  assert.equal(pending(unfinished, sample, 'en'), false);
});
