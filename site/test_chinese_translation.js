const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseReadme, parseRoadmap, parseCurriculumPrereqs, parseGlossary, lessonDocumentSeo } = require('./build.js');

const readme = `### Phase 0: 环境搭建（Setup） \`1 lessons\`
> 学习开发工具。

| # | 课程（Lesson） | 类型 | 语言 |
|---|---|---|---|
| 01 | [开发环境（Dev Environment）](phases/00-setup-and-tooling/01-dev-environment/) | 实践（Build） | Python |
`;
const roadmap = '## 阶段 0: 环境搭建（Setup） — ✅\n| 01 | 开发环境（Dev Environment） | ✅ |\n';
const phases = parseReadme(readme, parseRoadmap(roadmap));
assert.equal(phases.length, 1);
assert.equal(phases[0].lessons.length, 1);
assert.equal(phases[0].lessons[0].type, 'Build');
assert.equal(phases[0].lessons[0].name, '开发环境（Dev Environment）');
assert.equal(phases[0].status, 'complete');
assert.match(phases[0].lessons[0].url, /01-dev-environment\/$/);
const graph = '## 课程结构（The shape of the curriculum）\n```mermaid\ngraph TD\nP0["环境"] --> P1["数学"]\n```\n';
assert.deepEqual(parseCurriculumPrereqs(graph, [{ id: 0 }, { id: 1 }]), { 0: [], 1: [0] });
assert.throws(() => parseCurriculumPrereqs(graph.replace('P1[', 'P2['), [{ id: 0 }, { id: 1 }]));
const description = lessonDocumentSeo('# x\n\n> ' + '中'.repeat(106) + ' ' + '文'.repeat(100), 'x').description;
assert.ok(description.length >= 120 && description.length <= 160);
const terms = parseGlossary('### 词元（Token）\n- **分类（Category）:** 数据与表示（Data & representations）\n- **准确含义（What it actually means）:** 模型处理文本的基本单元。\n- **相关术语（Related terms）:** RAG\n\n### 检索增强生成（RAG）\n- **分类（Category）:** Retrieval & generation\n- **准确含义（What it actually means）:** 根据检索结果生成回答。\n');
assert.equal(terms[0].slug, 'token');
assert.equal(terms[0].category, 'Data & representations');
assert.equal(terms[0].means, '模型处理文本的基本单元。');
assert.deepEqual(terms[0].related, ['RAG']);
assert.equal(parseGlossary('<a id="token"></a>\n### 词元（Token）\n- **Category:** Data & representations\n- **What it actually means:** 文本单元。\n<a id="next-term"></a>\n')[0].slug, 'token');
const document = { documentElement: {}, readyState: 'complete', getElementById: () => null };
const window = {};
vm.runInNewContext(fs.readFileSync(__dirname + '/lang-picker.js', 'utf8'), { document, window });
assert.equal(window.AIFS_currentLang(), 'zh-CN');
assert.equal(document.documentElement.lang, 'zh-CN');
const lesson = fs.readFileSync(__dirname + '/lesson.html', 'utf8');
assert.ok(!lesson.includes('/translations/i18n/'));
assert.ok(lesson.includes('if (localPreview || !fallback || fallback === primary) throw error;'));
console.log('PASS: Chinese table, types, URLs, roadmap, language and no upstream translation fallback.');
