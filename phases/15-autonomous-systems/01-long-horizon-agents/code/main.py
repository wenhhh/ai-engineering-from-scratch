"""METR 风格的任务时间跨度模拟器，仅使用 Python 标准库。

给定翻倍周期和基准时间跨度，外推未来各月份在 50% 任务完成率下对应的任务时长。
另行演示逐步可靠性如何沿执行轨迹连乘：单步成功率为 99%，70 步全成功的概率
也只有约一半。这个乘积模型假设每一步成功事件相互独立，且成功率固定。

这是未经过校准的教学模型，用来帮助理解数量关系，不应直接据此批准无人值守运行。
译注：代码中的 14 小时、7 个月及模型/研究归属均来自固定原文快照，本轮未重新核验。
部署差距仅按自选比例线性折减；后面的研究百分比不是这个折减模型的实测校准依据。
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class HorizonConfig:
    baseline_hours: float
    baseline_month: int  # 相对基准时点的月数（0 表示现在）
    doubling_months: float


def horizon_at(cfg: HorizonConfig, months_from_now: int) -> float:
    """外推指定月份偏移下，完成率为 50% 的任务时间跨度。"""
    delta = months_from_now - cfg.baseline_month
    return cfg.baseline_hours * (2 ** (delta / cfg.doubling_months))


def months_to_cross(cfg: HorizonConfig, target_hours: float) -> float:
    """返回时间跨度达到 target_hours 时相对基准时点的月数。"""
    ratio = target_hours / cfg.baseline_hours
    return cfg.baseline_month + cfg.doubling_months * math.log2(ratio)


def end_to_end_reliability(per_step: float, steps: int) -> float:
    """在独立、同成功率假设下，计算所有步骤依次成功的概率。"""
    return per_step ** steps


def max_steps_for_target(per_step: float, target: float) -> int:
    """满足 per_step**N >= target 的最大步数 N。"""
    if per_step >= 1.0:
        return 10**9
    return math.floor(math.log(target) / math.log(per_step))


def fmt_hours(h: float) -> str:
    if h < 1:
        return f"{h * 60:.1f} 分钟"
    if h < 24:
        return f"{h:.1f} 小时"
    return f"{h / 24:.1f} 天"


def horizon_projection() -> None:
    """按示例设定的翻倍周期，打印未来的任务时间跨度。"""
    cfg = HorizonConfig(
        baseline_hours=14.0,
        baseline_month=0,
        doubling_months=7.0,
    )
    print("\nMETR 风格的任务时间跨度外推")
    print("-" * 70)
    print(f"  基准：{cfg.baseline_hours:.1f} 小时，第 0 个月 "
          f"（原文标注：Claude Opus 4.6，2026 年 1 月）")
    print(f"  翻倍周期：{cfg.doubling_months:.1f} 个月")
    print()
    print(f"  {'月份':>8}  {'时间跨度':>12}  {'含义':<30}")
    for m in (0, 6, 12, 18, 24, 30, 36):
        h = horizon_at(cfg, m)
        tag = ""
        if h < 24:
            tag = "工作日量级"
        elif h < 168:
            tag = "多日任务"
        elif h < 720:
            tag = "周量级"
        else:
            tag = "月量级"
        print(f"  {m:>8}  {fmt_hours(h):>12}  {tag:<30}")

    print()
    print("  达到各目标时长的时点")
    for target in (24, 48, 168, 720):
        m = months_to_cross(cfg, target)
        print(f"    {fmt_hours(target)}：相对基准的月数 {m:.1f}")


def reliability_compounding() -> None:
    """演示逐步可靠性在整条执行轨迹上的累积衰减。"""
    print("\n单步可靠性 -> 端到端可靠性")
    print("-" * 70)
    print(f"  {'单步成功率':>10}  {'步数':>8}  {'整体成功率':>12}  "
          f"{'提示':<20}")
    cases = [
        (0.90, 10),
        (0.90, 50),
        (0.95, 50),
        (0.99, 50),
        (0.99, 70),
        (0.99, 200),
        (0.995, 200),
        (0.999, 1000),
    ]
    for per_step, steps in cases:
        p = end_to_end_reliability(per_step, steps)
        flag = ""
        if p < 0.5:
            flag = "不高于抛硬币"
        elif p < 0.8:
            flag = "不宜用于生产"
        elif p < 0.95:
            flag = "脆弱"
        else:
            flag = "尚可"
        print(f"  {per_step:>10.3f}  {steps:>8}  {p:>12.1%}  {flag:<20}")

    print()
    print("  端到端成功率至少为 50% 时的最大轨迹长度")
    for per_step in (0.90, 0.95, 0.99, 0.995, 0.999):
        n = max_steps_for_target(per_step, 0.50)
        print(f"    单步成功率 {per_step:.3f}：最多 {n} 步")


def deploy_gap_note() -> None:
    """演示评测与部署之间的差距折减；不是经校准的规避评测模型。"""
    print("\n评测与部署差距的示意调整")
    print("-" * 70)
    print("  原文将 METR 数字置于工具理想、无现实后果、")
    print("  不规避评测的假设下，并引述 Anthropic 2024 年的伪装对齐")
    print("  研究：基础测试中 Claude 伪装的比例为 12%，再次训练后")
    print("  最高达 78%。（沿用原文引述，不能视为下列折减比例的依据。）")
    print()
    for horizon in (14.0, 48.0, 168.0):
        for gap in (0.0, 0.2, 0.4):
            effective = horizon * (1 - gap)
            print(f"  基准评测 {fmt_hours(horizon):>7}  "
                  f"差距 {gap:.0%}  ->  部署 "
                  f"{fmt_hours(effective):>7}")


def main() -> None:
    print("=" * 70)
    print("METR 任务时间跨度与可靠性连乘（阶段 15，第 1 课）")
    print("=" * 70)
    horizon_projection()
    reliability_compounding()
    deploy_gap_note()
    print()
    print("=" * 70)
    print("要点：时间跨度按指数增长，逐步可靠性则连乘")
    print("-" * 70)
    print("  在示例的 7 个月翻倍假设下，多日量级约在一年内到达。")
    print("  单步成功率 99% 时，70 步全成功的概率就已降至约一半。")
    print("  系统设计必须同时考虑任务时间跨度和端到端可靠性。")


if __name__ == "__main__":
    main()
