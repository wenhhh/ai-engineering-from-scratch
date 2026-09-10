"""具身视觉语言动作模型（VLA）的动作格式简化示例——仅使用标准库。

三个迷你实现：
  1. 离散分箱动作词元化（RT-2 / OpenVLA）。
  2. FAST 风格的“离散余弦变换 + 量化”压缩器。
  3. 三种格式的词元数量对比：离散分箱、FAST 和连续流。

译注：原文 speedup 输出按词元数量之比计算，并未测量真实运行速度。
连续流的计数 1 表示示意性的单个输出头，不代表实现或计时了完整流匹配模型。
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def discretize(action: list[float], bins: int = 256) -> list[int]:
    """将 [-1,1]^D 中的动作映射为 D 个整数分箱索引。"""
    tokens = []
    for a in action:
        idx = int((a + 1) / 2 * (bins - 1))
        idx = max(0, min(bins - 1, idx))
        tokens.append(idx)
    return tokens


def undiscretize(tokens: list[int], bins: int = 256) -> list[float]:
    return [(2 * t / (bins - 1)) - 1 for t in tokens]


def dct(x: list[float]) -> list[float]:
    """朴素 II 型离散余弦变换（DCT）。"""
    n = len(x)
    out = []
    for k in range(n):
        s = 0.0
        for i in range(n):
            s += x[i] * math.cos(math.pi / n * (i + 0.5) * k)
        out.append(s)
    return out


def fast_compress(trajectory: list[list[float]], keep_coeff: int = 4,
                  bins: int = 32) -> list[int]:
    """FAST 风格的词元化器：逐维 DCT + 保留低频系数 + 量化。
    trajectory：动作列表，每个动作为浮点数列表，整体形状为 (T, D)。
    返回展平的整数词元列表。"""
    if not trajectory:
        return []
    D = len(trajectory[0])
    tokens = []
    for d in range(D):
        series = [step[d] for step in trajectory]
        coeffs = dct(series)[:keep_coeff]
        for c in coeffs:
            c_norm = max(-1.0, min(1.0, c / len(series)))
            idx = int((c_norm + 1) / 2 * (bins - 1))
            tokens.append(idx)
    return tokens


def compare_formats() -> None:
    T = 30
    D = 10
    trajectory = [[math.sin(0.1 * t + 0.3 * d) for d in range(D)] for t in range(T)]

    print("\n动作词元数量（30 步轨迹，10 个自由度）")
    print("-" * 60)
    per_step_discrete = len(discretize(trajectory[0]))
    total_discrete = per_step_discrete * T
    fast_tokens = fast_compress(trajectory, keep_coeff=4)
    total_fast = len(fast_tokens)
    continuous_flow_count = 1
    rows = [
        ("离散 256 分箱（RT-2）",   total_discrete, "逐步自回归"),
        ("FAST，每维保留 4 个系数",      total_fast,     "序列压缩器"),
        ("流匹配（pi0）",       continuous_flow_count, "单个输出头"),
    ]
    for name, count, note in rows:
        print(f"  {name:<28}  {count:>6} 个词元   （{note}）")
    print(f"\n  加速比：FAST 约为离散分箱的 {total_discrete / total_fast:.1f} 倍")


def round_trip_demo() -> None:
    print("\n往返测试：10 自由度动作经过离散化与反离散化")
    print("-" * 60)
    action = [0.1, -0.5, 0.25, -0.75, 0.9, -0.1, 0.0, 0.33, -0.67, 0.5]
    tokens = discretize(action, bins=256)
    recovered = undiscretize(tokens, bins=256)
    print(f"  原始动作：{[round(a, 3) for a in action]}")
    print(f"  词元    ：{tokens}")
    print(f"  恢复动作：{[round(r, 3) for r in recovered]}")
    max_err = max(abs(a - r) for a, r in zip(action, recovered))
    print(f"  最大绝对误差：{max_err:.4f}  （分箱宽度 = 2/255，约为 0.0078）")


def lineage_table() -> None:
    print("\nVLA 发展谱系")
    print("-" * 60)
    rows = [
        ("RT-2",       "2023", "PaLM-X + 离散分箱",  "闭源"),
        ("OpenVLA",    "2024", "Llama 7B + 离散分箱", "开放"),
        ("Octo",       "2024", "小型扩散头",   "开放"),
        ("pi0",        "2024", "流匹配头",     "开放"),
        ("pi0-FAST",   "2025", "流模型 + FAST 词元化器",  "开放"),
        ("GR00T N1",   "2025", "双系统人形机器人",   "开放"),
        ("GR00T N1.7", "2025", "扩大仿真到现实的数据规模", "开放"),
    ]
    print(f"  {'模型':<12}{'年份':<6}{'架构模式':<28}{'开放/闭源'}")
    for r in rows:
        print(f"  {r[0]:<12}{r[1]:<6}{r[2]:<28}{r[3]}")


def main() -> None:
    print("=" * 60)
    print("具身视觉语言动作模型（阶段 12，第 21 课）")
    print("=" * 60)

    round_trip_demo()
    compare_formats()
    lineage_table()

    print("\n联合微调比例（网络视觉问答数据 : 机器人轨迹）")
    print("-" * 60)
    print("  RT-2       : ~1:1")
    print("  OpenVLA    ：网络数据与机器人数据约为 0.5:1")
    print("  pi0        ：采用相近的配比")
    print("  视觉问答数据过多 -> 遗忘动作；机器人数据过多 -> 丢失语言能力")


if __name__ == "__main__":
    main()
