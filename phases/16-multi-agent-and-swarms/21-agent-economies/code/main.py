"""智能体经济机制：Shapley 贡献归因、二价拍卖与信誉加权路由。

全部使用 Python 标准库。提供精确枚举和抽样两种 Shapley 计算函数，
演示五人二价拍卖，再比较随机分配与信誉加权分配在 100 次任务中的合成质量。

译注：函数不会按 N 自动切换算法，示例对三个智能体分别调用精确与抽样版本。
拍卖只演示“最高价者获胜、支付次高价”的结算，不验证激励相容性的完整前提。
信誉只是带下限的指数平滑分数，并未实现身份抗女巫、质押或明确的惩罚扣款机制。
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from itertools import permutations
from typing import Callable


# ---------- Shapley ----------

def shapley_exact(value_fn: Callable[[frozenset], float], agents: list[str]) -> dict[str, float]:
    n = len(agents)
    contribs = {a: 0.0 for a in agents}
    for order in permutations(agents):
        visited: set[str] = set()
        prev_value = value_fn(frozenset(visited))
        for a in order:
            visited.add(a)
            new_value = value_fn(frozenset(visited))
            contribs[a] += new_value - prev_value
            prev_value = new_value
    factorial = math.factorial(n)
    return {a: v / factorial for a, v in contribs.items()}


def shapley_sampled(value_fn: Callable[[frozenset], float], agents: list[str],
                    samples: int, rng: random.Random) -> dict[str, float]:
    contribs = {a: 0.0 for a in agents}
    for _ in range(samples):
        order = list(agents)
        rng.shuffle(order)
        visited: set[str] = set()
        prev_value = value_fn(frozenset(visited))
        for a in order:
            visited.add(a)
            new_value = value_fn(frozenset(visited))
            contribs[a] += new_value - prev_value
            prev_value = new_value
    return {a: v / samples for a, v in contribs.items()}


# ---------- 二价拍卖 ----------

@dataclass
class Bid:
    bidder: str
    value: float


def second_price(bids: list[Bid]) -> tuple[str, float] | None:
    if len(bids) < 2:
        return None
    sorted_bids = sorted(bids, key=lambda b: b.value, reverse=True)
    winner = sorted_bids[0].bidder
    payment = sorted_bids[1].value
    return winner, payment


# ---------- 信誉加权路由 ----------

class Reputation:
    def __init__(self, alpha: float = 0.95, floor: float = 0.1) -> None:
        self.alpha = alpha
        self.floor = floor
        self.scores: dict[str, float] = {}

    def init(self, agents: list[str]) -> None:
        for a in agents:
            self.scores[a] = 1.0

    def update(self, agent: str, quality: float) -> None:
        current = self.scores.get(agent, 1.0)
        self.scores[agent] = max(self.floor, self.alpha * current + (1 - self.alpha) * quality)

    def weights(self, agents: list[str]) -> list[float]:
        return [self.scores.get(a, 1.0) for a in agents]


def weighted_choice(agents: list[str], weights: list[float], rng: random.Random) -> str:
    total = sum(weights)
    r = rng.random() * total
    upto = 0.0
    for a, w in zip(agents, weights):
        upto += w
        if r <= upto:
            return a
    return agents[-1]


# ---------- 演示 ----------

def demo_shapley() -> None:
    print("=" * 72)
    print("Shapley 贡献归因——三个智能体协作完成任务")
    print("=" * 72)

    # 价值函数：编码者独立贡献 0.5，研究者 0.3，审阅者 0.1；
    # 组合价值由下面的表直接指定，并非所有组合都保证超可加。
    base = {
        frozenset(): 0.0,
        frozenset(["coder"]): 0.5,
        frozenset(["researcher"]): 0.3,
        frozenset(["reviewer"]): 0.1,
        frozenset(["coder", "researcher"]): 0.85,
        frozenset(["coder", "reviewer"]): 0.70,
        frozenset(["researcher", "reviewer"]): 0.55,
        frozenset(["coder", "researcher", "reviewer"]): 1.00,
    }
    value_fn = lambda s: base[s]
    agents = ["coder", "researcher", "reviewer"]

    exact = shapley_exact(value_fn, agents)
    print("  精确 Shapley 值：")
    for a, v in exact.items():
        print(f"    {a:11s} {v:.4f}")
    print(f"    总和 = {sum(exact.values()):.4f}（应等于全体联盟价值 1.0000，因为空联盟价值设为 0）")

    rng = random.Random(0)
    sampled = shapley_sampled(value_fn, agents, samples=200, rng=rng)
    print("\n  抽样 Shapley 值（200 次排列抽样）：")
    for a, v in sampled.items():
        print(f"    {a:11s} {v:.4f}")


def demo_auction() -> None:
    print("\n" + "=" * 72)
    print("二价拍卖——五个竞标者争取一个任务席位")
    print("=" * 72)
    bids = [
        Bid("agent-a", 0.82),
        Bid("agent-b", 0.60),
        Bid("agent-c", 0.95),
        Bid("agent-d", 0.45),
        Bid("agent-e", 0.77),
    ]
    for b in bids:
        print(f"  {b.bidder:10s} 出价 {b.value:.2f}")
    result = second_price(bids)
    if result:
        winner, payment = result
        print(f"\n  获胜者：{winner}  支付金额：{payment:.2f}")
        print("  （获胜者支付次高报价；一次演示不能单独证明真实报价的激励条件。）")


def demo_reputation_routing() -> None:
    print("\n" + "=" * 72)
    print("信誉加权路由——100 个任务、4 个智能体，前 50 次为预热")
    print("=" * 72)
    agents = ["alpha", "beta", "gamma", "delta"]
    true_quality = {"alpha": 0.9, "beta": 0.5, "gamma": 0.75, "delta": 0.3}

    rng = random.Random(0)

    # 随机分配对照组
    random_quality = 0.0
    for _ in range(100):
        a = rng.choice(agents)
        q = max(0.0, min(1.0, true_quality[a] + rng.uniform(-0.1, 0.1)))
        random_quality += q

    # 信誉加权分配，前 50 次随机预热
    rng = random.Random(0)
    rep = Reputation()
    rep.init(agents)
    rep_quality = 0.0
    for i in range(100):
        if i < 50:
            a = rng.choice(agents)  # 预热：通过随机分配观察各智能体质量
        else:
            a = weighted_choice(agents, rep.weights(agents), rng)
        q = max(0.0, min(1.0, true_quality[a] + rng.uniform(-0.1, 0.1)))
        rep.update(a, q)
        rep_quality += q

    print(f"  随机路由平均质量：{random_quality / 100:.3f}")
    print(f"  信誉加权路由平均质量：{rep_quality / 100:.3f}")
    print(f"  相对改善：{(rep_quality - random_quality) / random_quality * 100:+.1f}%")
    print("\n  最终信誉分数：")
    for a in agents:
        print(f"    {a:8s} 信誉={rep.scores[a]:.3f} 设定质量={true_quality[a]:.2f}")


def main() -> None:
    demo_shapley()
    demo_auction()
    demo_reputation_routing()
    print("\n要点：")
    print("  Shapley 按边际贡献分摊价值，精确枚举开销较大；原文建议 N > 6 时考虑抽样。")
    print("  原文将二价拍卖与真实报价激励联系起来；本例只实现结算，未验证其全部假设。")
    print("  信誉反馈可参与路由更新；本例只有平滑评分，没有实现原文提到的质押惩罚。")


if __name__ == "__main__":
    main()
