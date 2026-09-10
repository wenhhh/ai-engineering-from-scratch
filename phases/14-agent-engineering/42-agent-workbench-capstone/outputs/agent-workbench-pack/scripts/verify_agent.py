#!/usr/bin/env python3
"""确定性验证门禁，参见阶段 14 第 38 课。

根据已记录的验收命令、范围报告和规则结果生成判定。机器诊断保持英文：
acceptance.missing/failed 为验收缺失/失败，feedback.null_exit 为退出码缺失，
scope.forbidden/off_scope 为禁止修改/越界修改，rule.failed 为规则未通过。

重要限制：此打包版不含覆盖率、严格模式或签名例外；缺少文件时读取空对象/列表。
如果验收、反馈、范围与规则记录全部缺失，当前实现可能仍返回 passed=true。
这是保留原行为的教学示例，不是生产环境中默认拒绝缺证据的安全门禁。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(ln) for ln in path.read_text().splitlines() if ln.strip()]


def _normalize_command(cmd) -> str:
    if isinstance(cmd, list):
        return " ".join(str(part) for part in cmd)
    return str(cmd)


def check_acceptance(accept: list[str], feedback: list[dict]) -> list[dict]:
    findings: list[dict] = []
    commands_run = [_normalize_command(r.get("command")) for r in feedback]
    accept_set = set(accept)
    for cmd in accept:
        if cmd not in commands_run:
            findings.append({"code": "acceptance.missing", "severity": "block", "detail": f"never ran: {cmd}"})
    for r in feedback:
        cmd_str = _normalize_command(r.get("command"))
        if r.get("exit_code") is None:
            findings.append({"code": "feedback.null_exit", "severity": "block", "detail": f"missing exit for {cmd_str}"})
        elif r.get("exit_code") != 0 and cmd_str in accept_set:
            findings.append({"code": "acceptance.failed", "severity": "block",
                             "detail": f"exit {r.get('exit_code')} on {cmd_str}"})
    return findings


def check_scope(scope_report: dict) -> list[dict]:
    findings: list[dict] = []
    if scope_report.get("forbidden_writes"):
        findings.append({"code": "scope.forbidden", "severity": "block",
                         "detail": f"forbidden writes: {scope_report['forbidden_writes']}"})
    if scope_report.get("off_scope_writes"):
        findings.append({"code": "scope.off_scope", "severity": "warn",
                         "detail": f"off-scope writes: {scope_report['off_scope_writes']}"})
    return findings


def check_rules(rule_report: list[dict]) -> list[dict]:
    return [{"code": "rule.failed", "severity": "block", "detail": f"rule failed: {row.get('slug')}"}
            for row in rule_report if not row.get("passed")]


def run_checks(task_id: str) -> dict[str, object]:
    accept = list(_load_json(ROOT / f"outputs/scope/closed/{task_id}.json", {}).get("acceptance_criteria", []))
    feedback = _load_jsonl(ROOT / "feedback_record.jsonl")
    scope_report = _load_json(ROOT / f"outputs/scope/closed/{task_id}.report.json", {})
    rule_report = _load_json(ROOT / "outputs/rule_report.json", [])
    findings = check_acceptance(accept, feedback) + check_scope(scope_report) + check_rules(rule_report)
    return {"task_id": task_id, "passed": not any(f["severity"] == "block" for f in findings), "findings": findings}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("task_id")
    args = ap.parse_args()
    report = run_checks(args.task_id)
    out = ROOT / "outputs" / "verification" / f"{args.task_id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["passed"]:
        print("验证失败", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
