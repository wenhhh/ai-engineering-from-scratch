"""Pinned-source checks for browser-agent and calendar-focus-planner localization."""
from copy import deepcopy
import json
from pathlib import Path
import re
import unittest
from project_translation_contracts import (
    digest, manifest_contract, markdown_contract, reverse_offset_edits,
    reverse_prose_pairs, sha256,
)

ROOT=Path(__file__).resolve().parent.parent
FIXTURE=json.loads((ROOT/'site/fixtures/projects-zh-batch10.json').read_text())

class ProjectBatch10TranslationTests(unittest.TestCase):
    def test_current_bytes_match_every_pinned_file_receipt(self):
        self.assertEqual(len(FIXTURE['files']),81)
        for path,entry in FIXTURE['files'].items():
            self.assertEqual(sha256((ROOT/path).read_bytes()),entry['localizedSha256'],path)

    def test_metadata_preserves_runners_ids_paths_types_and_api_summaries(self):
        for slug in FIXTURE['projects']:
            path=f'projects/{slug}/project.json'
            obj=json.loads((ROOT/path).read_text());expected=FIXTURE['files'][path]['contract']
            self.assertEqual(manifest_contract(obj),expected)
            for stage in obj['stages']:self.assertRegex(stage['title'],r'[\u3400-\u9fff]')
            for key,value in [('id','other-project'),('status','draft'),('level',1),('languages',['Go'])]:
                modified={**obj,key:value};self.assertNotEqual(manifest_contract(modified),expected)
            modified=deepcopy(obj);modified['demo']['command'].append('--wrong')
            self.assertNotEqual(manifest_contract(modified),expected)
            modified=deepcopy(obj);modified['stages'].reverse()
            self.assertNotEqual(manifest_contract(modified),expected)
        calendar=json.loads((ROOT/'projects/calendar-focus-planner/project.json').read_text())
        self.assertEqual([s['summary'] for s in calendar['stages']],[
            'parseCalendar(text)','availableSlots(events, window, bufferMinutes=0)',
            'schedule(tasks, events, window, bufferMinutes=0)','exportCalendar(plan, createdAt); renderPlan(plan)'])

    def test_linked_prerequisite_titles_do_not_exempt_machine_paths(self):
        obj=json.loads((ROOT/'projects/calendar-focus-planner/project.json').read_text());expected=manifest_contract(obj)
        for key,value in [('path','phases/other/path'),('extra','unexpected')]:
            changed=deepcopy(obj);changed['prerequisites'][0][key]=value
            self.assertNotEqual(manifest_contract(changed),expected)
        for value in [None,{},[],{'title':'标题'},{'title':None,'path':'phases/example'}]:
            changed=deepcopy(obj);changed['prerequisites'][0]=value
            with self.assertRaises(ValueError):manifest_contract(changed)
        changed=deepcopy(obj);changed['prerequisites'].reverse()
        self.assertNotEqual(manifest_contract(changed),expected)
        browser=json.loads((ROOT/'projects/browser-agent/project.json').read_text());changed=deepcopy(browser)
        changed['stages'][0]['concepts'][0]='wrongFunction'
        self.assertNotEqual(manifest_contract(changed),manifest_contract(browser))

    def test_all_document_fences_links_and_signatures_remain_exact(self):
        count=0
        for path,entry in FIXTURE['files'].items():
            if entry['kind']!='markdown':continue
            text=(ROOT/path).read_text();count+=1
            self.assertEqual(digest(markdown_contract(text)),digest(entry['contract']),path)
            self.assertRegex(text,r'[\u3400-\u9fff]')
        self.assertEqual(count,19)

    def test_modified_commands_and_figure_targets_cannot_pass(self):
        path='projects/browser-agent/stages/01-observations/docs/en.md';text=(ROOT/path).read_text()
        expected=digest(FIXTURE['files'][path]['contract'])
        for before,after in [('python3 scripts/project_test.py','python3 fake.py'),('pj-browser-agent-1','pj-other-1'),('../../../API.md','../../../wrong.md'),('`parseObservation, choose`','`different`')]:
            self.assertIn(before,text)
            self.assertNotEqual(digest(markdown_contract(text.replace(before,after))),expected)

    def test_only_recorded_prose_changes_occur_in_code_and_html(self):
        count=0
        for path,entry in FIXTURE['files'].items():
            if entry['kind']!='code-prose':continue
            count+=1
            restored=reverse_prose_pairs((ROOT/path).read_text(),entry['replacements'])
            self.assertEqual(sha256(restored.encode()),entry['sourceSha256'],path)
            self.assertNotEqual(sha256((restored+'\n// altered\n').encode()),entry['sourceSha256'])
        self.assertEqual(count,6)

    def test_fixture_display_does_not_change_observed_labels_or_selectors(self):
        files=[ROOT/'projects/browser-agent'/p/'fixture.html' for p in ['solution','starter','stages/01-observations/starter']]
        self.assertEqual(len({p.read_bytes() for p in files}),1)
        text=files[0].read_text()
        self.assertIn('lang="zh-CN"',text)
        self.assertEqual(re.findall(r'<label for="([^"]+)">([^<]+)</label>',text),[('name','Full name'),('email','Email address')])
        self.assertIn('<button id="save" type="submit">Save request</button>',text)
        self.assertIn("status.dataset.state='done'",text)
        self.assertIn("document.querySelector('#save').disabled=true",text)

    def test_original_recordings_test_assertions_and_inputs_remain_unchanged(self):
        count=0
        for path,entry in FIXTURE['files'].items():
            if entry['kind'] in ('preserved-contract','original-recording'):
                self.assertEqual(entry['sourceSha256'],entry['localizedSha256'],path)
                self.assertEqual(sha256((ROOT/path).read_bytes()),entry['sourceSha256'],path)
            count+=entry['kind']=='original-recording'
        self.assertEqual(count,12)
        for slug in FIXTURE['projects']:
            obj=json.loads((ROOT/f'projects/{slug}/project.json').read_text())
            for demo in obj['demos']:self.assertIn('上游原始录屏',demo['title'])

    def test_starters_and_live_scope_are_not_misrepresented(self):
        for rel,count in [('projects/browser-agent/starter/main.ts',11),('projects/browser-agent/stages/01-observations/starter/main.ts',11),('projects/calendar-focus-planner/stages/01-read-calendar/starter/main.ts',5)]:
            self.assertEqual((ROOT/rel).read_text().count('throw new Error'),count,rel)
        self.assertIn('不修改账号中的日历',(ROOT/'projects/calendar-focus-planner/README.md').read_text())
        self.assertIn('不会启动 Chromium',(ROOT/'projects/browser-agent/stages/04-real-browser/docs/en.md').read_text())

    def test_figure_source_is_exact_after_reversing_display_edits(self):
        self.assertEqual(len(FIXTURE['figures']),2)
        for record in FIXTURE['figures']:
            text=(ROOT/record['path']).read_text()
            self.assertEqual(sha256(reverse_offset_edits(text,record['edits']).encode()),record['sourceSha256'])
            first=record['edits'][0];i=first['afterOffset']
            with self.assertRaises(ValueError):reverse_offset_edits(text[:i]+'X'+text[i+1:],record['edits'])

if __name__=='__main__':unittest.main()
