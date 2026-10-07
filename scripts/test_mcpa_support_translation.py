"""Protect MCPA supporting prose contracts without treating tests as semantic certification."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unittest

from audit_chinese_translation import CJK, FENCES, INLINE_CODE, LINKS, prose

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / 'site/fixtures/mcpa-support-contracts.json'
SKILL = 'skills/mcpa-certification/SKILL.md'
MIRROR = '.claude/skills/mcpa-certification/SKILL.md'
LAUNCHER = 'skills/mcpa-certification/agents/openai.yaml'
LAUNCHER_MIRROR = '.claude/skills/mcpa-certification/agents/openai.yaml'
URLS = re.compile(r'https?://[^\s<>`"\[\]()\u3000-\u303f\u3400-\u9fff\uff00-\uffef]+')
STATE_HEADINGS = ['Goal', 'Active track', 'Route', 'Domain readiness', 'Review queue', 'Assessment attempts']


def digest(value):
    text = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(text.encode()).hexdigest()


def multiset(values):
    return sorted(Counter(values).items())


def state_projection(body):
    headings = []
    for line in body.splitlines():
        if line.startswith('## '):
            heading = line[3:]
            suffix = re.search(r'（([^（）]+)）$', heading)
            headings.append(suffix.group(1) if suffix else heading)
    fields = re.findall(r'^- (Exam code|Track file|Started|Pace|Diagnostic):', body, re.M)
    fixed = {value: body.count(value) for value in ['MCPA', 'certifications/mcpa/tracks/mcpa-f.json', '<YYYY-MM-DD>', 'Next', 'Pending', 'not taken']}
    table_widths = [len(line.split('|')) - 2 for line in body.splitlines() if line.startswith('|')]
    return {'headings': headings, 'fields': fields, 'fixed': fixed, 'tables': table_widths,
            'urls': URLS.findall(body)}


def document_projection(relative, text):
    """Exclude only reviewed natural-language surfaces, never commands or wire JSON."""
    clean = prose(text)
    fenced = []
    for index, match in enumerate(FENCES.finditer(text)):
        language, body = match[2].strip(), match[3]
        kind = 'exact'
        value = body
        if relative.endswith('/README.md') and language == 'mermaid':
            kind = 'mermaid-labels-only'
            value = re.sub(r'\["(?:\\.|[^"\\])*"\]', '["<label>"]', body)
        elif relative.endswith('/GETTING_STARTED.md') and index in (3, 4):
            assert language == 'text'
            kind = 'learner-prompt'
            value = {
                'skillPaths': re.findall(r'skills/[a-z-]+/SKILL\.md', body),
                'exam': re.findall(r'\bMCPA\b', body),
                'python': re.findall(r'\bPython\b', body),
            }
        elif relative.endswith('/GETTING_STARTED.md') and index == 5:
            assert language == 'text'
            kind = 'file-tree-labels-only'
            value = [re.split(r' {2,}', line, maxsplit=1)[0] for line in body.splitlines()]
        elif relative.endswith('/SKILL.md') and language == 'markdown':
            kind = 'progress-template-prose'
            value = state_projection(body)
        fenced.append({'language': language, 'kind': kind, 'value': value})
    return {
        'headings': re.findall(r'^(#{1,6})\s', clean, re.M),
        'tableRows': len(re.findall(r'^\s*\|.*\|\s*$', clean, re.M)),
        'listItems': len(re.findall(r'^\s*(?:[-*+] |\d+[.)] )', clean, re.M)),
        'links': multiset(LINKS.findall(clean)),
        'urls': multiset(url.rstrip('.,;') for url in URLS.findall(clean)),
        'inlineCode': multiset(INLINE_CODE.findall(clean)),
        'fences': fenced,
    }


SAFETY_CLAUSES = {
    'prior-state-confirmation': '只有在获得明确确认后',
    'no-reference-overwrite': '不得覆盖参考交付物',
    'no-fake-api': '不得编造虚假 API 代码',
    'no-unrun-verification': '不得将实践标记为已验证',
    'no-invented-assessment': '不得自行生成替代题目',
    'hidden-answer-key': '提交前不展示提示、`correct` 字段、解析或参考资料',
    'exact-set-scoring': '按集合完全相等计分，多选题不给部分分',
    'no-pass-guarantee': '绝不能保证学习者会通过考试',
    'no-book-generation': '不得送入仓库的电子书生成流水线',
    'no-learner-authorship-fiction': '绝不声称其已经编写或理解',
    'known-erratum': '不得将错误键导致的机器判分当作学习者知识错误',
    'verification-date-boundary': '翻译日期不能当作官方信息的新核验日期',
}


def safety_issues(text):
    return [key for key, value in SAFETY_CLAUSES.items() if value not in text]


class MCPASupportTranslationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.contract = json.loads(FIXTURE.read_text())

    def test_source_derived_document_structure_links_code_and_fences_match(self):
        for relative, record in self.contract['documents'].items():
            with self.subTest(path=relative):
                text = (ROOT / relative).read_text()
                self.assertEqual(digest(document_projection(relative, text)), record['projectionSha256'])
                self.assertRegex(prose(text), CJK)

    def test_mutated_command_wire_value_link_and_status_do_not_pass(self):
        changes = [
            ('certifications/mcpa/GETTING_STARTED.md', 'python3 "$LESSON/code/main.py"', 'python3 other.py'),
            ('certifications/mcpa/research/mcp-2026-07-28-brief.md', '"id": 7,', '"id": 8,'),
            ('certifications/mcpa/README.md', '(GETTING_STARTED.md)', '(missing.md)'),
            (SKILL, 'lab pending', 'lab verified'),
        ]
        for relative, before, after in changes:
            text = (ROOT / relative).read_text()
            self.assertIn(before, text)
            self.assertNotEqual(digest(document_projection(relative, text.replace(before, after))),
                                self.contract['documents'][relative]['projectionSha256'], relative)

    def test_mermaid_text_changes_do_not_allow_graph_changes(self):
        relative = 'certifications/mcpa/README.md'
        text = (ROOT / relative).read_text()
        changed = text.replace(' --> A[', ' --> Z[')
        self.assertNotEqual(text, changed)
        self.assertNotEqual(digest(document_projection(relative, text)), digest(document_projection(relative, changed)))

    def test_progress_template_keeps_order_fields_statuses_and_table_columns(self):
        body = next(m[3] for m in FENCES.finditer((ROOT / SKILL).read_text()) if m[2] == 'markdown')
        self.assertEqual(state_projection(body)['headings'], STATE_HEADINGS)
        self.assertEqual(state_projection(body)['fields'], ['Exam code', 'Track file', 'Started', 'Pace', 'Diagnostic'])
        changed = body.replace('Next', 'Complete')
        self.assertNotEqual(state_projection(body), state_projection(changed))

    def test_tutor_skill_and_launcher_entrypoints_are_identical(self):
        self.assertEqual((ROOT / SKILL).read_bytes(), (ROOT / MIRROR).read_bytes())
        self.assertEqual((ROOT / LAUNCHER).read_bytes(), (ROOT / LAUNCHER_MIRROR).read_bytes())

    def test_tutor_frontmatter_does_not_gain_tools_or_permissions(self):
        front = (ROOT / SKILL).read_text().split('---', 2)[1]
        self.assertEqual(re.findall(r'^([a-z_-]+):', front, re.M), ['name', 'description'])
        self.assertIn('\nname: mcpa-certification\n', front)
        self.assertRegex(front.split('description:', 1)[1], CJK)

    def test_launcher_preserves_schema_and_exact_skill_identifier(self):
        text = (ROOT / LAUNCHER).read_text()
        self.assertEqual(text.splitlines()[0], 'interface:')
        fields = re.findall(r'^  ([a-z_]+): (.*)$', text, re.M)
        self.assertEqual([x[0] for x in fields], ['display_name', 'short_description', 'default_prompt'])
        for key, value in fields:
            self.assertRegex(json.loads(value), CJK)
        self.assertIn('mcpa-certification', json.loads(dict(fields)['default_prompt']))

    def test_tutor_boundaries_are_present_and_deleting_each_is_rejected(self):
        text = (ROOT / SKILL).read_text()
        self.assertEqual(safety_issues(text), [])
        for name, clause in SAFETY_CLAUSES.items():
            with self.subTest(boundary=name):
                self.assertIn(name, safety_issues(text.replace(clause, '规则已删除')))

    def test_readme_lists_all_actual_lesson_titles_and_targets(self):
        text = (ROOT / 'certifications/mcpa/README.md').read_text()
        entries = re.findall(r'^\| (\d{2}) \| \[(.*?)\]\((lessons/[^)]+)\) \|$', text, re.M)
        self.assertEqual(len(entries), 34)
        for index, (number, title, relative) in enumerate(entries):
            self.assertEqual(int(number), index)
            actual = (ROOT / 'certifications/mcpa' / relative / 'docs/en.md').read_text().splitlines()[0][2:]
            self.assertEqual(title, actual)

    def test_official_fact_records_keep_original_dates_discrepancy_and_nonpublication(self):
        readme = (ROOT / 'certifications/mcpa/README.md').read_text()
        ledger = (ROOT / 'certifications/mcpa/research/source-verification-ledger.md').read_text()
        self.assertIn('**Last verified:** 2026-09-24', readme)
        for token in ['2026-09-24', '2026-09-16', '2026-07-28', '90 分钟', '120 分钟', '250 美元', '495 美元', '2 年', '12 个月']:
            self.assertIn(token, ledger)
        for line in ledger.splitlines():
            if line.startswith('| 题目数量') or line.startswith('| 及格分数'):
                self.assertIn('未公布', line)
        self.assertIn('未重新查询来源', ledger)

    def test_program_track_and_prerequisite_bytes_are_not_rewritten_by_document_translation(self):
        for relative, expected in self.contract['unchangedFiles'].items():
            self.assertEqual(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), expected, relative)

    def test_historical_source_conflicts_remain_unspecified_and_visible(self):
        text = (ROOT / 'certifications/mcpa/research/mcp-2026-07-28-brief.md').read_text()
        section = text.split('## 17.', 1)[1]
        self.assertEqual(sum('未明确规定' in line for line in section.splitlines() if line.startswith('|')), 3)
        self.assertIn('不能包装成只有唯一规定的考题', section)


if __name__ == '__main__':
    unittest.main()
