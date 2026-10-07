"""Check display scope and unchanged grading/content; no live services or browser profile."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / 'site/fixtures/certification-ui-zh.json').read_text())
PATTERN = r'(<!-- GENERATED:CERTIFICATION-DISCOVERY:START -->)[\s\S]*?(<!-- GENERATED:CERTIFICATION-DISCOVERY:END -->)'

def sha(raw):
    return hashlib.sha256(raw.encode() if isinstance(raw, str) else raw).hexdigest()

def projected(relative, source):
    return re.sub(PATTERN, r'\1\n<generated-discovery>\n\2', source) if relative == 'site/certifications.html' else source

def restored(row, source):
    text = projected(row['path'], source)
    for before, after, count in reversed(row['pairs']):
        if text.count(after) != count:
            raise ValueError('stale or ambiguous source edit')
        text = text.replace(after, before)
    return text

def function(source, name):
    marker = '  function ' + name + '('
    start = source.index(marker)
    return source[start:source.index('\n  function ', start + len(marker))]

class CertificationUITranslationTests(unittest.TestCase):
    def test_six_owned_source_hashes(self):
        self.assertEqual(len(FIXTURE['files']), 6)
        for row in FIXTURE['files']:
            text = (ROOT / row['path']).read_text()
            self.assertEqual(sha(projected(row['path'], text)), row['localizedSha256'], row['path'])

    def test_all_edits_reverse_and_reject_stale_mutation(self):
        for row in FIXTURE['files']:
            if row['sourceSha256'] is None:
                continue
            text = (ROOT / row['path']).read_text()
            self.assertEqual(sha(restored(row, text)), row['sourceSha256'])
            marker = row['pairs'][-1][1]
            self.assertIn(marker, text)
            with self.assertRaises(ValueError):
                restored(row, text.replace(marker, '<stale-source>', 1))

    def test_projection_excludes_only_generated_discovery(self):
        relative = 'site/certifications.html'
        source = (ROOT / relative).read_text()
        self.assertEqual(len(re.findall(PATTERN, source)), 1)
        changed = re.sub(PATTERN, r'\1 anything generated \2', source)
        self.assertEqual(projected(relative, source), projected(relative, changed))
        changed = source.replace('certification-ui.js', 'other-ui.js')
        self.assertNotEqual(projected(relative, source), projected(relative, changed))
        self.assertEqual(projected('site/assessment.html', source), source)

    def test_17_scoring_navigation_and_submission_functions_unchanged(self):
        source = (ROOT / 'site/certifications.js').read_text()
        self.assertEqual(len(FIXTURE['unchangedFunctions']), 17)
        for name, expected in FIXTURE['unchangedFunctions'].items():
            self.assertEqual(sha(function(source, name)), expected, name)

    def test_progress_storage_and_old_regression_files_unchanged(self):
        self.assertEqual(len(FIXTURE['unchangedFiles']), 5)
        for relative, expected in FIXTURE['unchangedFiles'].items():
            self.assertEqual(sha((ROOT / relative).read_bytes()), expected, relative)

    def test_all_1975_prior_content_and_shared_ui_receipts_match(self):
        rows = FIXTURE['priorReceipts']
        self.assertEqual(len(rows), 1975)
        self.assertEqual(len({r['path'] for r in rows}), 1975)
        for row in rows:
            self.assertEqual(sha((ROOT / row['path']).read_bytes()), row['localizedSha256'], row['path'])

    def test_all_certification_json_including_answer_keys_remain_unchanged(self):
        rows = FIXTURE['unchangedCertificationJsonFiles']
        self.assertEqual(len(rows), 116)
        for relative, expected in rows.items():
            self.assertEqual(sha((ROOT / relative).read_bytes()), expected, relative)
        banks = [p for p in rows if '/assessments/' in p]
        self.assertEqual(len(banks), 12)
        self.assertEqual(sum(len(json.loads((ROOT / p).read_text())['questions']) for p in banks), 505)

    def test_page_scripts_keep_order_and_preserve_non_script_destinations(self):
        for row in FIXTURE['files']:
            if not row['path'].endswith('.html'):
                continue
            current = projected(row['path'], (ROOT / row['path']).read_text())
            original = restored(row, (ROOT / row['path']).read_text())
            get = lambda s: re.findall(r'<script\b[^>]*\bsrc="([^"]+)"', s)
            scripts = get(current)
            self.assertEqual([x for x in scripts if not x.startswith('certification-ui.js')], get(original))
            locale = next(i for i,x in enumerate(scripts) if x.startswith('certification-ui.js'))
            consumer = next(i for i,x in enumerate(scripts) if x.startswith('certifications.js'))
            self.assertLess(locale, consumer)
            self.assertEqual(Counter(re.findall(r'\bhref="([^"]+)"', current)), Counter(re.findall(r'\bhref="([^"]+)"', original)))
            self.assertEqual(re.findall(r'<code>([\s\S]*?)</code>', current), re.findall(r'<code>([\s\S]*?)</code>', original))

    def test_timer_fix_has_recorded_original_failure_and_no_scoring_edits(self):
        timer = FIXTURE['timer']
        self.assertEqual(function((ROOT / 'site/certifications.js').read_text(), 'startTimer'), timer['current'])
        self.assertIn('    tick();\n    assessmentTimer = setInterval(tick, 1000);', timer['original'])
        self.assertIn('    assessmentTimer = setInterval(tick, 1000);\n    tick();', timer['current'])
        before, after = timer['originalBugEvidence']['before'], timer['originalBugEvidence']['after']
        self.assertEqual(before, {'attempts': 1, 'intervals': 1})
        self.assertEqual(after, {'attempts': 2, 'intervals': 0})
        self.assertEqual(timer['current'].count('submitAssessment('), 1)

    def test_display_scope_uses_shared_locale_and_retains_unpublished_flags(self):
        source = (ROOT / 'site/certifications.js').read_text()
        self.assertIn("unpublished(track, 'itemCountPublished')", source)
        self.assertIn("unpublished(track, 'passingScorePublished')", source)
        self.assertIn('window.AIFSCertificationUI.formatDate(value)', source)
        module = (ROOT / 'site/certification-ui.js').read_text()
        self.assertIn("options.timeZone = 'UTC'", module)
        self.assertIn("typeof value === 'string'", module)
        self.assertNotIn('localStorage', module)
        self.assertNotIn('fetch(', module)
        self.assertNotIn('recordAttempt', module)

if __name__ == '__main__':
    unittest.main()
