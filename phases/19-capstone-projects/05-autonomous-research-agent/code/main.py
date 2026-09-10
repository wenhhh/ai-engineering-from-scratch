"""自主研究智能体：计划／执行／验证树搜索示例框架。

本例以实验节点为单位做优先队列搜索，在预算约束下扩展假设、模拟执行实验、
检查结果，并依据新颖性、质量和剩余预算评分。LLM 规划器与实际 PyTorch 实验
均为桩实现，因此无需真实模型计算即可观察搜索流程。

运行：python main.py

译注：评分函数实际是三项加权求和，并非相乘；节点在入队时打分，执行实验后
没有重新对已有队列评分。所谓沙箱实验只是合成随机指标，没有启动容器或训练。
max_nodes 限制在批量扩展前检查，因此加入一批子节点后可能超过该值；没有深度限制。
费用是模拟数字，且只在实验开始前检查预算。节点总数包含尚未执行的候选，
不能把它当作已完成实验数。最佳分支按已成功执行节点的质量选择。
"""

from __future__ import annotations

import heapq
import random
from dataclasses import dataclass, field
from typing import Iterable


# ---------------------------------------------------------------------------
# 实验节点：保存假设、配置、结果与评分信息。
# ---------------------------------------------------------------------------

@dataclass
class Node:
    node_id: int
    parent: int | None
    hypothesis: str
    config: dict[str, object]
    result: dict[str, float] = field(default_factory=dict)
    cost_usd: float = 0.0
    novelty: float = 0.5
    quality: float = 0.0
    failure: str | None = None

    def score(self, remaining_budget: float) -> float:
        budget_weight = min(1.0, remaining_budget / 10.0)
        return self.novelty * 0.4 + self.quality * 0.5 + budget_weight * 0.1


# ---------------------------------------------------------------------------
# 规划器桩：小幅修改配置，提出子节点。
# ---------------------------------------------------------------------------

def expand(node: Node, next_id: int) -> list[Node]:
    """每次改变一个配置维度，提出一组子节点。"""
    children: list[Node] = []
    base_cfg = node.config
    # 改变稀疏度参数。
    for sp in (4, 8, 16):
        cfg = dict(base_cfg, sparsity_top=sp)
        children.append(Node(node_id=next_id, parent=node.node_id,
                             hypothesis=f"稀疏度 top-{sp}",
                             config=cfg))
        next_id += 1
    # 改变学习率。
    for lr in (3e-4, 1e-3):
        cfg = dict(base_cfg, lr=lr)
        children.append(Node(node_id=next_id, parent=node.node_id,
                             hypothesis=f"学习率={lr}",
                             config=cfg))
        next_id += 1
    return children


# ---------------------------------------------------------------------------
# 沙箱执行桩：返回合成指标，固定随机种子后可复现。
# ---------------------------------------------------------------------------

def run_experiment(node: Node, rng: random.Random) -> None:
    """模拟在沙箱容器内执行实验，本函数实际只计算合成数值。
    原文建议真实实现另行启动容器，例如：
      docker run --network=none --memory=8g --cpus=2 --read-only ...
    并从挂载的输出卷收集标准输出和指标文件；本例没有执行这些操作。"""
    sp = node.config.get("sparsity_top", 8)
    lr = node.config.get("lr", 3e-4)
    # 按超参数构造损失，并加入随机噪声；此公式在稀疏度参数 8 附近较优。
    ideal_sp = 8
    loss = 3.0 - 0.3 * (1 - abs(sp - ideal_sp) / 16) + rng.gauss(0, 0.05)
    loss += 0.0001 * abs(lr - 3e-4) * 1000
    node.result = {"loss": round(loss, 3), "sparsity_top": sp, "lr": lr}
    node.cost_usd = 1.2 + rng.uniform(0, 0.4)
    node.quality = max(0.0, 1.0 - (loss - 2.5) / 1.5)
    node.novelty = 0.5 + rng.uniform(-0.1, 0.2)
    # 模拟偶发失败。
    if rng.random() < 0.1:
        # 失败标记：模拟因内存不足被 cgroup 终止；本例没有真实 cgroup。
        node.failure = "oom_killed_by_cgroup"
        node.quality = 0.0


