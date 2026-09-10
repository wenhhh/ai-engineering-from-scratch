"""交接驱动的编排：OpenAI Swarm 风格的最小示例。

两个基本概念：Agent（名称、指令、函数列表）和交接（返回另一个 Agent 的函数）。
运行循环检测到 Agent 类型的返回值后，就切换当前活跃智能体。

译注：路由实际由 scripted_router 中的英文关键词规则实现，并不执行模型提示词。
示例输入保留英文以维持分支匹配；退款、报价、开工单均只返回字符串，没有真实副作用。
交接后，后续消息继续交给当前智能体，没有自动回到分诊或跨业务重新路由的机制。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional, Union


@dataclass
class Agent:
    name: str
    instructions: str
    functions: list[Callable] = field(default_factory=list)


@dataclass
class Msg:
    role: str
    content: str
    sender: Optional[str] = None


def triage_agent_factory() -> Agent:
    def transfer_to_refunds() -> "Agent":
        return refund_agent

    def transfer_to_sales() -> "Agent":
        return sales_agent

    def transfer_to_support() -> "Agent":
        return support_agent

    return Agent(
        name="triage",
        instructions="将用户分流至退款、销售或技术支持。",
        functions=[transfer_to_refunds, transfer_to_sales, transfer_to_support],
    )


def refund_agent_factory() -> Agent:
    def process_refund(order_id: str) -> str:
        return f"已为订单 {order_id} 办理退款。"

    return Agent(
        name="refund",
        instructions="处理退款请求。",
        functions=[process_refund],
    )


def sales_agent_factory() -> Agent:
    def quote_product(product: str) -> str:
        return f"产品报价：{product}，每月 99 美元。"

    return Agent(
        name="sales",
        instructions="处理销售咨询。",
        functions=[quote_product],
    )


def support_agent_factory() -> Agent:
    def open_ticket(issue: str) -> str:
        return f"已为以下问题创建工单：{issue}"

    return Agent(
        name="support",
        instructions="处理技术支持问题。",
        functions=[open_ticket],
    )


triage_agent = triage_agent_factory()
refund_agent = refund_agent_factory()
sales_agent = sales_agent_factory()
support_agent = support_agent_factory()


def scripted_router(current: Agent, user_msg: str) -> Union[str, Agent]:
    """用规则代替模型：根据当前智能体和用户输入，返回文本或调用函数，
    函数也可能返回另一个 Agent。本例没有读取 instructions 来推理路由，
    真正接入模型的交接方案可通过模型工具调用选择相应函数。"""
    text = user_msg.lower()
    if current.name == "triage":
        if "refund" in text or "money back" in text:
            return next(f for f in current.functions if f.__name__ == "transfer_to_refunds")()
        if "buy" in text or "price" in text:
            return next(f for f in current.functions if f.__name__ == "transfer_to_sales")()
        if "broken" in text or "bug" in text:
            return next(f for f in current.functions if f.__name__ == "transfer_to_support")()
        return "请说明你需要哪方面的帮助？"
    if current.name == "refund":
        order = "42"
        for word in user_msg.split():
            if word.isdigit():
                order = word
                break
        return next(f for f in current.functions if f.__name__ == "process_refund")(order)
    if current.name == "sales":
        product = "企业套餐"
        return next(f for f in current.functions if f.__name__ == "quote_product")(product)
    if current.name == "support":
        return next(f for f in current.functions if f.__name__ == "open_ticket")(user_msg)
    return "［没有回复］"


def run_swarm(start_agent: Agent, user_messages: list[str]) -> list[Msg]:
    history: list[Msg] = []
    active = start_agent
    for user in user_messages:
        history.append(Msg(role="user", content=user))
        out = scripted_router(active, user)
        if isinstance(out, Agent):
            history.append(
                Msg(role="assistant", content=f"（交接给 {out.name}）", sender=active.name)
            )
            active = out
            out = scripted_router(active, user)
        history.append(Msg(role="assistant", content=str(out), sender=active.name))
    return history


def render(history: list[Msg]) -> None:
    for m in history:
        tag = m.sender if m.sender else m.role
        print(f"  [{tag:>8s}]: {m.content}")


def main() -> None:
    print("交接驱动的编排——OpenAI Swarm 风格")
    print("-" * 54)

    scenarios = [
        # 示例输入：我需要为订单 77 退款；refund 用于分诊匹配。
        ("退款流程", ["I need a refund on order 77"]),
        # 示例输入：想购买企业套餐并询问价格；buy 和 price 用于分诊匹配。
        ("销售流程", ["I want to buy the enterprise plan. what's the price?"]),
        # 示例输入：我的仪表盘坏了；broken 用于分诊匹配。
        ("支持流程", ["my dashboard is broken"]),
        # 示例输入：你好，没有足以分诊的业务关键词。
        ("意图不明确", ["hello"]),
    ]
    for label, msgs in scenarios:
        print(f"\n=== {label} ===")
        history = run_swarm(triage_agent, msgs)
        render(history)

    print("\n要点：本例中的每次交接都由一个返回 Agent 的函数调用表示。")
    print("这里的循环负责识别 Agent 返回值并切换活跃智能体。")
    print("无需另外定义状态机或领域专用语言；但本例路由由硬编码规则实现，并非由提示词驱动。")


if __name__ == "__main__":
    main()
