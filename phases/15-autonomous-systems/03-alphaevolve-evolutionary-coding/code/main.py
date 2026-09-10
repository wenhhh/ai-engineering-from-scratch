"""AlphaEvolve 风格的最小进化循环，仅使用 Python 标准库。

用玩具符号回归演示候选表达式的变异与评估。所谓“LLM”实际上是随机变异函数：
替换叶子、增加加法或乘法项，或扰动常数。评估器计算训练点和另一组数据点上的误差。
MAP-Elites 网格按（表达式深度，常数幅值分桶）存放不同候选，保留多样性。

译注：use_holdout=True 时，代码把 test_score 直接用于反复选择候选，
因此这组数据实际承担验证集的角色，不是从未参与搜索的独立测试集。
变量名 test_score 和原有搜索逻辑保留；低误差不等于已经证明泛化能力。
"""

from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass


DEFAULT_SEED = 1


# 进化循环试图重新发现的目标函数。
def target(x: float) -> float:
    return 2.0 * x * x + 3.0 * x - 1.0


Expr = tuple  # 递归表示：("num", v) | ("x",) | ("add", a, b) | ("mul", a, b)


def evaluate_expr(e: Expr, x: float) -> float:
    tag = e[0]
    if tag == "num":
        return float(e[1])
    if tag == "x":
        return x
    if tag == "add":
        return evaluate_expr(e[1], x) + evaluate_expr(e[2], x)
    if tag == "mul":
        return evaluate_expr(e[1], x) * evaluate_expr(e[2], x)
    raise ValueError(tag)


def depth(e: Expr) -> int:
    tag = e[0]
    if tag in ("num", "x"):
        return 1
    return 1 + max(depth(e[1]), depth(e[2]))


def max_const(e: Expr) -> float:
    tag = e[0]
    if tag == "num":
        return abs(e[1])
    if tag == "x":
        return 0.0
    return max(max_const(e[1]), max_const(e[2]))


def mutate(e: Expr) -> Expr:
    """用随机变异模拟 LLM 对表达式的局部修改。"""
    choice = random.random()
    if choice < 0.25:
        return random_leaf()
    if choice < 0.5:
        return ("add", e, random_leaf())
    if choice < 0.75:
        return ("mul", e, random_leaf())
    # 在表达式中的某处扰动常数
    return perturb(e)


def perturb(e: Expr) -> Expr:
    tag = e[0]
    if tag == "num":
        return ("num", e[1] + random.choice([-1.0, -0.5, 0.5, 1.0]))
    if tag == "x":
        return e
    return (tag, perturb(e[1]), e[2]) if random.random() < 0.5 else (tag, e[1], perturb(e[2]))


def random_leaf() -> Expr:
    if random.random() < 0.5:
        return ("x",)
    return ("num", float(random.choice([-2, -1, 0, 1, 2, 3])))


def render(e: Expr) -> str:
    tag = e[0]
    if tag == "num":
        return f"{e[1]:g}"
    if tag == "x":
        return "x"
    op = "+" if tag == "add" else "*"
    return f"({render(e[1])} {op} {render(e[2])})"


def mse(e: Expr, xs: list[float]) -> float:
    total = 0.0
    for x in xs:
        try:
            y = evaluate_expr(e, x)
        except (OverflowError, ValueError):
            return float("inf")
        total += (y - target(x)) ** 2
    return total / max(1, len(xs))


@dataclass
class Candidate:
    expr: Expr
    train_score: float
    test_score: float
    generation: int


def cell_key(e: Expr) -> tuple[int, int]:
    d = min(depth(e), 6)
    c = min(int(max_const(e) / 2), 4)
    return (d, c)


def seed_candidate(test_xs: list[float], train_xs: list[float], gen: int) -> Candidate:
    e = random_leaf()
    return Candidate(e, mse(e, train_xs), mse(e, test_xs), gen)


