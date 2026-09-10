"""计划并执行智能体：失败后重新规划、计划差异与双重预算。

概念参考：
- ../docs/en.md（本课中文说明，沿用原文件名；英文原文在包内 english-source/ 的对应路径）
- 阶段 14 第 01 课：智能体循环基础
- 阶段 13 第 02 课：工具协议概览

仅使用标准库。在课程目录运行：python3 code/main.py

译注：两项预算分别限制执行步数与重新规划次数，不是费用预算。
演示使用确定性计划器和内存工具结果，不调用真实模型或后端。
expected_outcome 只用于计划描述，不会自动校验实际结果；goal_met 表示计划
执行完毕，并不证明业务目标经过独立验收。状态、事件与错误匹配字符串保持原值。
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Step:
    id: int
    tool_name: str
    args: dict
    expected_outcome: str
    result: Any | None = None
    error: str | None = None

    def signature(self) -> tuple:
        return (self.tool_name, json.dumps(self.args, sort_keys=True))


@dataclass
class PlanDiff:
    revision: int
    removed: list[int]
    added: list[int]
    revised: list[int]

    def to_dict(self) -> dict:
        return {
            "revision": self.revision,
            "removed": list(self.removed),
            "added": list(self.added),
            "revised": list(self.revised),
        }


@dataclass
class Event:
    type: str
    payload: dict
    ts: float = field(default_factory=time.time)


@dataclass
class SessionResult:
    status: str
    reason: str
    history: list[Step]
    revisions: list[PlanDiff]
    events: list[Event]

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "reason": self.reason,
            "history": [
                {"id": s.id, "tool": s.tool_name, "args": s.args,
                 "result": s.result, "error": s.error}
                for s in self.history
            ],
            "revisions": [r.to_dict() for r in self.revisions],
            "events": [{"type": e.type, "payload": e.payload, "ts": e.ts} for e in self.events],
        }


Planner = Callable[[str, list[Step], str | None], list[Step]]
ToolExecutor = Callable[[str, dict], Any]


class ToolFailure(Exception):
    pass


def _diff_plans(old: list[Step], new: list[Step], revision: int) -> PlanDiff:
    old_ids = {s.id for s in old}
    new_ids = {s.id for s in new}
    removed = sorted(old_ids - new_ids)
    added = sorted(new_ids - old_ids)
    revised: list[int] = []
    old_by_id = {s.id: s for s in old}
    for s in new:
        if s.id in old_ids and old_by_id[s.id].signature() != s.signature():
            revised.append(s.id)
    return PlanDiff(revision=revision, removed=removed, added=added, revised=revised)


class PlanExecuteAgent:
    """顺序执行计划，在步骤失败后重新规划。"""

    def __init__(
        self,
        planner: Planner,
        executor: ToolExecutor,
        *,
        max_steps: int = 12,
        max_replans: int = 5,
    ) -> None:
        self._planner = planner
        self._executor = executor
        self.max_steps = max_steps
        self.max_replans = max_replans
        self._events: list[Event] = []

    def _emit(self, etype: str, payload: dict) -> None:
        self._events.append(Event(type=etype, payload=payload))

    def run(self, goal: str) -> SessionResult:
        self._events = []
        history: list[Step] = []
        revisions: list[PlanDiff] = []
        steps_taken = 0
        replans_used = 0
        last_error: str | None = None

        plan = self._planner(goal, history, None)
        self._emit("plan.commit", {"revision": 0, "steps": _summarize(plan)})

        if not plan:
            self._emit("session.complete", {"reason": "no_plan"})
            return SessionResult(
                status="failed", reason="no_plan",
                history=history, revisions=revisions, events=list(self._events),
            )

        cursor = 0
        revision = 0

        while cursor < len(plan):
            if steps_taken >= self.max_steps:
                self._emit("session.complete", {"reason": "step_budget"})
                return SessionResult(
                    status="failed", reason="step_budget",
                    history=history, revisions=revisions, events=list(self._events),
                )

            step = plan[cursor]
            self._emit("step.start", {"step_id": step.id, "tool": step.tool_name})
            try:
                step.result = self._executor(step.tool_name, step.args)
                self._emit("step.end", {"step_id": step.id, "outcome": "ok"})
                history.append(step)
                cursor += 1
                steps_taken += 1
                continue
            except Exception as exc:
                step.error = f"{type(exc).__name__}: {exc}"
                self._emit("step.end", {"step_id": step.id, "outcome": "error", "error": step.error})
                history.append(step)
                steps_taken += 1
                last_error = step.error

            if replans_used >= self.max_replans:
                self._emit("session.complete", {"reason": "replan_budget"})
                return SessionResult(
                    status="failed", reason="replan_budget",
                    history=history, revisions=revisions, events=list(self._events),
                )

            replans_used += 1
            revision += 1
            new_plan = self._planner(goal, history, last_error)
            self._emit("plan.draft", {"revision": revision, "steps": _summarize(new_plan)})
            if not new_plan:
                self._emit("session.complete", {"reason": "no_plan"})
                return SessionResult(
                    status="failed", reason="no_plan",
                    history=history, revisions=revisions, events=list(self._events),
                )
            diff = _diff_plans(plan[cursor:], new_plan, revision)
            revisions.append(diff)
            self._emit("plan.diff", diff.to_dict())
            plan = new_plan
            cursor = 0
            self._emit("plan.commit", {"revision": revision, "steps": _summarize(plan)})

        self._emit("session.complete", {"reason": "goal_met"})
        return SessionResult(
            status="completed", reason="goal_met",
            history=history, revisions=revisions, events=list(self._events),
        )


def _summarize(plan: list[Step]) -> list[dict]:
    return [{"id": s.id, "tool": s.tool_name, "outcome": s.expected_outcome} for s in plan]


def make_deterministic_planner(fail_step_id: int | None, recovery: str = "route_around") -> Planner:
    """演示与测试使用的计划器。

    指定 ``fail_step_id`` 后，会在初始计划中对应步骤的参数里加入 ``_force_fail``
    标记。识别该标记的执行器会在该步抛出异常，以覆盖重新规划路径。
    修订后的计划移除该标记，使绕行恢复路径可以成功。
    """

    def planner(goal: str, history: list[Step], last_error: str | None) -> list[Step]:
        if last_error is None:
            initial = [
                # 预期结果：已加载用户输入。该字段是描述，不是验证结果。
                Step(1, "fetch", {"key": "input"}, "loaded user input"),
                # 预期结果：已计算 v1 格式。
                Step(2, "transform", {"mode": "v1"}, "computed v1 form"),
                # 预期结果：已渲染输出。
                Step(3, "render", {}, "rendered output"),
                # 预期结果：已提交给后端；演示没有真实后端提交。
                Step(4, "submit", {}, "submitted to backend"),
            ]
            if fail_step_id is not None:
                for s in initial:
                    if s.id == fail_step_id:
                        s.args = {**s.args, "_force_fail": True}
            return initial
        if recovery == "route_around" and "transform" in last_error:
            return [
                # 预期结果：已使用回退方案计算。
                Step(2, "transform", {"mode": "v2"}, "computed via fallback"),
                # 预期结果：已渲染输出。
                Step(3, "render", {}, "rendered output"),
                # 预期结果：已提交给后端；演示没有真实后端提交。
                Step(4, "submit", {}, "submitted to backend"),
            ]
        if recovery == "give_up":
            return [
                # 预期结果：已记录失败。
                Step(98, "log_failure", {"why": last_error or ""}, "logged failure"),
                # 预期结果：已通知用户。
                Step(99, "notify_user", {}, "told the user"),
            ]
        return []

    return planner


def _demo() -> None:
    counters = {"transform_v1_calls": 0}

    def executor(tool: str, args: dict) -> Any:
        if args.get("_force_fail"):
            counters["transform_v1_calls"] += 1
            raise ToolFailure(f"{tool} marker-forced failure")
        if tool == "fetch":
            return {"k": "v"}
        if tool == "transform":
            if args.get("mode") == "v1":
                counters["transform_v1_calls"] += 1
                raise ToolFailure("transform v1 backend down")
            return {"ok": True}
        if tool == "render":
            return "html"
        if tool == "submit":
            return {"id": 1}
        if tool in ("log_failure", "notify_user"):
            return "logged"
        raise ToolFailure(f"unknown tool {tool}")

    agent = PlanExecuteAgent(
        planner=make_deterministic_planner(fail_step_id=2, recovery="route_around"),
        executor=executor,
        max_steps=12, max_replans=5,
    )
    # 固定目标：交付报告。
    res = agent.run("ship the report")
    print(json.dumps({
        "status": res.status,
        "reason": res.reason,
        "history": [(s.id, s.tool_name, bool(s.error)) for s in res.history],
        "revisions": [r.to_dict() for r in res.revisions],
        "events": [e.type for e in res.events],
        "transform_v1_calls": counters["transform_v1_calls"],
    }, indent=2))


if __name__ == "__main__":
    _demo()
