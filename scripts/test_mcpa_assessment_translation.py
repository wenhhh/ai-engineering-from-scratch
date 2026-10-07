"""Keep MCPA bilingual objectives tied to the right track without widening edits."""
import copy
import json
import unittest
from pathlib import Path
from unittest.mock import patch

import audit_chinese_translation as audit


class MCPAObjectiveAssociationTests(unittest.TestCase):
    def setUp(self):
        self.path = 'certifications/mcpa/assessments/mcpa-f/diagnostic.json'
        self.track = {
            'id': 'mcpa-f',
            'domains': [
                {'id': 'first', 'weight': 60, 'objectives': ['Review evidence', 'Check context']},
                {'id': 'second', 'weight': 40, 'objectives': ['Choose tools']},
            ],
            'assessments': [{'path': self.path}],
        }
        self.translated_track = copy.deepcopy(self.track)
        for domain in self.translated_track['domains']:
            domain['objectives'] = ['中文目标（' + text + '）' for text in domain['objectives']]
        self.source = {
            'id': 'mcpa-f-diagnostic', 'track': 'mcpa-f', 'kind': 'diagnostic',
            'title': 'Diagnostic', 'timeLimitMinutes': 30, 'version': 1,
            'questions': [
                {'id': 'one', 'domain': 'first', 'objective': 'Review evidence', 'type': 'single',
                 'prompt': 'Choose evidence.', 'options': ['First', 'Second', 'Third', 'Fourth'],
                 'correct': [1], 'explanation': 'Second fits.', 'references': ['certifications/mcpa/lessons/01-example']},
                {'id': 'two', 'domain': 'second', 'objective': 'Choose tools', 'type': 'multiple',
                 'prompt': 'Select two.', 'options': ['A', 'B', 'C', 'D'],
                 'correct': [0, 2], 'explanation': 'A and C fit.', 'references': []},
            ],
        }
        self.target = copy.deepcopy(self.source)
        self.target['title'] = '诊断测评'
        for q in self.target['questions']:
            q['objective'] = '中文目标（' + q['objective'] + '）'
            q.update(prompt='请选择对应内容。', options=['选项甲', '选项乙', '选项丙', '选项丁'],
                     explanation='中文解释保持原有判断关系。')

    def issues(self, value=None, manifest=None, path=None):
        if value is None:
            value = self.target
        if manifest is None:
            manifest = self.translated_track
        with patch.object(audit, 'git', return_value=json.dumps(self.track)) as fetch, \
             patch.object(Path, 'read_text', return_value=json.dumps(manifest)):
            found = audit.assessment_issues(path or self.path, json.dumps(self.source), json.dumps(value), 'pinned-source')
            if fetch.called:
                self.assertIn('certifications/mcpa/tracks/mcpa-f.json', fetch.call_args.args[1])
            return found

    def test_complete_bilingual_objectives_are_accepted_for_mcpa(self):
        self.assertEqual(self.issues(), [])

    def test_mcpa_audit_file_routes_through_association_checks(self):
        with patch.object(audit, 'assessment_issues', return_value=['association-test']) as check:
            result = audit.audit_file(self.path, json.dumps(self.source), json.dumps(self.target), 'pinned-source')
        self.assertEqual(result['issues'], ['association-test'])
        self.assertEqual(check.call_args.args[0], self.path)

    def test_unknown_program_does_not_gain_bilingual_machine_field_exemption(self):
        result = audit.audit_file(self.path.replace('/mcpa/', '/unknown/'),
                                  json.dumps(self.source), json.dumps(self.target))
        self.assertTrue(result['issues'])

    def test_invalid_paths_are_rejected_before_any_source_access(self):
        for path in [self.path.replace('/mcpa-f/', '/../'), self.path + '?x=1',
                     self.path.replace('/mcpa/', '/unknown/'), '/' + self.path,
                     self.path.replace('diagnostic.json', 'nested/diagnostic.json')]:
            with self.subTest(path=path), patch.object(audit, 'git') as fetch:
                self.assertEqual(audit.assessment_issues(path, '{}', '{}', 'base'), ['assessment_path_invalid'])
                fetch.assert_not_called()

    def test_top_level_contract_values_remain_protected(self):
        for key, value in [('id', 'changed'), ('track', 'other'), ('kind', 'mock'),
                           ('version', 2), ('timeLimitMinutes', 90)]:
            changed = copy.deepcopy(self.target)
            changed[key] = value
            with self.subTest(key=key):
                self.assertTrue(self.issues(changed))

    def test_question_grading_ids_and_references_remain_protected(self):
        for key, value in [('id', 'different'), ('domain', 'second'), ('correct', [0]),
                           ('type', 'multiple'), ('references', ['other/path'])]:
            changed = copy.deepcopy(self.target)
            changed['questions'][0][key] = value
            with self.subTest(key=key):
                self.assertTrue(self.issues(changed))

    def test_question_order_and_option_count_remain_protected(self):
        changed = copy.deepcopy(self.target)
        changed['questions'].reverse()
        self.assertTrue(self.issues(changed))
        changed = copy.deepcopy(self.target)
        changed['questions'][0]['options'].pop()
        self.assertTrue(self.issues(changed))

    def test_objective_requires_exact_full_original_suffix(self):
        for value in ['中文目标', '中文目标（Review evidence modified）',
                      '中文目标（Check context）', '中文目标（Choose tools）', 42]:
            changed = copy.deepcopy(self.target)
            changed['questions'][0]['objective'] = value
            with self.subTest(value=value):
                self.assertTrue(self.issues(changed))

    def test_different_translation_in_track_and_question_does_not_match(self):
        changed = copy.deepcopy(self.translated_track)
        changed['domains'][0]['objectives'][0] = '另一中文译法（Review evidence）'
        self.assertTrue(self.issues(manifest=changed))

    def test_current_track_must_still_declare_assessment_exactly_once(self):
        for declarations in [[], [{'path': self.path + '.copy'}],
                             [{'path': self.path}, {'path': self.path}], None]:
            changed = copy.deepcopy(self.translated_track)
            changed['assessments'] = declarations
            with self.subTest(declarations=declarations):
                self.assertIn('assessment_track_association_changed', self.issues(manifest=changed))

    def test_domain_order_weight_and_objective_order_remain_protected(self):
        changed = copy.deepcopy(self.translated_track)
        changed['domains'].reverse()
        self.assertTrue(self.issues(manifest=changed))
        changed = copy.deepcopy(self.translated_track)
        changed['domains'][0]['weight'] = 61
        self.assertTrue(self.issues(manifest=changed))
        changed = copy.deepcopy(self.translated_track)
        changed['domains'][0]['objectives'].reverse()
        self.assertTrue(self.issues(manifest=changed))

    def test_malformed_bank_or_track_does_not_pass(self):
        for target in [[], {**self.target, 'questions': None}, {**self.target, 'questions': [None]}]:
            with self.subTest(target=target):
                self.assertTrue(self.issues(value=target))
        for track in [[], {**self.translated_track, 'domains': None},
                      {**self.translated_track, 'domains': [None]}]:
            with self.subTest(track=track):
                self.assertTrue(self.issues(manifest=track))

    def test_mcpa_track_is_audited_without_treating_other_values_as_translatable(self):
        path = 'certifications/mcpa/tracks/mcpa-f.json'
        result = audit.audit_file(path, json.dumps(self.track), json.dumps(self.translated_track))
        self.assertEqual(result['issues'], [])
        changed = copy.deepcopy(self.translated_track)
        changed['domains'][0]['id'] = 'changed'
        self.assertTrue(audit.audit_file(path, json.dumps(self.track), json.dumps(changed))['issues'])

    def test_claude_program_keeps_its_own_track_namespace(self):
        path = self.path.replace('/mcpa/', '/claude/')
        before = copy.deepcopy(self.track)
        after = copy.deepcopy(self.translated_track)
        before['assessments'][0]['path'] = after['assessments'][0]['path'] = path
        with patch.object(audit, 'git', return_value=json.dumps(before)) as fetch, \
             patch.object(Path, 'read_text', return_value=json.dumps(after)):
            self.assertEqual(audit.assessment_issues(path, json.dumps(self.source), json.dumps(self.target), 'base'), [])
            self.assertIn('certifications/claude/tracks/mcpa-f.json', fetch.call_args.args[1])


if __name__ == '__main__':
    unittest.main()
