"""Verify translation contracts; skipped Go/SDK execution is never a passing lab."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest

from project_translation_contracts import (
    digest, manifest_contract, markdown_contract, reverse_offset_edits,
    reverse_prose_pairs, sha256,
)
ROOT = Path(__file__).resolve().parent.parent
FIXTURE = json.loads((ROOT/'site/fixtures/projects-zh-batch11.json').read_text())

class DropDocstrings(ast.NodeTransformer):
    def scope(self, node):
        self.generic_visit(node)
        if node.body and isinstance(node.body[0], ast.Expr) and isinstance(node.body[0].value, ast.Constant) and isinstance(node.body[0].value.value, str):
            node.body.pop(0)
        return node
    visit_Module = scope
    visit_ClassDef = scope
    visit_FunctionDef = scope
    visit_AsyncFunctionDef = scope

class ProjectBatch11TranslationTests(unittest.TestCase):
    def test_all_file_receipts_match_current_bytes(self):
        for path, record in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/path).read_bytes()), record['localizedSha256'], path)
        for record in FIXTURE['figures']:
            self.assertEqual(sha256((ROOT/record['path']).read_bytes()), record['localizedSha256'])

    def test_project_metadata_only_changes_approved_display_fields(self):
        for slug in FIXTURE['projects']:
            path = f'projects/{slug}/project.json'
            value = json.loads((ROOT/path).read_text())
            self.assertEqual(manifest_contract(value), FIXTURE['files'][path]['contract'])
            self.assertRegex(value['title'], r'[\u3400-\u9fff]')
            for stage in value['stages']:
                self.assertRegex(stage['title'], r'[\u3400-\u9fff]')

    def test_commands_scope_api_tokens_and_optional_runner_cannot_drift(self):
        for slug in FIXTURE['projects']:
            path = f'projects/{slug}/project.json'
            original = json.loads((ROOT/path).read_text())
            expected = FIXTURE['files'][path]['contract']
            variants = []
            for key, value in [('id','wrong'),('status','draft'),('hours',1),('languages',['Rust'])]:
                changed=deepcopy(original);changed[key]=value;variants.append(changed)
            changed=deepcopy(original);changed['demo']['command'].append('--changed');variants.append(changed)
            changed=deepcopy(original);changed['stages'].reverse();variants.append(changed)
            changed=deepcopy(original);changed['stages'][0]['id']='wrong-stage';variants.append(changed)
            if slug=='cloud-agent-with-aws-strands':
                changed=deepcopy(original);changed['stages'][3]['runners'][1]['optional']=False;variants.append(changed)
                changed=deepcopy(original);changed['stages'][3]['runners'][1]['requires']=['python:fake'];variants.append(changed)
                changed=deepcopy(original);changed['stages'][0]['concepts'][0]='changed-api-token';variants.append(changed)
            else:
                changed=deepcopy(original);changed['prerequisites'][0]['path']='phases/wrong';variants.append(changed)
            for changed in variants:self.assertNotEqual(manifest_contract(changed),expected,slug)

    def test_complete_markdown_structure_and_executable_examples_are_preserved(self):
        for path,record in FIXTURE['files'].items():
            if record['kind']!='markdown':continue
            text=(ROOT/path).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(record['contract']),path)
            self.assertRegex(text,r'[\u3400-\u9fff]')

    def test_mutated_commands_signatures_and_sources_do_not_pass(self):
        path='projects/changelog-writer-from-git/stages/04-render-bounded-release-notes/docs/en.md'
        text=(ROOT/path).read_text();expected=digest(FIXTURE['files'][path]['contract'])
        for old,new in [('go run . --repo','go run . --wrong'),('func Release(','func Other('),('pj-changelog-writer-from-git-4','pj-wrong-4'),('https://git-scm.com/docs/pretty-formats','https://example.invalid/')]:
            self.assertIn(old,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(old,new))),expected)

    def test_registered_code_edits_reverse_to_exact_upstream(self):
        for path,record in FIXTURE['files'].items():
            if record['kind']!='code-prose':continue
            current=(ROOT/path).read_text()
            original=reverse_prose_pairs(current,record['replacements'])
            self.assertEqual(sha256(original.encode()),record['sourceSha256'],path)
            self.assertNotEqual(sha256((original+'\nBROKEN\n').encode()),record['sourceSha256'])
            if path.endswith('.py') and not path.endswith('framework_demo.py'):
                self.assertEqual(ast.dump(DropDocstrings().visit(ast.parse(current))),ast.dump(DropDocstrings().visit(ast.parse(original))),path)
            if path.endswith('.go'):
                # Only string-literal contents change: syntax and all non-string tokens remain exact.
                literals=re.compile(r'"(?:\\.|[^"\\])*"|`[^`]*`',re.S)
                self.assertEqual(literals.sub('"<string>"',current),literals.sub('"<string>"',original),path)
                self.assertEqual(re.findall(r'%[a-z]',current),re.findall(r'%[a-z]',original),path)

    def test_source_algorithms_and_input_samples_remain_byte_identical(self):
        for path,record in FIXTURE['files'].items():
            if record['kind'] in ('preserved-contract','original-recording'):
                self.assertEqual(record['sourceSha256'],record['localizedSha256'],path)
                self.assertEqual(sha256((ROOT/path).read_bytes()),record['sourceSha256'],path)
        self.assertEqual(sum(r['kind']=='original-recording' for r in FIXTURE['files'].values()),15)

    def test_real_figure_scripts_reverse_without_algorithm_changes(self):
        for record in FIXTURE['figures']:
            text=(ROOT/record['path']).read_text()
            original=reverse_offset_edits(text,record['edits'])
            self.assertEqual(sha256(original.encode()),record['sourceSha256'])
            first=record['edits'][0];i=first['afterOffset']
            with self.assertRaises(ValueError):reverse_offset_edits(text[:i]+'X'+text[i+1:],record['edits'])

    def test_cloud_prompts_pins_errors_and_starter_stubs_remain_original(self):
        path='projects/cloud-agent-with-aws-strands/solution/strands_adapter.py'
        text=(ROOT/path).read_text()
        self.assertIn('system_prompt="Propose a read-only JSON plan. Execution requires a separate scope check."',text)
        self.assertIn('system_prompt="Propose read-only inspection plans. Never claim execution."',text)
        self.assertIn('strands-agents==1.57.1',(ROOT/'projects/cloud-agent-with-aws-strands/requirements-framework.txt').read_text())
        self.assertIn('raise NotImplementedError',(ROOT/'projects/cloud-agent-with-aws-strands/stages/01-plan/starter/plan.py').read_text())
        self.assertIn('panic(', (ROOT/'projects/changelog-writer-from-git/stages/01-read-an-immutable-git-export/starter/stage1.go').read_text())

    def test_missing_runtime_and_original_recordings_remain_disclosed(self):
        readme=(ROOT/'projects/changelog-writer-from-git/README.md').read_text()
        self.assertIn('缺少 Go',readme)
        self.assertIn('Go 阶段测试尚未实跑',readme)
        cloud=(ROOT/'projects/cloud-agent-with-aws-strands/README.md').read_text()
        self.assertIn('未安装 Strands SDK',cloud)
        self.assertIn('不能视为流式内存硬上限',cloud)
        for slug in FIXTURE['projects']:
            metadata=json.loads((ROOT/f'projects/{slug}/project.json').read_text())
            for demo in metadata['demos']:self.assertIn('上游原始录屏',demo['title'])

    def test_known_upstream_calculator_defect_is_visible_in_docs_and_runtime(self):
        root=ROOT/'projects/cloud-agent-with-aws-strands/stages'
        for file in root.glob('*/docs/en.md'):
            self.assertIn('原图在资源超出范围时仍可能显示缓存命中',file.read_text())
        runtime=(ROOT/'site/figures/projects/cloud-agent-with-aws-strands.js').read_text()
        self.assertEqual(runtime.count('原图在资源超出范围时仍可能显示缓存命中'),4)

if __name__=='__main__':unittest.main()
