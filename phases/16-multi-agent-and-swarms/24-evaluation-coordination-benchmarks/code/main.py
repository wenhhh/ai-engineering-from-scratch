"""多智能体基准评分卡生成器，仅使用 Python 标准库。

用三个预设系统模拟玩具任务集，计算 MARBLE 风格的里程碑完成指标、
相对随机基线的差距、费用指标，以及见过任务和留出任务之间的准确率差异。

译注：随机基线直接返回 0.15，没有实际运行随机策略；训练污染也是手工加分参数。
准确率差大于 0.1 只是本例的启发式标记，不能独立证明污染，未标记也不证明可信。
cost_per_milestone_held 实际为“每任务费用 / 里程碑完成比例”，本例每任务有四个
里程碑，因此是按四个里程碑折算的费用，不是每完成一个里程碑的平均费用。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass
class SystemSim:
    name: str
    base_accuracy: float
    cost_per_task: float
    milestone_completion_rate: float
    training_contamination: float = 0.0  # 对训练中见过的任务额外增加成功概率
    variance: float = 0.1


@dataclass
class TaskResult:
    task_id: str
    seen_in_training: bool
    accuracy: float
    milestones: int
    cost: float


SYSTEMS = [
    SystemSim("system-A", base_accuracy=0.70, cost_per_task=0.30,
              milestone_completion_rate=0.80, training_contamination=0.20),
    SystemSim("system-B", base_accuracy=0.64, cost_per_task=0.12,
              milestone_completion_rate=0.55, training_contamination=0.0),
    SystemSim("system-C", base_accuracy=0.55, cost_per_task=0.25,
              milestone_completion_rate=0.70, training_contamination=0.0),
]


def run_task(system: SystemSim, task_id: str, seen: bool, rng: random.Random) -> TaskResult:
    base = system.base_accuracy
    if seen:
        base += system.training_contamination
    base = max(0.0, min(1.0, base + rng.uniform(-system.variance, system.variance)))
    success = rng.random() < base
    milestones = 4 if success else int(4 * system.milestone_completion_rate * rng.random())
    return TaskResult(
        task_id=task_id,
        seen_in_training=seen,
        accuracy=1.0 if success else 0.0,
        milestones=milestones,
        cost=system.cost_per_task,
    )


def random_baseline(rng: random.Random) -> float:
    return 0.15  # 为这一任务族直接设定的随机基线准确率，并非运行测量值


def run_bench(system: SystemSim, n_seen: int, n_held: int, seed: int = 0) -> dict:
    rng = random.Random(seed)
    results_seen: list[TaskResult] = []
    results_held: list[TaskResult] = []
    for i in range(n_seen):
        results_seen.append(run_task(system, f"seen-{i}", True, rng))
    for i in range(n_held):
        results_held.append(run_task(system, f"held-{i}", False, rng))
    return {
        "name": system.name,
        "accuracy_seen": sum(r.accuracy for r in results_seen) / len(results_seen),
        "accuracy_held": sum(r.accuracy for r in results_held) / len(results_held),
        "milestone_rate_seen": sum(r.milestones for r in results_seen) / (len(results_seen) * 4),
        "milestone_rate_held": sum(r.milestones for r in results_held) / (len(results_held) * 4),
        "cost_per_task": system.cost_per_task,
        "cost_per_milestone_held":
            system.cost_per_task / max(0.01, sum(r.milestones for r in results_held) / len(results_held) / 4),
    }


def format_scorecard() -> None:
    print("=" * 78)
    print("基准评分卡——MARBLE 风格里程碑与污染风险提示")
    print("  风险提示：已见任务准确率 - 留出任务准确率（差值 > 0.1 时标记，不等于污染证明）")
    print("=" * 78)
    print(f"{'系统':10s} {'已见准确率':>10s} {'留出准确率':>10s} {'Δ':>6s} "
          f"{'留出里程碑率':>12s} {'每任务费':>8s} {'折算费用':>10s} {'相对随机差值':>12s}")

    rng = random.Random(0)
    rand_baseline = random_baseline(rng)
    for sys in SYSTEMS:
        r = run_bench(sys, n_seen=40, n_held=160, seed=17)
        delta = r["accuracy_seen"] - r["accuracy_held"]
        contam_flag = "*" if delta > 0.1 else " "
        vs_random = r["accuracy_held"] - rand_baseline
        print(f"{r['name']:10s} {r['accuracy_seen']:>10.3f} {r['accuracy_held']:>10.3f} "
              f"{delta:>5.2f}{contam_flag} {r['milestone_rate_held']:>12.3f} "
              f"${r['cost_per_task']:>7.2f} ${r['cost_per_milestone_held']:>9.3f} "
              f"+{vs_random:>10.3f}")

    print("\n  * 表示污染风险提示；比较时关注留出集，但不能只靠这个标记判断可信度")
    print(f"  预设随机基线准确率：{rand_baseline:.3f}")


def print_claim_scorecard() -> None:
    print("\n" + "=" * 78)
    print("结论检查清单——接受多智能体结果之前先核对")
    print("=" * 78)
    checklist = [
        "使用哪个基准与数据划分？原文称前沿模型在 Pro 与 Verified 上相差 40 分；该数字未在本轮核验，不能混用不同测试结果。",
        "污染检查：基准是否在训练截止日期后构建？还需要哪些证据？",
        "对照基线：是否比较单模型、随机策略及已有多智能体方案？",
        "统计依据：试验次数、p 值和置信区间是否公开？",
        "任务多样性：只有一个任务还是多个任务？能否跨领域泛化？",
        "成本披露：每任务词元数和墙钟耗时是多少？",
    ]
    for i, item in enumerate(checklist, 1):
        print(f"  [{i}] {item}")


def main() -> None:
    format_scorecard()
    print_claim_scorecard()
    print("\n要点：")
    print("  观察 system-A 的已见与留出任务分差；它被预先设定为存在训练污染加分。")
    print("  请按表比较 system-B 的费用与准确率；原文称其准确率最低，不能替代实际排序。")
    print("  system-C 即使没有污染提示，也不能因此直接判为可信。")
    print("  按准确率和按费用排序可能不同；解读费用前还须核对分母和里程碑单位。")


if __name__ == "__main__":
    main()
