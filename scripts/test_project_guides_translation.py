"""Check human-guide translation without changing agent rules or learner evidence."""
from pathlib import Path
import hashlib
import json
import re
import unittest
from audit_chinese_translation import FENCES, markdown_issues
from project_translation_contracts import markdown_contract, digest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / 'site/fixtures/project-guides-zh.json').read_text())
CJK = re.compile(r'[\u3400-\u9fff]')

def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def link_rows(text):
    return re.findall(r'^\| \[([^\]]+)\]\(([a-z0-9-]+)/\) \| (.+) \|$', text, re.M)


def roadmap_sections(text):
    pattern = r'<a id="([^"]+)"></a>\s*\n\s*### ([^\n]+)\n([\s\S]*?)(?=\n<a id=|\n## |\Z)'
    return re.findall(pattern, text)


class ProjectGuidesTranslationTests(unittest.TestCase):
    def test_four_source_and_translation_hashes(self):
        self.assertEqual(len(FIXTURE['documents']), 4)
        for rel, row in FIXTURE['documents'].items():
            self.assertEqual(sha(row['sourceText'].encode()), row['sourceSha256'], rel)
            self.assertEqual(sha((ROOT / rel).read_bytes()), row['localizedSha256'], rel)
            self.assertRegex((ROOT / rel).read_text(), CJK, rel)

    def test_structures_examples_and_commands_preserved(self):
        total = 0
        for rel, row in FIXTURE['documents'].items():
            source, target = row['sourceText'], (ROOT / rel).read_text()
            self.assertEqual(digest(markdown_contract(target)), digest(row['contract']), rel)
            self.assertEqual(markdown_issues(source, target), [], rel)
            original = [m.group() for m in FENCES.finditer(source)]
            self.assertEqual([m.group() for m in FENCES.finditer(target)], original, rel)
            total += len(original)
        self.assertEqual(total, 9)

    def test_ready_catalog_titles_match_existing_translations(self):
        rel = 'projects/README.md'
        before = link_rows(FIXTURE['documents'][rel]['sourceText'])
        after = link_rows((ROOT / rel).read_text())
        self.assertEqual(len(after), 48)
        self.assertEqual(len({r[1] for r in after}), 48)
        self.assertEqual([(r[1], r[2]) for r in after], [(r[1], r[2]) for r in before])
        for title, slug, fields in after:
            manifest = json.loads((ROOT / 'projects' / slug / 'project.json').read_text())
            self.assertEqual(title, manifest['title'])
            level, languages, stages, hours = fields.split(' | ')
            self.assertEqual(int(level), manifest['level'])
            self.assertEqual(int(stages), len(manifest['stages']))
            self.assertEqual(hours, '~' + str(manifest['hours']) + 'h')
            self.assertEqual(languages.split(', '), manifest['languages'])

    def test_roadmap_preserves_all_plans_and_acceptance_sections(self):
        rel = 'projects/ROADMAP.md'
        source = FIXTURE['documents'][rel]['sourceText']
        target = (ROOT / rel).read_text()
        before, after = roadmap_sections(source), roadmap_sections(target)
        planned = json.loads((ROOT / 'projects/roadmap.json').read_text())['planned']
        self.assertEqual([r[0] for r in before], [e['id'] for e in planned])
        self.assertEqual([r[0] for r in after], [r[0] for r in before])
        self.assertEqual(len(after), 52)
        for (_, original_title, old), (slug, title, current), entry in zip(before, after, planned):
            self.assertRegex(title, CJK)
            self.assertEqual(len(re.findall(r'^\d+\. ', current, re.M)), 4, slug)
            self.assertEqual(len(re.findall(r'^\d+\. ', old, re.M)), 4, slug)
            for label in ['独立重点：', '首个待实现演示：', '交付物：', '先修项目：']:
                self.assertEqual(current.count('**' + label + '**'), 1, (slug, label))
            self.assertEqual('**范围限制：**' in current, 'implementationBoundary' in entry)
            self.assertEqual(re.findall(r'^\*\*Languages:\*\* (.*)', current, re.M),
                             re.findall(r'^\*\*Languages:\*\* (.*)', old, re.M))
            self.assertEqual(entry['status'], 'planned')
        self.assertEqual(len(re.findall(r'^\d+\. ', target, re.M)), 208)
        self.assertEqual(target.count('**范围限制：**'), 20)
        self.assertEqual(target.count('无；从所选语言基础开始。'), 8)

    def test_roadmap_has_no_untranslated_narrative_lines(self):
        text = (ROOT / 'projects/ROADMAP.md').read_text()
        for line in text.splitlines():
            if (not line.strip() or line.startswith('<a ')
                    or re.fullmatch(r'\|[-:| ]+\|', line)
                    or re.fullmatch(r'\*\*Languages:\*\* (?:Python|Rust|TypeScript|Go)(?:, (?:Python|Rust|TypeScript|Go))*', line)):
                continue
            self.assertRegex(line, CJK, line[:180])

    def test_relative_links_and_explicit_anchors_remain_resolvable(self):
        anchors = set(re.findall(r'<a id="([^"]+)"', (ROOT / 'projects/ROADMAP.md').read_text()))
        self.assertEqual(len(anchors), 52)
        for rel in FIXTURE['documents']:
            text = (ROOT / rel).read_text()
            for destination in re.findall(r'\[[^\]]+\]\(([^)]+)\)', text):
                if destination.startswith(('https://', 'http://')):
                    continue
                if destination.startswith('#'):
                    self.assertIn(destination[1:], anchors)
                else:
                    self.assertTrue((ROOT / rel).parent.joinpath(destination).exists(), (rel, destination))

    def test_runtime_requirements_and_evidence_limits_are_not_weakened(self):
        readme = (ROOT / 'projects/README.md').read_text()
        for literal in ['Python 3.12+', 'Node 22.18+', 'edition 2021', '1.23+',
                        '未经监考', '不属于厂商认证', '可选 SDK 验证与核心内容完成资格分开']:
            self.assertIn(literal, readme)
        roadmap = (ROOT / 'projects/ROADMAP.md').read_text()
        for literal in ['48 个可构建、52 个规划中', '尚无可运行阶段', '不承诺交付日期',
                        '不能证明全局最小', '不构成通用符合性认证']:
            self.assertIn(literal, roadmap)

    def test_agent_instructions_and_machine_sources_unchanged(self):
        for rel, expected in FIXTURE['preservedFiles'].items():
            self.assertEqual(sha((ROOT / rel).read_bytes()), expected, rel)
        self.assertEqual((ROOT / 'skills/build-project/SKILL.md').read_bytes(),
                         (ROOT / '.claude/skills/build-project/SKILL.md').read_bytes())
        self.assertFalse(FIXTURE['translationsScope']['agentInstructionPatchApplied'])
        self.assertFalse(FIXTURE['translationsScope']['agentInstructionFullTranslationRequired'])

    def test_changed_commands_links_and_omitted_sections_are_detected(self):
        source = (ROOT / 'projects/AUTHORING.md').read_text()
        original = digest(markdown_contract(source))
        for before, after in [('`--stage N`', '`--stage 999`'),
                              ('{workspace}', '{untrusted}'),
                              ('(ROADMAP.md)', '(missing.md)'),
                              ('## 发布检查', '发布检查')]:
            self.assertIn(before, source)
            self.assertNotEqual(digest(markdown_contract(source.replace(before, after))), original)
        roadmap = (ROOT / 'projects/ROADMAP.md').read_text()
        changed = re.sub(r'^1\. [^\n]+\n', '', roadmap, count=1, flags=re.M)
        self.assertNotEqual(digest(markdown_contract(changed)), digest(markdown_contract(roadmap)))


if __name__ == '__main__':
    unittest.main()
