"""多智能体辩论：比较全连接拓扑与稀疏的星形拓扑。

用按预设规则调整意见的辩论者，统计最终答案、首次达成共识的轮次，
以及互相评议的操作次数（作为成本的替代指标）。

译注：本例不调用模型；预置修正规则使三个问题在初始状态就已得到一致的正确答案。
因此，结果只能说明这些夹具下的操作计数差异，不能证明真实辩论提高准确率。
converged_round 是循环中首次观察到一致的轮次，记录后仍继续执行剩余轮次。
问题、答案及拓扑标签保留英文：capital_of_portugal 为葡萄牙首都（Lisbon，里斯本）；
is_2_plus_2_equal_4 为 2+2 是否等于 4；chess_legal_e4 为 e4 走法是否合法。
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Debater:
    name: str
    drift: Callable[[str, list[str]], str]


def _make_debater(name: str, bias: str,
                  corrections: dict[str, str]) -> Debater:
    def drift(question: str, peer_answers: list[str]) -> str:
        current = corrections.get(question, bias)
        if peer_answers:
            common = Counter(peer_answers).most_common(1)[0][0]
            if common != current and common != bias:
                return common
        return current
    return Debater(name=name, drift=drift)


def full_mesh_round(debaters: list[Debater], question: str,
                    prior: dict[str, str]) -> tuple[dict[str, str], int]:
    new_answers: dict[str, str] = {}
    ops = 0
    for debater in debaters:
        peers = [prior[d.name] for d in debaters if d.name != debater.name]
        new_answers[debater.name] = debater.drift(question, peers)
        ops += len(peers)
    return new_answers, ops


def sparse_star_round(hub: Debater, spokes: list[Debater], question: str,
                      prior: dict[str, str]) -> tuple[dict[str, str], int]:
    new_answers: dict[str, str] = {}
    ops = 0
    spoke_names = [s.name for s in spokes]
    new_answers[hub.name] = hub.drift(
        question, [prior[n] for n in spoke_names]
    )
    ops += len(spoke_names)
    for spoke in spokes:
        new_answers[spoke.name] = spoke.drift(
            question, [prior[hub.name]]
        )
        ops += 1
    return new_answers, ops


def run_debate(debaters: list[Debater], question: str, rounds: int,
               topology: str) -> tuple[str, int, int]:
    prior: dict[str, str] = {}
    for debater in debaters:
        prior[debater.name] = debater.drift(question, [])

    total_ops = 0
    converged_round = -1
    hub = debaters[0]
    spokes = debaters[1:]
    for r in range(rounds):
        if topology == "full_mesh":
            new, ops = full_mesh_round(debaters, question, prior)
        else:
            new, ops = sparse_star_round(hub, spokes, question, prior)
        total_ops += ops
        if all(v == list(new.values())[0] for v in new.values()) and converged_round == -1:
            converged_round = r + 1
        prior = new

    votes = Counter(prior.values()).most_common(1)[0][0]
    return votes, converged_round, total_ops


def main() -> None:
    print("=" * 70)
    print("多智能体辩论——阶段 14，第 25 课")
    print("=" * 70)

    questions_and_truth = {
        "capital_of_portugal": "Lisbon",
        "is_2_plus_2_equal_4": "yes",
        "chess_legal_e4": "legal",
    }

    debaters = [
        _make_debater(
            "alpha", bias="Lisbon",
            corrections={"is_2_plus_2_equal_4": "yes",
                         "chess_legal_e4": "legal"},
        ),
        _make_debater(
            "beta", bias="Madrid",
            corrections={"capital_of_portugal": "Lisbon",
                         "is_2_plus_2_equal_4": "yes",
                         "chess_legal_e4": "legal"},
        ),
        _make_debater(
            "gamma", bias="Porto",
            corrections={"capital_of_portugal": "Lisbon",
                         "is_2_plus_2_equal_4": "yes",
                         "chess_legal_e4": "legal"},
        ),
    ]

    for q, truth in questions_and_truth.items():
        print(f"\n--- {q}  （标准答案：{truth}）---")
        for topology in ("full_mesh", "sparse_star"):
            answer, converged, ops = run_debate(
                debaters, q, rounds=3, topology=topology,
            )
            correct = "CORRECT" if answer == truth else "WRONG"
            print(f"  {topology:12}  答案={answer:10}  "
                  f"首次一致轮次={converged}  操作数={ops}  {correct}")

    print()
    print("在此预设样本中，星形与全连接拓扑准确率相同，但星形的评议操作更少。")
    print("原文认为辩论可帮助事实型和规则型任务，但会增加延迟与成本；本例未验证其普遍收益。")


if __name__ == "__main__":
    main()
