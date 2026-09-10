"""多智能体协作的四类基本概念，仅使用 Python 标准库。

本例以 Agent（智能体）、交接、SharedState（共享消息池）和 Orchestrator（编排器）
描述协作结构，用研究者 -> 写作者 -> 审阅者的同一条流水线，比较固定顺序、
智能体主动交接和选择器调度。所有策略均为预设 Python 函数，不调用 LLM。

译注：原文概念列表中的 tools 和独立 Handoff 类型未在此实现；交接通过消息内的
handoff 字段表达。所谓 LLM 选择器实际采用轮询规则。共享池操作使用锁，但快照是
浅复制，消息对象仍被共享，不能据此保证任意调用方修改消息时的线程安全。
研究笔记中的年份和数量沿用原文夹具，没有在本轮重新核验。
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Callable, Optional


Message = dict


@dataclass
class SharedState:
    messages: list[Message] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def append(self, msg: Message) -> None:
        with self._lock:
            self.messages.append(msg)

    def snapshot(self) -> list[Message]:
        with self._lock:
            return list(self.messages)

    def last_by(self, name: str) -> Optional[Message]:
        with self._lock:
            for m in reversed(self.messages):
                if m["from"] == name:
                    return m
            return None


@dataclass
class Agent:
    name: str
    system_prompt: str
    policy: Callable[[SharedState], Message]

    def run(self, state: SharedState) -> Message:
        msg = self.policy(state)
        msg.setdefault("from", self.name)
        return msg


def researcher_policy(state: SharedState) -> Message:
    n = len([m for m in state.snapshot() if m["from"] == "researcher"])
    # 研究笔记夹具；内容沿用原文，保留英文便于跟踪下游匹配。
    notes = f"note {n + 1}: FIPA-ACL ratified 2000; 20 performatives."
    return {"content": notes, "handoff": "writer" if n == 0 else "done"}


def writer_policy(state: SharedState) -> Message:
    research = [m["content"] for m in state.snapshot() if m["from"] == "researcher"]
    # 草稿前缀：汇总以下研究内容。审阅者会匹配其中的 summarizing，故不替换。
    # 没有研究材料时生成的占位草稿。
    draft = "Draft summarizing: " + " | ".join(research) if research else "Draft with no research yet."
    return {"content": draft, "handoff": "reviewer"}


def reviewer_policy(state: SharedState) -> Message:
    last = state.last_by("writer")
    # 审阅通过；这里只是字符串规则判定，并非实际内容审核。
    # 需要修改。
    verdict = "approved" if last and "summarizing" in last["content"] else "needs revision"
    # 审阅结论。
    return {"content": f"Review verdict: {verdict}.", "handoff": "done"}


def make_team() -> dict[str, Agent]:
    return {
        # 研究者提示词：收集事实。本例不把它发送给模型。
        "researcher": Agent("researcher", "Gather facts.", researcher_policy),
        # 写作者提示词：依据研究撰写草稿。
        "writer": Agent("writer", "Draft from research.", writer_policy),
        # 审阅者提示词：评议草稿。
        "reviewer": Agent("reviewer", "Critique the draft.", reviewer_policy),
    }


class StaticOrchestrator:
    """固定执行顺序，用确定性边演示类似 LangGraph 的编排方式。"""

    def __init__(self, order: list[str]) -> None:
        self.order = order

    def run(self, team: dict[str, Agent], state: SharedState, max_steps: int = 10) -> None:
        for name in self.order[:max_steps]:
            msg = team[name].run(state)
            state.append(msg)


class HandoffOrchestrator:
    """演示类似 OpenAI Swarm 的交接方式：当前智能体返回下一接手者。"""

    def __init__(self, start: str) -> None:
        self.start = start

    def run(self, team: dict[str, Agent], state: SharedState, max_steps: int = 10) -> None:
        current = self.start
        for _ in range(max_steps):
            if current not in team:
                return
            msg = team[current].run(state)
            state.append(msg)
            nxt = msg.get("handoff", "done")
            if nxt == "done":
                return
            current = nxt


class LLMSelectorOrchestrator:
    """演示类似 AutoGen GroupChat 的发言者选择。
    本例选择器使用预设规则；接入 LLM 的版本需要读取共享消息池后再做选择。"""

    def __init__(self, start: str, selector: Callable[[SharedState, dict[str, Agent]], Optional[str]]) -> None:
        self.start = start
        self.selector = selector

    def run(self, team: dict[str, Agent], state: SharedState, max_steps: int = 10) -> None:
        current: Optional[str] = self.start
        for _ in range(max_steps):
            if current is None or current not in team:
                return
            msg = team[current].run(state)
            state.append(msg)
            current = self.selector(state, team)


def round_robin_selector(state: SharedState, team: dict[str, Agent]) -> Optional[str]:
    if not state.messages:
        return None
    last = state.messages[-1]["from"]
    names = list(team.keys())
    idx = (names.index(last) + 1) % len(names)
    if len([m for m in state.messages if m["from"] == "reviewer"]) >= 1:
        return None
    return names[idx]


def render_pool(label: str, state: SharedState) -> None:
    print(f"\n=== {label} ===")
    for i, m in enumerate(state.snapshot()):
        ho = f" -> {m['handoff']}" if "handoff" in m else ""
        print(f"  [{i}] {m['from']:10s} | {m['content']}{ho}")


def main() -> None:
    print("多智能体协作的四类基本概念演示")
    print("-" * 42)

    team = make_team()
    state_a = SharedState()
    StaticOrchestrator(["researcher", "writer", "reviewer"]).run(team, state_a)
    render_pool("固定顺序（类似 LangGraph）", state_a)

    team = make_team()
    state_b = SharedState()
    HandoffOrchestrator("researcher").run(team, state_b)
    render_pool("交接驱动（类似 OpenAI Swarm）", state_b)

    team = make_team()
    state_c = SharedState()
    LLMSelectorOrchestrator("researcher", round_robin_selector).run(team, state_c)
    render_pool("选择器调度（类似 AutoGen；本例实际使用轮询）", state_c)

    print("\n要点：三次运行使用相同的智能体定义和状态结构；")
    print("只有编排器的选择不同，从而决定谁在何时发言。")


if __name__ == "__main__":
    main()
