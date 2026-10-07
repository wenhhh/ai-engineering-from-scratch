"""Protect four localized project sources without treating static parity as runtime proof."""
from copy import deepcopy
import ast
import json
from pathlib import Path
import unittest
from project_translation_contracts import (
    digest,manifest_contract,markdown_contract,reverse_prose_pairs,reverse_offset_edits,sha256,
)
ROOT=Path(__file__).resolve().parent.parent
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch12.json').read_text())

class ProjectBatch12TranslationTests(unittest.TestCase):
    def test_exact_four_project_batch_and_current_file_receipts(self):
        self.assertEqual(FIXTURE['projects'],['csv-sql-question-workbench','dataset-split-auditor','desktop-control','distributed-eval-farm'])
        for relative,record in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/relative).read_bytes()),record['localizedSha256'],relative)

    def test_manifest_only_translates_approved_display_fields(self):
        for slug in FIXTURE['projects']:
            relative=f'projects/{slug}/project.json'
            obj=json.loads((ROOT/relative).read_text())
            self.assertEqual(manifest_contract(obj),FIXTURE['files'][relative]['contract'],slug)
            self.assertRegex(obj['title'],r'[\u3400-\u9fff]')
            for stage in obj['stages']:self.assertRegex(stage['title'],r'[\u3400-\u9fff]')

    def test_api_summaries_and_desktop_concepts_remain_machine_identifiers(self):
        relative='projects/csv-sql-question-workbench/project.json'
        obj=json.loads((ROOT/relative).read_text())
        self.assertEqual([s['summary'] for s in obj['stages']],FIXTURE['files'][relative]['exactStageSummaries'])
        relative='projects/desktop-control/project.json'
        obj=json.loads((ROOT/relative).read_text())
        expected=FIXTURE['files'][relative]['contract']
        self.assertEqual([s['concepts'] for s in obj['stages']],[s['concepts'] for s in expected['stages']])

    def test_runner_identity_paths_and_stage_order_cannot_be_translated(self):
        for slug in FIXTURE['projects']:
            relative=f'projects/{slug}/project.json';obj=json.loads((ROOT/relative).read_text())
            expected=FIXTURE['files'][relative]['contract']
            variants=[]
            for key,value in [('id','changed'),('level',0),('status','draft'),('languages',['Julia'])]:
                bad=deepcopy(obj);bad[key]=value;variants.append(bad)
            bad=deepcopy(obj);bad['demo']['command'].append('--modified');variants.append(bad)
            bad=deepcopy(obj);bad['stages'].reverse();variants.append(bad)
            bad=deepcopy(obj);bad['stages'][0]['runner']=['echo','PASS'];variants.append(bad)
            bad=deepcopy(obj);bad['stages'][0]['timeout']=1;variants.append(bad)
            for bad in variants:self.assertNotEqual(manifest_contract(bad),expected,slug)
            for index,value in enumerate(obj.get('prerequisites',[])):
                if isinstance(value,dict):
                    bad=deepcopy(obj);bad['prerequisites'][index]['path']='phases/wrong'
                    self.assertNotEqual(manifest_contract(bad),expected)

    def test_every_markdown_document_keeps_examples_links_and_structure(self):
        for relative,record in FIXTURE['files'].items():
            if record['kind']!='markdown':continue
            text=(ROOT/relative).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(record['contract']),relative)
            self.assertRegex(text,r'[\u3400-\u9fff]')

    def test_changed_command_signature_or_figure_reference_is_detected(self):
        relative='projects/csv-sql-question-workbench/stages/01-import-table/docs/en.md'
        text=(ROOT/relative).read_text();expected=digest(FIXTURE['files'][relative]['contract'])
        for old,new in [('python3 scripts/project_test.py','python3 other.py'),('pj-csv-sql-question-workbench-1','pj-wrong-1'),('`load_csv(text, max_rows=10000)`','`load_csv(text)`')]:
            self.assertIn(old,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(old,new))),expected)

    def test_code_and_help_edits_restore_exact_pinned_source(self):
        for relative,record in FIXTURE['files'].items():
            if record['kind']!='code-prose':continue
            text=(ROOT/relative).read_text()
            restored=reverse_prose_pairs(text,record['replacements'])
            self.assertEqual(sha256(restored.encode()),record['sourceSha256'],relative)
            if relative.endswith('.py'):
                ast.parse(text);ast.parse(restored)
            self.assertNotEqual(sha256((restored+'\nchanged\n').encode()),record['sourceSha256'])

    def test_all_four_real_figure_scripts_restore_source(self):
        self.assertEqual(len(FIXTURE['figures']),4)
        for record in FIXTURE['figures']:
            text=(ROOT/record['path']).read_text()
            self.assertEqual(sha256(text.encode()),record['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,record['edits']).encode()),record['sourceSha256'])
            edit=record['edits'][0]
            changed=text[:edit['afterOffset']]+'X'+text[edit['afterOffset']+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(changed,record['edits'])

    def test_original_tests_samples_and_recordings_remain_exact(self):
        count=0
        for relative,record in FIXTURE['files'].items():
            if record['kind'] not in ('preserved-contract','original-recording'):continue
            self.assertEqual(record['sourceSha256'],record['localizedSha256'],relative)
            self.assertEqual(sha256((ROOT/relative).read_bytes()),record['sourceSha256'])
            count+=record['kind']=='original-recording'
        self.assertEqual(count,24)
        for slug in FIXTURE['projects']:
            for demo in json.loads((ROOT/f'projects/{slug}/project.json').read_text())['demos']:
                self.assertIn('上游原始录屏',demo['title'])

    def test_existing_dataset_checks_only_change_two_expected_ui_labels(self):
        record=FIXTURE['existingTestDisplayChange']
        self.assertEqual(len(record['changes']),2)
        text=(ROOT/record['path']).read_text()
        self.assertEqual(sha256(text.encode()),record['localizedSha256'])
        self.assertEqual(sha256(reverse_prose_pairs(text,record['changes']).encode()),record['sourceSha256'])

    def test_source_fingerprint_and_native_runtime_limits_remain_visible(self):
        text=(ROOT/'projects/csv-sql-question-workbench/stages/01-import-table/docs/en.md').read_text()
        self.assertIn('读入后的文本',text)
        self.assertIn('磁盘原始字节',text)
        for slug in ['desktop-control','distributed-eval-farm']:
            text=(ROOT/f'projects/{slug}/README.md').read_text()
            self.assertIn('本轮汉化环境没有',text)
            self.assertIn('尚未完成',text)
            self.assertIn('历史录屏不作为本轮实跑证据',text)
        desktop=(ROOT/'projects/desktop-control/solution/main.rs').read_text()
        self.assertIn('native_verified=false',desktop)
        self.assertIn('--native-capture',desktop)

    def test_starters_remain_incomplete_and_do_not_import_reference_solutions(self):
        for relative,record in FIXTURE['files'].items():
            if '/starter/' not in relative or not relative.endswith(('.py','.go','.rs')):continue
            text=(ROOT/relative).read_text()
            self.assertNotIn('projects/'+relative.split('/')[1]+'/solution',text)
        text=(ROOT/'projects/dataset-split-auditor/stages/01-fingerprint-records/starter/main.py').read_text()
        self.assertIn('raise NotImplementedError',text)

if __name__=='__main__':unittest.main()
