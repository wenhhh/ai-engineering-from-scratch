"""能力与对齐增长竞赛的模拟器，仅使用 Python 标准库。

每轮递归自我改进（RSI）都模拟两个乘法增长过程：能力增长因子 r_c 和对齐增长
因子 r_a，各自叠加可配置噪声。跟踪差距 M(t) = C(t) - A(t)，以及首次达到阈值的轮次。

译注：C、A 是任意单位的玩具状态，不是经验证的能力与对齐测量尺度。
阈值仅用于事后标记 PAUSE，没有真正停止 run()；结尾的 1.5 和 10 轮描述来自
默认演示，修改 --threshold 或种子后未必成立。同均值的乘法过程也不保证差距有界。
"""

from __future__ import annotations

import argparse
import random
import statistics
from dataclasses import dataclass


DEFAULT_SEED = 11


@dataclass
class Config:
    r_c: float
    r_a: float
    noise_c: float
    noise_a: float
    threshold: float = 1.5


def run(cycles: int, cfg: Config) -> list[tuple[int, float, float, float]]:
    c = 1.0
    a = 1.0
    out = [(0, c, a, c - a)]
    for cyc in range(1, cycles + 1):
        nc = cfg.r_c + random.gauss(0, cfg.noise_c)
        na = cfg.r_a + random.gauss(0, cfg.noise_a)
        c *= max(0.9, nc)
        a *= max(0.9, na)
        out.append((cyc, c, a, c - a))
    return out


def crossing_cycle(trajectory, threshold: float) -> int:
    for cyc, _c, _a, gap in trajectory:
        if gap >= threshold:
            return cyc
    return -1


def print_trajectory(label: str, cfg: Config, cycles: int = 40) -> None:
    traj = run(cycles, cfg)
    print(f"\n{label}")
    print(f"  r_c={cfg.r_c:.2f} r_a={cfg.r_a:.2f} "
          f"noise_c={cfg.noise_c:.3f} noise_a={cfg.noise_a:.3f}")
    print(f"  阈值（C - A）：{cfg.threshold:.2f}")
    print(f"  {'轮次':>6}  {'C(t)':>8}  {'A(t)':>8}  {'C-A':>8}  提示")
    # 打印约九个快照，始终包含第 0 轮和最后一轮，
    # 避免修改 cycles（例如做练习）后悄悄漏掉起点或终点。
    step = max(1, cycles // 8)
    for cyc, c, a, gap in traj:
        if cyc == 0 or cyc == cycles or cyc % step == 0:
            flag = "建议暂停" if gap >= cfg.threshold else "未越界"
            print(f"  {cyc:>6}  {c:>8.2f}  {a:>8.2f}  {gap:>+8.2f}  {flag}")
    cross = crossing_cycle(traj, cfg.threshold)
    if cross >= 0:
        print(f"  -> 首次达到阈值的轮次：{cross}")
    else:
        print("  -> 本次模拟窗口内未达到阈值")


def monte_carlo(cfg: Config, cycles: int, trials: int) -> None:
    crossings = []
    for _ in range(trials):
        traj = run(cycles, cfg)
        cross = crossing_cycle(traj, cfg.threshold)
        if cross >= 0:
            crossings.append(cross)
    print(f"\n  蒙特卡洛试验次数：{trials}；每次 {cycles} 轮")
    print(f"  达到阈值的试验：{len(crossings)} ({len(crossings)/trials:.0%})")
    if crossings:
        avg = sum(crossings) / len(crossings)
        p50 = statistics.median(crossings)
        print(f"  首次越界轮次的均值：{avg:.1f}")
        print(f"  首次越界轮次的中位数：{p50}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--threshold", type=float, default=1.5,
                        help="触发暂停提示的差距阈值 C - A（默认值：%(default)s；不实际中止循环）")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED,
                        help="随机数种子（默认值：%(default)s）")
    args = parser.parse_args()

    random.seed(args.seed)
    th = args.threshold
    print("=" * 70)
    print("能力与对齐的增长竞赛（阶段 15，第 7 课）")
    print("=" * 70)

    # 场景 A：能力以中等幅度领先于对齐增长
    print_trajectory(
        "场景 A：能力增长快于对齐增长",
        Config(r_c=1.15, r_a=1.08, noise_c=0.02, noise_a=0.03, threshold=th),
    )

    # 场景 B：对齐与能力的平均增长因子相同
    print_trajectory(
        "场景 B：平均增长因子相同（差距由噪声产生）",
        Config(r_c=1.10, r_a=1.10, noise_c=0.02, noise_a=0.03, threshold=th),
    )

    # 场景 C：对齐平均增长更快，但能力可能突增
    print_trajectory(
        "场景 C：对齐平均增长更快，但能力可能突增",
        Config(r_c=1.10, r_a=1.13, noise_c=0.06, noise_a=0.01, threshold=th),
    )

    print("\n场景 A 的蒙特卡洛试验")
    monte_carlo(
        Config(r_c=1.15, r_a=1.08, noise_c=0.02, noise_a=0.03, threshold=th),
        cycles=30, trials=500,
    )
    print("\n场景 C 的蒙特卡洛试验")
    monte_carlo(
        Config(r_c=1.10, r_a=1.13, noise_c=0.06, noise_a=0.01, threshold=th),
        cycles=30, trials=500,
    )

    print()
    print("=" * 70)
    print("要点：微小的增长差异可能累积到触发阈值")
    print("-" * 70)
    print("  默认示例中，场景 A 会较快达到绝对差距 1.5；具体轮次见上方输出。")
    print("  场景 B 的均值相同，但这不保证乘法噪声造成的差距永远有界。")
    print("  场景 C 中，即使对齐平均增长更快，也未必能抵御能力的突增。")
    print("  因此既要考虑平均增长差异，也要考虑噪声与突发变化。")
    print("  实际 RSI 流程需要真正执行暂停措施；本例仅打印提示。")


if __name__ == "__main__":
    main()
