"""用标准库实现 CrewAI 式团队（Crew）与流程（Flow）原语。

由三个智能体（researcher、writer、editor）组成团队，撰写关于
"agent engineering 2026" 的简报。同一团队分别以顺序式（Sequential）、
分层式（Hierarchical）和 Flow 运行，展示三种执行结构。

使用标准库与 numpy。模拟的 LLM 响应为确定性的硬编码字符串，
以智能体角色和输入前缀为依据。
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any, Callable

import numpy as np


def tool(name: str) -> Callable[[Callable[..., str]], Callable[..., str]]:
    """模拟 CrewAI 的 @tool 装饰器，将函数标记为
    Agent 可调用的工具。文档字符串是工具描述，函数签名是结构定义（Schema）。"""

    def decorator(fn: Callable[..., str]) -> Callable[..., str]:
        fn.tool_name = name  # type: ignore[attr-defined]
        fn.is_tool = True  # type: ignore[attr-defined]
        return fn

    return decorator


@tool("Search the web")
def search(query: str) -> str:
    """返回查询的排名靠前结果。"""
    fixtures = {
        "agent engineering": "src1: agent loop, src2: tool use, src3: memory",
        "crewai": "src1: docs intro, src2: flows guide, src3: tools ref",
    }
    for key, value in fixtures.items():
        if key in query.lower():
            return value
    return "src1: generic, src2: generic, src3: generic"


@dataclass
class Agent:
    role: str
    goal: str
    backstory: str
    fn: Callable[..., str]
    tools: list[Callable[..., str]] = field(default_factory=list)


@dataclass
class Task:
    description: str
    expected_output: str
    agent: Agent
    context: list["Task"] = field(default_factory=list)


@dataclass
class SequentialCrew:
    agents: list[Agent]
    tasks: list[Task]
    memory: "Memory | None" = None

    def kickoff(self, inputs: dict[str, Any]) -> list[str]:
        outputs: list[str] = []
        prior = inputs.get("topic", "")
        by_task: dict[int, str] = {}
        for task in self.tasks:
            if task.context:
                # CrewAI 的行为：将每个已声明的上游任务输出
                # 传给当前任务。未声明上游任务时回退到 prior。
                joined = "\n\n".join(
                    by_task[id(t)] for t in task.context if id(t) in by_task
                )
                agent_input = joined or prior
            else:
                agent_input = prior
            out = task.agent.fn(agent_input, task.agent.tools, self.memory)
            outputs.append(f"[{task.agent.role}] {out}")
            by_task[id(task)] = out
            prior = out
            if self.memory is not None:
                self.memory.write_short_term(task.agent.role, out)
                self.memory.write_long_term(task.agent.role, out)
        return outputs


@dataclass
class HierarchicalCrew:
    manager: Agent
    specialists: dict[str, Agent]
    max_steps: int = 5
    memory: "Memory | None" = None

    def kickoff(self, topic: str) -> list[str]:
        outputs: list[str] = []
        current = topic
        done: set[str] = set()
        for _ in range(self.max_steps):
            pick = self.manager.fn(done, [], None)
            if pick == "done":
                outputs.append("[manager] 已完成")
                break
            specialist = self.specialists.get(pick)
            if specialist is None:
                outputs.append(f"[manager] 未知选择 {pick!r}")
                break
            out = specialist.fn(current, specialist.tools, self.memory)
            outputs.append(f"[manager -> {specialist.role}] {out}")
            current = out
            done.add(pick)
            if self.memory is not None:
                self.memory.write_short_term(specialist.role, out)
        return outputs


class Flow:
    """确定性的事件驱动工作流（Event-driven workflow）。kickoff 时触发 @start；
    其他步骤发出对应主题时触发 @listen(topic)。
    """

    def __init__(self) -> None:
        self.start_step: Callable[[Any], tuple[str, Any]] | None = None
        self.listeners: dict[str, Callable[[Any], tuple[str, Any] | None]] = {}
        self.trace: list[tuple[str, str, Any]] = []

    def start(self, fn: Callable[[Any], tuple[str, Any]]) -> Callable[..., Any]:
        self.start_step = fn
        return fn

    def listen(self, topic: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        def decorator(fn: Callable[[Any], tuple[str, Any] | None]) -> Callable[..., Any]:
            self.listeners[topic] = fn
            return fn

        return decorator

    def kickoff(self, payload: Any) -> list[tuple[str, str, Any]]:
        if self.start_step is None:
            return []
        self.trace = []
        topic, out = self.start_step(payload)
        self.trace.append(("start", topic, out))
        while topic in self.listeners:
            step = self.listeners[topic]
            result = step(out)
            if result is None:
                break
            topic, out = result
            self.trace.append((step.__name__, topic, out))
        return self.trace


class Memory:
    """四存储记忆，对应 CrewAI 的短期（Short-term）、长期（Long-term）、实体（Entity）和上下文（Contextual）记忆。
    长期检索通过 numpy 计算哈希词元向量的余弦相似度（Cosine similarity）。
    """

    def __init__(self, dim: int = 16) -> None:
        self.dim = dim
        self.short_term: list[tuple[str, str]] = []
        self.long_term: list[tuple[str, str, np.ndarray]] = []
        self.entity: dict[str, dict[str, str]] = {}

    def _embed(self, text: str) -> np.ndarray:
        seed = int.from_bytes(
            hashlib.sha256(text.encode("utf-8")).digest()[:8],
            "little",
        )
        rng = np.random.default_rng(seed)
        v = rng.standard_normal(self.dim)
        n = np.linalg.norm(v)
        return v / n if n > 0 else v

    def write_short_term(self, role: str, value: str) -> None:
        self.short_term.append((role, value))

    def write_long_term(self, role: str, value: str) -> None:
        self.long_term.append((role, value, self._embed(value)))

    def write_entity(self, entity_id: str, key: str, value: str) -> None:
        self.entity.setdefault(entity_id, {})[key] = value

    def recall_long_term(self, query: str, k: int = 2) -> list[tuple[str, str, float]]:
        if not self.long_term:
            return []
        q = self._embed(query)
        scored = [(r, v, float(np.dot(q, e))) for r, v, e in self.long_term]
        scored.sort(key=lambda row: row[2], reverse=True)
        return scored[:k]

    def reset_short_term(self) -> None:
        self.short_term = []


def _researcher(prior: Any, tools: list[Callable[..., str]], memory: Memory | None) -> str:
    topic = prior if isinstance(prior, str) else ""
    # 按顺序查找并运行接入该智能体的搜索类工具。
    search_fn = next(
        (t for t in tools if getattr(t, "is_tool", False) and "search" in getattr(t, "tool_name", "").lower()),
        None,
    )
    sources = search_fn(topic) if search_fn else "src1, src2, src3"
    return f"3 sources on {topic}: {sources}"


def _writer(prior: Any, tools: list[Callable[..., str]], memory: Memory | None) -> str:
    text = prior if isinstance(prior, str) else ""
    return f"draft (3 paragraphs) from sources: {text[:60]}"


def _editor(prior: Any, tools: list[Callable[..., str]], memory: Memory | None) -> str:
    text = prior if isinstance(prior, str) else ""
    return f"final brief (tightened, 800 words): {text[:60]}"


def _manager(prior: Any, tools: list[Callable[..., str]], memory: Memory | None) -> str:
    done = prior if isinstance(prior, set) else set()
    if "researcher" not in done:
        return "researcher"
    if "writer" not in done:
        return "writer"
    if "editor" not in done:
        return "editor"
    return "done"


def build_agents() -> tuple[Agent, Agent, Agent]:
    researcher = Agent(
        role="researcher",
        goal="找到 3 个可信来源",
        backstory="曾任图书管理员，表达简练，引用一手资料。",
        fn=_researcher,
        tools=[search],
    )
    writer = Agent(
        role="writer",
        goal="根据资料撰写草稿",
        backstory="采用编辑式笔调，写成三段。",
        fn=_writer,
    )
    editor = Agent(
        role="editor",
        goal="精简草稿，形成最终简报",
        backstory="删去形容词，遵循内部写作规范。",
        fn=_editor,
    )
    return researcher, writer, editor


def main() -> None:
    print("=" * 70)
    print("CrewAI 团队（Crew）与流程（Flow）——第 14 阶段，第 15 课")
    print("=" * 70)

    researcher, writer, editor = build_agents()
    memory = Memory()

    print("\n1. 顺序团队（SequentialCrew，researcher -> writer -> editor）")
    seq = SequentialCrew(
        agents=[researcher, writer, editor],
        tasks=[
            Task("研究主题", "3 个来源", researcher),
            Task("撰写草稿", "3 段", writer),
            Task("编辑成最终简报", "800 词", editor),
        ],
        memory=memory,
    )
    for line in seq.kickoff({"topic": "agent engineering 2026"}):
        print(f"  {line}")

    print("\n2. 分层团队（HierarchicalCrew，由 manager 路由）")
    manager = Agent(
        role="manager",
        goal="选择下一位专家",
        backstory="具有产品经理（PM）背景，根据尚未参与的角色进行路由。",
        fn=_manager,
    )
    hcrew = HierarchicalCrew(
        manager=manager,
        specialists={"researcher": researcher, "writer": writer, "editor": editor},
        memory=memory,
    )
    for line in hcrew.kickoff("agent engineering 2026"):
        print(f"  {line}")

    print("\n3. 流程（Flow，确定性、事件驱动）")
    flow = Flow()

    @flow.start
    def kickoff(topic: str) -> tuple[str, str]:
        out = _researcher(topic, [search], memory)
        memory.write_short_term("researcher", out)
        memory.write_long_term("researcher", out)
        return "researched", out

    @flow.listen("researched")
    def on_researched(prior: str) -> tuple[str, str]:
        out = _writer(prior, [], memory)
        memory.write_short_term("writer", out)
        memory.write_long_term("writer", out)
        return "drafted", out

    @flow.listen("drafted")
    def on_drafted(prior: str) -> tuple[str, str]:
        out = _editor(prior, [], memory)
        memory.write_short_term("editor", out)
        memory.write_long_term("editor", out)
        return "edited", out

    @flow.listen("edited")
    def on_edited(prior: str) -> None:
        return None

    for step_name, topic, output in flow.kickoff("agent engineering 2026"):
        print(f"  [{step_name}] 主题={topic!r} 输出={output[:60]}")

    print("\n4. 记忆（Memory）：recall_long_term('brief')")
    for role, value, score in memory.recall_long_term("brief"):
        print(f"  [{role}] 分数={score:+.3f} 内容={value[:50]}")

    print("\n5. 再次启动（长期记忆保留）")
    memory.reset_short_term()
    seq2 = SequentialCrew(
        agents=[researcher, writer, editor],
        tasks=[
            Task("研究", "3 个来源", researcher),
            Task("起草", "3 段", writer),
            Task("编辑", "800 词", editor),
        ],
        memory=memory,
    )
    seq2.kickoff({"topic": "agent engineering 2026"})
    print(f"  长期记忆（long_term）条目数： {len(memory.long_term)}")
    print(f"  本次运行的短期记忆（short_term）条目数： {len(memory.short_term)}")

    print()
    print("Crew：LLM 决定执行结构。Flow：代码决定执行结构。")
    print("文档（2026）：生产环境先采用 Flow，再将 Crew 作为子步骤接入。")


if __name__ == "__main__":
    main()
