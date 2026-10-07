"""Protect localizations of four projects without treating them as learner completion."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import unittest
from project_translation_contracts import digest,manifest_contract,markdown_contract,reverse_offset_edits,reverse_prose_pairs,sha256

ROOT=Path(__file__).resolve().parent.parent
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch13.json').read_text())

class Batch13TranslationTests(unittest.TestCase):
    def test_every_recorded_file_matches_its_current_hash(self):
        for rel,row in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)
        self.assertEqual(len(FIXTURE['projects']),4)

    def test_all_markdown_examples_links_and_machine_tokens_remain_exact(self):
        count=0
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='markdown':continue
            self.assertEqual(digest(markdown_contract((ROOT/rel).read_text())),digest(row['contract']),rel)
            self.assertRegex((ROOT/rel).read_text(),r'[\u3400-\u9fff]')
            count+=1
        self.assertEqual(count,30)

    def test_manifests_only_change_explicit_display_fields(self):
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';row=FIXTURE['files'][rel];actual=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(actual),row['contract'],slug)
            self.assertIn('（',actual['title'])
            if 'exactStageSummaries' in row:self.assertEqual([s['summary'] for s in actual['stages']],row['exactStageSummaries'])

    def test_commands_permissions_stage_order_and_prerequisite_paths_are_protected(self):
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text());expected=FIXTURE['files'][rel]['contract']
            mutations=[]
            for key,value in [('id','wrong'),('status','draft'),('languages',['Rust'])]:
                changed=deepcopy(data);changed[key]=value;mutations.append(changed)
            changed=deepcopy(data);changed['demo']['command'].append('--different');mutations.append(changed)
            changed=deepcopy(data);changed['stages'].reverse();mutations.append(changed)
            changed=deepcopy(data);changed['stages'][0]['runner']=['echo','pass'];mutations.append(changed)
            for changed in mutations:self.assertNotEqual(manifest_contract(changed),expected)
            for i,p in enumerate(data.get('prerequisites',[])):
                if isinstance(p,dict):
                    changed=deepcopy(data);changed['prerequisites'][i]['path']='elsewhere';self.assertNotEqual(manifest_contract(changed),expected)

    def test_modified_code_fence_or_figure_never_passes_doc_contract(self):
        rel='projects/doc-qa-with-citations/stages/01-documents/docs/en.md';text=(ROOT/rel).read_text();expected=digest(FIXTURE['files'][rel]['contract'])
        for old,new in [('python3 scripts/project_test.py','python3 other.py'),('pj-doc-qa-with-citations-1','pj-other-1'),('`load_documents`','`delete_documents`'),('../../../API.md','../../../other.md')]:
            self.assertIn(old,text);self.assertNotEqual(digest(markdown_contract(text.replace(old,new))),expected)

    def test_code_display_reversal_recovers_exact_original_source(self):
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose':continue
            original=reverse_prose_pairs((ROOT/rel).read_text(),row['replacements'])
            self.assertEqual(sha256(original.encode()),row['sourceSha256'],rel)
            self.assertNotEqual(sha256((original+'\nchanged = True\n').encode()),row['sourceSha256'])

    def test_pure_python_modules_keep_executable_ast(self):
        class NoDoc(ast.NodeTransformer):
            def scope(self,node):
                self.generic_visit(node)
                if node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):node.body.pop(0)
                return node
            visit_Module=scope;visit_FunctionDef=scope;visit_AsyncFunctionDef=scope;visit_ClassDef=scope
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose' or not rel.endswith('.py') or Path(rel).name=='cli.py' or '/document-extraction-desk/' in rel or Path(rel).name=='framework_demo.py':continue
            target=(ROOT/rel).read_text();source=reverse_prose_pairs(target,row['replacements'])
            self.assertEqual(ast.dump(NoDoc().visit(ast.parse(target))),ast.dump(NoDoc().visit(ast.parse(source))),rel)

    def test_real_figure_files_reverse_exactly_and_reject_changed_offsets(self):
        for row in FIXTURE['figures']:
            target=(ROOT/row['path']).read_text()
            self.assertEqual(sha256(target.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(target,row['edits']).encode()),row['sourceSha256'])
            e=row['edits'][0];tampered=target[:e['afterOffset']]+'X'+target[e['afterOffset']+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(tampered,row['edits'])

    def test_original_recordings_inputs_and_test_assertions_are_preserved(self):
        count=0
        for rel,row in FIXTURE['files'].items():
            if row['kind'] in ['original-recording','preserved-contract']:
                self.assertEqual(row['localizedSha256'],row['sourceSha256'],rel)
            count+=row['kind']=='original-recording'
        self.assertEqual(count,27)
        for slug in FIXTURE['projects']:
            meta=json.loads((ROOT/f'projects/{slug}/project.json').read_text())
            for demo in meta['demos']:self.assertIn('上游原始录屏',demo['title'])

    def test_optional_sdk_and_go_runtime_gaps_are_disclosed(self):
        qa=(ROOT/'projects/doc-qa-with-citations/README.md').read_text();jobs=(ROOT/'projects/durable-agent-jobs/README.md').read_text()
        self.assertIn('真实 SDK 比较尚未执行',qa)
        self.assertIn('尚未安装 Go',jobs)
        self.assertIn('编译、工作进程崩溃恢复和并发运行未执行',jobs)
        meta=json.loads((ROOT/'projects/doc-qa-with-citations/project.json').read_text())
        self.assertTrue(meta['stages'][-1]['runners'][1]['optional'])
        self.assertEqual(meta['stages'][-1]['runners'][1]['requires'],['python:langchain_text_splitters'])

    def test_approval_and_feedback_control_code_keeps_original_contract(self):
        source=(ROOT/'projects/document-extraction-desk/solution/main.py').read_text()
        for token in ['Array.from(data.text)',"sourceSha256:data.sourceSha256,choices","field.get('selected')",'data-start','data-end',"link.download='approvals.json'"]:
            self.assertIn(token,source)
        feedback=(ROOT/'projects/feedback-theme-board/solution/main.ts').read_text()
        for token in ["normalize('NFKC')","toLowerCase()",'local draft, not posted',' distinct source labels',' input records']:
            self.assertIn(token,feedback)

    def test_unicode_figure_limits_are_visible_beside_actual_labs(self):
        for slug,key in [('doc-qa-with-citations','qa'),('feedback-theme-board','feedback')]:
            note=FIXTURE['figureLimitations'][key]
            for p in (ROOT/'projects'/slug/'stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())

if __name__=='__main__':unittest.main()
