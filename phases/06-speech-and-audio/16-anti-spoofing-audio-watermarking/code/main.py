"""用于展示结构的小型反欺骗（Anti-spoofing）与水印（Watermark）示例。

实际生产使用 AASIST / RawNet2 检测，使用 AudioSeal
添加水印，两者都是神经网络。这里用简单数值技巧模拟接口，
以呈现流水线（Pipeline）。

运行：python3 code/main.py
"""

import math
import random


def synth_real_speech(n_samples=16000, seed=0):
    rng = random.Random(seed)
    out = []
    for i in range(n_samples):
        base = 0.2 * math.sin(2 * math.pi * 220 * i / 16000)
        harmonic = 0.08 * math.sin(2 * math.pi * 440 * i / 16000)
        noise = 0.02 * rng.gauss(0, 1.0)
        out.append(base + harmonic + noise)
    return out


def synth_fake_speech(n_samples=16000, seed=0):
    rng = random.Random(seed)
    out = []
    for i in range(n_samples):
        base = 0.2 * math.sin(2 * math.pi * 220 * i / 16000)
        ultra_flat = 0.05 * math.sin(2 * math.pi * 6000 * i / 16000)
        out.append(base + ultra_flat + 0.002 * rng.gauss(0, 1.0))
    return out


def magnitude_spectrum(audio, n_fft=256):
    result = [0.0] * (n_fft // 2 + 1)
    window = [0.5 - 0.5 * math.cos(2 * math.pi * i / (n_fft - 1)) for i in range(n_fft)]
    chunks = [audio[i : i + n_fft] for i in range(0, len(audio) - n_fft, n_fft)]
    for chunk in chunks:
        for k in range(n_fft // 2 + 1):
            re, im = 0.0, 0.0
            for j in range(n_fft):
                angle = -2 * math.pi * k * j / n_fft
                re += window[j] * chunk[j] * math.cos(angle)
                im += window[j] * chunk[j] * math.sin(angle)
            result[k] += math.sqrt(re * re + im * im)
    return result


def toy_detector_score(audio):
    spec = magnitude_spectrum(audio)
    total = sum(spec) or 1e-9
    high_band = sum(spec[len(spec) // 2 :]) / total
    return high_band


def toy_watermark_embed(audio, payload_bits):
    out = list(audio)
    step = max(1, len(audio) // len(payload_bits))
    for i, bit in enumerate(payload_bits):
        idx = i * step
        if idx < len(out):
            out[idx] = out[idx] + (0.0005 if bit else -0.0005)
    return out


def toy_watermark_detect(audio, n_bits=16):
    step = max(1, len(audio) // n_bits)
    out = []
    for i in range(n_bits):
        idx = i * step
        if idx < len(audio):
            out.append(1 if audio[idx] > 0 else 0)
    return out


def main():
    random.seed(0)

    print("=== 步骤 1：合成真实与伪造语音（Real vs fake speech） ===")
    real_clips = [synth_real_speech(seed=i) for i in range(20)]
    fake_clips = [synth_fake_speech(seed=100 + i) for i in range(20)]
    print(f"  20 段真实、20 段伪造，每段 {len(real_clips[0])} 个采样点")

    print()
    print("=== 步骤 2：用简化频谱检测器（Spectral detector）评分 ===")
    real_scores = [toy_detector_score(a) for a in real_clips]
    fake_scores = [toy_detector_score(a) for a in fake_clips]
    print(f"  真实语音均值: {sum(real_scores)/len(real_scores):.3f}")
    print(f"  伪造语音均值: {sum(fake_scores)/len(fake_scores):.3f}")

    print()
    print("=== 步骤 3：扫描阈值（Threshold）→ 等错误率（EER） ===")
    candidates = sorted(set(real_scores + fake_scores))
    best = (1.0, 0.0, 0.0, 0.0)
    for t in candidates:
        far = sum(1 for s in fake_scores if s >= t) / len(fake_scores)
        frr = sum(1 for s in real_scores if s < t) / len(real_scores)
        if abs(far - frr) < best[0]:
            best = (abs(far - frr), t, far, frr)
    gap, t, far, frr = best
    print(f"  EER ≈ {(far + frr) * 50:.2f}%  对应阈值 {t:.4f}")
    print(f"    （小型数据集结果；实际 AASIST 在 ASVspoof 2019 LA 上为 0.42% EER）")

    print()
    print("=== 步骤 4：水印嵌入（Embed）+ 检测（小型示例） ===")
    payload = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0]
    clean = synth_real_speech(n_samples=16000, seed=42)
    watermarked = toy_watermark_embed(clean, payload)
    recovered = toy_watermark_detect(watermarked)
    bit_acc = sum(1 for a, b in zip(payload, recovered) if a == b) / len(payload)
    print(f"  载荷（Payload）:   {payload}")
    print(f"  恢复结果（Recovered）: {recovered}")
    print(f"  比特准确率（Bit accuracy）: {bit_acc * 100:.1f}%   （小型示例；实际 AudioSeal 在攻击前 &gt; 99%）")

    print()
    print("=== 步骤 5：2026 基准测试（Benchmarks） ===")
    rows = [
        ("AASIST (ASVspoof 2019 LA)",    "0.42% EER",  "检测领域最佳水平（SOTA）"),
        ("NeXt-TDNN + WavLM (2025)",     "0.42% EER",  "检测领域最佳水平（SOTA）"),
        ("ASVspoof 5 上的鲁棒方法（Robust method）",  "7.23% EER",  "真实世界"),
        ("AudioSeal （攻击前）",       "&gt; 99% 比特准确率（Bit acc）","可定位水印（Localized watermark）"),
        ("WavMark （攻击前）",         "99.52% 比特准确率（Bit acc）","传统水印（Legacy watermark）"),
        ("全部（音高偏移 Pitch shift 下）",       "&lt; 60% 比特准确率（Bit acc）","通用攻击（Universal attack）"),
    ]
    print("  | 方法（Method） | 指标（Metric） | 说明（Note） |")
    for name, m, note in rows:
        print(f"  | {name:<30} | {m:<16} | {note:<17} |")

    print()
    print("要点:")
    print("  - 检测：AASIST 使用对数梅尔（Log-mel）/频谱特征；与 RawNet2 集成（Ensemble）")
    print("  - 水印：AudioSeal（可定位、速度快、来自 Meta，比 WavMark 快 485×）")
    print("  - 音高偏移攻击（Pitch-shift attack）能破坏所有水印 → 必须同时使用检测和水印")
    print("  - 始终额外交付 C2PA 清单（Manifest）+ 审计日志（Audit log）")


if __name__ == "__main__":
    main()
