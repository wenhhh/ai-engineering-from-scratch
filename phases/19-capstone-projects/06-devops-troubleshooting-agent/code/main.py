"""运维故障排查智能体：Kubernetes 知识图谱与人工审批门禁。

本例展示两类结构：通过 Kubernetes 对象关系与遥测节点组织排障线索；
将工具划分为只读操作和需要人工审批的破坏性操作，并记录每次工具调用的审计状态。

运行：python main.py

译注：集群、遥测、审批和工具执行均为内存模拟，不连接 Kubernetes、Slack 或 Argo CD。
executed=true 只表示代码设置了该标记，并未执行命令；审批也只检查是否给了非空字符串，
没有验证审批者身份或权限。图查询只读取告警节点的一跳邻居，不会沿对象关系做完整根因搜索。
“发布异常”假设在告警对象为 Deployment 时就会生成，没有真正核实错误激增；评分是加权和，
不是各项相乘。以下保留遥测夹具、时间格式、工具名称、审计结果和状态值，附中文解释。
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Kubernetes 知识图谱：对象与遥测关联边。
# ---------------------------------------------------------------------------

@dataclass
class Node:
    kind: str               # 对象类型示例：Pod、Deployment、Node、Service、Prom、Loki；类型值保持原样。
    name: str
    attrs: dict = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.kind}/{self.name}"


@dataclass
class Graph:
    nodes: dict[str, Node] = field(default_factory=dict)
    edges: list[tuple[str, str, str]] = field(default_factory=list)  # 边记录为（源节点、关系、目标节点）。

    def add(self, n: Node) -> None:
        self.nodes[n.key] = n

    def link(self, src: str, rel: str, dst: str) -> None:
        self.edges.append((src, rel, dst))

    def neighbors(self, key: str) -> list[tuple[str, str]]:
        out = [(rel, dst) for s, rel, dst in self.edges if s == key]
        out += [(rel, src) for src, rel, dst in self.edges if dst == key]
        return out


def build_sample_cluster() -> Graph:
    g = Graph()
    dep = Node("Deployment", "checkout-api",
               # 遥测夹具：14 分钟前；后续按 m 切分，必须保留英文格式。
               {"revision": 42, "image": "checkout-api:v2.41", "deployed_at": "14m ago"})
    rs = Node("ReplicaSet", "checkout-api-abc")
    node = Node("Node", "ip-10-2-3-4", {"kernel": "6.1.109"})
    pods = [Node("Pod", f"checkout-api-abc-{i}", {"phase": "Running"}) for i in range(3)]
    svc = Node("Service", "checkout-api")
    prom = Node("Prom", "error_rate{deployment=checkout-api}",
                # 遥测夹具：均值 0.14，呈上升趋势。
                {"last_15m": "mean=0.14 up_trend", "threshold": 0.05})
    loki = Node("Loki", "namespace=prod,app=checkout-api",
                # 遥测夹具：/api/v2/pay 出现 500 错误，堆栈标识为 NullHealthz。
                {"last_15m": "500 errors on /api/v2/pay, stack = NullHealthz"})

    for n in (dep, rs, node, svc, prom, loki, *pods):
        g.add(n)
    g.link(dep.key, "OWNS", rs.key)
    for p in pods:
        g.link(rs.key, "OWNS", p.key)
        g.link(p.key, "SCHEDULED_ON", node.key)
    g.link(svc.key, "EXPOSES", dep.key)
    g.link(dep.key, "OBSERVED_BY", prom.key)
    g.link(dep.key, "OBSERVED_BY", loki.key)
    return g


# ---------------------------------------------------------------------------
# 假设排序：综合新近程度、具体程度、引用数和路径长度，实际为加权求和。
# ---------------------------------------------------------------------------

@dataclass
class Hypothesis:
    title: str
    citations: list[str]
    recency_mins: int
    specificity: float     # 具体程度，范围为 0—1。
    path_len: int

    def score(self) -> float:
        recency_w = max(0.0, 1.0 - self.recency_mins / 60.0)
        path_w = 1.0 / (1 + self.path_len)
        return (recency_w * 0.35 +
                self.specificity * 0.35 +
                min(len(self.citations), 5) / 5 * 0.2 +
                path_w * 0.1)


def root_cause(g: Graph, alerted: str) -> list[Hypothesis]:
    """读取告警对象的一跳邻居，收集遥测节点，并对预设规则产生的假设排序。"""
    hyps: list[Hypothesis] = []
    # 直接相邻的遥测节点。
    telemetry: list[Node] = []
    for rel, neighbor_key in g.neighbors(alerted):
        n = g.nodes.get(neighbor_key)
        if n and n.kind in ("Prom", "Loki", "Tempo"):
            telemetry.append(n)

    # 发布异常假设：当前实现仅依据 Deployment 对象生成，不核验错误激增。
    dep = g.nodes.get(alerted)
    if dep and dep.kind == "Deployment":
        mins = int(str(dep.attrs.get("deployed_at", "?")).split("m")[0]) if "m" in str(dep.attrs.get("deployed_at", "")) else 999
        hyps.append(Hypothesis(
            title=f"发布异常：镜像 {dep.attrs.get('image')} 的 /healthz 检查失败（假设）",
            citations=[t.name for t in telemetry],
            recency_mins=mins,
            specificity=0.82,
            path_len=0,
        ))

    # 节点层问题假设：相邻工作负载争用或内核问题。
    nodes = [g.nodes[dst] for _, dst in g.neighbors(alerted) if dst.startswith("Node/")]
    if nodes:
        hyps.append(Hypothesis(
            title=f"节点层资源压力：{nodes[0].name}（内核={nodes[0].attrs.get('kernel')}）",
            citations=[n.name for n in nodes],
            recency_mins=30,
            specificity=0.45,
            path_len=2,
        ))

    # 服务网格／DNS 假设。
    hyps.append(Hypothesis(
        title="kube-system/coredns 出现 DNS 抖动（假设）",
        citations=[],
        recency_mins=60,
        specificity=0.2,
        path_len=4,
    ))

    return sorted(hyps, key=lambda h: -h.score())


# ---------------------------------------------------------------------------
# 审批门禁与审计日志：记录每次提交给示例工具接口的操作。
# ---------------------------------------------------------------------------

@dataclass
class AuditEvent:
    ts: float
    tool: str
    args: dict
    considered: bool = True
    approved: bool = False
    executed: bool = False
    approver: str | None = None
    result: str | None = None


@dataclass
class Agent:
    graph: Graph
    audit: list[AuditEvent] = field(default_factory=list)
    read_only_tools: tuple = ("kubectl_get", "kubectl_describe", "promql", "logql", "traceql")
    destructive_tools: tuple = ("kubectl_scale", "kubectl_rollback", "kubectl_delete", "argocd_rollback")

    def call(self, tool: str, args: dict, approver: str | None = None) -> AuditEvent:
        ev = AuditEvent(ts=time.time(), tool=tool, args=args)
        if tool in self.read_only_tools:
            ev.executed = True
            # 工具结果：只读操作通过；这只是内存标记。
            ev.result = "ok (read-only)"
        elif tool in self.destructive_tools:
            if approver:
                ev.approved = True
                ev.approver = approver
                ev.executed = True
                # 工具结果前缀：由指定审批者批准执行；保留英文审计值。
                ev.result = f"executed by {approver}"
            else:
                # 工具结果：没有 Slack 审批，已阻止。
                ev.result = "blocked: no slack approval"
        else:
            # 工具结果：未知工具，已阻止。
            ev.result = "blocked: unknown tool"
        self.audit.append(ev)
        return ev


# ---------------------------------------------------------------------------
# 演示：告警 → 一跳图查询 → 假设排序 → 模拟 Slack 审批。
# ---------------------------------------------------------------------------

def main() -> None:
    g = build_sample_cluster()
    agent = Agent(graph=g)

    alerted = "Deployment/checkout-api"
    print(f"=== 收到告警：{alerted}（错误率 14%） ===")

    # 先调用只读遥测工具桩。
    agent.call("promql", {"query": "rate(http_requests_total{status=~'5..'}[5m])"})
    agent.call("logql", {"query": '{app="checkout-api"} |~ "stack"'})

    hyps = root_cause(g, alerted)
    print("\n假设排序：")
    for i, h in enumerate(hyps, 1):
        print(f"  #{i} 得分={h.score():.3f}  {h.title}")
        print(f"     引用线索：{h.citations}")

    # 提议回滚，但没有审批者时会被示例门禁阻止。
    print("\n提出处置方案：")
    ev = agent.call("argocd_rollback", {"app": "checkout-api", "to_revision": 41})
    print(f"  {ev.tool}: {ev.result}")

    # 提供模拟审批者后，工具记录变为 executed；并没有实际执行回滚。
    print("\n模拟 Slack 审批者：alice@sre")
    ev = agent.call("argocd_rollback",
                    {"app": "checkout-api", "to_revision": 41},
                    approver="alice@sre")
    print(f"  {ev.tool}: {ev.result}")

    print("\n审计日志：")
    for ev in agent.audit:
        print(" ", json.dumps({
            "tool": ev.tool, "executed": ev.executed,
            "approved": ev.approved, "approver": ev.approver,
            "result": ev.result,
        }))


if __name__ == "__main__":
    main()
