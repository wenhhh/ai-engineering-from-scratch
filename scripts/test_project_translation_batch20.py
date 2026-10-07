"""Protect batch-20 localization and evidence; no learner or production certification."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest
from project_translation_contracts import (sha256, digest, markdown_contract,
    manifest_contract, reverse_prose_pairs, reverse_offset_edits)

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT / 'site/fixtures/projects-zh-batch20.json').read_text())
EVIDENCE = json.loads((ROOT / 'docs/validation/2026-10-07-batch20.json').read_text())
EXPECTED = {'source-grounded-study-coach':30, 'support-agent-with-google-adk':25,
            'tiny-coding-agent':31, 'token-counter-and-cost-meter':20, 'tool-call-firewall':23}

def normalize(text, row):
    text = text.replace(row['work'], '$WORK').replace(row['snapshot'], '$SNAPSHOT')
    return re.sub(r'(Ran \d+ tests? in )\d+(?:\.\d+)?s', r'\1<elapsed>s', text)

def normalize_json(value, row):
    if isinstance(value,str): return normalize(value,row)
    if isinstance(value,list): return [normalize_json(x,row) for x in value]
    if isinstance(value,dict): return {k:normalize_json(v,row) for k,v in value.items()}
    return value

def restore_html(slug,text):
    file = 'main.ts' if slug == 'source-grounded-study-coach' else 'support.py'
    for before,after in reversed(FIXTURE['files'][f'projects/{slug}/solution/{file}']['replacements']):
        if after in text: text=text.replace(after,before)
    if slug == 'source-grounded-study-coach':
        text=text.replace('<p>现在到期 |','<p>Due now |').replace('<p>下次到期 ','<p>Next due ')
        text=re.sub(r'\| 分盒 (\d+) \| 答题次数 (\d+)',r'| Box \1 | Attempts \2',text)
        text=re.sub(r'<p>来源：(.*?) \| UTF-16 偏移 (\d+) 至 (\d+)</p>',r'<p>Source: \1 | UTF-16 offsets \2 to \3</p>',text)
    else:
        text=text.replace('| 路由：','| Route: ').replace('Source: 人工审阅','Source: human review')
    return text

class Batch20TranslationTests(unittest.TestCase):
    def test_inventory_and_all_final_source_hashes(self):
        self.assertEqual(set(FIXTURE['projects']),set(EXPECTED))
        self.assertEqual(len(FIXTURE['files']),162)
        self.assertEqual(len(FIXTURE['figures']),5)
        for rel,row in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)
        self.assertEqual(len(EVIDENCE['sourceHashes']),167)
        for rel,h in EVIDENCE['sourceHashes'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),h,rel)

    def test_complete_markdown_structure_and_original_code_blocks(self):
        rows={p:r for p,r in FIXTURE['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(rows),32)
        for rel,row in rows.items():
            text=(ROOT/rel).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)
            self.assertRegex(text,r'[\u3400-\u9fff]',rel)

    def test_machine_markdown_mutations_do_not_pass(self):
        rel='projects/tool-call-firewall/stages/03-consume-a-request-bound-approval-once/docs/en.md'
        text=(ROOT/rel).read_text(); expected=digest(FIXTURE['files'][rel]['contract'])
        for a,b in [('pj-tool-call-firewall-3','pj-wrong'),('pub fn authorize','pub fn wrong'),('scripts/project_test.py','scripts/wrong.py'),('https://modelcontextprotocol.io/','https://invalid.example/')]:
            self.assertIn(a,text);self.assertNotEqual(digest(markdown_contract(text.replace(a,b))),expected)

    def test_only_manifest_display_changes_are_allowed(self):
        for slug in EXPECTED:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(data),FIXTURE['files'][rel]['contract'])
            self.assertRegex(data['title'],r'[\u3400-\u9fff]')
            for stage in data['stages']:
                self.assertRegex(stage['title'],r'[\u3400-\u9fff]')
                self.assertRegex(stage['summary'],r'[\u3400-\u9fff]')
            for demo in data['demos']:self.assertIn('上游原始录屏',demo['title'])

    def test_machine_manifest_mutations_are_rejected(self):
        for slug in EXPECTED:
            rel=f'projects/{slug}/project.json';data=json.loads((ROOT/rel).read_text());expected=FIXTURE['files'][rel]['contract']
            for key,value in [('id','changed'),('languages',['Wrong']),('status','draft'),('level',99)]:
                changed=deepcopy(data);changed[key]=value;self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['stages'].reverse();self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(data);changed['demo']['command'].append('--mutated');self.assertNotEqual(manifest_contract(changed),expected)

    def test_all_registered_source_prose_reverses_exactly(self):
        changed=[(p,r) for p,r in FIXTURE['files'].items() if r['kind']=='code-prose']
        self.assertEqual(len(changed),50)
        for rel,row in changed:
            original=reverse_prose_pairs((ROOT/rel).read_text(),row['replacements'])
            self.assertEqual(sha256(original.encode()),row['sourceSha256'],rel)
            self.assertNotEqual(sha256((original+'\nMUTATED').encode()),row['sourceSha256'])

    def test_core_python_functions_preserve_executable_ast(self):
        class StripDoc(ast.NodeTransformer):
            def visit(self,node):
                node=super().visit(node)
                if isinstance(node,(ast.Module,ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)) and node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):node.body.pop(0)
                return node
        for rel in ['projects/tiny-coding-agent/solution/main.py','projects/token-counter-and-cost-meter/solution/usage.py','projects/support-agent-with-google-adk/solution/adk_adapter.py']:
            current=(ROOT/rel).read_text();original=reverse_prose_pairs(current,FIXTURE['files'][rel]['replacements'])
            self.assertEqual(ast.dump(StripDoc().visit(ast.parse(current))),ast.dump(StripDoc().visit(ast.parse(original))),rel)

    def test_original_tests_samples_and_media_stay_byte_exact(self):
        media=0
        for rel,row in FIXTURE['files'].items():
            if row['kind'] in ('original-recording','preserved-contract'):self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
            media+=row['kind']=='original-recording'
        self.assertEqual(media,33)

    def test_calculators_restore_and_reject_changed_text(self):
        for row in FIXTURE['figures']:
            text=(ROOT/row['path']).read_text();self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            e=row['edits'][0];i=e['afterOffset'];tampered=text[:i]+'X'+text[i+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(tampered,row['edits'])

    def test_raw_reports_support_258_paired_reference_tests(self):
        rows=EVIDENCE['stages'];self.assertEqual(len(rows),10)
        self.assertEqual({(r['variant'],r['project']) for r in rows},{(v,s) for v in ['upstream','current'] for s in EXPECTED})
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            report=json.loads(row['rawReport']);p=report['projects'][0]
            self.assertFalse(report['certificateEligible']);self.assertEqual(p['mode'],'solution');self.assertTrue(p['allStagesPassed'])
            self.assertEqual(row['tests'],EXPECTED[row['project']]);self.assertEqual(sum(s['tests'] for s in p['stages']),row['tests'])
            self.assertEqual(sum(s['skippedTests'] for s in p['stages']),0)
        self.assertEqual(sum(r['tests'] for r in rows),258)

    def test_eighty_cli_runs_and_all_exported_files_match_with_declared_rules(self):
        runs=EVIDENCE['cli']['runs'];self.assertEqual(len(runs),80);pairs={}
        for row in runs:
            self.assertEqual(row['exit'],row['expectedExit'])
            for stream in ['stdout','stderr']:self.assertEqual(sha256(row[stream].encode()),row[stream+'SHA256'])
            for rel,value in row['files'].items():
                self.assertEqual(sha256(value['text'].encode()),value['sha256']);self.assertEqual(len(value['text'].encode()),value['bytes'])
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        self.assertEqual(len(pairs),40)
        for (slug,name),pair in pairs.items():
            a,b=pair['upstream'],pair['current']
            if slug=='tiny-coding-agent' and a['stdout']:
                self.assertEqual(normalize_json(json.loads(a['stdout']),a),normalize_json(json.loads(b['stdout']),b),(slug,name))
            else:self.assertEqual(normalize(a['stdout'],a),normalize(b['stdout'],b),(slug,name))
            if 'Traceback (most recent call last)' in a['stderr'] or 'Traceback (most recent call last)' in b['stderr']:
                self.assertEqual(normalize(a['stderr'].splitlines()[-1],a),normalize(b['stderr'].splitlines()[-1],b))
            else:self.assertEqual(normalize(a['stderr'],a),normalize(b['stderr'],b))
            self.assertEqual(set(a['files']),set(b['files']))
            for rel,value in b['files'].items():
                text=value['text'];old=a['files'][rel]['text']
                if rel.endswith('.html'):self.assertEqual(restore_html(slug,text),old)
                elif slug=='tiny-coding-agent' and rel=='trace.json':self.assertEqual(normalize_json(json.loads(text),b),normalize_json(json.loads(old),a))
                else:self.assertEqual(text,old,(slug,name,rel))

    def test_new_workspaces_failed_as_expected_and_retained_edits(self):
        rows=EVIDENCE['workspaces'];self.assertEqual({r['project'] for r in rows},set(EXPECTED))
        for row in rows:
            report=json.loads(row['rawReport']);self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertFalse(report['certificateEligible']);self.assertFalse(report['projects'][0]['allStagesPassed'])
            self.assertGreater(row['actualTests'],0);self.assertEqual(row['skipped'],0);self.assertTrue(row['reinitializationPreservesEdit'])

    def test_browser_script_and_loopback_integration_evidence(self):
        evidence=EVIDENCE['integration'];self.assertEqual(evidence['realLoopbackRequests'],4);self.assertFalse(evidence['realBrowserVisualReview'])
        a,b=[x['result'] for x in evidence['runs']]
        self.assertEqual(a['provider'],b['provider'])
        for k in ['payload','firstDownload','secondDownload','downloads']:self.assertEqual(a['browser'][k],b['browser'][k])
        for result in [a,b]:
            self.assertEqual(len(result['provider']['requests']),2)
            self.assertEqual(result['provider']['accepted']['status'],'review-required')
            self.assertEqual(result['provider']['rejected'],'Proposal lacks verbatim answer evidence')
            self.assertEqual(len(result['browser']['secondDownload']),2)
            self.assertEqual(result['browser']['secondDownload'][1]['answer'],'黄色托盘')

    def test_native_audit_overflow_and_optional_sdk_limits(self):
        self.assertEqual(len(EVIDENCE['nativeProbes']),2)
        for row in EVIDENCE['nativeProbes']:
            self.assertEqual(row['exit'],0);self.assertEqual(json.loads(row['stdout']),row['result'])
            self.assertTrue(row['result']['auditFullRejected']);self.assertFalse(row['result']['dispatchExecuted']);self.assertFalse(row['result']['approvalConsumed']);self.assertTrue(row['result']['overflowRejected'])
        self.assertEqual(EVIDENCE['optionalSDK']['exit'],1);self.assertFalse(EVIDENCE['optionalSDK']['frameworkExecuted'])
        self.assertIn('missing dependency python:google.adk',EVIDENCE['optionalSDK']['rawLog'])
        self.assertTrue(all(v is False for v in EVIDENCE['limits'].values()))

    def test_disclosed_machine_and_figure_scope_stays_visible(self):
        for slug,note in FIXTURE['preservedMachineNotes'].items():self.assertIn(note,(ROOT/'projects'/slug/'README.md').read_text())
        for slug,note in FIXTURE['figureLimitations'].items():
            self.assertIn(note,(ROOT/'site/figures/projects'/f'{slug}.js').read_text())
            for p in (ROOT/'projects'/slug/'stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())

if __name__=='__main__':unittest.main()
