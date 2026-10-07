"""Regression tests for the first localized practical projects; no learner work is modified."""
from copy import deepcopy
import json
from pathlib import Path
import unittest

from project_translation_contracts import (
    digest, manifest_contract, markdown_contract, reverse_offset_edits,
    reverse_prose_pairs, sha256,
)

ROOT=Path(__file__).resolve().parent.parent
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch09.json').read_text())


class ProjectTranslationTests(unittest.TestCase):
    def test_all_project_file_receipts_match_current_content(self):
        for path,record in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/path).read_bytes()),record['localizedSha256'],path)

    def test_manifest_only_changes_explicit_display_fields(self):
        for slug in FIXTURE['projects']:
            path=f'projects/{slug}/project.json'
            actual=json.loads((ROOT/path).read_text())
            self.assertEqual(manifest_contract(actual),FIXTURE['files'][path]['contract'])
            self.assertIn('（',actual['title'])
            for stage in actual['stages']:
                self.assertRegex(stage['title'],r'[\u3400-\u9fff]')

    def test_manifest_commands_identity_and_runner_mutations_are_rejected(self):
        for slug in FIXTURE['projects']:
            path=f'projects/{slug}/project.json';value=json.loads((ROOT/path).read_text())
            expected=FIXTURE['files'][path]['contract']
            changes=[]
            for key,replacement in [('id','different-project'),('status','draft'),('level',5),('languages',['Rust'])]:
                changed=deepcopy(value);changed[key]=replacement;changes.append(changed)
            changed=deepcopy(value);changed['demo']['command'].append('--changed');changes.append(changed)
            changed=deepcopy(value);changed['stages'].reverse();changes.append(changed)
            changed=deepcopy(value);changed['stages'][0]['id']='changed-stage';changes.append(changed)
            changed=deepcopy(value);changed['stages'][0]['timeout']=1;changes.append(changed)
            changed=deepcopy(value);changed['stages'][0]['runner']=['echo','PASS'];changes.append(changed)
            changed=deepcopy(value);changed['skills'].append('新增字段');changes.append(changed)
            for changed in changes:self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(value);changed['stages'][0]['title']=None
            with self.assertRaises(ValueError):manifest_contract(changed)

    def test_document_contracts_keep_fences_links_and_inline_code(self):
        for path,record in FIXTURE['files'].items():
            if record['kind']!='markdown':continue
            text=(ROOT/path).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(record['contract']),path)
            self.assertRegex(text,r'[\u3400-\u9fff]',path)

    def test_markdown_contract_rejects_modified_command_or_figure(self):
        path='projects/agent-budget-planner/stages/01-estimate-cost/docs/en.md'
        text=(ROOT/path).read_text();expected=digest(FIXTURE['files'][path]['contract'])
        for old,new in [('python3 scripts/project_test.py','python3 other.py'),('pj-agent-budget-planner-1','pj-wrong-1'),('../../../API.md','../../../elsewhere.md'),('`estimate`','`reserve`')]:
            self.assertIn(old,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(old,new))),expected)

    def test_code_prose_reversal_recovers_exact_upstream_source(self):
        for path,record in FIXTURE['files'].items():
            if record['kind']!='code-prose':continue
            text=(ROOT/path).read_text()
            restored=reverse_prose_pairs(text,record['replacements'])
            self.assertEqual(sha256(restored.encode()),record['sourceSha256'],path)
            # Changing executable content outside registered prose cannot pass parity.
            self.assertNotEqual(sha256((restored+'\nBROKEN = True\n').encode()),record['sourceSha256'])

    def test_real_figure_scripts_recover_exact_upstream_source(self):
        for record in FIXTURE['figures']:
            text=(ROOT/record['path']).read_text()
            restored=reverse_offset_edits(text,record['edits'])
            self.assertEqual(sha256(restored.encode()),record['sourceSha256'])
            first=record['edits'][0]
            tampered=text[:first['afterOffset']]+'X'+text[first['afterOffset']+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(tampered,record['edits'])

    def test_original_media_and_machine_fixtures_are_not_translated_logs(self):
        media=0
        for path,record in FIXTURE['files'].items():
            if record['kind'] in ('preserved-contract','original-recording'):
                self.assertEqual(record['sourceSha256'],record['localizedSha256'],path)
                self.assertEqual(sha256((ROOT/path).read_bytes()),record['sourceSha256'],path)
            media+=record['kind']=='original-recording'
        self.assertEqual(media,12)
        for slug in FIXTURE['projects']:
            meta=json.loads((ROOT/f'projects/{slug}/project.json').read_text())
            for demo in meta['demos']:
                self.assertIn('上游原始录屏',demo['title'])
                self.assertIn('上游',demo['caption'])

    def test_starter_implementations_remain_incomplete(self):
        budget=(ROOT/'projects/agent-budget-planner/stages/01-estimate-cost/starter/main.py').read_text()
        trace=(ROOT/'projects/agent-trace-debugger/stages/01-parse/starter/main.ts').read_text()
        self.assertEqual(budget.count('raise NotImplementedError'),6)
        self.assertEqual(trace.count('throw new Error'),5)
        self.assertIn('不能把凭据缺失当作零费用',(ROOT/'projects/agent-budget-planner/stages/03-settle-and-release/docs/en.md').read_text())


if __name__=='__main__':unittest.main()
