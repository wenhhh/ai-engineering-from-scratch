"""Protect full prose, fixed source contracts and recorded execution evidence."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import unittest
from project_translation_contracts import (sha256,digest,manifest_contract,
    markdown_contract,reverse_prose_pairs,reverse_offset_edits)
ROOT=Path(__file__).resolve().parents[1]
FX=json.loads((ROOT/'site/fixtures/projects-zh-batch18.json').read_text())
EVIDENCE=ROOT/'docs/validation/2026-10-07-batch18.json'

class Batch18TranslationTests(unittest.TestCase):
    def test_inventory_and_current_hashes(self):
        self.assertEqual(len(FX['projects']),4);self.assertEqual(len(FX['files']),122)
        for rel,row in FX['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)

    def test_complete_markdown_contracts(self):
        docs={p:r for p,r in FX['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(docs),26)
        for rel,row in docs.items():
            text=(ROOT/rel).read_text();self.assertRegex(text,r'[\u3400-\u9fff]')
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)

    def test_manifest_only_display_changes(self):
        for slug in FX['projects']:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(data),FX['files'][rel]['contract'])
            self.assertIn('（',data['title'])
            for demo in data['demos']:self.assertIn('上游原始录屏',demo['title'])
            for s in data['stages']:self.assertRegex(s['title'],r'[\u3400-\u9fff]')

    def test_machine_metadata_mutations_are_rejected(self):
        for slug in FX['projects']:
            data=json.loads((ROOT/f'projects/{slug}/project.json').read_text());expected=manifest_contract(data)
            for key,value in [('id','changed'),('status','draft'),('languages',['wrong'])]:
                changed=deepcopy(data);changed[key]=value;self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['stages'].reverse();self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['demo']['command'].append('--wrong');self.assertNotEqual(manifest_contract(changed),expected)
        data=json.loads((ROOT/'projects/rust-agent-shell/project.json').read_text());changed=deepcopy(data)
        changed['stages'][0]['concepts']=['unsafe_extra_action'];self.assertNotEqual(manifest_contract(changed),manifest_contract(data))

    def test_markdown_machine_references_are_protected(self):
        p=ROOT/'projects/rust-agent-shell/README.md';text=p.read_text();original=digest(markdown_contract(text))
        for before,after in [('python3 scripts/project_test.py','python3 wrong.py'),('https://doc.rust-lang.org/std/path/struct.Path.html','https://invalid.example'),('`schema_version: 1`','`schema_version: 2`')]:
            self.assertIn(before,text);self.assertNotEqual(digest(markdown_contract(text.replace(before,after))),original)

    def test_source_prose_edits_reverse_exactly(self):
        rows={p:r for p,r in FX['files'].items() if r['kind']=='code-prose'};self.assertEqual(len(rows),23)
        for rel,row in rows.items():
            text=(ROOT/rel).read_text();old=reverse_prose_pairs(text,row['replacements'])
            self.assertEqual(sha256(old.encode()),row['sourceSha256'],rel)
            if rel.endswith('.py'):
                def core(src):
                    tree=ast.parse(src)
                    for node in ast.walk(tree):
                        if isinstance(node,(ast.Module,ast.FunctionDef,ast.ClassDef,ast.AsyncFunctionDef)) and node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):node.body.pop(0)
                    return ast.dump(tree)
                self.assertEqual(core(text),core(old),rel)

    def test_figures_restore_and_reject_stale_edits(self):
        self.assertEqual(len(FX['figures']),4)
        for row in FX['figures']:
            text=(ROOT/row['path']).read_text();self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            start=row['edits'][0]['afterOffset'];changed=text[:start]+'X'+text[start+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(changed,row['edits'])

    def test_source_samples_and_original_media_are_not_translated(self):
        media=0
        for rel,row in FX['files'].items():
            if row['kind'] in ['original-recording','preserved-contract']:
                self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
            media+=row['kind']=='original-recording'
        self.assertEqual(media,24)
        self.assertEqual(FX['files']['projects/semantic-notes-search/examples/notes/café.md']['kind'],'preserved-contract')

    def test_scope_notes_are_visible_at_each_relevant_entry(self):
        for slug,note in FX['preservedMachineNotes'].items():self.assertIn(note,(ROOT/f'projects/{slug}/README.md').read_text())
        for slug,note in FX['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())
            for p in (ROOT/f'projects/{slug}/stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())
        self.assertIn(FX['supportWarning'],(ROOT/'projects/self-improving-skill-loop/stages/03-propose/docs/en.md').read_text())
        self.assertIn(FX['datasetNote'],(ROOT/'projects/self-improving-skill-loop/stages/01-dataset/docs/en.md').read_text())

    def test_execution_evidence_supports_208_reference_tests(self):
        r=json.loads(EVIDENCE.read_text());expected={'rust-agent-shell':32,'sandbox-ladder':20,'self-improving-skill-loop':25,'semantic-notes-search':27}
        self.assertEqual(len(r['stageRuns']),8);self.assertEqual({(v['variant'],v['project']) for v in r['stageRuns']},{(v,p) for v in ['upstream','current'] for p in expected})
        for row in r['stageRuns']:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256']);self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            data=json.loads(row['rawReport']);p=data['projects'][0];self.assertEqual(p['mode'],'solution');self.assertFalse(data['certificateEligible']);self.assertTrue(p['allStagesPassed'])
            self.assertEqual(sum(s['tests'] for s in p['stages']),expected[row['project']]);self.assertEqual(sum(s['skippedTests'] for s in p['stages']),0)
        self.assertEqual(sum(x['tests'] for x in r['stageRuns']),208)
        for rel,h in r['finalSourceHashes'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),h,rel)

    def test_64_cli_streams_and_complete_artifacts_match(self):
        r=json.loads(EVIDENCE.read_text());cli=r['cli'];self.assertEqual(len(cli['runs']),64);self.assertEqual(len(cli['comparisons']),32)
        pairs={}
        for row in cli['runs']:
            for stream in ['stdout','stderr']:self.assertEqual(sha256(row[stream].encode()),row[stream+'Sha256'])
            for rel,item in row['files'].items():self.assertEqual(sha256(item['text'].encode()),item['sha256']);self.assertEqual(len(item['text'].encode()),item['bytes'])
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        for pair in pairs.values():
            self.assertEqual(set(pair),{'upstream','current'});a,b=pair['upstream'],pair['current']
            self.assertEqual((a['exit'],a['stdout'],a['files']),(b['exit'],b['stdout'],b['files']))
            if a['stderr']!=b['stderr']:
                self.assertNotEqual(a['exit'],0);self.assertEqual(a['stderr'].strip().splitlines()[-1],b['stderr'].strip().splitlines()[-1])
        self.assertTrue(cli['inputFilesUnchanged']);self.assertFalse(cli['dockerExecuted']);self.assertFalse(cli['networkRequestsMade'])

    def test_workspace_failures_and_reinitialization_have_evidence(self):
        rows=json.loads(EVIDENCE.read_text())['workspaces'];self.assertEqual(len(rows),4)
        for row in rows:
            self.assertTrue(row['reinitializationPreservesEdit']);self.assertFalse(row['certificateEligible']);self.assertGreater(row['actualTests'],0);self.assertEqual(row['skipped'],0)
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256']);self.assertEqual(sha256(row['rawLog'].encode()),row['logSha256'])
            report=json.loads(row['rawReport']);self.assertFalse(report['certificateEligible']);self.assertFalse(report['projects'][0]['allStagesPassed'])

    def test_native_probes_and_limits_are_not_overclaimed(self):
        r=json.loads(EVIDENCE.read_text());self.assertEqual(len(r['nativeProbes']),2)
        for x in r['nativeProbes']:
            self.assertEqual(x['compileExit'],0);self.assertEqual(x['exit'],0);self.assertEqual(x['stdin'],'read\npwd extra\nquit\n')
            self.assertEqual([json.loads(line)['kind'] for line in x['stdout'].splitlines()],['rejected','rejected','ok'])
        self.assertEqual(r['nativeProbes'][0]['stdout'],r['nativeProbes'][1]['stdout'])
        for k,v in r['limits'].items():self.assertIs(v,k=='testsUseReferenceSolutions',k)

if __name__=='__main__':unittest.main()
