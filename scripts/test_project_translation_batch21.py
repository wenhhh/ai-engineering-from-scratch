"""Verify batch21 content contracts and retained execution evidence, not learner completion."""
import ast
import base64
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest
from project_translation_contracts import (sha256, digest, manifest_contract,
    markdown_contract, reverse_prose_pairs, reverse_offset_edits)

ROOT = Path(__file__).resolve().parents[1]
FX = json.loads((ROOT / 'site/fixtures/projects-zh-batch21.json').read_text())
EV = json.loads((ROOT / 'docs/validation/2026-10-07-batch21.json').read_text())
EXPECTED = {'typed-workflow-agent-with-mastra':24, 'visual-evidence-library':24,
    'voice-note-transcriber-pipeline':33, 'web-change-brief':35, 'workflow-hooks':27}


def normalize_stream(text, work):
    text = text.replace(work, '$WORK')
    text = re.sub(r'^可读块数：此前 (\d+)，之后 (\d+)$', r'Readable blocks: \1 before, \2 after', text, flags=re.M)
    text = re.sub(r'^移除 \((\d+)\)：', r'Removed (\1): ', text, flags=re.M)
    text = re.sub(r'^新增 \((\d+)\)：', r'Added (\1): ', text, flags=re.M)
    return re.sub(r'^未变：(\d+) \| 报告：', r'Unchanged: \1 | Report: ', text, flags=re.M)


