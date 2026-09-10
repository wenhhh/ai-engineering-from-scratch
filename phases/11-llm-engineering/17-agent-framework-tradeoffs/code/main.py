"""基于决策树的智能体框架推荐器。

接收问题描述，推荐 LangGraph、CrewAI、AutoGen、Agno 或“不使用框架”，
并用一句话说明理由。决策树将 docs/en.md 中讨论的取舍编码为规则。

运行：
    python main.py           # 运行随附的测试套件
    python main.py --ask     # 交互问答模式
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Problem:
    """描述智能体式（agentic）任务的结构特征。"""

    has_typed_state: bool = False
    has_roles: bool = False
    has_dialogue: bool = False
    has_parallel_fanout: bool = False
    needs_resume: bool = False
    needs_human_interrupt: bool = False
    total_llm_calls: int = 1
    needs_session_memory: bool = False


@dataclass(frozen=True)
class Recommendation:
    framework: str
    reason: str


def recommend(p: Problem) -> Recommendation:
    # 优先选择最小方案：如果只需调用两次或更少，就完全不使用框架。
    if p.total_llm_calls <= 2 and not any(
        (p.has_roles, p.has_dialogue, p.needs_resume, p.has_parallel_fanout, p.needs_human_interrupt)
    ):
        return Recommendation(
            "plain python",
            "LLM 调用不超过两次，也不需要状态、角色、对话、并行分发"
            "或恢复执行；引入框架只会增加额外开销。",
        )

    # 持久化状态、人工中断或时间旅行（time travel） -> LangGraph。
    if p.needs_resume or p.needs_human_interrupt or p.has_parallel_fanout:
        return Recommendation(
            "langgraph",
            "类型化状态、检查点保存器（checkpointer）、中断和 Send 并行分发，"
            "只有在 LangGraph 中才得到一等支持。",
        )

    # 以对话为组织形式的问题 -> AutoGen。
    if p.has_dialogue and not p.has_typed_state:
        return Recommendation(
            "autogen",
            "提议者—评审者或教师—学生式对话是 AutoGen 原生支持的组织形式；"
            "GroupChat 会选择发言者，无需手动连接调度逻辑。",
        )

    # 角色驱动的流水线 -> CrewAI。
    if p.has_roles and not p.has_typed_state:
        return Recommendation(
            "crewai",
            "对于由专业角色执行的简短顺序计划或层级计划，"
            "使用 CrewAI 表达所需的实现成本最低。",
        )

    # 单个智能体 + 会话 -> Agno。
    if p.needs_session_memory and not p.has_roles and not p.has_dialogue:
        return Recommendation(
            "agno",
            "单个智能体配合工具和持久化会话记忆；"
            "Agno 内置了存储驱动。",
        )

    # 只有类型化状态而没有其他特征时，仍然推荐 LangGraph。
    if p.has_typed_state:
        return Recommendation(
            "langgraph",
            "类型化状态是 LangGraph 的核心抽象；将 TypedDict "
            "映射到 StateGraph 即可。",
        )

    # 兜底选择。
    return Recommendation(
        "langgraph",
        "对于多步骤智能体，如果未来是否需要状态"
        "或分支尚不确定，默认选择此框架。",
    )


# 测试 -----------------------------------------------------------------------


def _check(label: str, actual: Recommendation, expected_framework: str) -> bool:
    ok = actual.framework == expected_framework
    tag = "通过" if ok else "失败"
    print(f"[{tag}] {label:<60}  -> {actual.framework:<14} // {actual.reason}")
    return ok


def run_tests() -> int:
    cases: list[tuple[str, Problem, str]] = [
        (
            "两次调用的摘要工具，无状态",
            Problem(total_llm_calls=2),
            "plain python",
        ),
        (
            "需要人工批准的长时间运行工作流",
            Problem(has_typed_state=True, needs_human_interrupt=True, total_llm_calls=8),
            "langgraph",
        ),
        (
            "并行分发到三个检索器的研究任务",
            Problem(has_typed_state=True, has_parallel_fanout=True, total_llm_calls=5),
            "langgraph",
        ),
        (
            "提议者—评审者式编码循环",
            Problem(has_dialogue=True, total_llm_calls=10),
            "autogen",
        ),
        (
            "由研究员、撰稿人和编辑角色组成的营销流水线",
            Problem(has_roles=True, total_llm_calls=4),
            "crewai",
        ),
        (
            "具有持久化用户记忆的聊天助手",
            Problem(needs_session_memory=True, total_llm_calls=6),
            "agno",
        ),
        (
            "崩溃后必须恢复执行的工作流",
            Problem(has_typed_state=True, needs_resume=True, total_llm_calls=12),
            "langgraph",
        ),
    ]

    failures = 0
    for label, problem, expected in cases:
        if not _check(label, recommend(problem), expected):
            failures += 1
    print()
    print(f"{len(cases) - failures}/{len(cases)} 个用例通过。")
    return 0 if failures == 0 else 1


def run_interactive() -> int:
    def yes(prompt: str) -> bool:
        return input(f"{prompt} [y/N] ").strip().lower().startswith("y")

    p = Problem(
        has_typed_state=yes("是否需要类型化状态 / 显式的状态结构定义（schema）？"),
        has_roles=yes("是否需要目标各不相同的专业角色？"),
        has_dialogue=yes("是否需要多智能体对话（发言顺序动态形成）？"),
        has_parallel_fanout=yes("是否需要将任务并行分发到 N 个子执行者？"),
        needs_resume=yes("是否必须在进程重启后恢复执行？"),
        needs_human_interrupt=yes("是否需要在运行中途获得人工批准？"),
        total_llm_calls=int(input("每次运行大约调用 LLM 多少次？").strip() or "1"),
        needs_session_memory=yes("是否需要为每个用户保留持久化会话记忆？"),
    )
    r = recommend(p)
    print()
    print(json.dumps({"framework": r.framework, "reason": r.reason}, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ask", action="store_true", help="交互模式")
    args = parser.parse_args()
    return run_interactive() if args.ask else run_tests()


if __name__ == "__main__":
    sys.exit(main())
