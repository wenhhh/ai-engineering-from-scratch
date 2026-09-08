"""从零实现残差向量量化（Residual Vector Quantization，RVQ）。

构建小型一维信号，通过级联的小型码本（Codebooks）进行量化，
测量增加码本时的重建误差（Reconstruction error）。说明现代
音频编解码器（Audio codecs）为何采用 RVQ 而非单个巨大码本。

仅用标准库。运行：python3 code/main.py
"""

import math
import random


def generate_signal(n=1000, seed=0):
    rng = random.Random(seed)
    return [math.sin(2 * math.pi * i / 100) + 0.3 * rng.gauss(0, 1.0) for i in range(n)]


def learn_codebook(values, size, iterations=20, seed=0):
    rng = random.Random(seed)
    if not values:
        return [0.0] * size
    lo, hi = min(values), max(values)
    centroids = [lo + (hi - lo) * rng.random() for _ in range(size)]
    for _ in range(iterations):
        buckets = [[] for _ in range(size)]
        for v in values:
            idx = min(range(size), key=lambda i: abs(centroids[i] - v))
            buckets[idx].append(v)
        for i in range(size):
            if buckets[i]:
                centroids[i] = sum(buckets[i]) / len(buckets[i])
    return sorted(centroids)


def quantize_with_codebook(values, codebook):
    indices = []
    residuals = []
    for v in values:
        idx = min(range(len(codebook)), key=lambda i: abs(codebook[i] - v))
        indices.append(idx)
        residuals.append(v - codebook[idx])
    return indices, residuals


def rvq_encode(values, codebook_size=8, n_codebooks=4):
    residuals = list(values)
    codebooks = []
    all_indices = []
    for cb_i in range(n_codebooks):
        cb = learn_codebook(residuals, codebook_size, seed=cb_i)
        codebooks.append(cb)
        indices, residuals = quantize_with_codebook(residuals, cb)
        all_indices.append(indices)
    return all_indices, codebooks


def rvq_decode(all_indices, codebooks, length):
    out = [0.0] * length
    for indices, cb in zip(all_indices, codebooks):
        for i, idx in enumerate(indices):
            out[i] += cb[idx]
    return out


def mse(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) / len(a)


def main():
    print("=== 步骤 1：生成信号（Signal） ===")
    sig = generate_signal(n=1000)
    print(f"  长度: {len(sig)}   范围: [{min(sig):.2f}, {max(sig):.2f}]   均值（Mean）: {sum(sig)/len(sig):.3f}")

    print()
    print("=== 步骤 2：RVQ 重建误差与码本数量的关系 ===")
    print("  codebook_size = 8，每个码本包含 8 个值")
    print("  | 码本数量 | 比特/帧 | 均方误差（MSE） | 50 fps 下的比特率（Bitrate） |")

    for n_cb in [1, 2, 4, 8, 12]:
        indices, codebooks = rvq_encode(sig, codebook_size=8, n_codebooks=n_cb)
        recon = rvq_decode(indices, codebooks, length=len(sig))
        err = mse(sig, recon)
        bits_per_frame = n_cb * 3
        bitrate = bits_per_frame * 50
        print(f"  | {n_cb:>11} | {bits_per_frame:>10} | {err:.6f}   | {bitrate:>5} bps       |")

    print()
    print("=== 步骤 3：2026 编解码器比较（语音 @ 6 kbps） ===")
    rows = [
        ("EnCodec-24k", "75 Hz",   "3.2 PESQ", "通用音频，MusicGen"),
        ("DAC-44.1k",   "86 Hz",   "3.5 PESQ", "最高保真度（Fidelity）"),
        ("SNAC-24k",    "~12 Hz",  "3.3 PESQ", "多尺度（Multi-scale），自回归语言模型（AR-LM）"),
        ("Mimi",        "12.5 Hz", "3.1 PESQ", "语义（Semantic）+ 声学（Acoustic），Moshi"),
    ]
    print("  | 编解码器（Codec） | 帧率（Frame rate） | 质量（Quality） | 用途（Use case） |")
    for name, fr, q, u in rows:
        print(f"  | {name:<12} | {fr:<10} | {q:<10} | {u:<24} |")

    print()
    print("=== 步骤 4：语义词元（Semantic tokens）与声学词元（Acoustic tokens），以 Mimi 作概念示例 ===")
    print("  码本 0 → 从 WavLM 蒸馏（Distillation）→ 内容（说了什么）")
    print("  码本 1-7 → 声学残差（Acoustic residuals）→ 音色、说话人、噪声")
    print()
    print("  语言模型（LM）先生成码本 0（文本 → 语义），然后")
    print("  以语义 + 说话人参考为条件生成码本 1-7")
    print("  = 可直接支持声音克隆的因子化生成（Factorized generation）")

    print()
    print("要点:")
    print("  - RVQ：级联小码本 > 单个巨大码本")
    print("  - 语义/声学分离（Mimi、AudioLM）是 2024-2026 的转变")
    print("  - 12.5 Hz Mimi × 8 个码本 = 每段 10 s 音频 1000 个词元")
    print("  - 因此，处理音频的 Transformer 语言模型终于能在 2026 的规模下工作")


if __name__ == "__main__":
    main()
