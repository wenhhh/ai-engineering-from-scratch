"""投票与辩论拓扑实验脚手架，仅使用 Python 标准库。

在预设任务上比较 star（星形）、chain（链式）、tree（树形）和 graph（图形）
结构。每个智能体按固定准确率概率返回正确答案，否则返回 error_bias 标签。
测量模拟准确率、预设词元开销和串行步数；没有真实模型调用或延迟测量。

译注：同质化组只共享错误标签，各次正确与否仍独立抽样，并未建模所有相关错误。
majority 是相对多数票，平票按插入顺序选择；树形分支平票可能偏向左分支。
原文提到 graph/N=7 的词元数约为 star/N=3 的 7 倍，按本代码实际是
5600 / 1200，约 4.67 倍。具体拓扑收益应逐行比较结果，不能预设全面优胜。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass
class SimAgent:
    name: str
    base_accuracy: float
    error_bias: str
    tokens_per_call: int = 400

    def answer(self, correct: str, rng: random.Random) -> str:
        return correct if rng.random() < self.base_accuracy else self.error_bias


@dataclass
class RunResult:
    topology: str
    n: int
    final_answer: str
    correct: str
    tokens: int
    steps: int

    def accuracy(self) -> int:
        return 1 if self.final_answer == self.correct else 0


def majority(items: list[str]) -> str:
    counts: dict[str, int] = {}
    for it in items:
        counts[it] = counts.get(it, 0) + 1
    return max(counts, key=counts.get)


def run_star(agents: list[SimAgent], correct: str, rng: random.Random) -> RunResult:
    hub = agents[0]
    workers = agents[1:]
    answers = [w.answer(correct, rng) for w in workers]
    tokens = sum(w.tokens_per_call for w in workers) + hub.tokens_per_call
    final = majority(answers) if answers else hub.answer(correct, rng)
    return RunResult("star", len(agents), final, correct, tokens, steps=2)


def run_chain(agents: list[SimAgent], correct: str, rng: random.Random) -> RunResult:
    current = agents[0].answer(correct, rng)
    tokens = agents[0].tokens_per_call
    for a in agents[1:]:
        proposal = a.answer(correct, rng)
        current = proposal if proposal != current and rng.random() < a.base_accuracy else current
        tokens += a.tokens_per_call
    return RunResult("chain", len(agents), current, correct, tokens, steps=len(agents))


def run_tree(agents: list[SimAgent], correct: str, rng: random.Random) -> RunResult:
    root = agents[0]
    leaves = agents[1:]
    if len(leaves) <= 1:
        return run_star(agents, correct, rng)
    mid = len(leaves) // 2
    left_answers = [a.answer(correct, rng) for a in leaves[:mid]]
    right_answers = [a.answer(correct, rng) for a in leaves[mid:]]
    tokens = sum(a.tokens_per_call for a in leaves) + root.tokens_per_call
    left_consensus = majority(left_answers)
    right_consensus = majority(right_answers)
    final = majority([left_consensus, right_consensus])
    return RunResult("tree", len(agents), final, correct, tokens, steps=3)


def run_graph(agents: list[SimAgent], correct: str, rng: random.Random, rounds: int = 2) -> RunResult:
    # 每个智能体先给出答案，再根据全部候选的相对多数结果决定是否更新。
    # 少数意见以固定概率转向多数；这不保证更接近正确答案。
    positions = [a.answer(correct, rng) for a in agents]
    tokens = sum(a.tokens_per_call for a in agents)
    for _ in range(rounds - 1):
        majority_now = majority(positions)
        new_positions = []
        for pos, ag in zip(positions, agents):
            if pos != majority_now and rng.random() < 0.4:
                new_positions.append(majority_now)
            else:
                new_positions.append(pos)
            tokens += ag.tokens_per_call
        positions = new_positions
    return RunResult("graph", len(agents), majority(positions), correct, tokens, steps=rounds * 2)


def make_agents(n: int, heterogeneous: bool, seed: int) -> list[SimAgent]:
    rng = random.Random(seed)
    if heterogeneous:
        biases = ["WRONG-A", "WRONG-B", "WRONG-C"]
        accuracies = [0.72, 0.70, 0.74, 0.71, 0.73, 0.70, 0.72]
    else:
        biases = ["WRONG-A"]
        accuracies = [0.72] * 7
    return [
        SimAgent(f"agent-{i}", accuracies[i % len(accuracies)], biases[i % len(biases)])
        for i in range(n)
    ]


def bench(correct: str, trials: int, heterogeneous: bool) -> None:
    tag = "异质智能体组" if heterogeneous else "同质智能体组（共同错误标签）"
    print("\n" + "=" * 72)
    print(f"模拟基准——{tag}")
    print("=" * 72)
    print(f"{'拓扑':10s} {'N':>3s} {'准确率':>8s} {'平均词元数':>12s} {'步数':>6s}")
    for topology in ("star", "chain", "tree", "graph"):
        for n in (3, 5, 7):
            acc_sum = 0
            tok_sum = 0
            step_sum = 0
            for t in range(trials):
                agents = make_agents(n, heterogeneous, seed=t)
                rng = random.Random(t * 31 + 7)
                if topology == "star":
                    r = run_star(agents, correct, rng)
                elif topology == "chain":
                    r = run_chain(agents, correct, rng)
                elif topology == "tree":
                    r = run_tree(agents, correct, rng)
                else:
                    r = run_graph(agents, correct, rng)
                acc_sum += r.accuracy()
                tok_sum += r.tokens
                step_sum += r.steps
            print(f"{topology:10s} {n:>3d} {acc_sum/trials:>8.2f} {tok_sum//trials:>12d} {step_sum//trials:>6d}")


def main() -> None:
    bench(correct="RIGHT", trials=200, heterogeneous=False)
    bench(correct="RIGHT", trials=200, heterogeneous=True)
    print("\n要点：")
    print("  请逐项比较异质组与同质组的准确率；本例不保证每种拓扑和规模都严格提升。")
    print("  graph/N=7 的模拟词元数为 5600，约为 star/N=3 的 1200 的 4.67 倍。")
    print("  星形结构的成本与准确率可作为简单聚合场景的对照，不是通用最优结论。")
    print("  链式结构可能传递偏差；实际影响应对照本次抽样结果，而非预设结论。")


if __name__ == "__main__":
    main()
