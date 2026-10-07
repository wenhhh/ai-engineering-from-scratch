"""Protect localized prose, executable contracts and scoped execution evidence."""
import ast
from copy import deepcopy
import json
from pathlib import Path
import unittest
from project_translation_contracts import (sha256,digest,manifest_contract,
    markdown_contract,reverse_prose_pairs,reverse_offset_edits)

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch15.json').read_text())
RECEIPT=ROOT/'docs/validation/2026-10-06-batch15.json'
COUNTS={'local-model-eval-harness':25,'mcp-at-scale':35,'meeting-notes-to-actions':36,'memory-server':32}

class Batch15TranslationTests(unittest.TestCase):
    def test_all_current_file_hashes(self):
        self.assertEqual(len(FIXTURE['files']),154)
        self.assertEqual(set(FIXTURE['projects']),set(COUNTS))
        for rel,row in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/rel).read_bytes()),row['localizedSha256'],rel)

    def test_complete_markdown_preserves_examples_and_links(self):
        docs={p:r for p,r in FIXTURE['files'].items() if r['kind']=='markdown'}
        self.assertEqual(len(docs),35)
        for rel,row in docs.items():
            text=(ROOT/rel).read_text()
            self.assertEqual(digest(markdown_contract(text)),digest(row['contract']),rel)
            self.assertRegex(text,r'[\u3400-\u9fff]',rel)

    def test_metadata_only_changes_reviewed_display_fields(self):
        stages=0
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';obj=json.loads((ROOT/rel).read_text())
            self.assertEqual(manifest_contract(obj),FIXTURE['files'][rel]['contract'])
            self.assertIn('（',obj['title'])
            for row in obj['stages']:
                self.assertRegex(row['title'],r'[\u3400-\u9fff]')
                self.assertRegex(row['summary'],r'[\u3400-\u9fff]')
            stages+=len(obj['stages'])
            for demo in obj['demos']:self.assertIn('上游原始录屏',demo['title'])
        self.assertEqual(stages,17)

    def test_machine_metadata_and_optional_boundaries_cannot_be_changed(self):
        for slug in FIXTURE['projects']:
            rel=f'projects/{slug}/project.json';obj=json.loads((ROOT/rel).read_text());expected=FIXTURE['files'][rel]['contract']
            for field,value in [('id','wrong'),('status','draft'),('languages',['wrong'])]:
                changed=deepcopy(obj);changed[field]=value;self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(obj);changed['stages'].reverse();self.assertNotEqual(manifest_contract(changed),expected)
            changed=deepcopy(obj);changed['demo']['command'].append('--wrong');self.assertNotEqual(manifest_contract(changed),expected)
            if slug in ('mcp-at-scale','memory-server'):
                changed=deepcopy(obj);changed['stages'][-1]['runners'][-1]['optional']=False
                self.assertNotEqual(manifest_contract(changed),expected)
                changed=deepcopy(obj);changed['stages'][0]['concepts']=['different-contract']
                self.assertNotEqual(manifest_contract(changed),expected)

    def test_changed_commands_and_interface_names_fail_markdown_contract(self):
        rel='projects/memory-server/stages/01-record-contract/docs/en.md'
        text=(ROOT/rel).read_text();expected=digest(FIXTURE['files'][rel]['contract'])
        for old,new in [('python3 scripts/project_test.py','python3 different.py'),
                        ('pj-memory-server-1','pj-wrong-1'),
                        ('`validateMemory, embed`','`deleteAll`'),
                        ('../../../API.md','../../../other.md')]:
            self.assertIn(old,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(old,new))),expected)

    def test_all_code_edits_reverse_to_exact_upstream(self):
        count=0
        for rel,row in FIXTURE['files'].items():
            if row['kind']!='code-prose':continue
            source=reverse_prose_pairs((ROOT/rel).read_text(),row['replacements'])
            self.assertEqual(sha256(source.encode()),row['sourceSha256'],rel)
            self.assertNotEqual(sha256((source+'\nchanged=True\n').encode()),row['sourceSha256'])
            count+=1
        self.assertEqual(count,39)

    def test_python_algorithms_prompts_and_protocols_have_identical_ast(self):
        pure=['projects/local-model-eval-harness/solution/main.py',
              'projects/local-model-eval-harness/solution/record.py']
        pure += ['projects/mcp-at-scale/solution/'+name+'.py' for name in ['registry','discovery','protocol','audit','rest_adapter']]
        class RemoveDoc(ast.NodeTransformer):
            def scope(self,node):
                self.generic_visit(node)
                if node.body and isinstance(node.body[0],ast.Expr) and isinstance(node.body[0].value,ast.Constant) and isinstance(node.body[0].value.value,str):node.body.pop(0)
                return node
            visit_Module=scope;visit_ClassDef=scope;visit_FunctionDef=scope;visit_AsyncFunctionDef=scope
        for rel in pure:
            text=(ROOT/rel).read_text();source=reverse_prose_pairs(text,FIXTURE['files'][rel]['replacements'])
            self.assertEqual(ast.dump(RemoveDoc().visit(ast.parse(text))),ast.dump(RemoveDoc().visit(ast.parse(source))),rel)

    def test_figure_reversal_rejects_modified_offsets(self):
        self.assertEqual(len(FIXTURE['figures']),4)
        for row in FIXTURE['figures']:
            text=(ROOT/row['path']).read_text()
            self.assertEqual(sha256(text.encode()),row['localizedSha256'])
            self.assertEqual(sha256(reverse_offset_edits(text,row['edits']).encode()),row['sourceSha256'])
            i=row['edits'][0]['afterOffset'];tampered=text[:i]+'X'+text[i+1:]
            with self.assertRaises(ValueError):reverse_offset_edits(tampered,row['edits'])

    def test_recordings_inputs_and_tests_are_preserved(self):
        counts={'original-recording':0,'preserved-contract':0}
        for rel,row in FIXTURE['files'].items():
            if row['kind'] in counts:
                counts[row['kind']]+=1;self.assertEqual(row['sourceSha256'],row['localizedSha256'],rel)
        self.assertEqual(counts,{'original-recording':24,'preserved-contract':52})

    def test_reader_notices_explain_scope_at_the_actual_labs(self):
        for slug,note in FIXTURE['figureLimitations'].items():
            self.assertIn(note,(ROOT/f'site/figures/projects/{slug}.js').read_text())
            for p in (ROOT/'projects'/slug/'stages').glob('*/docs/en.md'):self.assertIn(note,p.read_text())
        for slug,note in FIXTURE['preservedMachineNotes'].items():
            self.assertIn(note,(ROOT/'projects'/slug/'README.md').read_text())

    def test_raw_stage_reports_support_the_recorded_256_executions(self):
        receipt=json.loads(RECEIPT.read_text());rows=receipt['stageRuns']
        self.assertEqual(len(rows),8)
        self.assertEqual({(r['variant'],r['project']) for r in rows},{(v,p) for v in ['upstream','current'] for p in COUNTS})
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            data=json.loads(row['rawReport']);p=data['projects'][0]
            self.assertTrue(p['allStagesPassed']);self.assertEqual(p['mode'],'solution');self.assertFalse(data['certificateEligible'])
            self.assertEqual(row['tests'],COUNTS[row['project']]);self.assertEqual(sum(s['tests'] for s in p['stages']),row['tests'])
            self.assertEqual(sum(s['skippedTests'] for s in p['stages']),0)
        self.assertEqual(sum(r['tests'] for r in rows),256)
        self.assertEqual(receipt['totals']['pairedReferenceTestExecutions'],256)
        for rel,h in receipt['finalSourceHashes'].items():self.assertEqual(sha256((ROOT/rel).read_bytes()),h,rel)
        self.assertTrue(all(v is False for v in receipt['limits'].values()))

    def test_full_cli_artifacts_and_declared_error_boundaries(self):
        receipt=json.loads(RECEIPT.read_text());cli=receipt['cli'];self.assertEqual(len(cli['runs']),60)
        self.assertEqual(len(cli['comparisons']),30)
        rules={(r['project'],r['scenario']):r for r in cli['comparisons']};pairs={}
        for row in cli['runs']:
            for stream in ['stdout','stderr']:self.assertEqual(sha256(row[stream].encode()),row[stream+'SHA256'])
            for rel,item in row['files'].items():
                self.assertEqual(sha256(item['text'].encode()),item['sha256']);self.assertEqual(len(item['text'].encode()),item['bytes'])
            pairs.setdefault((row['project'],row['scenario']),{})[row['variant']]=row
        for key,pair in pairs.items():
            self.assertEqual(set(pair),{'upstream','current'});a,b=pair['upstream'],pair['current'];rule=rules[key]
            self.assertEqual((a['exit'],a['stdout']),(b['exit'],b['stdout']))
            if rule['stderrByteEqual']:self.assertEqual(a['stderr'],b['stderr'])
            else:
                self.assertTrue(rule['expectedExceptionSuffix'] or rule['expectedExceptionLine'])
                for row in (a,b):
                    if rule['expectedExceptionSuffix']:self.assertTrue(row['stderr'].splitlines()[-1].endswith(rule['expectedExceptionSuffix']))
                    if rule['expectedExceptionLine']:self.assertIn(rule['expectedExceptionLine'],[s.strip() for s in row['stderr'].splitlines()])
            self.assertEqual(set(a['files']),set(b['files']))
            for rel,item in b['files'].items():
                text=item['text']
                if rel.endswith('.html'):
                    for after,before in cli['htmlReversals'].get(key[0],[]):text=text.replace(after,before)
                self.assertEqual(text,a['files'][rel]['text'],(key,rel))
        self.assertTrue(cli['staleWriteLeavesLogUnchanged'])
        self.assertEqual(cli['memoryLogs']['upstream'],cli['memoryLogs']['current'])

    def test_workspace_followups_and_optional_sdk_gaps_are_distinct(self):
        receipt=json.loads(RECEIPT.read_text());rows=receipt['workspaces'];self.assertEqual(len(rows),8)
        self.assertEqual(sum(r['priorBatchFollowup'] for r in rows),4)
        for row in rows:
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
            report=json.loads(row['rawReport']);self.assertFalse(report['certificateEligible'])
            self.assertFalse(report['projects'][0]['allStagesPassed']);self.assertGreater(row['actualTests'],0)
            self.assertEqual(row['skipped'],0);self.assertTrue(row['reinitializationPreservesEdit'])
        self.assertEqual(len(receipt['optionalClientChecks']),2)
        for row in receipt['optionalClientChecks']:
            self.assertEqual(row['exit'],1);self.assertIn('missing dependency python:mcp',row['rawLog'])
            self.assertEqual(sha256(row['rawReport'].encode()),row['reportSHA256'])
            self.assertEqual(sha256(row['rawLog'].encode()),row['logSHA256'])
        self.assertFalse(receipt['limits']['optionalMCPClientVerified'])

    def test_recorder_requests_keep_labels_local_and_real_timings_separate(self):
        evidence=json.loads(RECEIPT.read_text())['recorder']
        self.assertEqual(evidence['realHTTPRequests'],4);self.assertTrue(evidence['labelsStayedLocal'])
        self.assertFalse(evidence['actualTimingComparedAsEqual']);self.assertFalse(evidence['externalModelUsed'])
        a,b=evidence['controlled'];self.assertEqual(a['requests'],b['requests']);self.assertEqual(a['result'],b['result'])
        a,b=evidence['actualLoopback'];self.assertEqual(a['requests'],b['requests'])
        for run in evidence['actualLoopback']:
            for request in run['requests']:
                self.assertEqual(sha256(request['rawBody'].encode()),request['rawSha256'])
                self.assertNotIn('private-label-not-sent',request['rawBody'])
            for row in run['result']['records']:self.assertGreaterEqual(row['latency_ms'],0)

if __name__=='__main__':unittest.main()
