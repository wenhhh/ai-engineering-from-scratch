"""使用 Python 标准库实现原生稀疏注意力（Native Sparse Attention，DeepSeek NSA）。

实现 Yuan 等人在 2025 年提出的三个并行分支:
  - 压缩分支（Compressed branch）: 对块均值键计算粗粒度注意力
  - 选择分支（Selected branch）: 对 top-k 未压缩块计算细粒度注意力
  - 滑动窗口分支（Sliding-window branch）: 对最后 W 个词元计算注意力

通过门控（Gate）组合三个分支，打印各分支每次查询的键数量，与全注意力比较。
将键数量报告扩展到 64k 和 128k 上下文，展示 NSA 面向长序列的开销节省。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import List


def dot(a: List[float], b: List[float]) -> float:
    return sum(ai * bi for ai, bi in zip(a, b))


def softmax(row: List[float]) -> List[float]:
    m = max(row)
    exps = [math.exp(x - m) for x in row]
    s = sum(exps)
    return [e / s for e in exps]


def attention(q: List[float], K: List[List[float]],
              V: List[List[float]]) -> tuple[List[float], List[float]]:
    """返回 (weights, output)，即（权重，输出）。"""
    d = len(q)
    scale = math.sqrt(d)
    scores = [dot(q, k) / scale for k in K]
    w = softmax(scores)
    d_v = len(V[0])
    out = [sum(w[j] * V[j][c] for j in range(len(V))) for c in range(d_v)]
    return w, out


def compress_mean(K: List[List[float]], l: int) -> List[List[float]]:
    """将每 l 个连续键合并为其均值。真实 NSA 在此处使用学得的多层感知机（MLP），
    均值池化（Mean-pool）只是教学基线。"""
    n = len(K)
    d = len(K[0])
    n_blocks = (n + l - 1) // l
    out = []
    for b in range(n_blocks):
        start, end = b * l, min((b + 1) * l, n)
        block = K[start:end]
        summary = [sum(row[c] for row in block) / len(block) for c in range(d)]
        out.append(summary)
    return out


def top_k_blocks(scores: List[float], k: int) -> List[int]:
    indexed = sorted(range(len(scores)), key=lambda i: -scores[i])
    return sorted(indexed[:k])


def fine_grained_keys(K: List[List[float]], V: List[List[float]], l: int,
                      block_indices: List[int]) -> tuple[List[List[float]], List[List[float]]]:
    """从选定块中加载原始（未压缩）词元。"""
    k_out, v_out = [], []
    for b in block_indices:
        start, end = b * l, min((b + 1) * l, len(K))
        k_out.extend(K[start:end])
        v_out.extend(V[start:end])
    return k_out, v_out


def sliding_window(K: List[List[float]], V: List[List[float]],
                   W: int) -> tuple[List[List[float]], List[List[float]]]:
    n = len(K)
    start = max(0, n - W)
    return K[start:], V[start:]


def gate(q: List[float], Wg: List[List[float]]) -> List[float]:
    """门控 MLP: 1 层线性变换 + sigmoid，生成 3 个分支权重。"""
    logits = [dot(q, Wg[i]) for i in range(3)]
    return [1.0 / (1.0 + math.exp(-x)) for x in logits]


@dataclass
class NSAConfig:
    l: int
    k: int
    W: int


def nsa_step(q: List[float], K: List[List[float]], V: List[List[float]],
             Wg: List[List[float]], cfg: NSAConfig) -> tuple[List[float], dict]:
    K_cmp = compress_mean(K, cfg.l)
    V_cmp = compress_mean(V, cfg.l)
    cmp_w, cmp_out = attention(q, K_cmp, V_cmp)

    picks = top_k_blocks(cmp_w, cfg.k)
    K_sel, V_sel = fine_grained_keys(K, V, cfg.l, picks)
    if K_sel:
        _, sel_out = attention(q, K_sel, V_sel)
    else:
        sel_out = [0.0] * len(q)

    K_win, V_win = sliding_window(K, V, cfg.W)
    _, win_out = attention(q, K_win, V_win)

    g = gate(q, Wg)
    combined = [g[0] * cmp_out[i] + g[1] * sel_out[i] + g[2] * win_out[i]
                for i in range(len(cmp_out))]

    info = {
        "cmp_keys": len(K_cmp),
        "sel_keys": len(K_sel),
        "win_keys": len(K_win),
        "total_keys": len(K_cmp) + len(K_sel) + len(K_win),
        "full_keys": len(K),
        "selected_blocks": picks,
        "gates": g,
    }
    return combined, info


def synthesize_sequence(n: int, d: int, signal_blocks: List[int], l: int,
                        rng: random.Random) -> tuple[List[List[float]], List[List[float]], List[float]]:
    """构建 K、V，其中 `signal_blocks` 承载共享模式，查询与该模式对齐。
    其余部分为高斯噪声（Gaussian noise）。"""
    pattern = [rng.gauss(0, 1) for _ in range(d)]
    norm = math.sqrt(sum(x * x for x in pattern))
    pattern = [x / norm for x in pattern]
    K = [[rng.gauss(0, 0.3) for _ in range(d)] for _ in range(n)]
    V = [[rng.gauss(0, 1) for _ in range(d)] for _ in range(n)]
    for b in signal_blocks:
        start, end = b * l, min((b + 1) * l, n)
        for i in range(start, end):
            K[i] = list(pattern)
    q = list(pattern)
    return K, V, q


def count_full_attention(N: int) -> int:
    return N


def count_nsa(N: int, l: int, k: int, W: int) -> int:
    return (N // l) + (k * l) + W


def main() -> None:
    rng = random.Random(11)
    print("=" * 70)
    print("原生稀疏注意力（Native Sparse Attention）— DeepSeek NSA（阶段 10，第 17 课）")
    print("=" * 70)
    print()

    d = 16
    n = 1024
    l, k, W = 32, 4, 128
    signal_blocks = [3, 17, 28]

    print("-" * 70)
    print(f"步骤 1: 合成数据 N={n}, d={d}，信号位于块 {signal_blocks}")
    print(f"        配置: l={l}（压缩块），k={k}（top-k），W={W}（滑动窗口）")
    print("-" * 70)

    K, V, q = synthesize_sequence(n=n, d=d, signal_blocks=signal_blocks, l=l, rng=rng)
    Wg = [[rng.gauss(0, 0.5) for _ in range(d)] for _ in range(3)]

    out, info = nsa_step(q, K, V, Wg, NSAConfig(l=l, k=k, W=W))

    print(f"  压缩分支键数 : {info['cmp_keys']}")
    print(f"  选择分支键数 : {info['sel_keys']}  （块 {info['selected_blocks']}）")
    print(f"  滑动窗口键数 : {info['win_keys']}")
    print(f"  参与注意力的键总数 : {info['total_keys']}")
    print(f"  全注意力键数 : {info['full_keys']}  （为其 {info['full_keys'] / info['total_keys']:.1f}x）")
    print(f"  门控权重（压缩/选择/窗口，cmp/sel/win）: "
          f"{info['gates'][0]:.3f} / {info['gates'][1]:.3f} / {info['gates'][2]:.3f}")
    print()

    hit_signal = [b for b in info["selected_blocks"] if b in signal_blocks]
    miss_signal = [b for b in signal_blocks if b not in info["selected_blocks"]]
    print(f"  检索到的信号块: {hit_signal}（遗漏: {miss_signal}）")
    print()

    print("-" * 70)
    print("步骤 2: 生产级上下文长度下的计算节省")
    print("-" * 70)
    print(f"  {'N':>8} {'l':>4} {'k':>4} {'W':>5}  "
          f"{'NSA 键数':>10}  {'全注意力键数':>10}  {'节省倍数':>9}")
    for N_prod, l_prod, k_prod, W_prod in [
        (4_096, 32, 8, 256),
        (16_384, 32, 16, 512),
        (32_768, 64, 16, 512),
        (65_536, 64, 16, 512),
        (131_072, 64, 16, 512),
        (262_144, 64, 16, 512),
    ]:
        nsa = count_nsa(N_prod, l_prod, k_prod, W_prod)
        full = count_full_attention(N_prod)
        print(f"  {N_prod:>8} {l_prod:>4} {k_prod:>4} {W_prod:>5}  "
              f"{nsa:>10,} {full:>10,}  {full/nsa:>8.1f}x")
    print()

    print("-" * 70)
    print("步骤 3: 块大小与 top-k 扫描（N=65536, W=512 时的开销）")
    print("-" * 70)
    print(f"  {'l':>4} {'k':>4}  {'键数（keys）':>8}  {'相对全注意力':>8}")
    for l_p in (32, 64, 128):
        for k_p in (8, 16, 32):
            cost = count_nsa(65_536, l_p, k_p, 512)
            print(f"  {l_p:>4} {k_p:>4}  {cost:>8,}  {65_536/cost:>7.1f}x")
    print()

    print("要点: NSA 的 3 分支分解将 O(N^2) 注意力转换为")
    print("          O(N * (N/l + k*l + W))。在 64k-128k 上下文中，每次查询")
    print("          所需键数减少 25x-36x。梯度通过")
    print("          压缩分支的分数流动，因此 top-k 选择机制")
    print("          原生支持训练。")


if __name__ == "__main__":
    main()
