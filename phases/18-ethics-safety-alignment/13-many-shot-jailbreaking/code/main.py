"""多样本越狱玩具示例，仅使用 Python 标准库。

用手工设定的幂律函数表示：上下文中顺从回答示例越多，模拟攻击成功率越高。
再比较一个将有效示例数限制为 16 的防御函数。不训练或调用任何模型。
原文以 Anil 等（2024）图 2 的趋势为背景；这里只生成相似形状的合成曲线，
并非复现论文数据或实际越狱试验。

运行方式：python3 code/main.py

译注：实现使用 ASR(n) = min(1, 0.02 + 0.03 × n^0.5)，在 n=256 时为 0.50，
不是原文所述的“约 256 个样本时饱和”。所谓分类器仅对 n 取上限，没有识别
上下文的过程。结尾引用的 61%→2% 是固定原文数字，未在本例测量或重新核验。
"""

from __future__ import annotations

import math
import random


random.seed(41)


def target_asr(n_shots: int, alpha: float = 0.5, a0: float = 0.02) -> float:
    """按示例数计算手工设定的攻击成功率。
    幂律形式：ASR(n) = min(1, a0 + c × n^alpha)。

    原文将其类比为 Anil 等（2024）观察到的增长趋势，但此函数不是论文
    数据拟合；其在 5、32、256 个样本处的值应以实际公式为准。
    """
    if n_shots <= 0:
        return 0.0
    c = 0.03
    return min(1.0, a0 + c * (n_shots ** alpha))


def defense_adjusted(n_shots: int, alpha: float = 0.5) -> float:
    """简化防御：直接将有效示例数限制为 16，使 ASR 不超过该点的值。
    这里只模拟分类器防御后的效果，没有实现模式识别分类器。"""
    eff = min(n_shots, 16)
    return target_asr(eff, alpha)


def simulate(n_shots: int, asr_fn, trials: int = 500) -> float:
    p = asr_fn(n_shots)
    hits = sum(1 for _ in range(trials) if random.random() < p)
    return hits / trials


def fit_power_law(shots: list[int], asrs: list[float]) -> tuple[float, float]:
    """简单双对数线性回归：log(ASR) = log(c) + alpha × log(n)。"""
    xs = [math.log(s) for s in shots if s > 0]
    ys = [math.log(max(a, 1e-4)) for a in asrs]
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((xi - mx) * (yi - my) for xi, yi in zip(xs, ys))
    den = sum((xi - mx) ** 2 for xi in xs)
    alpha = num / den
    logc = my - alpha * mx
    return alpha, math.exp(logc)


def main() -> None:
    print("=" * 70)
    print("多样本越狱玩具示例（阶段 18，第 13 课）")
    print("=" * 70)

    shots = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]

    print("\n-- 无防御目标（手工设定的幂律 ASR 曲线）--")
    undef = []
    for s in shots:
        rate = simulate(s, target_asr)
        undef.append(rate)
        print(f"  示例数={s:4d}   ASR={rate:.3f}")
    alpha, c = fit_power_law(shots, undef)
    print(f"\n  拟合幂律：ASR ≈ {c:.3f} * n^{alpha:.3f}")

    print("\n-- 模拟分类器防御（有效示例数上限为 16）--")
    for s in shots:
        rate = simulate(s, defense_adjusted)
        print(f"  示例数={s:4d}   ASR={rate:.3f}")

    print("\n" + "=" * 70)
    print("要点：此模拟按预设幂律增加 ASR，防御函数限制有效示例数。")
    print("既保留良性的上下文学习（ICL），又抑制有害的上下文学习，")
    print("需要在上下文层面区分两类内容；本例没有实现这种识别能力。")
    print("原文引用的分类器式提示词修改方法（Anthropic，2024）")
    print("报告在保留 ICL 的同时将攻击成功率由 61% 降至 2%；这不是本例的实测结果。")
    print("=" * 70)


if __name__ == "__main__":
    main()
