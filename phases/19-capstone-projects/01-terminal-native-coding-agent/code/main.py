"""终端原生编码智能体：最小的计划／行动／观察循环。

本例用 Python 标准库串联结构化计划、预算限制、工具派发与生命周期钩子。
模型由确定性脚本代替，不调用网络 LLM，便于观察每轮计划重写、工具动作、
异常记录和终止条件。运行方式：python main.py

译注：这是运行框架示意，不是实际修复代码的智能体。工具只列目录和读取
README.md，随后脚本直接把事项标记为 done；未编辑文件，也未运行修复验收。
code/ 目录原本没有 README.md，默认读取会失败，但循环仍继续到预设完成状态。

run_shell 使用真实 shell，仅设置工作目录，并非安全沙箱；read_file 的路径
前缀判断也不是完整隔离保证。不要传入不可信命令或用于包含重要数据的目录。
TRUNCATE_BYTES 实际限制字符串字符数；上下文压缩和观察结果反馈给模型均未实现。
预算只在每轮开始检查，单轮模型调用及随后工具仍可能使预算超限。
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable


# ---------------------------------------------------------------------------
# 计划状态：类似 TodoWrite，每轮整体重写。
# ---------------------------------------------------------------------------

@dataclass
class TodoItem:
    id: int
    description: str
    status: str  # 状态：待处理 | 进行中 | 完成 | 失败；英文枚举保持不变。
    note: str = ""


@dataclass
class PlanState:
    goal: str
    items: list[TodoItem] = field(default_factory=list)

    def summary(self) -> str:
        lines = [f"目标：{self.goal}"]
        for it in self.items:
            mark = {"pending": " ", "in_progress": ">", "done": "x", "failed": "!"}[it.status]
            lines.append(f"  [{mark}] {it.id}. {it.description}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# 预算：轮次、词元和费用上限；只在循环开头检查，不是预扣额度。
# ---------------------------------------------------------------------------

@dataclass
class Budget:
    max_turns: int = 50
    max_tokens: int = 200_000
    max_dollars: float = 5.00
    turns_used: int = 0
    tokens_used: int = 0
    dollars_used: float = 0.0

    def step(self, tokens: int, dollars: float) -> None:
        self.turns_used += 1
        self.tokens_used += tokens
        self.dollars_used += dollars

    def exceeded(self) -> str | None:
        if self.turns_used >= self.max_turns:
            return "turn_limit"
        if self.tokens_used >= self.max_tokens:
            return "token_limit"
        if self.dollars_used >= self.max_dollars:
            return "dollar_limit"
        return None


# ---------------------------------------------------------------------------
# 钩子：原例列出八类事件；注册事件并不意味着所有事件都会被触发。
# ---------------------------------------------------------------------------

HookFn = Callable[[dict[str, Any]], dict[str, Any]]


class HookBus:
    EVENTS = ("SessionStart", "SessionEnd", "PreToolUse", "PostToolUse",
              "UserPromptSubmit", "Notification", "Stop", "PreCompact")

    def __init__(self) -> None:
        self._hooks: dict[str, list[HookFn]] = {e: [] for e in self.EVENTS}

    def on(self, event: str, fn: HookFn) -> None:
        self._hooks[event].append(fn)

    def fire(self, event: str, payload: dict[str, Any]) -> dict[str, Any]:
        for fn in self._hooks[event]:
            payload = fn(payload) or payload
        return payload


# ---------------------------------------------------------------------------
# 工具接口：实际仅有两个工具；返回截断文本，但没有真正的执行沙箱。
# ---------------------------------------------------------------------------

TRUNCATE_BYTES = 4096


def tool_read_file(sandbox: str, path: str) -> str:
    full = os.path.join(sandbox, path)
    if not os.path.realpath(full).startswith(os.path.realpath(sandbox)):
        # 路径越出示例根目录；英文异常被原样保留。此 startswith 判断仍存在同前缀目录边界问题。
        raise RuntimeError("path escapes sandbox")
    with open(full, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()[:TRUNCATE_BYTES]


def tool_run_shell(sandbox: str, cmd: str, timeout: int = 30) -> str:
    proc = subprocess.run(cmd, cwd=sandbox, shell=True, capture_output=True,
                          text=True, timeout=timeout)
    out = (proc.stdout + proc.stderr)[:TRUNCATE_BYTES]
    return f"exit={proc.returncode}\n{out}"


TOOLS: dict[str, Callable[..., str]] = {
    "read_file": tool_read_file,
    "run_shell": tool_run_shell,
}


# ---------------------------------------------------------------------------
# 模型桩：用确定性脚本驱动循环，无需 LLM 即可测试。
# ---------------------------------------------------------------------------

SCRIPT = [
    {"plan": [("定位目标文件", "in_progress"),
              ("读取并诊断", "pending"),
              ("应用修复并验证（脚本预设状态）", "pending")],
     "tool": ("run_shell", {"cmd": "ls"}),
     "tokens": 1200, "cost": 0.02},
    {"plan": [("定位目标文件", "done"),
              ("读取并诊断", "in_progress"),
              ("应用修复并验证（脚本预设状态）", "pending")],
     "tool": ("read_file", {"path": "README.md"}),
     "tokens": 900, "cost": 0.02},
    {"plan": [("定位目标文件", "done"),
              ("读取并诊断", "done"),
              ("应用修复并验证（脚本预设状态）", "done")],
     "tool": None,  # 终止轮次。
     "tokens": 600, "cost": 0.01},
]


def model_step(plan: PlanState, turn: int) -> dict[str, Any]:
    """模型桩：返回重写后的计划，以及可选的工具调用；不读取观察结果。"""
    if turn >= len(SCRIPT):
        return {"plan": plan.items, "tool": None, "tokens": 200, "cost": 0.005}
    s = SCRIPT[turn]
    items = [TodoItem(i + 1, desc, status) for i, (desc, status) in enumerate(s["plan"])]
    return {"plan": items, "tool": s["tool"], "tokens": s["tokens"], "cost": s["cost"]}


# ---------------------------------------------------------------------------
# 主循环：计划／行动／记录结果，并在异常后继续；接入示例钩子。
# ---------------------------------------------------------------------------

def destructive_guard(payload: dict[str, Any]) -> dict[str, Any]:
    cmd = payload.get("args", {}).get("cmd", "")
    if "rm -rf" in cmd or "shutdown" in cmd:
        payload["blocked"] = True
        # PreToolUse 钩子拦截破坏性命令；原例仅检查两个子串，不构成通用命令安全策略。
        payload["reason"] = "destructive command blocked by PreToolUse hook"
    return payload


def run_agent(task: str, sandbox: str) -> dict[str, Any]:
    plan = PlanState(goal=task, items=[])
    budget = Budget()
    hooks = HookBus()
    trace: list[dict[str, Any]] = []

    hooks.on("PreToolUse", destructive_guard)
    hooks.on("PostToolUse", lambda p: (trace.append({"event": "tool", **p}), p)[1])
    hooks.on("SessionStart", lambda p: (trace.append({"event": "start", **p}), p)[1])
    hooks.on("SessionEnd", lambda p: (trace.append({"event": "end", **p}), p)[1])

    hooks.fire("SessionStart", {"task": task, "sandbox": sandbox,
                                "started_at": time.time()})

    turn = 0
    while True:
        stop = budget.exceeded()
        if stop:
            hooks.fire("Stop", {"reason": stop, "turn": turn})
            break

        step = model_step(plan, turn)
        plan.items = step["plan"]
        budget.step(step["tokens"], step["cost"])

        call = step["tool"]
        if call is None:
            hooks.fire("Stop", {"reason": "complete", "turn": turn})
            break

        name, args = call
        pre = hooks.fire("PreToolUse", {"tool": name, "args": args})
        if pre.get("blocked"):
            hooks.fire("PostToolUse", {"tool": name, "blocked": True,
                                       "reason": pre.get("reason", "")})
            turn += 1
            continue

        try:
            result = TOOLS[name](sandbox, **args)
            hooks.fire("PostToolUse", {"tool": name, "ok": True,
                                       # 轨迹字段名保留为 bytes，但 len(result) 实际统计 Python 字符数。
                                       "bytes": len(result)})
        except Exception as exc:
            hooks.fire("PostToolUse", {"tool": name, "ok": False,
                                       "error": str(exc)})

        turn += 1

    hooks.fire("SessionEnd", {"turns": budget.turns_used,
                              "tokens": budget.tokens_used,
                              "dollars": budget.dollars_used})

    return {"plan": plan.summary(), "budget": asdict(budget), "trace": trace}


def main() -> None:
    task = "在不调用网络模型的情况下演示计划／行动／观察循环"
    sandbox = os.path.dirname(os.path.abspath(__file__))
    result = run_agent(task, sandbox)
    print(result["plan"])
    print("---")
    print(f"轮次={result['budget']['turns_used']} "
          f"词元={result['budget']['tokens_used']} "
          f"费用=${result['budget']['dollars_used']:.3f}")
    print("---")
    print(f"轨迹事件数：{len(result['trace'])}")
    for ev in result["trace"]:
        print(" ", json.dumps(ev, default=str))


if __name__ == "__main__":
    main()
