"""协商：合同网与 OG-Narrator 风格演示，仅使用 Python 标准库。

用随机报价模拟朴素 LLM 议价，与确定性报价生成器进行比较，分别统计
1000 次试验的成交率；最后演示一个包含三个竞标者的小型合同网任务市场。

译注：本例没有 LLM 叙述生成，只实现报价算术与成交判断。买卖双方底价是
模拟器已知数据，不代表真实谈判中可直接获知对方底线。两种策略消耗随机数的
次数不同，即使初始种子相同，后续抽取的底价序列也不一定逐次配对一致。
论文名称、编号和结尾百分比沿用固定原文引述，未在本轮重新核验或复现实验。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass
class BargainState:
    buyer_max: int
    seller_min: int
    buyer_offer: int | None = None
    seller_offer: int | None = None
    rounds: int = 0
    max_rounds: int = 5


def naive_llm_bargain(state: BargainState, rng: random.Random) -> int:
    """模拟朴素 LLM 议价：抽取波动较大、可能超出可达成协议区间（ZOPA）的报价。
    原文将其类比 arXiv:2402.15813 中的策略错误；本例并不调用模型。"""
    r = rng.random()
    if state.seller_offer is None:
        candidate = rng.randint(state.buyer_max - 60, state.buyer_max + 30)
    elif r < 0.35:
        candidate = state.seller_offer + rng.randint(-8, 3)
    elif r < 0.65:
        candidate = rng.randint(state.seller_min - 30, state.buyer_max + 30)
    else:
        candidate = rng.randint(state.seller_min - 60, state.buyer_max + 60)
    return candidate


def og_narrator_bargain(state: BargainState, rng: random.Random,
                        concession: float = 0.35) -> int:
    """OG-Narrator 风格确定性报价：按固定让步比例向对方报价移动，并约束买方上限。"""
    if state.seller_offer is None and state.buyer_offer is None:
        return state.buyer_max - max(1, int((state.buyer_max - state.seller_min) * 0.2))
    if state.seller_offer is None:
        return state.buyer_offer
    prior = state.buyer_offer if state.buyer_offer is not None else state.buyer_max
    move = max(1, int(concession * (state.seller_offer - prior)))
    candidate = prior + move
    candidate = min(candidate, state.buyer_max)
    return candidate


def seller_response(state: BargainState, rng: random.Random,
                    concession: float = 0.3) -> int:
    """面对两类买方时，卖方都使用同一个确定性让步报价函数。"""
    if state.buyer_offer is None and state.seller_offer is None:
        return state.seller_min + max(1, int((state.buyer_max - state.seller_min) * 0.4))
    if state.buyer_offer is None:
        return state.seller_offer
    prior = state.seller_offer if state.seller_offer is not None else state.seller_min + 20
    move = max(1, int(concession * (prior - state.buyer_offer)))
    candidate = prior - move
    candidate = max(candidate, state.seller_min)
    return candidate


def simulate_bargain(buyer_fn, rng: random.Random, buyer_max: int = 100,
                     seller_min: int = 60) -> bool:
    state = BargainState(buyer_max=buyer_max, seller_min=seller_min)
    deal = False
    while state.rounds < state.max_rounds:
        state.buyer_offer = buyer_fn(state, rng)
        if state.seller_offer is not None and state.buyer_offer >= state.seller_offer:
            # 按卖方当前要价成交；只有价格落在双方可接受区间内才判定为有效。
            if state.seller_offer >= state.seller_min and state.seller_offer <= state.buyer_max:
                deal = True
            break
        state.seller_offer = seller_response(state, rng)
        if state.buyer_offer is not None and state.seller_offer <= state.buyer_offer:
            # 按买方当前出价成交；只有价格落在双方可接受区间内才判定为有效。
            if state.buyer_offer <= state.buyer_max and state.buyer_offer >= state.seller_min:
                deal = True
            break
        state.rounds += 1
    return deal


def bench_deal_rate(buyer_fn, label: str, trials: int = 1000) -> None:
    rng = random.Random(42)
    deals = 0
    for _ in range(trials):
        seller_min = rng.randint(50, 80)
        buyer_max = rng.randint(max(seller_min + 5, 75), 115)
        if simulate_bargain(buyer_fn, rng, buyer_max=buyer_max, seller_min=seller_min):
            deals += 1
    print(f"  {label:20s} 成交率：{deals / trials:.2%}  ({deals}/{trials})")


@dataclass
class Bid:
    bidder: str
    price: int
    eta_minutes: int
    confidence: float


@dataclass
class ContractNetTask:
    task_id: str
    description: str
    deadline_minutes: int
    budget: int


class ContractNetManager:
    def __init__(self, bidders: list[str]) -> None:
        self.bidders = bidders
        self.proposals: dict[str, list[Bid]] = {}

    def broadcast_cfp(self, task: ContractNetTask) -> None:
        self.proposals[task.task_id] = []
        print(f"  管理者征集提案（CFP）-> {task.description}（截止时间 {task.deadline_minutes} 分钟，预算 {task.budget})")

    def receive_proposal(self, task_id: str, bid: Bid) -> None:
        self.proposals[task_id].append(bid)
        print(f"    提案来自 {bid.bidder}：价格={bid.price} 预计耗时={bid.eta_minutes} 分钟，置信度={bid.confidence:.2f}")

    def award(self, task: ContractNetTask) -> Bid | None:
        props = self.proposals.get(task.task_id, [])
        feasible = [b for b in props if b.price <= task.budget and b.eta_minutes <= task.deadline_minutes]
        if not feasible:
            print("    没有满足条件的报价，不授予任务")
            return None
        winner = max(feasible, key=lambda b: b.confidence / max(b.price, 1))
        print(f"  管理者接受提案（accept-proposal）-> {winner.bidder}（评分 = 置信度 / 价格）")
        for b in props:
            if b is not winner:
                print(f"  管理者拒绝提案（reject-proposal）-> {b.bidder}")
        return winner


def demo_contract_net() -> None:
    print("\n" + "=" * 72)
    print("合同网任务市场——一个管理者与三个竞标者")
    print("=" * 72)
    task = ContractNetTask(
        task_id="t-1",
        description="压缩 10 GB 日志包",
        deadline_minutes=30,
        budget=10,
    )
    mgr = ContractNetManager(bidders=["worker-a", "worker-b", "worker-c"])
    mgr.broadcast_cfp(task)
    mgr.receive_proposal(task.task_id, Bid("worker-a", price=3, eta_minutes=18, confidence=0.82))
    mgr.receive_proposal(task.task_id, Bid("worker-b", price=2, eta_minutes=25, confidence=0.77))
    mgr.receive_proposal(task.task_id, Bid("worker-c", price=4, eta_minutes=10, confidence=0.90))
    mgr.award(task)


def main() -> None:
    print("=" * 72)
    print("成交率——朴素议价模拟与 OG-Narrator 风格报价")
    print("每次试验抽样：卖方底价在 [50,80]；买方上限不低于卖方底价 + 5，且位于 [75,115]")
    print("=" * 72)
    bench_deal_rate(naive_llm_bargain, "朴素 LLM（模拟）")
    bench_deal_rate(og_narrator_bargain, "OG-Narrator")
    demo_contract_net()

    print("\n要点：")
    print("  本例的朴素议价函数被设为高方差，可能给出可达成协议区间之外的报价。")
    print("  原文将确定性报价与模型叙述分工称为 OG-Narrator；本例只实现报价部分，")
    print("  使用算术规则而非生成式模型出价；成交情况应以本次统计为准。")
    print("  原文引述论文 arXiv:2402.15813：真实 LLM 基准中的成交率从 26.67% 提升到 88.88%。")
    print("  这些论文数字不是本模拟的实测值，也未在本轮重新核验。这里的对手卖方")
    print("  同样使用确定性报价，因此不能直接拿模拟差距与论文结果进行归因比较。")
    print("  合同网以征集、收集提案和授予任务组织协作；本例不需要同步群聊。")


if __name__ == "__main__":
    main()
