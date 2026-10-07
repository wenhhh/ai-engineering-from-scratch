"""Pure structural checks for project localization; never certify prose or learner work."""
from copy import deepcopy
import hashlib
import json
import re

DISPLAY = '<translated-text>'
TOP_TEXT = ('title', 'tagline', 'summary', 'youWillBuild')
TOP_LISTS = ('usefulFor', 'skills', 'prerequisites')
STAGE_TEXT = ('title', 'summary', 'languageWhy')


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(value):
    return sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())


def manifest_contract(value):
    """Remove only known display text, preserving types, list counts and every other field."""
    obj = deepcopy(value)
    if not isinstance(obj, dict):
        raise ValueError('project manifest must be an object')
    def field(record, key):
        if key in record:
            if not isinstance(record[key], str) or not record[key].strip():
                raise ValueError('nonempty display string required: ' + key)
            record[key] = DISPLAY
    for key in TOP_TEXT:
        field(obj, key)
    for key in TOP_LISTS:
        if key in obj:
            if not isinstance(obj[key], list):
                raise ValueError('display string list required: ' + key)
            items = []
            for value in obj[key]:
                if isinstance(value, str) and value.strip():
                    items.append(DISPLAY)
                elif key == 'prerequisites' and isinstance(value, dict) and isinstance(value.get('path'), str) and value['path']:
                    # A linked prerequisite is an object, not a free-text string.
                    # Only its title is display text; path and all other keys stay exact.
                    if not isinstance(value.get('title'), str) or not value['title'].strip():
                        raise ValueError('prerequisite title must be nonempty')
                    field(value, 'title')
                    items.append(value)
                else:
                    raise ValueError('invalid display list entry: ' + key)
            obj[key] = items
    if 'languageWhy' in obj:
        if not isinstance(obj['languageWhy'], dict):
            raise ValueError('languageWhy must preserve language keys')
        for key in obj['languageWhy']:
            field(obj['languageWhy'], key)
    if not isinstance(obj.get('stages'), list) or not obj['stages']:
        raise ValueError('stages must be nonempty')
    for stage in obj['stages']:
        if not isinstance(stage, dict):
            raise ValueError('stage must be an object')
        for key in STAGE_TEXT:
            field(stage, key)
        # Function/API names are machine associations. Only these courses'
        # explicitly known natural-language concepts are localizable.
        if obj.get('id') in ('agent-budget-planner', 'calendar-focus-planner', 'changelog-writer-from-git', 'csv-sql-question-workbench', 'dataset-split-auditor', 'distributed-eval-farm', 'document-extraction-desk', 'durable-agent-jobs', 'feedback-theme-board', 'harness-bench', 'inbox-triage-desk', 'llm-gateway-with-fallbacks', 'local-model-eval-harness', 'meeting-notes-to-actions', 'postmortem-writer', 'prompt-regression-tester', 'rag-freshness-pipeline', 'report-judge', 'research-report-agent', 'retrieval-evaluation-lab', 'sandbox-ladder', 'self-improving-skill-loop', 'semantic-notes-search', 'skill-scanner', 'skill-validator', 'source-grounded-study-coach', 'support-agent-with-google-adk', 'tiny-coding-agent', 'token-counter-and-cost-meter', 'tool-call-firewall', 'typed-workflow-agent-with-mastra', 'visual-evidence-library', 'voice-note-transcriber-pipeline', 'web-change-brief') and 'concepts' in stage:
            if not isinstance(stage['concepts'], list) or not all(isinstance(s, str) and s for s in stage['concepts']):
                raise ValueError('concepts must preserve list structure')
            stage['concepts'] = [DISPLAY for _ in stage['concepts']]
    # This project additionally names why each language is used; language ids remain exact.
    if obj.get('id') == 'research-report-agent' and 'languageReasons' in obj:
        if not isinstance(obj['languageReasons'], list):
            raise ValueError('languageReasons must preserve list structure')
        for row in obj['languageReasons']:
            if not isinstance(row, dict) or not isinstance(row.get('language'), str):
                raise ValueError('language reason needs a language id')
            field(row, 'why')
    if 'demos' in obj:
        if not isinstance(obj['demos'], list):
            raise ValueError('demos must remain an array')
        for demo in obj['demos']:
            if not isinstance(demo, dict):
                raise ValueError('demo must be an object')
            for key in ('title', 'caption'):
                field(demo, key)
    return obj


def markdown_contract(text):
    from audit_chinese_translation import FENCES, INLINE_CODE, LINKS, DISPLAY_MATH, prose
    body = prose(text)
    return {
        'fences': [(m[2].strip(), m[3]) for m in FENCES.finditer(text)],
        'inlineCode': sorted([list(item) for item in INLINE_CODE.findall(body)]),
        'links': sorted(LINKS.findall(body)),
        'math': DISPLAY_MATH.findall(text),
        'headings': re.findall(r'^(#{1,6})\s', body, re.M),
        'tableRows': len(re.findall(r'^\s*\|.*\|\s*$', body, re.M)),
        'listItems': len(re.findall(r'^\s*(?:[-*+] |\d+[.)] )', body, re.M)),
    }


def reverse_offset_edits(text, edits):
    """Replay recorded Unicode-character offsets; reject stale or altered translated text."""
    for item in reversed(edits):
        start = item['afterOffset']
        after = item['after']
        if text[start:start + len(after)] != after:
            raise ValueError('translated edit no longer matches recorded source')
        text = text[:start] + item['before'] + text[start + len(after):]
    return text


def reverse_prose_pairs(text, pairs):
    for before, after in reversed(pairs):
        if after not in text:
            raise ValueError('recorded prose not found')
        text = text.replace(after, before)
    return text
