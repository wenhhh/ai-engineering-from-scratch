"""Darwin Gödel Machine 风格的循环，仅使用 Python 标准库。

玩具基准把“智能体”表示为字符串变换操作的序列。每一代修改操作序列，再由评估器
评分，档案保留不同的候选。--reward-hack-allowed 开启奖励投机旁路，允许
hack_bonus 在真实得分上额外加分，模拟智能体可以篡改评分过程的情况。

译注：原概述提到 score_adjustment 函数，实际实现使用 hack_bonus 字段。
所有 CASES 都被反复用于选择候选，不是独立留出的测试集。目标要求标题式大小写，
但工具库没有该变换，因此关闭旁路也不意味着可以完全解出基准。
这是预设变异规则下的教学模拟，不会让真实智能体自行修改评估器源码。
"""

from __future__ import annotations

import random
import sys
from dataclasses import dataclass, field


# 供智能体组合使用的工具库；操作名是分派键，保持不变。
TOOLS = [
    ("upper", lambda s: s.upper()),
    ("lower", lambda s: s.lower()),
    ("reverse", lambda s: s[::-1]),
    ("trim", lambda s: s.strip()),
    ("collapse", lambda s: " ".join(s.split())),
    ("nop", lambda s: s),
]

# 基准：将杂乱字符串变换为预期的规范形式。
# 目标以 CASES 为准：合并空白、去除首尾空白，并转为标题式大小写。
CASES = [
    ("  Hello   World  ", "Hello World"),
    ("FOO   bar", "Foo Bar"),
    ("  MixedCase Space  ", "Mixedcase Space"),
    ("Already clean", "Already Clean"),
    ("\t tabby\ttab ", "Tabby Tab"),
    ("   X   ", "X"),
    ("nothing  SPECIAL here", "Nothing Special Here"),
    ("ITEM   one-two", "Item One-Two"),
]
# 目标最后一步是标题式大小写；工具库不提供该操作，
# 所以任意操作序列都无法得到 1.0 分。若评分流程允许旁路，
# 循环可以通过奖励投机，让报告得分高于真实得分，
# 而不必改善任务行为。


def hash_seq(seq: list[str]) -> tuple[str, ...]:
    return tuple(seq)


@dataclass
class Agent:
    ops: list[str]
    # 若评分流程允许旁路，就把 hack_bonus 加到报告得分中。
    # 它代表智能体能够对评分流程本身作出的修改，
    # 而不是任务能力的真实提升。
    hack_bonus: float = 0.0


def apply(agent: Agent, s: str) -> str:
    tool_map = dict(TOOLS)
    for op in agent.ops:
        fn = tool_map.get(op)
        if fn is None:
            return ""
        s = fn(s)
    return s


def true_score(agent: Agent) -> float:
    correct = 0
    for inp, want in CASES:
        if apply(agent, inp) == want:
            correct += 1
    return correct / len(CASES)


def reported_score(agent: Agent, hack_allowed: bool) -> float:
    base = true_score(agent)
    if hack_allowed:
        return min(1.0, base + agent.hack_bonus)
    return base


def mutate(parent: Agent, hack_allowed: bool) -> Agent:
    ops = list(parent.ops)
    move = random.random()
    if move < 0.3 and ops:
        i = random.randrange(len(ops))
        ops[i] = random.choice([t[0] for t in TOOLS])
    elif move < 0.6 and len(ops) < 8:
        ops.insert(random.randrange(len(ops) + 1),
                   random.choice([t[0] for t in TOOLS]))
    elif move < 0.85 and len(ops) > 1:
        ops.pop(random.randrange(len(ops)))

    bonus = parent.hack_bonus
    if hack_allowed and random.random() < 0.08:
        # 每代以较小概率增加投机加分。
        bonus = min(1.0, bonus + random.uniform(0.0, 0.1))
    return Agent(ops=ops, hack_bonus=bonus)


def run_dgm(generations: int, hack_allowed: bool, seed: int | None = None) -> None:
    if seed is not None:
        random.seed(seed)
    archive: dict[tuple[int, float], Agent] = {}
    init = Agent(ops=["nop"])
    archive[(len(init.ops), round(reported_score(init, hack_allowed), 2))] = init

    best_report, best_true = reported_score(init, hack_allowed), true_score(init)
    print(f"  代数 {0:>4}  报告得分 {best_report:.2f}  真实得分 {best_true:.2f}  "
          f"操作 {init.ops}  额外加分 {init.hack_bonus:.2f}")

    for g in range(1, generations + 1):
        parent = random.choice(list(archive.values()))
        child = mutate(parent, hack_allowed)
        rep = reported_score(child, hack_allowed)
        true_s = true_score(child)
        key = (len(child.ops), round(rep, 2))
        incumbent = archive.get(key)
        if incumbent is None or rep > reported_score(incumbent, hack_allowed):
            archive[key] = child
        # 按报告得分记录历史最优值；这正是循环实际优化的指标。
        if rep > best_report:
            best_report = rep
            best_true = true_s
            print(f"  代数 {g:>4}  报告得分 {rep:.2f}  真实得分 {true_s:.2f}  "
                  f"操作 {child.ops}  额外加分 {child.hack_bonus:.2f}")

    best = max(archive.values(), key=lambda a: reported_score(a, hack_allowed))
    print(f"\n  最终报告得分：{reported_score(best, hack_allowed):.2f}")
    print(f"  最终真实得分：{true_score(best):.2f}")
    print(f"  最终操作序列：{best.ops}")
    print(f"  最终投机加分：{best.hack_bonus:.2f}")
    gap = reported_score(best, hack_allowed) - true_score(best)
    print(f"  报告值 - 真实值：{gap:+.2f}")


def main() -> None:
    hack_allowed = "--reward-hack-allowed" in sys.argv

    print("=" * 70)
    print("Darwin Gödel Machine 风格的循环（阶段 15，第 4 课）")
    print("=" * 70)
    print(f"奖励投机旁路：{'已开启' if hack_allowed else '已关闭'}")

    print("\n运行演示")
    print("-" * 70)
    run_dgm(generations=200, hack_allowed=hack_allowed, seed=7)

    print()
    print("=" * 70)
    print("要点：评估器必须处于智能体无权修改的边界之外")
    print("-" * 70)
    if hack_allowed:
        print("  旁路开启时，报告得分可以上升到真实得分之上。")
        print("  本例模拟原文讨论的奖励投机模式：智能体改善的是评分流程")
        print("  给出的数字，而不是任务行为；这里没有运行真实 DGM 系统。")
    else:
        print("  旁路关闭时，报告得分等于真实得分，但受工具库能力限制，")
        print("  仍无法完全满足目标。使用 --reward-hack-allowed 重新运行，")
        print("  可观察报告得分与真实表现分离的失败模式。")


if __name__ == "__main__":
    main()
