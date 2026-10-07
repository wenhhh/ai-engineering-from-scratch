"""Audit the pinned Chinese translation scope; do not fetch upstream or execute examples."""
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from audit_chinese_translation import FENCES, INLINE_CODE, DISPLAY_MATH, LINKS, markdown_issues

ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = 'd18b8fe5a913c46011a3b06cb6ebd6a924414fd3'
UPSTREAM = 'c02ca08d8a49ce24c3c1c1cf8e3b422f2c7393ca'
CJK = re.compile(r'[\u3400-\u9fff]')
DISCOVERY = r'(<!-- GENERATED:CERTIFICATION-DISCOVERY:START -->)[\s\S]*?(<!-- GENERATED:CERTIFICATION-DISCOVERY:END -->)'
CATEGORIES = {
    'reader-markdown': 'Chinese reader prose is required; source structure and remaining prose are checked.',
    'chinese-readme-mirror': 'Chinese entry is rebuilt from the translated root README with the existing link rebaser.',
    'other-locale': 'Other language editions are outside the Chinese translation target.',
    'agent-instructions': 'Agent rules and executable prompt artifacts retain their operational language; no new translation requirement.',
    'authoring-template': 'Scaffolding and replaceable examples remain templates, not published lesson prose.',
    'test-or-input-fixture': 'Input data, reference artifacts and test expectations retain exact machine behavior.',
    'historical-media': 'Images, recordings, original audio and capture evidence are preserved, not relabeled as new recordings.',
    'structured-content': 'Known display fields were localized in prior batches; IDs, schemas and machine values stay protected.',
    'site-rendering': 'Display localization and compatibility are covered by the existing project/certification UI regression suites.',
    'implementation-or-maintenance': 'Executable code, build configuration and internal comments are not a requirement to remove all English.',
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def classify(path):
    parts = Path(path).parts
    if path.startswith('i18n/') and not path.startswith('i18n/zh/'):
        return 'other-locale'
    if path == 'AGENTS.md' or path.startswith(('.claude/', 'skills/')) or 'outputs' in parts:
        return 'agent-instructions'
    if '_template' in parts:
        return 'authoring-template'
    if 'media' in parts or Path(path).suffix.lower() in ('.gif', '.png', '.wav'):
        return 'historical-media'
    if any(x in parts for x in ('tests', 'tests-framework', 'fixtures', 'samples', 'examples', 'heldout', 'solution')) or Path(path).name.startswith('test_'):
        return 'test-or-input-fixture'
    if path == 'i18n/zh/README.md':
        return 'chinese-readme-mirror'
    if path.endswith('.md'):
        return 'reader-markdown'
    if path.endswith('.json') and path.startswith(('projects/', 'certifications/')):
        return 'structured-content'
    if path.startswith(('site/', 'api/')):
        return 'site-rendering'
    return 'implementation-or-maintenance'


def prose_candidates(text):
    body = INLINE_CODE.sub('', DISPLAY_MATH.sub('', FENCES.sub('', text)))
    result = []
    for block in re.split(r'\n\s*\n', body):
        clean = re.sub(r'https?://\S+', '', block)
        clean = re.sub(r'<[^>]*>', '', clean)
        if not CJK.search(clean) and len(re.findall(r'\b[A-Za-z]{2,}\b', clean)) >= 9:
            result.append(block)
    return result


def audit():
    sync = json.loads((ROOT / 'i18n/zh-upstream-sync.json').read_text())
    errors = []
    if (sync['previousUpstreamCommit'], sync['upstreamCommit']) != (PREVIOUS, UPSTREAM):
        raise ValueError('Pinned translation range changed; do not silently widen the audit.')
    pieces = git('diff', '--name-status', '--no-renames', '-z', PREVIOUS, UPSTREAM).decode().rstrip('\0').split('\0')
    if len(pieces) % 2:
        raise ValueError('Malformed NUL-delimited git delta')
    delta = list(zip(pieces[::2], pieces[1::2]))
    objects = {}
    for row in git('ls-tree', '-r', '-z', UPSTREAM).decode().rstrip('\0').split('\0'):
        meta, path = row.split('\t', 1)
        objects[path] = meta.split()[2]
    entries = []
    reviewed = []
    for status, path in delta:
        category = classify(path)
        entry = {'path': path, 'upstreamChange': status, 'category': category, 'upstreamBlob': objects.get(path)}
        current = ROOT / path
        if not current.is_file():
            errors.append({'path': path, 'issue': 'missing-current-file'})
            entries.append(entry)
            continue
        raw = current.read_bytes()
        entry['currentSha256'] = sha(raw)
        if category in ('reader-markdown', 'chinese-readme-mirror'):
            text = raw.decode('utf-8')
            if not CJK.search(text):
                errors.append({'path': path, 'issue': 'no-chinese-reader-prose'})
            source = git('show', UPSTREAM + ':' + path).decode('utf-8')
            compare = text
            if path == 'README.md':
                marker = '\n## 中文增量翻译结项'
                if text.count(marker) != 1:
                    errors.append({'path': path, 'issue': 'missing-unique-closeout-section'})
                compare = text.split(marker)[0]
                reviewed.append({'path': path, 'kind': 'local-closeout-section', 'reason': 'The added dated local status is checked separately; the full canonical body still matches upstream structure.'})
            if category == 'chinese-readme-mirror':
                from build_readme_i18n import render, localize_links
                from readme_translations import TRANSLATIONS, README_NOTE
                expected = README_NOTE['zh'] + '\n' + localize_links(render((ROOT / 'README.md').read_text(), 'zh', TRANSLATIONS))
                issues = [] if text == expected else ['chinese-entry-does-not-match-generator']
                reviewed.append({'path': path, 'kind': 'canonical-chinese-mirror', 'reason': 'Replaces a stale partial-language mirror with the complete canonical translation; generator and fenced examples stay intact.'})
            else:
                issues = markdown_issues(source, compare)
                if path == 'docs/i18n.md' and issues == ['link_targets_changed']:
                    before = Counter(LINKS.findall(FENCES.sub('', source)))
                    after = Counter(LINKS.findall(FENCES.sub('', compare)))
                    if not (before - after) and after - before == Counter({'../TRANSLATION.md': 1}):
                        issues = []
                        reviewed.append({'path': path, 'kind': 'existing-local-policy-link', 'reason': 'One added TRANSLATION.md link; no original link removed.'})
            entry['structureIssues'] = issues
            for issue in issues:
                errors.append({'path': path, 'issue': issue})
            allowed = []
            for block in prose_candidates(text):
                if path == 'docs/i18n.md' and block.startswith('> # Kelime Gömmeleri'):
                    allowed.append({'sha256': sha(block.encode()), 'kind': 'quoted-turkish-translation-example'})
                else:
                    errors.append({'path': path, 'issue': 'unreviewed-non-chinese-prose', 'excerpt': block[:400]})
            if allowed:
                entry['preservedLanguageExamples'] = allowed
        entries.append(entry)
    receipt_counts = {}
    for key in ('completedLessonFiles', 'completedAssessmentFiles', 'completedSupportFiles', 'completedProjectFiles', 'completedSharedUIFiles', 'completedCertificationUIFiles'):
        rows = sync.get(key, [])
        receipt_counts[key] = len(rows)
        for row in rows:
            raw = (ROOT / row['path']).read_bytes()
            if key == 'completedCertificationUIFiles' and row['path'] == 'site/certifications.html':
                raw = re.sub(DISCOVERY, r'\1\n<generated-discovery>\n\2', raw.decode()).encode()
            if sha(raw) != row['localizedSha256']:
                errors.append({'path': row['path'], 'issue': 'existing-receipt-hash-drift', 'set': key})
    guides = json.loads((ROOT / 'site/fixtures/project-guides-zh.json').read_text())
    for path, row in guides['documents'].items():
        if sha((ROOT / path).read_bytes()) != row['localizedSha256']:
            errors.append({'path': path, 'issue': 'batch24-guide-drift'})
    projects = []
    for path in sorted((ROOT / 'projects').glob('*/project.json')):
        if path.parent.name.startswith('_'):
            continue
        data = json.loads(path.read_text())
        if data['status'] == 'ready':
            projects.append(data['id'])
            if not CJK.search(data['title']):
                errors.append({'path': str(path.relative_to(ROOT)), 'issue': 'untranslated-project-title'})
    if sorted(sync['completedProjects']) != sorted(projects) or sync['pendingProjects']:
        errors.append({'issue': 'project-completion-inventory-mismatch'})
    if len(sync['completedMCPALessons']) != 34 or sync['pendingMCPALessons'] or sync['pendingAssessments']:
        errors.append({'issue': 'mcpa-inventory-mismatch'})
    banks = [json.loads((ROOT / p).read_text()) for p in sync['completedAssessments']]
    if len(banks) != 4 or sum(len(b['questions']) for b in banks) != 210:
        errors.append({'issue': 'assessment-inventory-mismatch'})
    for bank in banks:
        for question in bank['questions']:
            for value in [question['prompt'], question['explanation'], *question['options']]:
                if not CJK.search(value):
                    errors.append({'issue': 'untranslated-assessment-field', 'question': question['id']})
    categories = dict(sorted(Counter(row['category'] for row in entries).items()))
    return {'schemaVersion': 1, 'previousUpstreamCommit': PREVIOUS, 'upstreamCommit': UPSTREAM,
            'scope': 'Reader-facing Chinese incremental translation. Not all English tokens, agent instructions, media, platform verification or newer upstream work.',
            'classificationReasons': CATEGORIES, 'counts': {'upstreamChangedFiles': len(delta), 'upstreamChangedMarkdownFiles': sum(p.endswith('.md') for _, p in delta), 'categories': categories, 'existingReceiptSetsChecked': receipt_counts, 'batch24GuidesChecked': len(guides['documents']), 'readyProjects': len(projects), 'mcpaLessons': 34, 'mcpaAssessmentQuestions': 210},
            'reviewedStructuralDifferences': reviewed, 'entries': entries, 'unresolved': errors,
            'limits': ['Structural and residue checks do not prove perfect semantic translation.', 'Quoted examples, test data, code comments, protocols and other languages are intentionally preserved.', 'No network fetch, external re-verification, new media or full runtime rerun is performed by this audit.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', type=Path, help='Save the coverage inventory to this JSON path.')
    args = parser.parse_args()
    report = audit()
    if args.write:
        args.write.parent.mkdir(parents=True, exist_ok=True)
        args.write.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'counts': report['counts'], 'reviewedStructuralDifferences': report['reviewedStructuralDifferences'], 'unresolved': report['unresolved']}, ensure_ascii=False, indent=2))
    return 1 if report['unresolved'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
