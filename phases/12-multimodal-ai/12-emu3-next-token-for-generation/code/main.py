"""Emu3 词元计数与无分类器引导（CFG）采样简化示例——仅使用标准库。

两个小工具：
  1. 计算不同分辨率、帧率下图像与视频的词元数。
  2. 使用无分类器引导（classifier-free guidance，CFG）的自回归采样器。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

random.seed(0)


@dataclass
class TokCost:
    label: str
    resolution: int
    reduction: int
    video_seconds: float = 0.0
    fps: float = 0.0
    time_reduction: int = 1

    def tokens(self) -> int:
        spatial_per_frame = (self.resolution // self.reduction) ** 2
        if self.video_seconds == 0:
            return spatial_per_frame
        frames = int(self.video_seconds * self.fps)
        frames_reduced = max(1, frames // self.time_reduction)
        return spatial_per_frame * frames_reduced


def token_table() -> None:
    print("\nEmu3 词元数量（采用推荐的分词器降采样倍率）")
    print("-" * 60)
    configs = [
        TokCost("图像 256x256",  256, 8),
        TokCost("图像 512x512",  512, 8),
        TokCost("图像 1024x1024", 1024, 8),
        TokCost("图像 2048x2048", 2048, 8),
        TokCost("视频 4 秒，8fps，256x256", 256, 4, 4.0, 8, 4),
        TokCost("视频 10 秒，8fps，256x256", 256, 4, 10.0, 8, 4),
        TokCost("视频 4 秒，8fps，512x512", 512, 4, 4.0, 8, 4),
    ]
    print(f"{'配置':<32}{'词元数':>12}{'30 词元/秒时的耗时（秒）':>18}")
    for c in configs:
        t = c.tokens()
        latency = t / 30.0
        print(f"  {c.label:<30}{t:>12}{latency:>16.1f} 秒")


def softmax(xs: list[float], temperature: float = 1.0) -> list[float]:
    m = max(xs)
    exps = [math.exp((x - m) / temperature) for x in xs]
    z = sum(exps)
    return [e / z for e in exps]


def cfg_mix(cond_logits: list[float], uncond_logits: list[float],
            gamma: float) -> list[float]:
    """无分类器引导：mixed = uncond + gamma * (cond - uncond)。"""
    return [u + gamma * (c - u) for c, u in zip(cond_logits, uncond_logits)]


def sample(probs: list[float]) -> int:
    r = random.random()
    acc = 0
    for i, p in enumerate(probs):
        acc += p
        if r <= acc:
            return i
    return len(probs) - 1


def demo_cfg() -> None:
    print("\n无分类器引导——对 logit 分布形状的影响")
    print("-" * 60)
    cond = [2.0, 4.0, 1.0, 3.5, 0.5]
    uncond = [1.0, 2.0, 1.5, 1.8, 1.2]
    for gamma in [0.0, 1.0, 3.0, 5.0, 7.0]:
        mixed = cfg_mix(cond, uncond, gamma)
        probs = softmax(mixed)
        top = probs.index(max(probs))
        print(f"  gamma={gamma:>4.1f}  logits={[round(x,2) for x in mixed]}")
        print(f"            概率 ={[round(p,3) for p in probs]}  最高概率词元={top}")
    print("\n  gamma 越高 -> 分布越尖锐 -> 生成结果的保真度越高")
    print("  Emu3 推荐图像生成使用 gamma=3.0，需要更强的条件遵循能力时使用 7.0")


def sample_tokens(cond: list[list[float]], uncond: list[list[float]],
                  gamma: float = 3.0, temp: float = 0.8) -> list[int]:
    """结合 CFG 和温度参数，采样长度为 len(cond) 的序列。"""
    out = []
    for c, u in zip(cond, uncond):
        mixed = cfg_mix(c, u, gamma)
        probs = softmax(mixed, temperature=temp)
        out.append(sample(probs))
    return out


def demo_sampling() -> None:
    print("\n自回归图像词元采样（简化示例，码本大小 K=16）")
    print("-" * 60)
    K = 16
    steps = 8
    cond = [[random.gauss(0, 2) for _ in range(K)] for _ in range(steps)]
    uncond = [[random.gauss(0, 1) for _ in range(K)] for _ in range(steps)]
    tokens_no_cfg = sample_tokens(cond, uncond, gamma=1.0, temp=1.0)
    tokens_cfg3 = sample_tokens(cond, uncond, gamma=3.0, temp=0.8)
    tokens_cfg7 = sample_tokens(cond, uncond, gamma=7.0, temp=0.8)
    print(f"  不使用 CFG   ：{tokens_no_cfg}")
    print(f"  CFG gamma=3 : {tokens_cfg3}")
    print(f"  CFG gamma=7 : {tokens_cfg7}")
    print("  更高的 gamma 使采样结果集中于条件分布的峰值附近；"
          "扩大规模后也呈现相同规律。")


def main() -> None:
    print("=" * 60)
    print("Emu3——用于图像与视频的下一词元预测（阶段 12，第 12 课）")
    print("=" * 60)

    token_table()
    demo_cfg()
    demo_sampling()

    print("\n" + "=" * 60)
    print("Emu3 与 SDXL——计算开销概览")
    print("-" * 60)
    print("  训练      ：开销相当（约 3000 亿词元 / 约 3 亿图像训练步）")
    print("  推理      ：Emu3 较慢（每秒 30 词元时，一幅 512×512 图像约需 2 分钟）")
    print("              SDXL 较快（一幅 512×512 图像约需 2–5 秒）")
    print("  质量      ：Emu3 在 FID / GenEval 上持平或更好")
    print("  灵活性    ：Emu3 还支持感知与视频，SDXL 不支持")


if __name__ == "__main__":
    main()