# ---------------------------------------------------------------------------
# 验证步骤：检查是否失败，以及损失是否超出阈值。
# ---------------------------------------------------------------------------

def verify(node: Node) -> bool:
    if node.failure:
        return False
    if node.result.get("loss", 99) > 4.0:
        # 失败标记：损失超出示例阈值，视为发散。
        node.failure = "loss_diverged"
        return False
    return True


# ---------------------------------------------------------------------------
# 树搜索：用优先队列选择候选，设置预算与节点数上限，但没有深度限制。
# ---------------------------------------------------------------------------

@dataclass
class Tree:
    root: Node
    nodes: dict[int, Node] = field(default_factory=dict)
    frontier: list = field(default_factory=list)  # 队列项为（负评分、入队计数、节点 ID）。
    counter: int = 0
    budget: float = 30.0
    spent: float = 0.0
    max_nodes: int = 24

    def push(self, node: Node) -> None:
        self.nodes[node.node_id] = node
        self.counter += 1
        remaining = self.budget - self.spent
        heapq.heappush(self.frontier, (-node.score(remaining), self.counter, node.node_id))

    def pop(self) -> Node | None:
        while self.frontier:
            _, _, nid = heapq.heappop(self.frontier)
            return self.nodes[nid]
        return None


def tree_search(seed: str, rng: random.Random) -> Tree:
    root = Node(node_id=0, parent=None, hypothesis=seed, config={"sparsity_top": 8, "lr": 3e-4})
    root.novelty = 1.0
    root.quality = 0.5
    tree = Tree(root=root)
    tree.push(root)

    next_id = 1
    while tree.frontier and len(tree.nodes) < tree.max_nodes:
        cur = tree.pop()
        if cur is None:
            break
        if tree.spent >= tree.budget:
            print(f"    预算已耗尽，累计 ${tree.spent:.2f}")
            break
        if cur.node_id != 0:
            run_experiment(cur, rng)
            tree.spent += cur.cost_usd
            ok = verify(cur)
            flag = "通过" if ok else "失败"
            print(f"    [{flag}] 节点 #{cur.node_id:02d}  假设='{cur.hypothesis}'  "
                  f"损失={cur.result.get('loss','?'):>5}  "
                  f"$={cur.cost_usd:.2f}  累计=${tree.spent:.2f}")
            if not ok:
                continue
        # 扩展当前出队节点；排队分数来自其入队时的状态。
        children = expand(cur, next_id)
        next_id += len(children)
        for ch in children:
            tree.push(ch)

    return tree


# ---------------------------------------------------------------------------
# 选择最佳分支；研究撰写部分仍为占位。
# ---------------------------------------------------------------------------

def best_branch(tree: Tree) -> list[Node]:
    done = [n for n in tree.nodes.values() if n.result and not n.failure]
    if not done:
        return []
    best = max(done, key=lambda n: n.quality)
    # 沿父节点回溯到根节点。
    chain = [best]
    while chain[-1].parent is not None:
        chain.append(tree.nodes[chain[-1].parent])
    return list(reversed(chain))


def main() -> None:
    print("=== 自主研究智能体：树搜索（模拟预算 $30） ===")
    rng = random.Random(7)
    seed = "研究参数量小于 10 亿的 Transformer 注意力图中的稀疏模式"
    tree = tree_search(seed, rng)
    print()
    print(f"已建立节点数：{len(tree.nodes)}")
    print(f"模拟费用支出：${tree.spent:.2f}，预算 ${tree.budget:.2f}")
    print(f"失败节点数：{sum(1 for n in tree.nodes.values() if n.failure)}")

    branch = best_branch(tree)
    print(f"\n最佳分支（长度 {len(branch)}）：")
    for n in branch:
        print(f"  #{n.node_id:02d} {n.hypothesis}   质量={n.quality:.2f}  损失={n.result.get('loss','?')}")

    print("\n（此处原本应执行撰写、评审与红队检查；"
          "本示例仅作占位。）")


if __name__ == "__main__":
    main()
