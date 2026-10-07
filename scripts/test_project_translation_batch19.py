"""Protect batch19 source contracts and actual evidence, without claiming production safety."""
import ast
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import unittest
from project_translation_contracts import (sha256,digest,manifest_contract,markdown_contract,reverse_prose_pairs,reverse_offset_edits)
ROOT=Path(__file__).resolve().parents[1]
FX=json.loads((ROOT/'site/fixtures/projects-zh-batch19.json').read_text())
E=json.loads((ROOT/'docs/validation/2026-10-07-batch19.json').read_text())
EXPECTED={'skill-installer':23,'skill-router':30,'skill-scanner':20,'skill-validator':24}

class Batch19TranslationTests(unittest.TestCase):
    def test_inventory_and_all_final_source_hashes(self):
        self.assertEqual(len(FX['files']),141)
        self.assertEqual(len(FX['figures']),4)
        self.assertEqual(set(FX['projects']),set(EXPECTED))
        for rel,row in FX['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)
        self.assertEqual(len(E['sourceHashes']),145)
        for rel,value in E['sourceHashes'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),value,rel)

    def test_complete_markdown_retains_full_structure_and_code(self):
        rows={p:r for p,r in FX['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(rows),28)
        for rel,row in rows.items():
            text=(ROOT/rel).read_text()
            self.assertRegex(text,r'[\u3400-\u9fff]')
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)

    def test_only_known_manifest_display_fields_change(self):
        for slug in EXPECTED:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(data),FX['files'][rel]['contract'])
            for s in data['stages']:self.assertRegex(s['title'],r'[\u3400-\u9fff]')
            for item in data['demos']:self.assertIn('上游原始录屏',item['title'])

    def test_contract_rejects_changed_machine_metadata(self):
        for slug in EXPECTED:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text());expected=manifest_contract(data)
            for field,value in [('id','wrong'),('status','draft'),('languages',['wrong'])]:
                changed=deepcopy(data);changed[field]=value
                self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['stages'].reverse()
            self.assertNotEqual(manifest_contract(changed),expected)
        data=json.loads((ROOT/'projects/skill-router/project.json').read_text())
        changed=deepcopy(data);changed['stages'][0]['concepts']=['differentFunction']
        self.assertNotEqual(manifest_contract(changed),manifest_contract(data))

    def test_markdown_mutations_do_not_pass(self):
        rel='projects/skill-installer/stages/01-bundle/docs/en.md'
        text=(ROOT/rel).read_text();expected=digest(FX['files'][rel]['contract'])
        for a,b in [('`safePath, validate`','`altered`'),('pj-skill-installer-1','pj-invalid'),('python3 scripts/project_test.py','python3 fake.py')]:
            self.assertIn(a,text);self.assertNotEqual(digest(markdown_contract(text.replace(a,b))),expected)

    def test_all_code_edits_reverse_to_pinned_source(self):
        count=0
        for rel,row in FX['files'].items():
            if row['kind']!='code-prose':continue
            count+=1;text=(ROOT/rel).read_text();source=reverse_prose_pairs(text,row['replacements'])
            self.assertEqual(sha256(source.encode()),row['sourceSha256'],rel)
            if rel.endswith('.py'):self.assertEqual(ast.dump(ast.parse(text)),ast.dump(ast.parse(source)))
        self.assertEqual(count,36)

    def test_actual_figure_sources_restore_and_detect_stale_edits(self):
        for row in FX['figures']:
            text=(ROOT/row['path']).read_text();self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            first=row['edits'][0];start=first['afterOffset'];bad=text[:start]+'X'+text[start+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(bad,row['edits'])

    def test_original_samples_tests_and_media_stay_byte_exact(self):
        media=0
        for rel,row in FX['files'].items():
            if row['kind'] in ('preserved-contract','original-recording'):
                self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
            media+=row['kind']=='original-recording'
        self.assertEqual(media,24)

    def test_raw_stage_reports_support_the_counts(self):
        rows=E['stages'];self.assertEqual(len(rows),8)
        self.assertEqual({(r['variant'],r['project']) for r in rows},{(v,p) for v in ('upstream','current') for p in EXPECTED})
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            data=json.loads(row['rawReport']);p=data['projects'][0]
            self.assertTrue(p['allStagesPassed']);self.assertEqual(p['mode'],'solution')
            self.assertFalse(data['certificateEligible']);self.assertEqual(row['tests'],EXPECTED[row['project']])
            self.assertEqual(sum(s['tests'] for s in p['stages']),row['tests'])
            self.assertEqual(sum(s['skippedTests'] for s in p['stages']),0)
        self.assertEqual(sum(r['tests'] for r in rows),194)

    def test_cli_raw_outputs_and_artifacts_are_comparable(self):
        rows=E['cli']['runs'];self.assertEqual(len(rows),64);pairs={}
        for row in rows:
            for stream in ('stdout','stderr'):self.assertEqual(sha256(row[stream].encode()),row[stream+'SHA256'])
            for rel,file in row['files'].items():
                self.assertEqual(sha256(file['text'].encode()),file['sha256'])
                self.assertEqual(len(file['text'].encode()),file['bytes'])
            self.assertIn('/.git/zh-sync-20261007-batch19/cli-checks-final/',row['cwd'])
            self.assertEqual(row['rootNormalization'],{row['cwd']:'<batch-workdir>'})
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        self.assertEqual(len(pairs),32)
        for key,pair in pairs.items():
            a,b=pair['upstream'],pair['current'];self.assertEqual(a['exit'],b['exit'])
            self.assertEqual(a['files'],b['files'],key)
            for stream in ('stdout','stderr'):
                self.assertEqual(a[stream].replace(a['cwd'],'<batch-workdir>'),b[stream].replace(b['cwd'],'<batch-workdir>'),key)

    def test_failed_upgrade_keeps_edit_and_metadata_scope_is_visible(self):
        rows=[r for r in E['cli']['runs'] if r['variant']=='current' and r['project']=='skill-installer']
        for name,marker in [('local-edit','LOCAL EDIT MUST REMAIN'),('unmanaged','UNMANAGED FILE MUST REMAIN')]:
            row=next(r for r in rows if r['scenario']==name)
            self.assertEqual(row['exit'],1)
            self.assertTrue(any(marker in f['text'] for f in row['files'].values()))
        for name in ('wrong-digest','unsafe-path'):
            row=next(r for r in rows if r['scenario']==name);self.assertEqual(row['files'],{})
        self.assertEqual(next(r for r in rows if r['scenario']=='metadata-only')['exit'],0)
        for slug,note in FX['preservedMachineNotes'].items():self.assertIn(note,(ROOT/'projects'/slug/'README.md').read_text())
        for slug,note in FX['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())
            for p in (ROOT/'projects'/slug/'stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())

    def test_cross_project_consumers_and_no_actual_agent_activation(self):
        rows=E['cli']['auxiliaryExecutions'];self.assertEqual(len(rows),10)
        self.assertEqual(sum(r['project']=='cross-project' for r in rows),6)
        for row in rows:
            self.assertEqual(row['exit'],0)
            for stream in ('stdout','stderr'):self.assertEqual(sha256(row[stream].encode()),row[stream+'SHA256'])
            self.assertIn('/.git/zh-sync-20261007-batch19/cli-checks-final/',row['cwd'])
        self.assertTrue(all(v is False for v in E['limits'].values()))

    def test_new_workspaces_preserve_edits_without_certificates(self):
        self.assertEqual(len(E['workspaces']),4)
        for row in E['workspaces']:
            self.assertFalse(row['certificateEligible']);self.assertTrue(row['reinitializationPreservesEdit'])
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            report=json.loads(row['rawReport']);self.assertFalse(report['certificateEligible'])
            self.assertFalse(report['projects'][0]['allStagesPassed'])
            self.assertGreater(row['actualTests'],0);self.assertEqual(row['skipped'],0)

if __name__=='__main__':unittest.main()
