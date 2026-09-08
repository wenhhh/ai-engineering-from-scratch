"""冷启动（Cold Start）缓解路径模拟器，仅使用 Python 标准库。

模拟 70B 模型在不同优化组合下的冷启动：
  RAW              ：不做优化，作为名义基线
  PRE_SEEDED       ：加入 Bottlerocket 预置节点镜像（Pre-seeded Node Image）
  STREAMER         ：加入 NVIDIA Run:ai Model Streamer
  GPU_SNAPSHOT     ：加入 Modal 式 GPU 快照（Snapshot）
  WARM_POOL        ：min_workers=1，预热路径完全没有冷启动

报告各层耗时与总耗时，单位为秒，并计算预热池（Warm Pool）的盈亏平衡点。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Phase:
    name: str
    raw_sec: float
    pre_seeded_sec: float    # 此步骤被省去时为 0
    streamer_sec: float      # 启用流式加载器时，替代原始耗时
    snapshot_sec: float      # 启用快照时，替代全部原有路径


PHASES_70B = [
    Phase("node provision",   50.0, 50.0,  50.0,  0.5),
    Phase("image pull",      180.0,  0.0, 180.0,  0.0),
    Phase("weights to HBM",   75.0, 75.0,  35.0,  0.0),
    Phase("engine init",      20.0, 20.0,  20.0,  2.0),
    Phase("first forward",     3.0,  3.0,   3.0,  0.5),
]


def total_for_stack(stack: set[str]) -> float:
    seconds = 0.0
    for phase in PHASES_70B:
        if "gpu_snapshot" in stack:
            seconds += phase.snapshot_sec
        elif "streamer" in stack and "pre_seeded" in stack:
            used = phase.pre_seeded_sec
            if phase.name == "weights to HBM":
                used = phase.streamer_sec
            seconds += used
        elif "pre_seeded" in stack:
            seconds += phase.pre_seeded_sec
        elif "streamer" in stack:
            seconds += phase.streamer_sec if phase.name == "weights to HBM" else phase.raw_sec
        else:
            seconds += phase.raw_sec
    return seconds


def report_stack(label: str, stack: set[str]) -> None:
    total = total_for_stack(stack)
    mins = total / 60
    print(f"{label:20}  {total:6.1f} 秒（{mins:4.1f} 分钟）  优化组合={sorted(stack) if stack else '{基线}'}")


def warm_pool_break_even(gpu_hourly: float, cold_seconds: float, sla_tolerated_drops_per_day: int) -> None:
    print("\n" + "=" * 80)
    print("预热池（Warm Pool）盈亏平衡点（Break-even）")
    print("=" * 80)
    print(f"GPU 价格：{gpu_hourly:.2f} 美元/小时  |  冷启动：{cold_seconds:.0f} 秒  |  每日允许丢弃请求数：{sla_tolerated_drops_per_day}\n")
    warm_monthly = gpu_hourly * 24 * 30
    print(f"预热池（min_workers=1）每月成本：{warm_monthly:.2f} 美元")
    print()
    print(f"{'请求/小时':>8}  {'预计每日冷启动次数':>24}  {'超出预算的丢弃数':>20}  {'预热池是否更好':>15}")
    for rate in (1, 5, 10, 25, 50, 100, 250):
        cold_starts_per_day = 24 / max(rate, 1) if rate < 1 else 1
        cold_starts_per_day = min(20, max(1, int(24 * 3600 / (rate * 3600))))
        drops = cold_starts_per_day
        warm_better = "是" if drops > sla_tolerated_drops_per_day else "否"
        print(f"{rate:>8}  {cold_starts_per_day:>24}  {max(0, drops - sla_tolerated_drops_per_day):>20}  {warm_better:>15}")


def main() -> None:
    print("=" * 80)
    print("冷启动缓解：全新 H100 节点上的 70B 模型")
    print("=" * 80)
    print(f"{'方案':20}  {'总耗时':>8}             优化组合")
    print("-" * 80)

    report_stack("原始基线（RAW）",                      set())
    report_stack("+ 预置镜像（PRE_SEEDED）",             {"pre_seeded"})
    report_stack("+ 流式加载（STREAMER）",               {"streamer"})
    report_stack("+ 预置镜像与流式加载（PRE_SEEDED + STREAMER）",  {"pre_seeded", "streamer"})
    report_stack("+ GPU 快照（GPU_SNAPSHOT）",           {"gpu_snapshot"})

    print("\n（预热池 WARM_POOL 的预热路径完全避免冷启动，代价是全天候租用 GPU。）")

    warm_pool_break_even(gpu_hourly=4.50, cold_seconds=328, sla_tolerated_drops_per_day=5)


if __name__ == "__main__":
    main()
