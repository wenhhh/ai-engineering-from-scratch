"""InternVL3 风格的原生预训练语料混合器与 ViR 路由模拟器。

三个简化示例：
  1. 语料混合规划器：根据目标百分比，计算每种模态的训练步数。
  2. ViR 路由模拟：根据查询分布，估算每个请求的平均词元数。
  3. DvD 吞吐量估算：根据编码器与 LLM 的 FLOPs，选择推理服务部署方式。

仅使用标准库。这不是真实训练器，而是演示 InternVL3 中的资源核算方式。

译注：语料输出键 text、interleaved、caption、video 分别表示纯文本、
交错图文、图像描述和视频，作为程序字段保留原样。表格中的模型结论
和资源估算沿用原文，不是对当前版本的重新测试。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class CorpusMix:
    text_pct: float
    interleaved_pct: float
    caption_pct: float
    video_pct: float

    def normalize(self) -> None:
        total = self.text_pct + self.interleaved_pct + self.caption_pct + self.video_pct
        self.text_pct /= total
        self.interleaved_pct /= total
        self.caption_pct /= total
        self.video_pct /= total

    def steps(self, total: int) -> dict:
        return {
            "text":       int(total * self.text_pct),
            "interleaved": int(total * self.interleaved_pct),
            "caption":    int(total * self.caption_pct),
            "video":      int(total * self.video_pct),
        }


@dataclass
class RouterTier:
    name: str
    tokens: int
    fraction: float


def vir_sim(tiers: list[RouterTier]) -> dict:
    avg = sum(t.tokens * t.fraction for t in tiers)
    baseline = max(t.tokens for t in tiers)
    return {"avg_tokens": avg, "baseline": baseline, "ratio": baseline / avg}


def dvd_throughput(encoder_flops: int, llm_flops: int,
                   llm_tokens: int = 128) -> dict:
    colocated = encoder_flops + llm_flops * llm_tokens
    decoupled = max(encoder_flops, llm_flops * llm_tokens)
    return {"colocated": colocated, "decoupled": decoupled,
            "speedup": colocated / decoupled}


def posthoc_vs_native_table() -> None:
    print("\n后接式多模态扩展与原生多模态预训练的对比")
    print("-" * 60)
    rows = [
        ("指标",                 "后接式",   "原生式"),
        ("-" * 22,                 "-" * 12,     "-" * 12),
        ("GPU 总小时数",        "~30k",       "~300k"),
        ("复用基础 LLM",         "可以",        "不可以"),
        ("对齐欠账",         "明显",    "可忽略"),
        ("MMLU 性能回退",        "-2 至 -8",   "0"),
        ("GSM8K 性能回退",       "-3 至 -10",  "0"),
        ("语料灵活性",     "仅指令数据", "交错图文"),
        ("后续替换基础 LLM",    "可行",   "不可行"),
        ("示例",               "LLaVA, Qwen-VL v1", "InternVL3, GPT-4o, Chameleon"),
    ]
    for r in rows:
        print(f"  {r[0]:<22}{r[1]:<14}{r[2]}")


def main() -> None:
    print("=" * 60)
    print("InternVL3 原生预训练（阶段 12，第 10 课）")
    print("=" * 60)

    mix = CorpusMix(text_pct=40, interleaved_pct=35, caption_pct=20, video_pct=5)
    mix.normalize()
    total_steps = 500_000
    steps = mix.steps(total_steps)
    print(f"\n语料混合方案（目标 {total_steps:,} 个训练步）")
    print("-" * 60)
    for k, v in steps.items():
        print(f"  {k:<14}: {v:>8,}  ({v * 100 / total_steps:.1f}%)")
    print("\n至少保留 40% 的纯文本以维持基础 LLM 的能力；交错图文是关键，")
    print("让模型能够在预训练阶段学习多图推理。")

    print("\nViR 路由模拟（生产环境查询组合）")
    print("-" * 60)
    tiers = [
        RouterTier("低分辨率照片问答",      256, 0.50),
        RouterTier("中等分辨率产品照片",   576, 0.30),
        RouterTier("高分辨率文档 + OCR",   2048, 0.20),
    ]
    for t in tiers:
        print(f"  {t.name:<26}  {t.tokens:>5} 个词元 × {t.fraction * 100:>4.0f}%")
    r = vir_sim(tiers)
    print(f"\n  每个请求的平均词元数：{r['avg_tokens']:.0f}")
    print(f"  基线（全部使用高分辨率）：{r['baseline']}")
    print(f"  相对基线的加速比：{r['ratio']:.2f}x")
    print("  说明：真实场景中有 50% 的查询只需要低分辨率编码")

    print("\nDvD 部署——编码器与 LLM 并行")
    print("-" * 60)
    encoder_gflops = 300
    llm_gflops_per_token = 8
    d = dvd_throughput(encoder_gflops, llm_gflops_per_token, 128)
    print(f"  编码器：{encoder_gflops} GFLOPs / 图像")
    print(f"  LLM    : {llm_gflops_per_token} GFLOPs / 输出词元，共 128 个词元")
    print(f"  同机部署总开销：{d['colocated']} GFLOPs")
    print(f"  解耦部署的瓶颈开销：{d['decoupled']} GFLOPs")
    print(f"  加速比：{d['speedup']:.2f} 倍（使用 DvD）")

    posthoc_vs_native_table()


if __name__ == "__main__":
    main()
