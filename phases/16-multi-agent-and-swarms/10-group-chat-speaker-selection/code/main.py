"""带发言者选择的群聊：AutoGen GroupChat 风格的最小示例。

三个智能体分别负责编码、审阅和协调，比较轮询与模拟 LLM 的选择策略，
并用 TERMINATE 结束标记或最大轮数停止。所谓 LLM 选择器实际是预设规则。

译注：review、fix、approved、a - b、a + b 和 TERMINATE 参与控制流匹配。
因此会话夹具保留英文，并在相邻注释中解释；不能只翻译自然语言而不顾下游消费。
本例只交换代码字符串，没有执行代码或运行验证测试。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class Msg:
    speaker: str
    content: str


@dataclass
class Agent:
    name: str
    role: str
    policy: Callable[[list[Msg]], str]


def coder_policy(pool: list[Msg]) -> str:
    recent = [m for m in pool[-3:] if m.speaker != "coder"]
    last = recent[-1].content if recent else ""
    if "review" in last.lower() or "fix" in last.lower():
        # 修订后的代码：返回 a + b；该字符串会被审阅策略匹配。
        return "revised code: return a + b"
    if not any(m.speaker == "coder" for m in pool):
        # 初始代码：返回 a - b（错误实现）；保留用于审阅匹配的夹具。
        return "initial code: return a - b  (buggy)"
    return "TERMINATE"


def reviewer_policy(pool: list[Msg]) -> str:
    last_coder = next((m for m in reversed(pool) if m.speaker == "coder"), None)
    if last_coder is None:
        # 审阅者等待编码者提供代码。
        return "waiting for code"
    if "a - b" in last_coder.content:
        # 审阅意见：发现错误，求和应为 a+b，请修复。review 和 fix 参与路由。
        return "review: bug detected -- sum must be a+b, please fix"
    if "a + b" in last_coder.content:
        # 审阅通过；approved 会触发协调者结束对话。
        return "review: approved"
    # 审阅意见：无法判明代码含义。
    return "review: unclear"


def manager_policy(pool: list[Msg]) -> str:
    approvals = [m for m in pool if m.speaker == "reviewer" and "approved" in m.content]
    if approvals:
        return "TERMINATE"
    # 协调者要求继续工作。
    return "manager: continue working"


AGENTS: dict[str, Agent] = {
    "coder": Agent("coder", "编写代码", coder_policy),
    "reviewer": Agent("reviewer", "审阅代码", reviewer_policy),
    "manager": Agent("manager", "协调推进", manager_policy),
}


def round_robin_selector(pool: list[Msg], team: dict[str, Agent]) -> Optional[str]:
    names = list(team.keys())
    if not pool:
        return names[0]
    idx = (names.index(pool[-1].speaker) + 1) % len(names)
    return names[idx]


def llm_style_selector(pool: list[Msg], team: dict[str, Agent]) -> Optional[str]:
    """模拟 LLM 选择器：按最近的发言者与内容关键词选择下一位。
    真正接入模型时，需要向模型提供近期消息池；本例不调用模型。"""
    if not pool:
        return "manager"
    last = pool[-1]
    if last.speaker == "coder":
        return "reviewer"
    if last.speaker == "reviewer":
        if "approved" in last.content:
            return "manager"
        return "coder"
    if last.speaker == "manager":
        return "coder"
    return None


def run_groupchat(
    team: dict[str, Agent],
    selector: Callable[[list[Msg], dict[str, Agent]], Optional[str]],
    max_rounds: int,
    label: str,
) -> list[Msg]:
    print(f"\n=== {label} ===")
    pool: list[Msg] = []
    trace: list[str] = []
    for _ in range(max_rounds):
        nxt = selector(pool, team)
        if nxt is None:
            break
        trace.append(nxt)
        agent = team[nxt]
        content = agent.policy(pool)
        pool.append(Msg(speaker=nxt, content=content))
        print(f"  [{nxt:8s}]: {content}")
        if content.strip().endswith("TERMINATE"):
            break
    print(f"  选择器轨迹：{trace}")
    print(f"  已用轮数：{len(pool)}")
    return pool


def speaker_counts(pool: list[Msg]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for m in pool:
        counts[m.speaker] = counts.get(m.speaker, 0) + 1
    return counts


def main() -> None:
    print("带发言者选择的群聊——AutoGen GroupChat 风格")
    print("-" * 62)

    p_rr = run_groupchat(AGENTS, round_robin_selector, max_rounds=8, label="轮询")
    print(f"  各智能体发言次数：{speaker_counts(p_rr)}")

    p_llm = run_groupchat(AGENTS, llm_style_selector, max_rounds=8, label="模拟 LLM 选择（依据上下文规则）")
    print(f"  各智能体发言次数：{speaker_counts(p_llm)}")

    print("\n观察要点：")
    print("  - 轮询按固定顺序轮流发言，不根据上下文选择；结束时总次数未必完全相等。")
    print("  - 模拟 LLM 的规则按上下文路由，例如让审阅者在编码者之后发言。")
    print("  - 两种方式都可因 TERMINATE 标记或达到 max_rounds 而停止。")


if __name__ == "__main__":
    main()
