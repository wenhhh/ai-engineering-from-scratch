"""Structural checks for shared project UI; not browser visual certification."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / 'site/fixtures/project-ui-zh.json').read_text())

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def reverse(text, edits):
    for edit in reversed(edits):
        for at in reversed(edit['afterOffsets']):
            after = edit['after']
            if text[at:at + len(after)] != after:
                raise ValueError('display edit no longer matches')
            text = text[:at] + edit['before'] + text[at + len(after):]
    return text

def original(relative):
    row = next(r for r in FIXTURE['files'] if r['path'] == relative)
    return reverse((ROOT / relative).read_text(), row['edits'])

class Markup(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes = []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        self.nodes.append((tag, dict(attrs)))

class SharedProjectUITranslationTests(unittest.TestCase):
    def test_all_six_production_sources_match_registered_hashes(self):
        self.assertEqual(len(FIXTURE['files']), 5)
        for row in FIXTURE['files']:
            self.assertEqual(sha((ROOT / row['path']).read_bytes()), row['localizedSha256'], row['path'])
        new = FIXTURE['newSource']
        self.assertEqual(new['path'], 'site/project-ui.js')
        self.assertEqual(sha((ROOT / new['path']).read_bytes()), new['sha256'])

    def test_every_edit_restores_the_exact_prior_source(self):
        for row in FIXTURE['files']:
            text = (ROOT / row['path']).read_text()
            restored = reverse(text, row['edits'])
            self.assertEqual(sha(restored.encode()), row['sourceSha256'], row['path'])
            edit = row['edits'][-1]
            at = edit['afterOffsets'][0]
            with self.assertRaises(ValueError):
                reverse(text[:at] + '\u0000' + text[at+1:], row['edits'])

    def test_original_english_regression_tests_are_not_rewritten(self):
        self.assertEqual(len(FIXTURE['unchangedLegacyTests']), 3)
        for rel, digest in FIXTURE['unchangedLegacyTests'].items():
            self.assertEqual(sha((ROOT / rel).read_bytes()), digest, rel)

    def test_html_commands_code_tokens_and_navigation_destinations_are_preserved(self):
        for rel in ['site/project.html', 'site/projects.html']:
            before, after = original(rel), (ROOT / rel).read_text()
            self.assertEqual(re.findall(r'<pre[^>]*><code>(.*?)</code></pre>', before, re.S),
                             re.findall(r'<pre[^>]*><code>(.*?)</code></pre>', after, re.S))
            self.assertEqual(sorted(re.findall(r'<code>(.*?)</code>', before, re.S)),
                             sorted(re.findall(r'<code>(.*?)</code>', after, re.S)))
            old, new = Markup(before).nodes, Markup(after).nodes
            self.assertEqual([(tag, a.get('href')) for tag,a in old if 'href' in a],
                             [(tag, a.get('href')) for tag,a in new if 'href' in a])
            self.assertEqual([a['id'] for _,a in old if 'id' in a],
                             [a['id'] for _,a in new if 'id' in a and a['id'] != 'pjTranslationNotice'])
            self.assertEqual([a['class'] for _,a in old if 'class' in a],
                             [a['class'] for _,a in new if 'class' in a])

    def test_scripts_keep_order_and_only_add_metadata_and_locale(self):
        for rel in ['site/project.html', 'site/projects.html']:
            old, new = Markup(original(rel)).nodes, Markup((ROOT / rel).read_text()).nodes
            scripts = lambda nodes: [a['src'].split('?')[0] for tag,a in nodes if tag == 'script' and 'src' in a]
            prior, current = scripts(old), scripts(new)
            added = ['project-ui.js'] + (['build-meta.js'] if rel.endswith('/projects.html') else [])
            self.assertEqual([s for s in current if s not in added], prior)
            self.assertLess(current.index('build-meta.js'), current.index('project-ui.js'))
            self.assertLess(current.index('project-ui.js'), current.index('projects.js'))

    def test_validator_and_storage_functions_stay_byte_exact(self):
        rel = 'site/project-certificates.js'
        extract = lambda text: text[text.index('  function validate('):text.index('  function escape(')]
        self.assertEqual(extract(original(rel)), extract((ROOT / rel).read_text()))
        before, after = original('site/projects.js'), (ROOT / 'site/projects.js').read_text()
        def function(text, name):
            start = text.index('  function ' + name + '(')
            match = re.search(r'\n  (?:async )?function ', text[start+1:])
            return text[start:start+1+match.start()]
        for name in ['readStore','writeStore','setTheme','initTheme','progressFor','setStageDone',
                     'repoFileUrl','contentUrl','projectHref','totalHours','fallbackCopy','normalizePath','loadFigures']:
            self.assertEqual(function(before,name), function(after,name), name)
        for key in ['aifs.projects.progress.v1','aifs.projects.source.v1']:
            self.assertEqual(before.count(key),after.count(key))

    def test_runtime_numeric_parameters_and_machine_attributes_are_unchanged(self):
        rel = 'site/figures/projects/runtime.js'
        before, after = original(rel), (ROOT / rel).read_text()
        self.assertEqual(re.findall(r'\d+',before),re.findall(r'\d+',after))
        for token in ['config.calculate(values, step ? step() : 0)', "type === 'checkbox'", "data-item-id", "data-lane-id", 'revision++', 'disposeRoot', 'JSON.stringify(result.receipt, null, 2)']:
            self.assertEqual(before.count(token),after.count(token),token)

    def test_52_planned_labels_are_display_only_and_do_not_change_roadmap(self):
        self.assertEqual(len(FIXTURE['plannedLabels']),52)
        self.assertEqual(len({r['id'] for r in FIXTURE['plannedLabels']}),52)
        for row in FIXTURE['plannedLabels']:
            self.assertRegex(row['localizedTitle'],r'[\u3400-\u9fff]')
            self.assertRegex(row['localizedTagline'],r'[\u3400-\u9fff]')
        original_roadmap = FIXTURE['unchangedRoadmap']
        self.assertEqual(sha((ROOT / original_roadmap['path']).read_bytes()), original_roadmap['sha256'])

    def test_all_1969_prior_content_receipts_still_match(self):
        sync = json.loads((ROOT / 'i18n/zh-upstream-sync.json').read_text())
        rows = [r for key in ['completedLessonFiles','completedAssessmentFiles','completedSupportFiles','completedProjectFiles'] for r in sync[key]]
        self.assertEqual(len(rows),1969)
        for row in rows:
            self.assertEqual(sha((ROOT / row['path']).read_bytes()),row['localizedSha256'],row['path'])
        self.assertEqual(len(sync['completedProjects']),48)
        self.assertEqual(sync['pendingProjects'],[])

    def test_locale_catalog_is_explicit_and_retains_unverified_evidence_boundary(self):
        text = (ROOT / 'site/project-ui.js').read_text()
        start = text.index('  var zh = ') + len('  var zh = ')
        stop = text.index(';\n  function create',start)
        catalog = json.loads(text[start:stop])
        self.assertGreaterEqual(len(catalog),223)
        self.assertIn('未经监考或独立核实',catalog['</p><small>Independent community course. Based on a learner-provided local grader report; not a proctored, independently verified, or vendor credential.</small><p>Curriculum fingerprint: <code>'])
        self.assertIn('Object.prototype.hasOwnProperty.call(zh, value)',text)
        self.assertIn('仍需单独验收',text)
        self.assertIn('new Set(all).size !== all.length',text)
        self.assertIn('all.length !== ids.length',text)

if __name__ == '__main__':
    unittest.main()
