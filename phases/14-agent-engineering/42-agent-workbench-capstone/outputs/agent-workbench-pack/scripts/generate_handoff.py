#!/usr/bin/env python3
"""会话结束交接包生成器，参见阶段 14 第 40 课。

输出供人阅读的 Markdown 与供程序读取的 JSON；字段、命令、路径和状态值保留英文。
缺失输入会回退为空数据，本例不会独立强制执行会话结束钩子或验证所有回执是否存在。
"""

from __future__ import annotations

import argparse
import json
import sys
import time
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


def derive_risks(verdict: dict, state: dict, review: dict) -> list[dict[str, str]]:
    risks: list[dict[str, str]] = []
    for f in verdict.get("findings", []) or []:
        if isinstance(f, dict) and f.get("severity") in ("warn", "block"):
            risks.append({"severity": str(f.get("severity")), "detail": str(f.get("detail"))})
    for blocker in state.get("blockers") or []:
        risks.append({"severity": "warn", "detail": f"尚未解决的阻塞项：{blocker}"})
    try:
        total = int(review.get("total", 10))
    except (TypeError, ValueError):
        total = 10
    if total < 7:
        risks.append({"severity": "warn", "detail": f"审查总分 {review.get('total')} 低于 7 分"})
    return risks


def generate_handoff(task_id: str, session_id: str | None = None) -> dict[str, object]:
    state = _load_json(ROOT / "agent_state.json", {})
    verdict = _load_json(ROOT / "outputs" / "verification" / f"{task_id}.json", {})
    review = _load_json(ROOT / "outputs" / "review" / f"{task_id}.json", {})
    feedback = _load_jsonl(ROOT / "feedback_record.jsonl")
    diff = _load_json(ROOT / "outputs" / "diff_summary.json", {})

    payload = {
        "session_id": session_id or str(int(time.time())),
        "timestamp": time.time(),
        "task_id": task_id,
        "summary": f"任务 {task_id}：验证门禁={verdict.get('passed')} 审查={review.get('verdict')}",
        "changed_files": diff.get("touched", []),
        "commands_run": [str(r.get("command")) for r in feedback],
        "failed_attempts": [
            f"{r.get('command')} -> 退出码 {r.get('exit_code')}"
            for r in feedback if r.get("exit_code") not in (0, None)
        ],
        "open_risks": derive_risks(verdict, state, review),
        "next_action": str(state.get("next_action") or "未记录下一步动作，需要人工确认"),
        "verdict_pointer": {
            "verdict": f"outputs/verification/{task_id}.json",
            "review": f"outputs/review/{task_id}.json",
        },
    }
    out = ROOT / "outputs" / "handoff" / payload["session_id"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "handoff.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    (out / "handoff.md").write_text(_render_markdown(payload))
    return payload


def _render_markdown(p: dict[str, object]) -> str:
    def bullets(items):
        return [f"- {x}" for x in items] or ["- 无"]
    lines = [
        f"# 交接记录：{p['task_id']}",
        "",
        f"**摘要。** {p['summary']}",
        "",
        "## 变更文件",
        *bullets(p["changed_files"]),
        "",
        "## 已运行命令",
        *bullets(p["commands_run"]),
        "",
        "## 失败尝试",
        *bullets(p["failed_attempts"]),
        "",
        "## 未解决风险",
        *bullets([f"[{r['severity']}] {r['detail']}" for r in p["open_risks"]]),
        "",
        "## 下一步动作",
        str(p["next_action"]),
        "",
        "## 验证与审查回执",
        f"- 验证判定：`{p['verdict_pointer']['verdict']}`",
        f"- 审查结果：`{p['verdict_pointer']['review']}`",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("task_id")
    ap.add_argument("--session-id", default=None)
    args = ap.parse_args()
    try:
        payload = generate_handoff(args.task_id, args.session_id)
    except Exception as exc:
        print(f"交接生成失败：{exc}", file=sys.stderr)
        return 1
    print(f"已写入 outputs/handoff/{payload['session_id']}/{{handoff.json,handoff.md}}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
