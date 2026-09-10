"""并排比较两种教学模型：Agno 风格（无状态 FastAPI 请求处理）与 Mastra 风格
（提供多种基础构件）。只使用标准库，目的是展示结构差异，不调用真实框架。

译注：本例复用同一个 AgnoAgent 对象，并未实现“每次请求新建智能体”或 HTTP 服务；
会话状态保存在 AgnoSession 中。框架选型文案沿用固定原文快照，不是性能实测结论。
会话前缀 user/assistant、工具返回值和英文演示输入保留原样。
error: unknown 表示未知工具；processed ... tools 表示已处理相应数量的工具调用。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class AgnoAgent:
    name: str
    fn: Callable[[str], str]

    def run(self, prompt: str) -> str:
        return self.fn(prompt)


class AgnoSession:
    def __init__(self) -> None:
        self._turns: dict[str, list[str]] = {}

    def append(self, session_id: str, turn: str) -> None:
        self._turns.setdefault(session_id, []).append(turn)

    def history(self, session_id: str) -> list[str]:
        return list(self._turns.get(session_id, []))


def agno_request_handler(session: AgnoSession,
                         agent: AgnoAgent,
                         session_id: str,
                         prompt: str) -> str:
    start = time.perf_counter_ns()
    session.append(session_id, f"user: {prompt}")
    output = agent.run(prompt)
    session.append(session_id, f"assistant: {output}")
    elapsed_us = (time.perf_counter_ns() - start) / 1000
    return f"{output}  (handler {elapsed_us:.1f} us)"


@dataclass
class MastraTool:
    name: str
    input_schema: dict[str, Any]
    fn: Callable[..., str]


@dataclass
class MastraAgent:
    name: str
    instructions: str
    tools: list[MastraTool] = field(default_factory=list)

    def run(self, prompt: str, tool_calls: list[tuple[str, dict[str, Any]]]
            ) -> tuple[str, list[tuple[str, str]]]:
        trace: list[tuple[str, str]] = []
        for tool_name, args in tool_calls:
            tool = next((t for t in self.tools if t.name == tool_name), None)
            if tool is None:
                trace.append((tool_name, "error: unknown"))
                continue
            result = tool.fn(**args)
            trace.append((tool_name, result))
        output = f"{self.name} processed {len(tool_calls)} tools"
        return output, trace


@dataclass
class MastraWorkflow:
    steps: list[tuple[str, Callable[[Any], Any]]]

    def run(self, payload: Any) -> list[tuple[str, Any]]:
        trace: list[tuple[str, Any]] = []
        current = payload
        for name, fn in self.steps:
            current = fn(current)
            trace.append((name, current))
        return trace


def _agno_agent_fn(prompt: str) -> str:
    return f"[agno reply] {prompt[:40]}"


def _mastra_tool_fn(query: str) -> str:
    return f"[mastra search result for {query!r}]"


def main() -> None:
    print("=" * 70)
    print("AGNO 与 MASTRA 对比——阶段 14，第 18 课")
    print("=" * 70)

    print("\n1. AGNO 风格（无状态处理函数，状态由会话管理）")
    session = AgnoSession()
    agent = AgnoAgent(name="agno_a", fn=_agno_agent_fn)
    for i in range(3):
        out = agno_request_handler(session, agent, "s001",
                                   f"query {i}: how do I ship an agent")
        print(f"  轮次 {i}: {out}")
    print(f"  会话历史长度：{len(session.history('s001'))}")
    print("  设计思路：每次请求新建智能体，由会话保存状态；"
          "FastAPI 处理层保持无状态。（本示例实际复用智能体对象。）")

    print("\n2. MASTRA 风格（智能体 + 工具 + 工作流）")
    search_tool = MastraTool(
        name="search",
        input_schema={"type": "object",
                      "properties": {"query": {"type": "string"}}},
        fn=_mastra_tool_fn,
    )
    mastra_agent = MastraAgent(
        name="mastra_a",
        instructions="search, summarize, cite",
        tools=[search_tool],
    )
    output, trace = mastra_agent.run(
        "research agent engineering",
        [("search", {"query": "agent engineering 2026"}),
         ("search", {"query": "BFCL V4 benchmarks"})],
    )
    print(f"  智能体输出：{output}")
    for tool, result in trace:
        print(f"    工具 {tool}: {result}")

    workflow = MastraWorkflow(steps=[
        ("normalize", lambda p: p.strip().lower()),
        ("search", lambda p: f"found 3 results for {p}"),
        ("summarize", lambda p: f"summary: {p}"),
    ])
    print("\n  运行工作流")
    for name, out in workflow.run("  Agent Engineering 2026  "):
        print(f"    {name}: {out}")

    print("\n按技术栈选择（原文建议）：Python + FastAPI 对应 Agno；TypeScript + Next/Vercel 对应 Mastra。")


if __name__ == "__main__":
    main()
