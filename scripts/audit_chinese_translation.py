#!/usr/bin/env python3
"""Compare the Chinese branch with its pinned English source; never certify prose quality."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
BASE = "d18b8fe5a913c46011a3b06cb6ebd6a924414fd3"
CJK = re.compile(r"[\u3400-\u9fff]")
FENCES = re.compile(r"^[ \t]*(`{3,}|~{3,})([^\n]*)\n(.*?)^[ \t]*\1[ \t]*$", re.M | re.S)
LINKS = re.compile(r"\]\(([^\s)]+)(?:\s+[^)]*)?\)")
INLINE_CODE = re.compile(r"(?<!`)(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`)")
DISPLAY_MATH = re.compile(r"\$\$.*?\$\$", re.S)
INLINE_MATH = re.compile(r"(?<![\\$])\$(?![\s$])[^$\n]*[^\s\\$]\$(?![$\d])")
QUIZ_TEXT_KEYS = {"title", "question", "prompt", "options", "explanation"}
PATH_TEXT_KEYS = {
    "title", "summary", "description", "codex", "portableFallback", "conceptualFallback",
    "goal", "workingDirectory", "expectedEvidence", "checkpoint", "entryRule", "workFamily",
    "commonTitles", "keywords", "decisionPrompt", "mission", "responsibilities", "goodFitIf",
    "baseline", "boundary", "timeNote", "evidence", "readinessCriteria", "strong", "partial",
    "outsideCourse", "completionClaim", "method", "outcome", "artifact", "appliesBefore",
    "requiredEvidence", "checkpointEvidence",
}


def git(*args, **kwargs):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, **kwargs).stdout


def source_files(base):
    entries = git("ls-tree", "-r", "-z", base).split(b"\0")
    selected = []
    for entry in entries:
        if not entry:
            continue
        meta, raw_path = entry.split(b"\t", 1)
        path = raw_path.decode()
        if path.startswith("i18n/"):
            continue
        if path.endswith((".md", ".svg")) or path == "book/volumes.json" or path.endswith("/quiz.json") or (
            path.startswith(("learning-paths/", "certifications/")) and path.endswith(".json")
        ):
            selected.append((path, meta.split()[2]))
    # One batch avoids a subprocess for each of the 1,500+ source documents.
    data = git("cat-file", "--batch", input=b"\n".join(oid for _, oid in selected) + b"\n")
    offset = 0
    for path, _ in selected:
        end = data.index(b"\n", offset)
        size = int(data[offset:end].split()[2])
        start = end + 1
        source = data[start:start + size].decode("utf-8")
        offset = start + size + 1
        if path.endswith(".svg"):
            root = ET.fromstring(source)
            labels = ["".join(element.itertext()) for element in root.iter()
                      if element.tag.rsplit("}", 1)[-1] in {"text", "title", "desc"}]
            labels.extend(element.get("aria-label", "") for element in root.iter())
            if not re.search(r"[A-Za-z]{2}", " ".join(labels)):
                continue
        yield path, source


def prose(text):
    return DISPLAY_MATH.sub("", FENCES.sub("", text))


def unchanged_english(source, target):
    source_lines = set(line.strip() for line in prose(source).splitlines())
    result = []
    # This is a review queue, not a language detector or a claim of correctness.
    for number, line in enumerate(prose(target).splitlines(), 1):
        stripped = line.strip()
        if stripped not in source_lines or CJK.search(stripped):
            continue
        if stripped.startswith(("<!--", "**Type:", "**Languages:")):
            continue
        if re.match(r"^(?:tags|name|version|phase|lesson|allowed-tools|license):", stripped):
            continue
        readable = re.sub(r"https?://\S+|`[^`]*`", "", stripped)
        if "=" in readable and not re.search(r"[.!?]", readable):
            continue
        if len(re.findall(r"[A-Za-z]+", readable)) >= 6 and re.search(r"[A-Za-z]{4,}", readable):
            result.append({"prose_line": number, "text": stripped[:240]})
    return result


def markdown_issues(source, target):
    issues = []
    source_fences, target_fences = list(FENCES.finditer(source)), list(FENCES.finditer(target))
    if [m[2].strip() or "text" for m in source_fences] != [m[2].strip() or "text" for m in target_fences]:
        issues.append("code_fence_count_or_languages_changed")
    for kind in ("figure",):
        if [m[3].strip() for m in source_fences if m[2].strip() == kind] != [
            m[3].strip() for m in target_fences if m[2].strip() == kind
        ]:
            issues.append("figure_identifiers_changed")
    before, after = prose(source), prose(target)
    metadata_fields = r"^\*\*(Type|Languages?|Prerequisites|Time):\*\*"
    if re.findall(metadata_fields, before, re.M) != re.findall(metadata_fields, after, re.M):
        issues.append("lesson_metadata_fields_changed")
    type_field = r"^\*\*Type:\*\*[ \t]*(.*)$"
    if re.findall(type_field, before, re.M) != re.findall(type_field, after, re.M):
        issues.append("lesson_type_metadata_changed")
    for label, pattern in (("link_targets", LINKS), ("inline_code", INLINE_CODE),
                           ("inline_math", INLINE_MATH)):
        if Counter(pattern.findall(before)) != Counter(pattern.findall(after)):
            issues.append(label + "_changed")
    if Counter(DISPLAY_MATH.findall(source)) != Counter(DISPLAY_MATH.findall(target)):
        issues.append("display_math_changed")
    if re.findall(r"^(#{1,6})\s", before, re.M) != re.findall(r"^(#{1,6})\s", after, re.M):
        issues.append("heading_structure_changed")
    for label, pattern in (("table_rows", r"^\s*\|.*\|\s*$"),
                           ("list_items", r"^\s*(?:[-*+] |\d+[.)] )")):
        if len(re.findall(pattern, before, re.M)) != len(re.findall(pattern, after, re.M)):
            issues.append(label + "_count_changed")
    if not CJK.search(after):
        issues.append("no_chinese_prose")
    return issues


def quiz_issues(source, target, text_keys=QUIZ_TEXT_KEYS):
    issues = []

    def compare(left, right, path="$"):
        if type(left) is not type(right):
            issues.append(path + ":type_changed")
        elif isinstance(left, dict):
            if left.keys() != right.keys():
                issues.append(path + ":keys_changed")
            for key in left.keys() & right.keys():
                if key in text_keys:
                    if type(left[key]) is not type(right[key]):
                        issues.append(path + "." + key + ":type_changed")
                    elif isinstance(left[key], str):
                        continue
                    elif isinstance(left[key], list) and all(isinstance(item, str) for item in left[key]):
                        if len(left[key]) != len(right[key]):
                            issues.append(path + "." + key + ":option_count_changed")
                        if not all(isinstance(item, str) for item in right[key]):
                            issues.append(path + "." + key + ":type_changed")
                        continue
                compare(left[key], right[key], path + "." + key)
        elif isinstance(left, list):
            if len(left) != len(right):
                issues.append(path + ":length_changed")
            for index, (a, b) in enumerate(zip(left, right)):
                compare(a, b, f"{path}[{index}]")
        elif left != right:
            issues.append(path + ":protected_value_changed")

    compare(json.loads(source), json.loads(target))
    return issues


def bilingual_objective(source, target):
    """Natural-language association values retain the complete, exact English suffix."""
    if not isinstance(source, str) or not isinstance(target, str):
        return False
    if re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", source):
        return target == source
    suffix = "（" + source + "）"
    return target.endswith(suffix) and bool(CJK.search(target[:-len(suffix)]))


def track_objective_issues(source, target):
    if not isinstance(target, dict):
        return ["track_type_changed"]
    issues = []
    # Keep domain identity, order, weights and objective order tied to the pinned source.
    if source.get("id") != target.get("id"):
        issues.append("track_id_changed")
    before, after = source.get("domains", []), target.get("domains", [])
    if not isinstance(after, list) or len(before) != len(after):
        return issues + ["track_domains_changed"]
    for index, (left, right) in enumerate(zip(before, after)):
        if not isinstance(right, dict) or any(left.get(key) != right.get(key) for key in ("id", "weight")):
            issues.append(f"domain[{index}]:identity_or_weight_changed")
            continue
        old, new = left.get("objectives", []), right.get("objectives", [])
        if not isinstance(new, list) or len(old) != len(new) or any(
            not bilingual_objective(a, b) for a, b in zip(old, new)
        ):
            issues.append(f"domain[{index}]:objective_english_or_order_changed")
    return issues


def assessment_issues(path, source, target, base):
    before, after = json.loads(source), json.loads(target)
    if not isinstance(after, dict) or not isinstance(after.get("questions"), list):
        return quiz_issues(source, target)
    # Only this schema's question objective is bilingual, never arbitrary JSON machine values.
    for left, right in zip(before.get("questions", []), after.get("questions", [])):
        if isinstance(left, dict) and isinstance(right, dict) and bilingual_objective(left.get("objective"), right.get("objective")):
            right["objective"] = left["objective"]
    issues = quiz_issues(source, json.dumps(after))
    after = json.loads(target)
    track_path = f"certifications/claude/tracks/{Path(path).parent.name}.json"
    try:
        old_track = json.loads(git("show", f"{base}:{track_path}", text=True))
        track = json.loads((ROOT / track_path).read_text(encoding="utf-8"))
    except (OSError, ValueError, subprocess.CalledProcessError):
        return issues + ["assessment_track_unavailable"]
    issues.extend(track_objective_issues(old_track, track))
    if not isinstance(track, dict) or not isinstance(track.get("domains"), list) or not all(
        isinstance(domain, dict) and isinstance(domain.get("objectives"), list) for domain in track["domains"]
    ):
        return issues + ["assessment_track_invalid"]
    if before.get("track") != old_track.get("id") or after.get("track") != track.get("id") or not any(
        declaration.get("path") == path for declaration in old_track.get("assessments", [])
    ):
        issues.append("assessment_track_association_changed")
    for index, (left, right) in enumerate(zip(before.get("questions", []), after.get("questions", []))):
        if not isinstance(left, dict) or not isinstance(right, dict):
            continue
        for question, manifest in ((left, old_track), (right, track)):
            domains = [domain for domain in manifest.get("domains", []) if domain.get("id") == question.get("domain")]
            if len(domains) != 1 or question.get("objective") not in domains[0].get("objectives", []):
                issues.append(f"question[{index}]:objective_domain_association_changed")
                break
    return issues


def svg_issues(source, target):
    before, after = ET.fromstring(source), ET.fromstring(target)
    shapes = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "image", "use"}
    def geometry(root):
        return [(element.tag, {key: value for key, value in element.attrib.items() if key != "aria-label"})
                for element in root.iter() if element.tag.rsplit("}", 1)[-1] in shapes]
    issues = []
    if geometry(before) != geometry(after):
        issues.append("svg_geometry_changed")
    for attribute in ("viewBox", "width", "height"):
        if before.get(attribute) != after.get(attribute):
            issues.append("svg_" + attribute + "_changed")
    old_ids = {element.get("id") for element in before.iter() if element.get("id")}
    new_ids = {element.get("id") for element in after.iter() if element.get("id")}
    if not old_ids <= new_ids:
        issues.append("svg_identifiers_removed")
    return issues


def audit_file(path, source, target, base=BASE):
    record = {"path": path, "source_sha256": hashlib.sha256(source.encode()).hexdigest()}
    if target is None:
        return {**record, "state": "missing", "issues": ["missing_file"]}
    if source == target:
        return {**record, "state": "unchanged", "issues": []}
    record.update(state="changed_requires_review", issues=[])
    if path.endswith(".md"):
        record["issues"] = markdown_issues(source, target)
        record["unchanged_english_lines"] = unchanged_english(source, target)
    elif path.endswith(".svg"):
        try:
            record["issues"] = svg_issues(source, target)
        except ET.ParseError as error:
            record["issues"] = ["invalid_svg:" + str(error)]
    else:
        try:
            json.loads(target)
            if path.startswith("certifications/claude/assessments/"):
                record["issues"] = assessment_issues(path, source, target, base)
            elif path.startswith("certifications/claude/tracks/"):
                record["issues"] = track_objective_issues(json.loads(source), json.loads(target))
            elif path.endswith("/quiz.json") or "/assessments/" in path:
                record["issues"] = quiz_issues(source, target)
            elif path.startswith("learning-paths/"):
                record["issues"] = quiz_issues(source, target, PATH_TEXT_KEYS)
        except (ValueError, TypeError) as error:
            record["issues"] = ["invalid_json:" + str(error)]
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--prefix", default="")
    parser.add_argument("--report", type=Path)
    parser.add_argument("--strict", action="store_true", help="fail on unchanged files or review findings")
    args = parser.parse_args()
    records = []
    for path, source in source_files(args.base):
        if not path.startswith(args.prefix):
            continue
        current = ROOT / path
        target = current.read_text(encoding="utf-8") if current.is_file() else None
        records.append(audit_file(path, source, target, args.base))
    summary = {
        "base": args.base, "scope": args.prefix or "all_document_sources",
        "files": len(records), "states": dict(Counter(item["state"] for item in records)),
        "files_with_structural_findings": sum(bool(item["issues"]) for item in records),
        "files_with_unchanged_english_lines": sum(bool(item.get("unchanged_english_lines")) for item in records),
        "quality_certified": False,
        "excluded_from_this_check": ["other_existing_languages", "LICENSE", "textless_SVGs", "site_UI_and_JS_diagrams", "code_comments"],
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps({"summary": summary, "files": records}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not records:
        raise SystemExit("No source files matched; this is not a successful coverage check.")
    if args.strict and any(item["state"] != "changed_requires_review" or item["issues"] or
                           item.get("unchanged_english_lines") for item in records):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
