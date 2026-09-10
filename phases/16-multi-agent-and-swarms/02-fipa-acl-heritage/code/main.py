"""FIPA-ACL 消息转换与最小合同网演示，仅使用 Python 标准库。

将本例选取的 MCP tools/call、resources/read 和 A2A 风格任务消息，映射到
FIPA-ACL 信封中的通信意图，再演示三个竞标者的合同网协商：cfp（征集提案）、
propose（提出方案）、accept-proposal（接受提案）、reject-proposal（拒绝提案）。

译注：这是消息意图的教学类比，不是完整协议转换器。本例只实现单向映射，
没有从 ACL 重建原消息，不能把原文的 round-trip 理解为已验证可逆转换，
也不能由这些例子推出所有协议消息语义等价。字段和端点沿用固定原文快照。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


PERFORMATIVES = {
    "inform", "request", "query-if", "query-ref", "propose",
    "accept-proposal", "reject-proposal", "agree", "refuse",
    "confirm", "disconfirm", "not-understood", "cfp",
    "subscribe", "cancel", "failure",
}


@dataclass
class ACLMessage:
    performative: str
    sender: str
    receiver: str
    content: Any
    language: str = "SL0"
    ontology: str = "default"
    protocol: Optional[str] = None
    conversation_id: Optional[str] = None
    reply_with: Optional[str] = None

    def __post_init__(self) -> None:
        if self.performative not in PERFORMATIVES:
            # 未知的通信行为类型；保留英文异常消息。
            raise ValueError(f"unknown performative: {self.performative}")

    def render(self) -> str:
        fields = [
            f":sender       {self.sender}",
            f":receiver     {self.receiver}",
            f":content      {self.content!r}",
            f":language     {self.language}",
            f":ontology     {self.ontology}",
        ]
        if self.protocol:
            fields.append(f":protocol     {self.protocol}")
        if self.conversation_id:
            fields.append(f":conversation-id {self.conversation_id}")
        if self.reply_with:
            fields.append(f":reply-with   {self.reply_with}")
        inner = "\n  ".join(fields)
        return f"({self.performative}\n  {inner}\n)"


def mcp_tools_call_to_acl(req: dict) -> ACLMessage:
    """将 MCP tools/call JSON-RPC 消息映射为 FIPA-ACL request（请求）。"""
    return ACLMessage(
        performative="request",
        sender="host",
        receiver="tool-server",
        content=req["params"].get("arguments", {}),
        language="JSON",
        ontology=req["params"]["name"],
        protocol="fipa-request",
        conversation_id=f"jsonrpc-{req['id']}",
        reply_with=f"msg-{req['id']}",
    )


def mcp_resources_read_to_acl(req: dict) -> ACLMessage:
    """将 MCP resources/read JSON-RPC 消息映射为 FIPA-ACL query-ref（查询对象）。"""
    return ACLMessage(
        performative="query-ref",
        sender="host",
        receiver="resource-server",
        content=req["params"]["uri"],
        language="URI",
        ontology="mcp-resource",
        protocol="fipa-query",
        conversation_id=f"jsonrpc-{req['id']}",
        reply_with=f"msg-{req['id']}",
    )


def a2a_task_create_to_acl(task: dict) -> ACLMessage:
    """将示例 A2A POST /tasks 请求体映射为 FIPA-ACL request；不实现完整合同网流程。"""
    return ACLMessage(
        performative="request",
        sender=task.get("client", "client"),
        receiver=task.get("agent", "agent"),
        content=task["input"],
        language="JSON",
        ontology=task.get("skill", "default"),
        protocol="a2a-task",
        conversation_id=task.get("task_id", "t-0"),
        reply_with=task.get("task_id", "t-0"),
    )


def a2a_subscribe_to_acl(task_id: str, client: str, agent: str) -> ACLMessage:
    """将示例 A2A SSE 订阅意图映射为 FIPA-ACL subscribe（订阅）。"""
    return ACLMessage(
        performative="subscribe",
        sender=client,
        receiver=agent,
        content={"task_id": task_id, "event_types": ["state", "artifact"]},
        language="JSON",
        ontology="a2a-events",
        protocol="fipa-subscribe",
        conversation_id=task_id,
    )


@dataclass
class Bid:
    bidder: str
    price: int
    eta_minutes: int


@dataclass
class ContractNet:
    manager: str
    bidders: list[str]
    log: list[ACLMessage] = field(default_factory=list)

    def cfp(self, task: str, conv: str) -> None:
        for b in self.bidders:
            self.log.append(ACLMessage(
                performative="cfp",
                sender=self.manager,
                receiver=b,
                content=task,
                ontology="contract-net",
                protocol="fipa-contract-net",
                conversation_id=conv,
                reply_with=f"cfp-{b}",
            ))

    def propose(self, bidder: str, bid: Bid, conv: str) -> None:
        self.log.append(ACLMessage(
            performative="propose",
            sender=bidder,
            receiver=self.manager,
            content={"price": bid.price, "eta_minutes": bid.eta_minutes},
            ontology="contract-net",
            protocol="fipa-contract-net",
            conversation_id=conv,
            reply_with=f"propose-{bidder}",
        ))

    def award(self, winner: str, losers: list[str], conv: str) -> None:
        self.log.append(ACLMessage(
            performative="accept-proposal",
            sender=self.manager,
            receiver=winner,
            # 协议示例载荷：已中标。
            content="awarded",
            ontology="contract-net",
            protocol="fipa-contract-net",
            conversation_id=conv,
        ))
        for L in losers:
            self.log.append(ACLMessage(
                performative="reject-proposal",
                sender=self.manager,
                receiver=L,
                # 协议示例载荷：未中标。
                content="not awarded",
                ontology="contract-net",
                protocol="fipa-contract-net",
                conversation_id=conv,
            ))


def demo_round_trip() -> None:
    print("=" * 72)
    print("消息映射：原文 2026 示例中的 JSON-RPC / REST -> FIPA-ACL 信封")
    print("=" * 72)

    mcp_call = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "lookup_stock", "arguments": {"symbol": "IBM"}},
        "id": 42,
    }
    print("\n-- MCP tools/call --")
    print(mcp_call)
    print("映射后的 ACL 消息：")
    print(mcp_tools_call_to_acl(mcp_call).render())

    mcp_read = {
        "jsonrpc": "2.0",
        "method": "resources/read",
        "params": {"uri": "file:///etc/hosts"},
        "id": 43,
    }
    print("\n-- MCP resources/read --")
    print(mcp_read)
    print("映射后的 ACL 消息：")
    print(mcp_resources_read_to_acl(mcp_read).render())

    a2a_task = {
        "client": "research-host",
        "agent": "code-review-agent",
        "skill": "review-python",
        "input": "def f(x): return x",
        "task_id": "t-12",
    }
    print("\n-- A2A POST /tasks --")
    print(a2a_task)
    print("映射后的 ACL 消息：")
    print(a2a_task_create_to_acl(a2a_task).render())

    print("\n-- A2A SSE subscribe --")
    print(a2a_subscribe_to_acl("t-12", "research-host", "code-review-agent").render())


def demo_contract_net() -> None:
    print("\n" + "=" * 72)
    print("合同网协议：管理者广播 cfp，竞标者通过 propose 报价")
    print("=" * 72)

    cn = ContractNet(manager="scheduler", bidders=["worker-a", "worker-b", "worker-c"])
    conv = "cn-1"

    # 任务夹具：压缩 10 GB 日志包；保留原消息内容便于协议对照。
    cn.cfp(task="compress 10GB log bundle", conv=conv)
    cn.propose("worker-a", Bid("worker-a", price=3, eta_minutes=18), conv)
    cn.propose("worker-b", Bid("worker-b", price=2, eta_minutes=25), conv)
    cn.propose("worker-c", Bid("worker-c", price=4, eta_minutes=10), conv)

    proposes = [m for m in cn.log if m.performative == "propose"]
    winner = min(proposes, key=lambda m: m.content["price"] + m.content["eta_minutes"] / 10)
    losers = [m.sender for m in proposes if m.sender != winner.sender]
    cn.award(winner.sender, losers, conv)

    for msg in cn.log:
        print()
        print(msg.render())

    print(f"\n中标者：{winner.sender}（价格 {winner.content['price']}，预计耗时 {winner.content['eta_minutes']} 分钟）")


def main() -> None:
    demo_round_trip()
    demo_contract_net()
    print("\n要点（本例的结构类比）：MCP/A2A 消息可映射到以 JSON 表达的 FIPA-ACL 信封。")
    print("结构上的基本概念仍可类比，但并未保留 FIPA 的本体与形式语义。")


if __name__ == "__main__":
    main()
