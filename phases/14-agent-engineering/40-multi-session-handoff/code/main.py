"""从工作台产物生成交接包。

读取状态、验证判定、审查结果和反馈（本例在内存中预设），
生成供人阅读的 handoff.md 和供下一智能体读取的 handoff.json。

译注：JSON 字段、命令、文件路径和严重程度保持原样；摘要、风险说明和 Markdown 中文化。
trim_feedback 保留最近 TAIL_K 条记录，以及此前所有非零退出码记录，因此并不保证
总记录数不超过 TAIL_K；缺失退出码在这里也未自动列入失败尝试。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).parent
TAIL_K = 5


@dataclass
class WorkbenchSnapshot:
    task_id: str
    state: dict[str, object]
    verdict: dict[str, object]
    review: dict[str, object]
    feedback: list[dict[str, object]]
    diff_summary: dict[str, list[str]]


@dataclass
class HandoffPayload:
    task_id: str
    summary: str
    changed_files: list[str]
    commands_run: list[str]
    failed_attempts: list[str]
    open_risks: list[dict[str, str]]
    next_action: str
    verdict_pointer: dict[str, str]
    feedback_tail: list[dict[str, object]] = field(default_factory=list)


def trim_feedback(records: list[dict[str, object]]) -> list[dict[str, object]]:
    tail = records[-TAIL_K:]
    nonzero = [r for r in records if r.get("exit_code") not in (0, None)]
    out: list[dict[str, object]] = []
    seen: set[int] = set()
    for r in tail + nonzero:
        key = id(r)
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def derive_risks(snapshot: WorkbenchSnapshot) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    for f in snapshot.verdict.get("findings", []) or []:
        if isinstance(f, dict) and f.get("severity") in ("warn", "block"):
            risks.append({"severity": str(f.get("severity")), "detail": str(f.get("detail"))})
    for blocker in snapshot.state.get("blockers") or []:
        risks.append({"severity": "warn", "detail": f"尚未解决的阻塞项：{blocker}"})
    raw_total = snapshot.review.get("total", 10)
    try:
        safe_total = int(raw_total)
    except (TypeError, ValueError):
        safe_total = 10
    if safe_total < 7:
        risks.append({"severity": "warn", "detail": f"审查总分 {raw_total} 低于 7 分"})
    return risks


def generate_handoff(snapshot: WorkbenchSnapshot) -> tuple[str, HandoffPayload]:
    next_action = str(snapshot.state.get("next_action") or "未记录下一步动作，需要人工确认")
    payload = HandoffPayload(
        task_id=snapshot.task_id,
        summary=f"任务 {snapshot.task_id}：审查={snapshot.review.get('verdict')}，验证门禁={snapshot.verdict.get('passed')}",
        changed_files=snapshot.diff_summary.get("touched", []),
        commands_run=[str(r.get("command")) for r in snapshot.feedback],
        failed_attempts=[
            f"{r.get('command')} -> 退出码 {r.get('exit_code')}"
            for r in snapshot.feedback
            if r.get("exit_code") not in (0, None)
        ],
        open_risks=derive_risks(snapshot),
        next_action=next_action,
        verdict_pointer={
            "verdict": f"outputs/verification/{snapshot.task_id}.json",
            "review": f"outputs/review/{snapshot.task_id}.json",
        },
        feedback_tail=trim_feedback(snapshot.feedback),
    )

    def _bullets(items: list[str]) -> list[str]:
        return items or ["- 无"]

    md_lines = [
        f"# 交接记录：{payload.task_id}",
        "",
        f"**摘要。** {payload.summary}",
        "",
        "## 变更文件",
        *_bullets([f"- `{f}`" for f in payload.changed_files]),
        "",
        "## 已运行命令",
        *_bullets([f"- `{c}`" for c in payload.commands_run]),
        "",
        "## 失败尝试",
        *_bullets([f"- {f}" for f in payload.failed_attempts]),
        "",
        "## 未解决风险",
        *_bullets([f"- [{r['severity']}] {r['detail']}" for r in payload.open_risks]),
        "",
        "## 下一步动作",
        f"{payload.next_action}",
        "",
        "## 验证与审查回执",
        f"- 验证判定：`{payload.verdict_pointer['verdict']}`",
        f"- 审查结果：`{payload.verdict_pointer['review']}`",
    ]
    return "\n".join(md_lines) + "\n", payload


def main() -> None:
    snapshot = WorkbenchSnapshot(
        task_id="T-001",
        state={
            "active_task_id": None,
            "blockers": ["等待确定速率限制的时间窗口"],
            "next_action": "根据当前差异创建拉取请求，并请求审查",
        },
        verdict={"passed": True, "findings": [{"severity": "warn", "detail": "超出范围：README.md"}]},
        review={"verdict": "pass", "total": 8},
        feedback=[
            {"command": "pytest", "exit_code": 0},
            {"command": "ruff check .", "exit_code": 0},
            {"command": "pytest test_signup.py", "exit_code": 1},
            {"command": "pytest test_signup.py", "exit_code": 0},
        ],
        diff_summary={"touched": ["app/signup.py", "tests/test_signup.py", "README.md"]},
    )

    md, payload = generate_handoff(snapshot)
    (HERE / "handoff.md").write_text(md)
    (HERE / "handoff.json").write_text(json.dumps(asdict(payload), indent=2, ensure_ascii=False) + "\n")
    print(md)


if __name__ == "__main__":
    main()
