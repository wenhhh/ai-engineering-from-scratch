"""Protect batch16 translation boundaries and verify preserved local execution receipts."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest
from project_translation_contracts import (sha256, digest, manifest_contract,
    markdown_contract, reverse_prose_pairs, reverse_offset_edits)

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch16.json').read_text())
RECEIPT=ROOT/'docs/validation/2026-10-07-batch16.json'
COUNTS={'multi-agent-code-review-panel':30,'postmortem-writer':29,
        'pr-review-reporter':33,'prompt-regression-tester':25}

class Batch16TranslationTests(unittest.TestCase):
    def test_all_registered_files_match_current_hashes(self):
        self.assertEqual(len(FIXTURE['files']),143)
        for rel,row in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)

    def test_complete_markdown_preserves_code_links_and_structure(self):
        docs={p:r for p,r in FIXTURE['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(docs),33)
        for rel,row in docs.items():
            text=(ROOT/rel).read_text()
            self.assertRegex(text,r'[\u3400-\u9fff]')
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)

    def test_manifests_change_only_reviewed_display_fields(self):
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';obj=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(obj),FIXTURE['files'][rel]['contract'])
            self.assertIn('（',obj['title'])
            for stage in obj['stages']:
                self.assertRegex(stage['title'],r'[\u3400-\u9fff]')
                self.assertRegex(stage['summary'],r'[\u3400-\u9fff]')
            for demo in obj['demos']:self.assertIn('上游原始录屏',demo['title'])

    def test_machine_metadata_mutations_are_rejected(self):
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';obj=json.loads((ROOT/rel).read_text());expected=manifest_contract(obj)
            mutations=[]
            for key,value in [('id','wrong'),('status','planned'),('languages',['wrong'])]:
                other=deepcopy(obj);other[key]=value;mutations.append(other)
            other=deepcopy(obj);other['stages'].reverse();mutations.append(other)
            other=deepcopy(obj);other['demo']['command'].append('--altered');mutations.append(other)
            for other in mutations:self.assertNotEqual(manifest_contract(other),expected)
        for slug in ['multi-agent-code-review-panel','pr-review-reporter']:
            obj=json.loads((ROOT/f'projects/{slug}/project.json').read_text());other=deepcopy(obj)
            other['stages'][0]['concepts']=['modifiedFunction']
            self.assertNotEqual(manifest_contract(obj),manifest_contract(other))

    def test_markdown_command_and_link_mutations_are_detected(self):
        rel='projects/pr-review-reporter/stages/01-diff-lines/docs/en.md';text=(ROOT/rel).read_text()
        expected=digest(FIXTURE['files'][rel]['contract'])
        for a,b in [('`parseDiff`','`parseSomethingElse`'),('pj-pr-review-reporter-1','pj-wrong-1'),
                    ('python3 scripts/project_test.py','python3 other.py'),
                    ('https://git-scm.com/docs/diff-format','https://invalid.example/')]:
            self.assertIn(a,text);self.assertNotEqual(digest(markdown_contract(text.replace(a,b))),expected)

    def test_code_changes_reverse_to_exact_upstream_bytes(self):
        count=0
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose':continue
            text=(ROOT/rel).read_text();original=reverse_prose_pairs(text,row['replacements'])
            self.assertEqual(sha256(original.encode()),row['sourceSha256'],rel);count+=1
            self.assertNotEqual(sha256((original+'\nchanged = 1\n').encode()),row['sourceSha256'])
        self.assertEqual(count,32)

    def test_python_algorithms_retain_identical_executable_ast(self):
        class StripDocstrings(ast.NodeTransformer):
            def visit_Module(self,node):
                self.generic_visit(node)
                if node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):
                    node.body.pop(0)
                return node
        for rel in ['projects/pr-review-reporter/solution/diff_parser.py','projects/prompt-regression-tester/solution/main.py']:
            row=FIXTURE['files'][rel];text=(ROOT/rel).read_text();original=reverse_prose_pairs(text,row['replacements'])
            self.assertEqual(ast.dump(StripDocstrings().visit(ast.parse(text))),ast.dump(StripDocstrings().visit(ast.parse(original))))
        rel='projects/prompt-regression-tester/solution/cli.py';row=FIXTURE['files'][rel]
        text=(ROOT/rel).read_text();original=reverse_prose_pairs(text,row['replacements'])
        def functions(s):
            return {n.name:ast.dump(n) for n in ast.parse(s).body if isinstance(n,ast.FunctionDef) and n.name!='main'}
        self.assertEqual(functions(text),functions(original))

    def test_figure_offsets_and_calculation_text_cannot_drift(self):
        self.assertEqual(len(FIXTURE['figures']),4)
        for row in FIXTURE['figures']:
            text=(ROOT/row['path']).read_text()
            self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            e=row['edits'][0];changed=text[:e['afterOffset']]+'X'+text[e['afterOffset']+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(changed,row['edits'])

    def test_original_recordings_samples_and_tests_remain_unchanged(self):
        media=0
        for rel,row in FIXTURE['files'].items():
            if row['kind'] in ['original-recording','preserved-contract']:
                self.assertEqual(row['localizedSha256'],row['sourceSha256'],rel)
            media+=row['kind']=='original-recording'
        self.assertEqual(media,24)

    def test_visible_scope_notes_remain_next_to_each_lab(self):
        for slug,note in FIXTURE['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())
            for p in (ROOT/f'projects/{slug}/stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())
        for slug,note in FIXTURE['preservedMachineNotes'].items():
            self.assertIn(note,(ROOT/f'projects/{slug}/README.md').read_text())

    def test_sealed_stage_reports_support_final_acceptance_counts(self):
        receipt=json.loads(RECEIPT.read_text());rows=receipt['stageRuns'];self.assertEqual(len(rows),8)
        self.assertEqual({(r['variant'],r['project']) for r in rows},{(v,p) for v in ['upstream','current'] for p in COUNTS})
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            report=json.loads(row['rawReport']);project=report['projects'][0]
            self.assertFalse(report['certificateEligible']);self.assertEqual(project['mode'],'solution')
            self.assertTrue(project['allStagesPassed']);self.assertEqual(row['exit'],0)
            self.assertEqual(sum(s['tests'] for s in project['stages']),COUNTS[row['project']])
            self.assertEqual(sum(s['skippedTests'] for s in project['stages']),0)
        self.assertEqual(sum(r['tests'] for r in rows),234)
        self.assertEqual(len(receipt['finalSourceHashes']),147)
        for rel,h in receipt['finalSourceHashes'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),h,rel)

    def test_cli_raw_streams_and_all_exported_artifacts(self):
        receipt=json.loads(RECEIPT.read_text());cli=receipt['cli'];self.assertEqual(len(cli['runs']),64)
        self.assertEqual(len(cli['comparisons']),32);pairs={}
        for row in cli['runs']:
            for key in ['stdout','stderr']:self.assertEqual(sha256(row[key].encode()),row[key+'SHA256'])
            for rel,item in row['files'].items():
                self.assertEqual(sha256(item['text'].encode()),item['sha256'])
                self.assertEqual(len(item['text'].encode()),item['bytes'])
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        for check in cli['comparisons']:
            slug,name=check['project'],check['scenario'];pair=pairs[(slug,name)];self.assertEqual(set(pair),{'upstream','current'})
            a,b=pair['upstream'],pair['current'];self.assertEqual(a['exit'],check['expectedExit']);self.assertEqual(b['exit'],a['exit'])
            self.assertEqual(a['stdout'],b['stdout'])
            if check['stderrByteEqual']:self.assertEqual(a['stderr'],b['stderr'])
            else:
                self.assertTrue(check['matchingFailureText'])
                self.assertIn(check['matchingFailureText'],a['stderr']);self.assertIn(check['matchingFailureText'],b['stderr'])
            self.assertEqual(set(a['files']),set(b['files']))
            for rel,item in b['files'].items():
                text=item['text']
                if rel.endswith(('.html','.md')):
                    for before,after in reversed(cli['displayReversals'][slug]):text=text.replace(after,before)
                if slug=='postmortem-writer' and rel.endswith('.html'):
                    r=cli['renderedTemplateReversals'][slug]
                    text=re.sub(r['lineLabelPattern'],r['lineLabelReplacement'],text)
                    text=text.replace(r['unassignedAfter'],r['unassignedBefore'])
                self.assertEqual(text,a['files'][rel]['text'],(slug,name,rel))
        self.assertTrue(cli['gitFixturePreserved']);self.assertTrue(cli['crossProjectPRImportChecked'])
        self.assertTrue(cli['staleSnapshotRejected'])

    def test_new_workspaces_fail_honestly_and_reinitialization_preserves_edits(self):
        receipt=json.loads(RECEIPT.read_text());self.assertEqual(len(receipt['workspaces']),4)
        for row in receipt['workspaces']:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            self.assertEqual(sha256(row['preservedEditedSource'].encode()),row['editSha256'])
            raw=json.loads(row['rawReport']);self.assertFalse(raw['certificateEligible'])
            self.assertFalse(raw['projects'][0]['allStagesPassed']);self.assertGreater(row['actualTests'],0)
            self.assertEqual(row['skipped'],0);self.assertTrue(row['reinitializationPreservesEdit'])

    def test_template_and_runtime_boundaries_are_not_overclaimed(self):
        receipt=json.loads(RECEIPT.read_text())
        self.assertTrue(all(v is False for v in receipt['limits'].values()))
        self.assertFalse(receipt['runtimes']['declaredPostmortemGraderMinimumMet'])
        self.assertEqual(receipt['taskDate'],'2026-10-07')
        self.assertIn('remote device',receipt['dateNote'])
        rel='projects/postmortem-writer/solution/integration.go';row=FIXTURE['files'][rel]
        current=(ROOT/rel).read_text();original=reverse_prose_pairs(current,row['replacements'])
        self.assertEqual(re.findall(r'{{.*?}}',current),re.findall(r'{{.*?}}',original))
        self.assertEqual(re.findall(r'<style>.*?</style>',current),re.findall(r'<style>.*?</style>',original))
        self.assertIn('input line {{.Line}}（输入行号）',current)
        report=(ROOT/'projects/pr-review-reporter/solution/main.ts').read_text()
        self.assertIn('" findings; "',report);self.assertIn('" rejected</p>',report)

if __name__=='__main__':
    unittest.main()
