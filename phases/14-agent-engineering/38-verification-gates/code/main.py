"""确定性验证门禁：支持覆盖率下限、--strict 严格模式和带签名的例外放行记录。

将任务的范围报告、规则报告、反馈日志和可选覆盖率报告组合成验证报告。
这里不用 LLM 评判；需要主观判断的审查位于第 39 课。例外记录写入 overrides.jsonl，
包含原因、用户、HEAD 提交等信息并签名。

译注：本课 main 使用内存夹具而非真实验收记录；它打印多个判定，即使某任务失败，
进程也不会据此自动返回非零退出码。record_override 只记录例外，不会将它应用到 verify。
缺少 VERIFY_OVERRIDE_SECRET 时，签名操作拒绝使用默认秘密；只有显式设置
VERIFY_DEMO_MODE=1 才允许使用不安全的演示秘密，main 会捕获拒绝并跳过签名演示。
签名原因、载荷键、规范化 JSON、环境变量、错误码及诊断消息全部保留原样。
coverage.below_floor 表示覆盖率低于下限；regression 表示覆盖率回退；
acceptance.missing/failed 表示未执行验收或验收失败；feedback.null_exit 表示退出码缺失。

运行：python3 code/main.py
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import math
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).parent
OVERRIDES_PATH = HERE / "overrides.jsonl"
COVERAGE_FLOOR_DEFAULT = 0.80
COVERAGE_REGRESSION_DELTA = 0.01

# 审计密钥用于签署例外记录；生产环境应从秘密管理服务读取。
# 默认拒绝不安全回退；仅在明确设置 VERIFY_DEMO_MODE=1 时
# 使用演示密钥，并输出醒目警告，防止误用于 CI。
_OVERRIDE_SECRET_ENV = "VERIFY_OVERRIDE_SECRET"
_DEMO_MODE_ENV = "VERIFY_DEMO_MODE"


def _load_override_secret() -> str:
    secret = os.environ.get(_OVERRIDE_SECRET_ENV)
    if secret:
        return secret
    if os.environ.get(_DEMO_MODE_ENV) == "1":
        print(
            f"WARNING: {_OVERRIDE_SECRET_ENV} unset and {_DEMO_MODE_ENV}=1; "
            "using insecure demo secret. Do not record real overrides in this mode.",
            file=sys.stderr,
        )
        return "demo-override-secret-do-not-ship"
    raise RuntimeError(
        f"refused to start: {_OVERRIDE_SECRET_ENV} is unset. "
        f"Set the env var, or pass {_DEMO_MODE_ENV}=1 to run the lesson demo only."
    )


@dataclass
class Finding:
    code: str
    severity: str
    detail: str


@dataclass
class Artifacts:
    task_id: str
    acceptance_commands: list[str]
    feedback: list[dict[str, object]]
    scope_report: dict[str, object]
    rule_report: list[dict[str, object]]
    coverage_report: dict[str, float] | None = None  # current 为当前覆盖率，previous 为前次覆盖率；例如 0.84 和 0.85
    head_commit: str = ""


@dataclass
class VerdictReport:
    task_id: str
    passed: bool
    strict: bool
    findings: list[Finding] = field(default_factory=list)
    coverage: dict[str, float] | None = None
    head_commit: str = ""


def _acceptance_findings(art: Artifacts) -> list[Finding]:
    findings: list[Finding] = []
    commands_run = [str(rec.get("command")) for rec in art.feedback]
    accept_set = set(art.acceptance_commands)
    for cmd in art.acceptance_commands:
        if cmd not in commands_run:
            findings.append(Finding("acceptance.missing", "block", f"never ran: {cmd}"))
    for rec in art.feedback:
        cmd_str = str(rec.get("command"))
        if rec.get("exit_code") is None:
            findings.append(Finding("feedback.null_exit", "block", f"missing exit for {cmd_str}"))
        elif rec.get("exit_code") != 0 and cmd_str in accept_set:
            findings.append(
                Finding("acceptance.failed", "block", f"acceptance exit {rec.get('exit_code')} on {cmd_str}")
            )
    return findings


def _scope_findings(art: Artifacts) -> list[Finding]:
    findings: list[Finding] = []
    if art.scope_report.get("forbidden_writes"):
        findings.append(Finding("scope.forbidden", "block",
                                f"forbidden writes: {art.scope_report['forbidden_writes']}"))
    if art.scope_report.get("off_scope_writes"):
        findings.append(Finding("scope.off_scope", "warn",
                                f"off-scope writes: {art.scope_report['off_scope_writes']}"))
    return findings


def _rule_findings(art: Artifacts) -> list[Finding]:
    return [Finding("rule.failed", "block", f"rule failed: {row.get('slug')}")
            for row in art.rule_report if not row.get("passed")]


def _coverage_findings(art: Artifacts, floor: float) -> list[Finding]:
    """结合可验证结果（测试、覆盖率）与评分标准判断；原文称为 Anthropic Hybrid Norm。

    低于覆盖率下限时阻断；相对前次合并的覆盖率下降超过
    COVERAGE_REGRESSION_DELTA 时阻断，较小幅度下降则记为警告。
    """
    findings: list[Finding] = []
    if not art.coverage_report:
        findings.append(Finding("coverage.missing", "warn",
                                "no coverage_report.json; cannot enforce floor"))
        return findings
    current = float(art.coverage_report.get("current", 0.0))
    previous = float(art.coverage_report.get("previous", current))
    if current < floor:
        findings.append(Finding("coverage.below_floor", "block",
                                f"coverage {current:.2%} below floor {floor:.0%}"))
    delta = previous - current
    if delta > COVERAGE_REGRESSION_DELTA and not math.isclose(
        delta, COVERAGE_REGRESSION_DELTA, rel_tol=1e-9
    ):
        findings.append(Finding("coverage.regression", "block",
                                f"coverage dropped {delta:.2%} (prev {previous:.2%} -> {current:.2%})"))
    elif delta > 0 and not math.isclose(delta, 0.0, abs_tol=1e-12):
        findings.append(Finding("coverage.minor_regression", "warn",
                                f"coverage dropped {delta:.2%}"))
    return findings


def verify(
    art: Artifacts,
    strict: bool = False,
    coverage_floor: float = COVERAGE_FLOOR_DEFAULT,
) -> VerdictReport:
    findings = (
        _acceptance_findings(art)
        + _scope_findings(art)
        + _rule_findings(art)
        + _coverage_findings(art, coverage_floor)
    )
    if strict:
        # --strict 将每条警告升级为阻断；原文建议仅在发布分支中显式启用。
        findings = [Finding(f.code, "block" if f.severity == "warn" else f.severity, f.detail)
                    for f in findings]
    blocking = [f for f in findings if f.severity == "block"]
    return VerdictReport(
        task_id=art.task_id,
        passed=not blocking,
        strict=strict,
        findings=findings,
        coverage=art.coverage_report,
        head_commit=art.head_commit,
    )


def _sign(payload: dict[str, object]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hmac.new(_load_override_secret().encode(), canonical, hashlib.sha256).hexdigest()[:32]


def record_override(
    task_id: str, finding_code: str, reason: str, user_id: str, head_commit: str
) -> dict[str, object]:
    """追加带签名的例外记录；五个必填字段中任何一个为空时都拒绝记录。"""
    if not all([task_id, finding_code, reason, user_id, head_commit]):
        raise ValueError("override requires task_id, finding_code, reason, user_id, head_commit")
    payload = {
        "task_id": task_id,
        "finding_code": finding_code,
        "reason": reason,
        "user_id": user_id,
        "head_commit": head_commit,
        "ts": time.time(),
    }
    payload["signature"] = _sign({k: v for k, v in payload.items() if k != "signature"})
    with OVERRIDES_PATH.open("a") as fh:
        fh.write(json.dumps(payload) + "\n")
    return payload


def verify_signature(entry: dict[str, object]) -> bool:
    expected = entry.get("signature")
    payload = {k: v for k, v in entry.items() if k != "signature"}
    return hmac.compare_digest(_sign(payload), str(expected))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="将所有 warn（警告）升级为 block（阻断）")
    ap.add_argument("--floor", type=float, default=COVERAGE_FLOOR_DEFAULT)
    args = ap.parse_args()

    accept = ["pytest -x test_app.py::test_signup_rejects_short_password"]
    cases = [
        Artifacts(
            task_id="T-001",
            acceptance_commands=accept,
            feedback=[{"command": accept[0], "exit_code": 0}],
            scope_report={"forbidden_writes": [], "off_scope_writes": []},
            rule_report=[{"slug": "done/tests-pass", "passed": True}],
            coverage_report={"current": 0.84, "previous": 0.85},
            head_commit="a1b2c3d",
        ),
        Artifacts(
            task_id="T-002",
            acceptance_commands=accept,
            feedback=[{"command": accept[0], "exit_code": 0}],
            scope_report={"forbidden_writes": ["scripts/release.sh"], "off_scope_writes": ["README.md"]},
            rule_report=[{"slug": "forbidden/no-release-script-edits", "passed": False}],
            coverage_report={"current": 0.62, "previous": 0.80},
            head_commit="b2c3d4e",
        ),
        Artifacts(
            task_id="T-003",
            acceptance_commands=accept,
            feedback=[],
            scope_report={"forbidden_writes": [], "off_scope_writes": []},
            rule_report=[{"slug": "done/tests-pass", "passed": False}],
            head_commit="c3d4e5f",
        ),
    ]

    for art in cases:
        report = verify(art, strict=args.strict, coverage_floor=args.floor)
        path = HERE / f"verification_report_{art.task_id}.json"
        path.write_text(json.dumps(
            {"task_id": report.task_id, "passed": report.passed, "strict": report.strict,
             "head_commit": report.head_commit, "coverage": report.coverage,
             "findings": [asdict(f) for f in report.findings]},
            indent=2) + "\n")
        flag = " （严格模式）" if report.strict else ""
        print(f"任务 {report.task_id}{flag}：是否通过={report.passed} 检查发现数={len(report.findings)}")
        for f in report.findings:
            print(f"  [{f.severity}] {f.code}: {f.detail}")
        print()

    # 针对 T-002 实际产生的越界警告演示带签名的例外记录。
    try:
        entry = record_override(
            task_id="T-002",
            finding_code="scope.off_scope",
            reason="reviewer approved README update for the new signup contract",
            user_id="rohitg00",
            head_commit="b2c3d4e",
        )
        print(f"例外已记录：签名={entry['signature']} 签名验证={verify_signature(entry)}")
    except RuntimeError as exc:
        print(f"已跳过例外签名演示：{exc}")


if __name__ == "__main__":
    main()