class Batch21TranslationTests(unittest.TestCase):
    def test_inventory_and_current_hashes(self):
        self.assertEqual(set(FX['projects']), set(EXPECTED))
        self.assertEqual(len(FX['files']), 174)
        self.assertEqual(len(FX['figures']), 5)
        self.assertEqual(len(EV['sourceHashes']), 179)
        for rel, row in FX['files'].items():
            self.assertEqual(sha256((ROOT / rel).read_bytes()), row['localizedSha256'], rel)
        for rel, h in EV['sourceHashes'].items():
            self.assertEqual(sha256((ROOT / rel).read_bytes()), h, rel)

    def test_full_markdown_and_unchanged_fenced_examples(self):
        docs = {p:r for p,r in FX['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(docs), 41)
        for rel, row in docs.items():
            text = (ROOT / rel).read_text()
            self.assertRegex(text, r'[\u3400-\u9fff]')
            self.assertEqual(digest(markdown_contract(text)), digest(row['contract']), rel)

    def test_markdown_mutations_fail(self):
        rel='projects/web-change-brief/stages/03-fetch-and-save/docs/en.md'
        text=(ROOT/rel).read_text(); expected=digest(FX['files'][rel]['contract'])
        for before,after in [('python3 scripts/project_test.py','python3 wrong.py'),
            ('pj-web-change-brief-3','pj-wrong'),('https://pkg.go.dev/net/http','https://invalid.example/')]:
            self.assertIn(before,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(before,after))),expected)

    def test_only_reviewed_manifest_fields_changed(self):
        for slug in FX['projects']:
            rel=f'projects/{slug}/project.json'; data=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(data),FX['files'][rel]['contract'])
            self.assertIn('（',data['title'])
            for row in data['stages']:
                self.assertRegex(row['title'],r'[\u3400-\u9fff]')
                self.assertRegex(row['summary'],r'[\u3400-\u9fff]')
            for row in data['demos']:
                self.assertIn('上游原始录屏',row['title'])

    def test_machine_manifest_mutations_are_rejected(self):
        for slug in FX['projects']:
            data=json.loads((ROOT/f'projects/{slug}/project.json').read_text()); expected=manifest_contract(data)
            for field,value in [('id','wrong'),('status','draft'),('languages',['wrong'])]:
                changed=deepcopy(data);changed[field]=value
                self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['stages'].reverse()
            self.assertNotEqual(manifest_contract(changed),expected)
        data=json.loads((ROOT/'projects/workflow-hooks/project.json').read_text())
        changed=deepcopy(data);changed['stages'][0]['concepts']=['unrelatedFunction']
        self.assertNotEqual(manifest_contract(changed),manifest_contract(data))

    def test_all_code_prose_reverses_exactly(self):
        count=0
        for rel,row in FX['files'].items():
            if row['kind']!='code-prose':continue
            original=reverse_prose_pairs((ROOT/rel).read_text(),row['replacements'])
            self.assertEqual(sha256(original.encode()),row['sourceSha256'],rel);count+=1
        self.assertEqual(count,37)

    def test_python_data_and_provider_functions_unchanged(self):
        rel='projects/visual-evidence-library/solution/main.py';row=FX['files'][rel]
        current=(ROOT/rel).read_text();original=reverse_prose_pairs(current,row['replacements'])
        names={'validate_manifest','terms','search','validate_proposal','request_vision','image_data'}
        def functions(text):
            return {n.name:ast.dump(n) for n in ast.parse(text).body if isinstance(n,ast.FunctionDef) and n.name in names}
        self.assertEqual(len(functions(current)),6)
        self.assertEqual(functions(current),functions(original))

    def test_figures_restore_exactly_and_reject_stale_edits(self):
        for row in FX['figures']:
            text=(ROOT/row['path']).read_text()
            self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            e=row['edits'][-1];start=e['afterOffset']
            with self.assertRaises(ValueError):reverse_offset_edits(text[:start]+'X'+text[start+1:],row['edits'])

    def test_original_samples_tests_and_recordings_preserved(self):
        count=0
        for rel,row in FX['files'].items():
            if row['kind'] in ('original-recording','preserved-contract'):
                self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
            count+=row['kind']=='original-recording'
        self.assertEqual(count,33)

    def test_stage_reports_support_286_executions(self):
        rows=EV['stages'];self.assertEqual(len(rows),10)
        self.assertEqual({(r['variant'],r['project']) for r in rows},
                         {(v,p) for v in ('upstream','current') for p in EXPECTED})
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            data=json.loads(row['rawReport']);project=data['projects'][0]
            self.assertEqual(project['mode'],'solution');self.assertFalse(data['certificateEligible'])
            self.assertTrue(project['allStagesPassed']);self.assertEqual(row['exit'],0)
            self.assertEqual(row['tests'],EXPECTED[row['project']]);self.assertEqual(row['skipped'],0)
            self.assertEqual(sum(s['tests'] for s in project['stages']),row['tests'])
        self.assertEqual(sum(r['tests'] for r in rows),286)

    def test_shipped_demos_are_actual_and_not_learner_qualifications(self):
        rows=EV['shippedDemos'];self.assertEqual(len(rows),10)
        self.assertEqual({(r['variant'],r['project']) for r in rows},
                         {(v,p) for v in ('upstream','current') for p in EXPECTED})
        for r in rows:
            self.assertEqual(r['exit'],0)
            self.assertEqual(sha256(r['stdout'].encode()),r['stdoutSHA256'])
            self.assertEqual(sha256(r['stderr'].encode()),r['stderrSHA256'])
            self.assertTrue(r['command'])

    def test_reference_exports_and_audio_are_complete(self):
        export=EV['referenceExports'];self.assertEqual(len(export['runs']),10)
        pairs={}
        for row in export['runs']:
            self.assertEqual(row['exit'],0)
            self.assertEqual(sha256(row['stdout'].encode()),row['stdoutSHA256'])
            self.assertEqual(sha256(row['stderr'].encode()),row['stderrSHA256'])
            for rel,item in row['files'].items():
                raw=base64.b64decode(item['base64']) if 'base64' in item else item['text'].encode()
                self.assertEqual(len(raw),item['bytes']);self.assertEqual(sha256(raw),item['sha256'])
            pairs.setdefault(row['project'],{})[row['variant']]=row
        for slug,pair in pairs.items():
            a,b=pair['upstream'],pair['current']
            self.assertEqual(normalize_stream(a['stdout'],a['work']),normalize_stream(b['stdout'],b['work']))
            self.assertEqual(a['stderr'],b['stderr']);self.assertEqual(set(a['files']),set(b['files']))
            for rel,old in a['files'].items():
                new=b['files'][rel]
                if rel.endswith('.html'):
                    text=new['text']
                    for before,after in reversed(export['uiReplacements'][slug]):text=text.replace(after,before)
                    self.assertEqual(text,old['text'])
                    self.assertIn('lang="zh-CN"',new['text'])
                else:self.assertEqual(old['sha256'],new['sha256'])
        voice=pairs['voice-note-transcriber-pipeline']['current']['files']
        report=json.loads(voice['out/transcript.json']['text'])
        self.assertEqual(report['audio_sha256'],voice['out/audio.wav']['sha256'])
        self.assertIn('no speech recognition ran',report['method'])

    def test_workspace_expected_failure_and_preservation(self):
        self.assertEqual(len(EV['workspaces']),5)
        for row in EV['workspaces']:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertFalse(row['certificateEligible']);self.assertTrue(row['reinitializationPreservesEdit'])
            self.assertGreater(row['actualTests'],0);self.assertEqual(row['skipped'],0)
            self.assertFalse(json.loads(row['rawReport'])['projects'][0]['allStagesPassed'])

    def test_limits_and_optional_framework_are_not_overclaimed(self):
        self.assertFalse(EV['optionalSDK']['frameworkExecuted'])
        self.assertEqual(EV['optionalSDK']['exit'],1)
        self.assertIn('missing dependency node:@mastra/core',EV['optionalSDK']['rawLog'])
        self.assertTrue(all(value is False for value in EV['limits'].values()))
        for slug,note in FX['preservedMachineNotes'].items():
            self.assertIn(note,(ROOT/f'projects/{slug}/README.md').read_text())
        for slug,note in FX['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'projects/{slug}/README.md').read_text())
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())

    def test_baseline_and_page_probe_evidence_is_retained(self):
        baseline=EV['webBaselineProbe'];self.assertEqual(len(baseline['runs']),2)
        for row in baseline['runs']:
            self.assertEqual(row['exit'],0)
            self.assertEqual(sha256(baseline['testSource'].encode()),row['testSHA256'])
            self.assertIn('alias=false changed_without_accept=false',row['stdout'])
            self.assertIn('alias=true changed_without_accept=true',row['stdout'])
        self.assertEqual(baseline['totalLoopbackRequests'],4)
        for row in EV['pageProbe']['runs']:
            self.assertEqual(sha256(row['script'].encode()),row['scriptSHA256'])
            self.assertTrue(row['embeddedAudioMatches'])
            self.assertEqual(row['seekPositions'],row['invokedPlayPositions'])
            self.assertFalse(row['actualAudioPlaybackPerformed'])

if __name__=='__main__':
    unittest.main()
