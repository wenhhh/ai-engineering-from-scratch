"""Protect batch17 prose, original data and recorded execution evidence."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import re
import subprocess
import unittest
from project_translation_contracts import (sha256,digest,manifest_contract,markdown_contract,
                                            reverse_prose_pairs,reverse_offset_edits)
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch17.json').read_text())
RECEIPT=ROOT/'docs/validation/2026-10-07-batch17.json'
EXPECTED={'rag-freshness-pipeline':23,'report-judge':28,'research-report-agent':82,'retrieval-evaluation-lab':21}

class StripDocs(ast.NodeTransformer):
    def scope(self,node):
        self.generic_visit(node)
        if node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):
            node.body.pop(0)
        return node
    visit_Module=scope
    visit_FunctionDef=scope
    visit_AsyncFunctionDef=scope
    visit_ClassDef=scope

class Batch17TranslationTests(unittest.TestCase):
    def test_all_registered_hashes(self):
        self.assertEqual(len(FIXTURE['files']),168)
        self.assertEqual(set(FIXTURE['projects']),set(EXPECTED))
        for rel,row in FIXTURE['files'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)

    def test_complete_learning_docs_keep_code_and_links(self):
        docs={p:r for p,r in FIXTURE['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(docs),26)
        for rel,row in docs.items():
            text=(ROOT/rel).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)
            self.assertRegex(text,r'[\u3400-\u9fff]')

    def test_meta_machine_contracts_and_localized_titles(self):
        for slug in EXPECTED:
            rel=f'projects/{slug}/project.json';d=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(d),FIXTURE['files'][rel]['contract'])
            self.assertRegex(d['title'],r'[\u3400-\u9fff]')
            for st in d['stages']:
                self.assertRegex(st['title'],r'[\u3400-\u9fff]')
                self.assertRegex(st['summary'],r'[\u3400-\u9fff]')
            for demo in d['demos']:self.assertIn('上游原始',demo['caption'])

    def test_meta_mutations_are_rejected(self):
        for slug in EXPECTED:
            d=json.loads((ROOT/f'projects/{slug}/project.json').read_text());expected=manifest_contract(d)
            changes=[]
            for k,v in [('id','wrong'),('languages',['unknown']),('status','draft')]:
                x=deepcopy(d);x[k]=v;changes.append(x)
            x=deepcopy(d);x['stages'].reverse();changes.append(x)
            x=deepcopy(d);x['demo']['command'].append('--wrong');changes.append(x)
            if slug=='research-report-agent':
                x=deepcopy(d);x['languageReasons'][0]['language']='Other';changes.append(x)
            for x in changes:self.assertNotEqual(manifest_contract(x),expected)

    def test_markdown_mutations_fail(self):
        rel='projects/research-report-agent/stages/01-search-the-corpus/docs/en.md';text=(ROOT/rel).read_text();expected=digest(markdown_contract(text))
        for a,b in [('python3 scripts/project_test.py','python3 wrong.py'),('pj-rra-bm25','pj-wrong'),('https://www.rfc-editor.org/rfc/rfc8259','https://example.invalid/'),('`engine_binary()`','`other()`')]:
            self.assertIn(a,text);self.assertNotEqual(digest(markdown_contract(text.replace(a,b))),expected)

    def test_source_code_prose_is_exactly_reversible(self):
        count=0
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose':continue
            original=reverse_prose_pairs((ROOT/rel).read_text(),row['replacements'])
            self.assertEqual(sha256(original.encode()),row['sourceSha256'],rel);count+=1
        self.assertEqual(count,52)

    def test_python_core_ast_unchanged_outside_documentation(self):
        checked=0
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose' or not rel.endswith('.py') or rel.endswith('cli.py') or rel.endswith('run_report.py'):continue
            text=(ROOT/rel).read_text();original=reverse_prose_pairs(text,row['replacements'])
            self.assertEqual(ast.dump(StripDocs().visit(ast.parse(text))),ast.dump(StripDocs().visit(ast.parse(original))),rel);checked+=1
        self.assertGreater(checked,30)

    def test_original_corpus_prompts_tests_and_recordings_unchanged(self):
        media=0
        for rel,row in FIXTURE['files'].items():
            if row['kind'] in ['preserved-contract','original-recording']:
                self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
            if any(x in rel for x in ['/fixtures/','/examples/','/heldout/','/tests/']):
                self.assertEqual(row['kind'],'preserved-contract',rel)
            media+=row['kind']=='original-recording'
        self.assertEqual(media,24)

    def test_figures_restore_exactly_and_detect_tampering(self):
        self.assertEqual(len(FIXTURE['figures']),4)
        for row in FIXTURE['figures']:
            text=(ROOT/row['path']).read_text();self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            start=row['edits'][0]['afterOffset'];bad=text[:start]+'X'+text[start+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(bad,row['edits'])

    def test_scope_notes_and_original_dispatch_keys_remain_visible(self):
        for slug,note in FIXTURE['preservedMachineNotes'].items():
            self.assertIn(note,(ROOT/f'projects/{slug}/README.md').read_text())
        for slug,note in FIXTURE['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())
            self.assertTrue(any(note in p.read_text() for p in (ROOT/f'projects/{slug}/stages').glob('*/docs/en.md')))
        text=(ROOT/'site/figures/projects/research-report-agent.js').read_text()
        for key in ['BM25 RANKING','SCORE THE PUBLIC FIXTURES','completed · 2 sentences dropped']:
            self.assertIn(key,text)

    def test_raw_stage_reports_support_308_acceptance_executions(self):
        receipt=json.loads(RECEIPT.read_text());rows=receipt['stageRuns'];self.assertEqual(len(rows),8)
        self.assertEqual({(r['variant'],r['project']) for r in rows},{(v,p) for v in ['upstream','current'] for p in EXPECTED})
        for row in rows:
            self.assertEqual(row['exit'],0);self.assertEqual(row['skipped'],0);self.assertEqual(row['tests'],EXPECTED[row['project']])
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            report=json.loads(row['rawReport']);p=report['projects'][0]
            self.assertFalse(report['certificateEligible']);self.assertEqual(p['mode'],'solution');self.assertTrue(p['allStagesPassed'])
            self.assertEqual(sum(s['tests'] for s in p['stages']),row['tests'])
        self.assertEqual(sum(r['tests'] for r in rows),308)
        for rel,h in receipt['finalSourceHashes'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),h,rel)
        self.assertTrue(all(v is False for v in receipt['limits'].values()))

    def test_cli_artifacts_compare_without_discarding_machine_values(self):
        receipt=json.loads(RECEIPT.read_text());cli=receipt['cli'];self.assertEqual(len(cli['runs']),58);self.assertEqual(len(cli['comparisons']),29)
        pairs={}
        for row in cli['runs']:
            for stream in ['stdout','stderr']:self.assertEqual(sha256(row[stream].encode()),row[stream+'SHA256'])
            for rel,f in row['files'].items():
                self.assertEqual(sha256(f['text'].encode()),f['sha256']);self.assertEqual(len(f['text'].encode()),f['bytes'])
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        for (slug,name),pair in pairs.items():
            a,b=pair['upstream'],pair['current'];self.assertEqual(a['stdout'],b['stdout']);self.assertEqual(a['exit'],b['exit']);self.assertEqual(set(a['files']),set(b['files']))
            if a['stderr']!=b['stderr']:
                self.assertNotEqual(a['exit'],0);self.assertEqual(a['stderr'].splitlines()[-1],b['stderr'].splitlines()[-1])
            for rel,raw in b['files'].items():
                text=raw['text']
                if rel.endswith('.html'):
                    for old,new in cli['displayReversals'].get(slug,[]):
                        if '${' not in new:text=text.replace(new,old)
                    if slug=='research-report-agent':
                        for pattern,replacement in cli['renderedHTMLRegexReversals']:text=re.sub(pattern,replacement,text)
                self.assertEqual(text,a['files'][rel]['text'],(slug,name,rel))

    def test_natural_traces_preserve_clock_and_uuid_values(self):
        cli=json.loads(RECEIPT.read_text())['cli'];runs=cli['naturalResearchRuns'];self.assertEqual(len(runs),2)
        payloads=[]
        for row in runs:
            self.assertEqual(row['exit'],0)
            for file,text in row['files'].items():self.assertEqual(sha256(text.encode()),row['fileHashes'][file])
            t=json.loads(row['files']['trace.json']);self.assertNotEqual(t['run_id'],'0123456789ab')
            self.assertRegex(t['run_id'],r'^[a-f0-9]{12}$')
            self.assertTrue(all(s['ms']>=0 for s in t['steps']));payloads.append(json.loads(row['files']['report.json']))
        a,b=payloads
        self.assertEqual({k:v for k,v in a.items() if k!='trace'},{k:v for k,v in b.items() if k!='trace'})
        for k in ['counts','budget','terminal_state','question']:self.assertEqual(a['trace'][k],b['trace'][k])
        self.assertEqual([(s['name'],s['detail']) for s in a['trace']['steps']],[(s['name'],s['detail']) for s in b['trace']['steps']])

    def test_new_workspaces_fail_intentionally_and_preserve_edits(self):
        rows=json.loads(RECEIPT.read_text())['workspaces'];self.assertEqual({r['project'] for r in rows},set(EXPECTED))
        for row in rows:
            self.assertEqual(row['freshStarterStatus'],'expected-unimplemented-failure');self.assertGreater(row['actualTests'],0)
            self.assertEqual(row['skipped'],0);self.assertFalse(row['certificateEligible']);self.assertTrue(row['reinitializationPreservesEdit'])
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            r=json.loads(row['rawReport']);self.assertFalse(r['projects'][0]['allStagesPassed']);self.assertFalse(r['certificateEligible'])

    def test_pipeline_budget_note_matches_work_before_gather_charge(self):
        code='''import json
from unittest.mock import patch
from types import SimpleNamespace
import report_agent.pipeline as p
from report_agent.critic import Budget
calls=[]
def gather(plan,index):
 calls.append('gather');return {}
with patch.object(p,'load_corpus',return_value=[]),patch.object(p,'BM25Index',return_value=object()),patch.object(p,'plan_research',return_value=SimpleNamespace(source='rules',facets=[])),patch.object(p,'gather_snippets',side_effect=gather),patch.object(p,'render_html',return_value='<p>test</p>'):
 report,trace,html=p.run_pipeline('question','unused',budget=Budget(max_steps=2,max_tokens=10000))
 print(json.dumps({'calls':calls,'state':trace['terminal_state'],'last':trace['steps'][-1]['name']}))
'''
        p=subprocess.run(['python3','-c',code],cwd=ROOT/'projects/research-report-agent/solution',capture_output=True,text=True,timeout=10)
        self.assertEqual(p.returncode,0,p.stderr);self.assertEqual(json.loads(p.stdout),{'calls':['gather'],'state':'failed','last':'budget_exceeded'})
        self.assertIn('gather 与 write 在完成相应工作后才扣预算',(ROOT/'projects/research-report-agent/solution/report_agent/pipeline.py').read_text())

if __name__=='__main__':unittest.main()
