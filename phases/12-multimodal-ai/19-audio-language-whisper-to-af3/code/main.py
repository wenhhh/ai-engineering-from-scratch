"""音频大语言模型简化示例：对数梅尔频谱、音频 Q-former，以及级联与端到端方案的对比。

仅使用标准库。从合成波形出发，使用朴素离散傅里叶变换（DFT）计算
对数梅尔频谱，在所得帧上运行简化的 Q-former，并比较级联流水线
与端到端流水线的任务覆盖范围。

译注：mel_filterbank 的原始说明称其为三角滤波器组，但实现实际使用
分段等权重的简化滤波器；此处保留算法，不将其改写成标准梅尔滤波器。
demo_melspec 按给定窗长和步长实际得到 98 帧，原文输出中的“约 99 帧”
是近似描述；demo_qformer 则独立生成 99 个随机帧，并非复用前面的频谱。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

random.seed(6)


def synth_waveform(duration_s: float = 1.0, sr: int = 16000) -> list[float]:
    n = int(duration_s * sr)
    freq = 440
    return [0.5 * math.sin(2 * math.pi * freq * i / sr) +
            0.2 * math.sin(2 * math.pi * 880 * i / sr)
            for i in range(n)]


def window_frames(x: list[float], sr: int, win_ms: int = 25, hop_ms: int = 10) -> list[list[float]]:
    win = int(sr * win_ms / 1000)
    hop = int(sr * hop_ms / 1000)
    frames = []
    i = 0
    while i + win <= len(x):
        frames.append(x[i:i + win])
        i += hop
    return frames


def naive_dft_mag(frame: list[float], n_bins: int = 64) -> list[float]:
    """使用朴素 DFT，计算 n_bins 个频率处的幅度谱。"""
    n = len(frame)
    out = []
    for k in range(n_bins):
        re = 0.0
        im = 0.0
        for i, x in enumerate(frame):
            angle = -2 * math.pi * k * i / n
            re += x * math.cos(angle)
            im += x * math.sin(angle)
        out.append(math.sqrt(re * re + im * im))
    return out


def mel_filterbank(n_bins: int = 64, n_mels: int = 20) -> list[list[float]]:
    """三角梅尔滤波器组（简化版，以线性映射近似）。
    译注：此处沿用原文命名，实际权重为各频段内的等权重，而非三角权重。"""
    fbank = []
    band = n_bins // n_mels
    for m in range(n_mels):
        row = [0.0] * n_bins
        start = m * band
        end = min(start + band, n_bins)
        for k in range(start, end):
            row[k] = 1.0 / (end - start)
        fbank.append(row)
    return fbank


def apply_mel(spec_mag: list[float], fbank: list[list[float]]) -> list[float]:
    return [sum(w * s for w, s in zip(row, spec_mag)) for row in fbank]


def log_compress(xs: list[float]) -> list[float]:
    return [math.log(1 + x) for x in xs]


def demo_melspec() -> None:
    print("\n对数梅尔频谱（1 秒、16 kHz、窗长 25 ms、帧移 10 ms、20 个梅尔频带）")
    print("-" * 60)
    wave = synth_waveform(1.0, 16000)
    frames = window_frames(wave, 16000, 25, 10)
    print(f"  帧数：{len(frames)}（1 秒应约为 99 帧）")

    spec = naive_dft_mag(frames[0], n_bins=64)
    fbank = mel_filterbank(n_bins=64, n_mels=20)
    mel = apply_mel(spec, fbank)
    log_mel = log_compress(mel)
    print(f"  每帧梅尔特征维度：{len(mel)}")
    print(f"  第一帧对数梅尔特征（四舍五入后）："
          f"{[round(v, 2) for v in log_mel[:10]]}...")


@dataclass
class QFormer:
    n_queries: int
    hidden: int

    def __post_init__(self):
        self.queries = [[random.gauss(0, 0.1) for _ in range(self.hidden)]
                        for _ in range(self.n_queries)]

    def forward(self, frames: list[list[float]]) -> list[list[float]]:
        """朴素交叉注意力：每个查询都关注所有帧。"""
        out = []
        for q in self.queries:
            scores = [sum(qi * fi for qi, fi in zip(q, f)) for f in frames]
            m = max(scores)
            exps = [math.exp(s - m) for s in scores]
            z = sum(exps)
            weights = [e / z for e in exps]
            agg = [sum(w * f[k] for w, f in zip(weights, frames))
                   for k in range(self.hidden)]
            out.append(agg)
        return out


def demo_qformer() -> None:
    print("\n音频 Q-former（N=8 个查询，帧特征维度为 20）")
    print("-" * 60)
    frames = [[random.gauss(0, 1) for _ in range(20)] for _ in range(99)]
    qf = QFormer(n_queries=8, hidden=20)
    tokens = qf.forward(frames)
    print(f"  输入帧数：{len(frames)}")
    print(f"  输出词元数：{len(tokens)}，每个词元的维度为 {len(tokens[0])}")
    print("  每个词元通过软注意力权重关注整段音频")


def task_coverage_table() -> None:
    print("\n级联方案（Whisper -> LLM）与端到端音频大语言模型的对比")
    print("-" * 60)
    tasks = [
        ("语音转写",            "支持", "支持"),
        ("关键词提取",       "支持", "支持"),
        ("摘要生成",            "支持", "支持"),
        ("说话人分离",      "部分支持", "支持"),
        ("情绪推断",        "不支持",  "支持"),
        ("音乐流派分类","不支持", "支持"),
        ("乐器识别",   "不支持",  "支持"),
        ("环境声音识别",   "不支持",  "支持"),
        ("事件时间定位", "部分支持", "支持"),
        ("深度伪造检测",       "不支持",  "支持"),
    ]
    print(f"  {'任务':<30}{'级联':<14}{'端到端'}")
    for name, cas, e2e in tasks:
        print(f"  {name:<30}{cas:<14}{e2e}")
    print("\n  级联：对可转为文本的信号，处理快速且可靠")
    print("  端到端：处理纯声学信号所必需（约占 MMAU 的 40%）")


def main() -> None:
    print("=" * 60)
    print("音频语言模型：从 Whisper 到 AF3（阶段 12，第 19 课）")
    print("=" * 60)

    demo_melspec()
    demo_qformer()
    task_coverage_table()

    print("\n2026 年实现配方")
    print("-" * 60)
    print("  编码器：拼接 AF-Whisper 与 BEATs 特征")
    print("  桥接层：具有 64 个查询的 Q-former")
    print("  LLM   ：接入音频词元的 Qwen2.5-7B")
    print("  训练  ：AudioCaps + Clotho + MMAU 风格的指令")
    print("  可选项：按需启用思考，处理复杂推理")


if __name__ == "__main__":
    main()