def run_loop(
    generations: int,
    pop: int,
    use_holdout: bool,
    seed: int | None = None,
) -> tuple[Candidate, list[float], list[float]]:
    if seed is not None:
        random.seed(seed)
    train_xs = [-2.0, -1.0, 0.0, 1.0, 2.0, 3.0]
    test_xs = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5]

    def signal_of(c: Candidate) -> float:
        return 0.5 * (c.train_score + c.test_score) if use_holdout else c.train_score

    archive: dict[tuple[int, int], Candidate] = {}
    for _ in range(pop):
        c = seed_candidate(test_xs, train_xs, 0)
        key = cell_key(c.expr)
        incumbent = archive.get(key)
        if incumbent is None or signal_of(c) < signal_of(incumbent):
            archive[key] = c

    best_trace: list[float] = []
    test_trace: list[float] = []
    for g in range(1, generations + 1):
        parent = random.choice(list(archive.values()))
        child_expr = mutate(parent.expr)
        tr = mse(child_expr, train_xs)
        te = mse(child_expr, test_xs)
        child = Candidate(child_expr, tr, te, g)
        key = cell_key(child_expr)
        incumbent = archive.get(key)
        if incumbent is None or signal_of(child) < signal_of(incumbent):
            archive[key] = child

        best = min(archive.values(), key=lambda c: c.train_score)
        best_trace.append(best.train_score)
        test_trace.append(best.test_score)

    # 最终选择必须采用与搜索相同的信号；若在 use_holdout=False 时
    # 又在这里使用留出数据，就会把它悄悄泄漏回运行 B，
    # 从而掩盖课程试图展示的过拟合现象。
    best = min(archive.values(), key=signal_of)
    return best, best_trace, test_trace


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--no-holdout",
        action="store_true",
        help="搜索和最终选择只使用训练误差（仅运行 B；仍计算另一组数据的误差供展示）",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("AlphaEvolve 风格的进化循环（阶段 15，第 3 课）")
    print("=" * 70)
    print("目标函数：2x^2 + 3x - 1")

    if not args.no_holdout:
        print("\n运行 A：评估信号包含另一组数据的误差（实际用作验证集）")
        best, train_trace, _ = run_loop(
            generations=1500, pop=20, use_holdout=True, seed=DEFAULT_SEED
        )
        print(f"  最佳表达式：{render(best.expr)}")
        print(f"  训练 MSE  ：{best.train_score:.4f}")
        print(f"  另一组 MSE：{best.test_score:.4f}")
        print(f"  出现代数  ：{best.generation}")
        print("  进展：第 100 代训练误差={:.3f}，第 500 代={:.3f}，第 1500 代={:.3f}".format(
            train_trace[99], train_trace[499], train_trace[-1]))

    print("\n运行 B：选择候选时不使用留出数据（仅优化训练误差 -> 奖励投机风险）")
    best, _train_trace, _test_trace = run_loop(
        generations=1500, pop=20, use_holdout=False, seed=DEFAULT_SEED
    )
    print(f"  最佳表达式：{render(best.expr)}")
    print(f"  训练 MSE  ：{best.train_score:.4f}")
    print(f"  另一组 MSE：{best.test_score:.4f}")
    print(f"  出现代数  ：{best.generation}")
    gap = best.test_score - best.train_score
    print(f"  两组数据的误差差距：{gap:+.4f}  （较大差距可作为过拟合或奖励投机的代理指标）")

    print()
    print("=" * 70)
    print("要点：评估器决定搜索会优化什么")
    print("-" * 70)
    print("  运行 A 同时以两组数据的误差为选择依据。")
    print("  运行 B 只优化训练误差，另一组数据的表现可能较差。")
    print("  独立评估有助于区分真实发现与奖励投机；但本例的另一组")
    print("  数据已参与运行 A 的搜索，不能再当作独立的泛化证据。")
    print("  能否构造可信评估器，是选择自动搜索问题时的关键。")


if __name__ == "__main__":
    main()
