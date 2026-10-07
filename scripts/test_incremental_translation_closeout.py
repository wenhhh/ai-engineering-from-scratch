"""Verify translation closeout evidence without granting runtime or learner qualifications."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unittest

from audit_chinese_translation import FENCES, markdown_issues
from audit_incremental_translation import audit, classify, prose_candidates, PREVIOUS, UPSTREAM
from build_readme_i18n import render, localize_links
from readme_translations import TRANSLATIONS, README_NOTE
from project_translation_contracts import markdown_contract, digest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / 'site/fixtures/translation-closeout.json').read_text())
COVERAGE = json.loads((ROOT / 'docs/validation/2026-10-07-translation-coverage.json').read_text())

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

class IncrementalTranslationCloseoutTests(unittest.TestCase):
    def test_fixed_delta_is_complete_unique_and_unicode_safe(self):
        raw = subprocess.check_output(['git', 'diff', '--name-status', '--no-renames', '-z', PREVIOUS, UPSTREAM], cwd=ROOT).decode().rstrip('\0').split('\0')
        pairs = list(zip(raw[::2], raw[1::2]))
        self.assertEqual(len(pairs), 2179)
        recorded = [(row['upstreamChange'], row['path']) for row in COVERAGE['entries']]
        self.assertEqual(recorded, pairs)
        self.assertEqual(len({path for _, path in pairs}), len(pairs))
        self.assertIn('projects/semantic-notes-search/examples/notes/café.md', [path for _, path in pairs])
        self.assertEqual(sum(path.endswith('.md') for _, path in pairs), 557)

    def test_fresh_reader_audit_and_prior_receipts_pass(self):
        fresh = audit()
        self.assertEqual(fresh['unresolved'], [])
        self.assertEqual(fresh['counts'], COVERAGE['counts'])
        self.assertEqual(fresh['counts']['categories']['reader-markdown'], 469)
        self.assertEqual(fresh['counts']['categories']['chinese-readme-mirror'], 1)
        self.assertEqual(sum(fresh['counts']['existingReceiptSetsChecked'].values()), 1981)
        self.assertEqual(fresh['counts']['readyProjects'], 48)

    def test_final_document_bytes_and_source_structure(self):
        self.assertEqual(len(FIXTURE['documents']), 2)
        for rel, row in FIXTURE['documents'].items():
            original, target = row['sourceText'], (ROOT / rel).read_text()
            self.assertEqual(sha(original.encode()), row['sourceSha256'])
            self.assertEqual(sha(target.encode()), row['localizedSha256'])
            self.assertEqual(markdown_issues(original, target), [])
            self.assertEqual(digest(markdown_contract(target)), digest(row['contract']))
            self.assertEqual(re.findall(r'\d+(?:[.,]\d+)*', original), re.findall(r'\d+(?:[.,]\d+)*', target))
            self.assertEqual([m.group() for m in FENCES.finditer(original)], [m.group() for m in FENCES.finditer(target)])

    def test_historical_results_are_not_claimed_as_current_execution(self):
        text = (ROOT / 'projects/VALIDATION.md').read_text()
        for value in ['上游历史记录', '2026-09-29', '本次只翻译', '不将其中的测试',
                      'Python 3.12.12', 'Node 25.6.1', 'Rust 1.95.0', 'Go 1.26.0',
                      '1,382', '197', '未执行可选 Docker 探针']:
            self.assertIn(value, text)
        self.assertIn('本文件说明上游的设计与交付契约', (ROOT / 'projects/PLAN.md').read_text())
        self.assertEqual(COVERAGE['unresolved'], [])

    def test_plan_catalog_preserves_metadata_and_all_48_titles(self):
        target = (ROOT / 'projects/PLAN.md').read_text()
        rows = re.findall(r'^\| \[([^\]]+)\]\(([a-z0-9-]+)/\) \| (.+) \|$', target, re.M)
        self.assertEqual(len(rows), 48)
        old = re.findall(r'^\| \[[^\]]+\]\(([a-z0-9-]+)/\) \| (.+) \|$', FIXTURE['documents']['projects/PLAN.md']['sourceText'], re.M)
        self.assertEqual([(slug, fields) for _, slug, fields in rows], old)
        for title, slug, fields in rows:
            meta = json.loads((ROOT / 'projects' / slug / 'project.json').read_text())
            self.assertEqual(title, meta['title'])
            self.assertEqual(meta['status'], 'ready')

    def test_chinese_entry_matches_existing_generator(self):
        canonical = (ROOT / 'README.md').read_text()
        mirror = (ROOT / 'i18n/zh/README.md').read_text()
        expected = README_NOTE['zh'] + '\n' + localize_links(render(canonical, 'zh', TRANSLATIONS))
        self.assertEqual(mirror, expected)
        self.assertEqual([m.group() for m in FENCES.finditer(mirror)], [m.group() for m in FENCES.finditer(canonical)])
        self.assertEqual(prose_candidates(mirror), [])
        self.assertIn('仓库主 README', mirror.splitlines()[0])
        self.assertNotIn('英文原文为准', mirror.splitlines()[0])

    def test_generator_and_other_locale_mapping_bytes_are_unchanged(self):
        self.assertEqual(sha((ROOT / 'scripts/build_readme_i18n.py').read_bytes()), FIXTURE['unchangedGeneratorSha256'])
        change = FIXTURE['readmeNoteChange']
        current = (ROOT / 'scripts/readme_translations.py').read_text()
        self.assertEqual(current.count(change['after']), 1)
        restored = current.replace(change['after'], change['before'])
        self.assertEqual(sha(restored.encode()), change['sourceSha256'])
        for row in COVERAGE['entries']:
            if row['category'] == 'other-locale':
                self.assertEqual(sha((ROOT / row['path']).read_bytes()), row['currentSha256'])

    def test_closeout_production_hashes_match(self):
        for path, expected in FIXTURE['fileHashes'].items():
            self.assertEqual(sha((ROOT / path).read_bytes()), expected, path)

    def test_scope_does_not_hide_reader_documents_as_agent_rules(self):
        for path in ['projects/PLAN.md', 'projects/VALIDATION.md', 'projects/README.md', 'projects/new-project/stages/01/docs/en.md']:
            self.assertEqual(classify(path), 'reader-markdown')
        self.assertEqual(classify('skills/build-project/SKILL.md'), 'agent-instructions')
        self.assertEqual(classify('projects/_template/README.md'), 'authoring-template')
        self.assertEqual(classify('projects/semantic-notes-search/examples/notes/café.md'), 'test-or-input-fixture')
        self.assertEqual(classify('i18n/fr/README.md'), 'other-locale')
        self.assertEqual(classify('i18n/zh/README.md'), 'chinese-readme-mirror')
        self.assertEqual(sum(COVERAGE['counts']['categories'].values()), 2179)

    def test_untranslated_prose_probe_detects_omissions_not_fenced_code(self):
        sentence = 'This entire human paragraph was accidentally left in English and should be reviewed.'
        self.assertEqual(prose_candidates(sentence), [sentence])
        self.assertEqual(prose_candidates('```text\n' + sentence + '\n```'), [])
        self.assertEqual(prose_candidates('这段给读者的说明已经翻译。'), [])
        rel = 'projects/VALIDATION.md'
        text = (ROOT / rel).read_text()
        changed = text.replace('## 复现命令\n', '', 1)
        self.assertNotEqual(digest(markdown_contract(text)), digest(markdown_contract(changed)))
        changed = text.replace('python3 scripts/project_test.py', 'python3 wrong.py', 1)
        self.assertNotEqual(digest(markdown_contract(text)), digest(markdown_contract(changed)))

    def test_only_explicit_local_structure_differences_are_accepted(self):
        rows = COVERAGE['reviewedStructuralDifferences']
        self.assertEqual({r['path'] for r in rows}, {'README.md', 'docs/i18n.md', 'i18n/zh/README.md'})
        preserved = [(r['path'], x['kind']) for r in COVERAGE['entries'] for x in r.get('preservedLanguageExamples', [])]
        self.assertEqual(preserved, [('docs/i18n.md', 'quoted-turkish-translation-example')])
        original = subprocess.check_output(['git', 'show', UPSTREAM + ':README.md'], cwd=ROOT).decode()
        current = (ROOT / 'README.md').read_text().split('\n## 中文增量翻译结项')[0]
        self.assertEqual(markdown_issues(original, current), [])

    def test_previous_guides_and_agent_files_stay_unchanged(self):
        old = json.loads((ROOT / 'site/fixtures/project-guides-zh.json').read_text())
        for path, row in old['documents'].items():
            self.assertEqual(sha((ROOT / path).read_bytes()), row['localizedSha256'])
        for path, expected in old['preservedFiles'].items():
            self.assertEqual(sha((ROOT / path).read_bytes()), expected)
        self.assertFalse(old['translationsScope']['agentInstructionFullTranslationRequired'])
        self.assertFalse(old['translationsScope']['agentInstructionPatchApplied'])

if __name__ == '__main__':
    unittest.main()
