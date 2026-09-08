"""流水线调度模拟器（Pipeline schedule simulator）: 比较 1F1B、Zero Bubble、DualPipe 与 DualPipeV。

教学工具。对给定的 (P, micro_batches) 计算各调度方案的流水线气泡（Bubble）。
输出:
  - 固定 (P, micro_batches) 下各调度方案的气泡比例
  - 气泡随 micro_batches 增长的变化

这不是生产级模拟器。前向/反向计算块的开销已按单位归一化。
通信开销采用重叠窗口建模，而不是完整的内核模型。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class ScheduleStats:
    name: str
    stable_bubble_frac: float
    scales_with_micro_batches: bool
    param_copies: int
    comm_overlap: str


def bubble_1f1b(P: int, M: int) -> float:
    """1F1B: 预热阶段（Warmup）有 (P-1) 个未与反向传播重叠的前向槽位。
    收尾阶段（Cooldown）与之对称。稳定阶段中，每个进程（Rank）的每个微批次气泡为零，
    但预热/收尾阶段每个进程的气泡为 (P-1) 个前向 + (P-1) 个反向计算块，
    总计算块数为 2 * M + 2 * (P - 1)。
    """
    total = 2 * M + 2 * (P - 1)
    bubble = 2 * (P - 1)
    return bubble / total


def bubble_zero_bubble(P: int, M: int) -> float:
    """Zero Bubble（Qi 2023）将反向传播拆成 B + W。W 部分可以填补 1F1B 的气泡。
    剩余气泡近似为预热阶段的 (P - 1) / 2 个计算块，加上等量的收尾计算块，
    总子计算块数为 3 * M + 2 * (P - 1)。
    """
    total = 3 * M + 2 * (P - 1)
    bubble = (P - 1)
    return bubble / total


def bubble_dualpipe(P: int, M: int) -> float:
    """DualPipe 从流水线两端注入微批次（Micro-batches）。稳定阶段气泡为零。
    预热/收尾阶段的气泡固定，与 M 无关。
    """
    total = 3 * M + (P - 1)
    bubble = (P - 1) // 2
    return bubble / total


def bubble_dualpipev(P: int, M: int) -> float:
    """DualPipeV 在单份参数副本上采用 V 形调度（V-shape schedule）。
    气泡略大于 DualPipe，但内存减半。近似为 DualPipe 气泡的 1.2x。"""
    return bubble_dualpipe(P, M) * 1.2


def summarize(P: int, M: int) -> List[tuple[str, float, int, str]]:
    return [
        ("1F1B",       bubble_1f1b(P, M),        1, "minimal"),
        ("Zero Bubble", bubble_zero_bubble(P, M), 1, "partial"),
        ("DualPipe",   bubble_dualpipe(P, M),    2, "full"),
        ("DualPipeV",  bubble_dualpipev(P, M),   1, "partial"),
    ]


def gpu_hours_recovered(P: int, M: int, total_gpu_hours: float) -> dict:
    b1 = bubble_1f1b(P, M)
    bd = bubble_dualpipe(P, M)
    recovered = (b1 - bd) * total_gpu_hours
    return {
        "1F1B_bubble_frac": b1,
        "DualPipe_bubble_frac": bd,
        "recovered_gpu_hours": recovered,
    }


def main() -> None:
    print("=" * 70)
    print("DualPipe 并行模拟器（Parallelism Simulator，阶段 10，第 19 课）")
    print("=" * 70)
    print()

    print("-" * 70)
    print("步骤 1: P=8, micro_batches=16 时的气泡比例")
    print("-" * 70)
    print(f"  {'调度（schedule）':<14} {'气泡（bubble）':>10} {'参数副本数（param copies）':>14} {'通信重叠（comm overlap）':>14}")
    for name, b, pc, co in summarize(P=8, M=16):
        print(f"  {name:<14} {b:>9.1%}  {pc:>14}  {co:>14}")
    print()

    print("-" * 70)
    print("步骤 2: 气泡比例随 micro_batches 的变化（P=8）")
    print("-" * 70)
    header = "  " + "M".rjust(6)
    for name in ("1F1B", "ZeroBubble", "DualPipe", "DualPipeV"):
        header += name.rjust(12)
    print(header)
    for M in (4, 8, 16, 32, 64, 128):
        row = f"  {M:>6}"
        for _, b, _, _ in summarize(P=8, M=M):
            row += f"{b:>12.1%}"
        print(row)
    print()

    print("-" * 70)
    print("步骤 3: 气泡比例随流水线深度的变化（固定 M=64）")
    print("-" * 70)
    header = "  " + "P".rjust(6)
    for name in ("1F1B", "ZeroBubble", "DualPipe", "DualPipeV"):
        header += name.rjust(12)
    print(header)
    for P in (4, 8, 16, 32, 64):
        row = f"  {P:>6}"
        for _, b, _, _ in summarize(P=P, M=64):
            row += f"{b:>12.1%}"
        print(row)
    print()

    print("-" * 70)
    print("步骤 4: 收回的 GPU 小时数（DeepSeek-V3 规模运行）")
    print("-" * 70)
    print("  DeepSeek-V3: 2048 张 H800 GPU，总计 ~2.8M GPU 小时。")
    print("  假设流水线深度 P=16，每步微批次数 M=128。")
    r = gpu_hours_recovered(P=16, M=128, total_gpu_hours=2_800_000)
    print(f"  1F1B 气泡 : {r['1F1B_bubble_frac']:.1%}")
    print(f"  DualPipe 气泡 : {r['DualPipe_bubble_frac']:.1%}")
    print(f"  收回的 GPU 时间 : {r['recovered_gpu_hours']:,.0f} GPU 小时")
    print(f"  （约相当于一次完整 70B 稠密模型预训练的成本）")
    print()

    print("要点: DualPipe 的气泡不随 M 增长。在混合专家（MoE）规模下，2x 参数")
    print("          副本的成本能够收回，因为专家并行（Expert Parallelism）")
    print("          已将占主体的权重充分分散。")
    print("          DualPipeV 以少量气泡开销换取去掉 2x 副本的收益。")


if __name__ == "__main__":
    main()
