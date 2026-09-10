"""数值任务上的多智能体辩论（原文类比 Du 等人 2023 年的研究）。

三个智能体从不同、可能有误的答案出发，每轮读取其他答案，按置信度加权更新，
并记录一致程度及与真值的误差。策略由预设公式实现，不调用 LLM。

译注：一轮内按顺序原地更新对象，后更新者会读到前者的新值，并非同时基于轮初
快照更新。single_shot_majority 实际计算算术平均数，不是多数票；fresh_team 的
种子没有改变固定初值。此模拟展示的是数值相互影响，不能当作论文结果的复现，
也不能把意见收敛等同于事实正确。
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field


TRUE_ANSWER = 42.0


@dataclass
class DebateAgent:
    name: str
    answer: float
    confidence: float
    history: list[float] = field(default_factory=list)

    def initial(self) -> None:
        self.history.append(self.answer)

    def revise(self, others: list["DebateAgent"]) -> None:
        """将自身与其他智能体的答案按各自置信度加权平均。"""
        weights = [self.confidence] + [o.confidence for o in others]
        values = [self.answer] + [o.answer for o in others]
        total_w = sum(weights)
        new_answer = sum(w * v for w, v in zip(weights, values)) / total_w
        self.answer = new_answer
        self.confidence = min(self.confidence * 1.05, 1.0)
        self.history.append(self.answer)


def agreement_score(agents: list[DebateAgent], tol: float = 0.1) -> float:
    """计算答案与全体均值相差不超过 tol 的智能体占比。"""
    mean = sum(a.answer for a in agents) / len(agents)
    agree = sum(1 for a in agents if abs(a.answer - mean) <= tol)
    return agree / len(agents)


def error_vs_truth(agents: list[DebateAgent]) -> float:
    mean = sum(a.answer for a in agents) / len(agents)
    return abs(mean - TRUE_ANSWER)


def run_debate(agents: list[DebateAgent], rounds: int, label: str) -> None:
    print(f"\n=== {label} ({rounds} 轮）===")
    for a in agents:
        a.initial()
    hdr = " ".join(f"{a.name:>6s}" for a in agents)
    print(f"  轮次     {hdr}    一致率    与真值误差")
    for a in agents:
        pass
    print(f"    0     {' '.join(f'{a.answer:6.2f}' for a in agents)}    {agreement_score(agents):4.2f}     {error_vs_truth(agents):5.2f}")
    for r in range(1, rounds + 1):
        updates = []
        for a in agents:
            others = [o for o in agents if o is not a]
            updates.append((a, others))
        for a, others in updates:
            a.revise(others)
        print(f"    {r}     {' '.join(f'{a.answer:6.2f}' for a in agents)}    {agreement_score(agents):4.2f}     {error_vs_truth(agents):5.2f}")


def fresh_team(seed: int) -> list[DebateAgent]:
    random.seed(seed)
    return [
        DebateAgent(name="A", answer=38.0, confidence=0.6),
        DebateAgent(name="B", answer=42.5, confidence=0.8),
        DebateAgent(name="C", answer=51.0, confidence=0.4),
    ]


def single_shot_majority(agents: list[DebateAgent]) -> float:
    """对照组：取第 0 轮答案的算术均值；函数名虽含 majority，实际未进行多数表决。"""
    return sum(a.answer for a in agents) / len(agents)


def main() -> None:
    print("多智能体辩论（原文类比 Du 等人，2023）")
    print("-" * 46)
    print(f"正确答案：{TRUE_ANSWER}")

    baseline = fresh_team(seed=1)
    for a in baseline:
        a.initial()
    control_mean = single_shot_majority(baseline)
    print(f"\n对照组（第 0 轮答案均值）：{control_mean:.2f}")
    print(f"与正确答案的误差：{abs(control_mean - TRUE_ANSWER):.2f}")

    team3 = fresh_team(seed=1)
    run_debate(team3, rounds=3, label="3 个智能体辩论，进行 3 轮")

    team5 = fresh_team(seed=2)
    run_debate(team5, rounds=5, label="3 个智能体辩论，进行 5 轮（观察边际变化）")

    print("\n观察要点：")
    print("  - 比较第一轮交流前后的误差变化。")
    print("  - 继续观察第 2、3 轮的累积影响。")
    print("  - 后续轮次的边际变化可能缩小；本例不构成论文中平台期的实证复现。")
    print("  - 若每次更新接入 LLM，N 个智能体、R 轮约需 N × R 次调用，且上下文可能增长。")


if __name__ == "__main__":
    main()
