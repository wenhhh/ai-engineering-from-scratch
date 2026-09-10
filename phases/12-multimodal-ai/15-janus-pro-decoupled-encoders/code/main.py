"""Janus-Pro 解耦编码器路由——仅使用标准库。

两个模拟编码器（用于语义理解的类 SigLIP 编码器、用于重建的类 VQ 编码器）、
一个共享 Transformer 主干，以及一个根据任务标签进行选择的路由器。
跟踪三个示例提示词在流水线中的处理过程。

译注：上面的“三个”沿用原文概述，demo_routing 实际包含五个提示词。
这些英文提示词同时参与关键词路由与 hash(p) 随机种子计算，保留原值。
五个请求依次表示：描述图像内容；生成海上日落图；画一只猫并描述其品种；
判断图中人物的姿态；渲染夜晚的赛博朋克城市景观。
任务值 understand、generate、ambiguous 分别表示理解、生成和有歧义；
text_out、image_out 是输出模式，word_ 是模拟文本词元前缀，均保持原样。
"""

from __future__ import annotations

import random
from dataclasses import dataclass

random.seed(3)


@dataclass
class SiglipStub:
    dim: int = 32

    def encode(self, image_seed: int) -> list[float]:
        random.seed(image_seed)
        return [random.gauss(0, 0.5) for _ in range(self.dim)]


@dataclass
class VQStub:
    vocab: int = 256
    n_tokens: int = 16

    def encode(self, image_seed: int) -> list[int]:
        random.seed(image_seed * 7 + 1)
        return [random.randint(0, self.vocab - 1) for _ in range(self.n_tokens)]

    def decode(self, tokens: list[int]) -> str:
        return f"根据以下词元经 VQ 解码得到的图像：{tokens[:4]}..."


@dataclass
class SharedBody:
    name: str = "DeepSeek-7B-init"

    def process(self, input_stream: list, kind: str) -> list:
        if kind == "text_out":
            return [f"word_{i}" for i in range(4)]
        if kind == "image_out":
            return [random.randint(0, 255) for _ in range(16)]
        return []


def route(prompt: str) -> str:
    """将任务分类为 understand（理解）或 generate（生成）。"""
    u_keywords = ["describe", "what", "why", "caption", "explain", "how many"]
    g_keywords = ["draw", "generate", "sketch", "render", "create", "paint"]
    p = prompt.lower()
    u_score = sum(1 for k in u_keywords if k in p)
    g_score = sum(1 for k in g_keywords if k in p)
    if g_score > u_score:
        return "generate"
    if u_score > g_score:
        return "understand"
    return "ambiguous"


def run_pipeline(prompt: str, image_seed: int = 42) -> dict:
    siglip = SiglipStub()
    vq = VQStub()
    body = SharedBody()

    task = route(prompt)
    trace = {"prompt": prompt, "task": task}

    if task == "understand":
        feats = siglip.encode(image_seed)
        trace["route"] = "SigLIP -> 共享主干 -> 文本"
        trace["input_len"] = len(feats)
        out = body.process(feats, kind="text_out")
        trace["output"] = out
    elif task == "generate":
        tokens = vq.encode(image_seed) if image_seed else []
        trace["route"] = "（可选 VQ）-> 共享主干 -> 图像 VQ -> 解码器"
        out_tokens = body.process(tokens, kind="image_out")
        trace["output"] = vq.decode(out_tokens)
    else:
        trace["route"] = "存在歧义：两条路径都运行，再合并结果"
        feats = siglip.encode(image_seed)
        tokens = vq.encode(image_seed)
        trace["input_len"] = f"SigLIP:{len(feats)} + VQ:{len(tokens)}"
        trace["output"] = (body.process(feats, "text_out"),
                           vq.decode(body.process(tokens, "image_out")))

    return trace


def demo_routing() -> None:
    prompts = [
        "Describe what's in this image",
        "Generate a picture of a sunset over the ocean",
        "Sketch a cat and then describe its breed",
        "What is the pose of the person in the image?",
        "Render a cyberpunk cityscape at night",
    ]
    for p in prompts:
        trace = run_pipeline(p, image_seed=hash(p) % 1000)
        print(f"\n  提示词：{p}")
        print(f"  任务  ：{trace['task']}")
        print(f"  路由  ：{trace['route']}")
        print(f"  输出  ：{trace['output']}")


def data_scale_table() -> None:
    print("\n数据规模扩展：Janus 与 Janus-Pro")
    print("-" * 60)
    rows = [
        ("阶段 1（对齐）",   "7200 万对样本",  "9000 万对样本",  "+25%"),
        ("阶段 2（统一训练）",     "2600 万对样本",  "7200 万对样本",  "+176%"),
        ("阶段 3（指令微调）", "120 万条指令",  "140 万条指令",  "+17%"),
        ("模型参数量",          "1.3B",       "7B",         "5.4x"),
        ("MMMU",                  "30.5",       "60.3",       "+29.8"),
        ("GenEval",               "0.61",       "0.80",       "+0.19"),
    ]
    print(f"  {'维度':<20}{'Janus':<14}{'Janus-Pro':<14}{'变化'}")
    for r in rows:
        print(f"  {r[0]:<20}{r[1]:<14}{r[2]:<14}{r[3]}")


def main() -> None:
    print("=" * 60)
    print("Janus-Pro 解耦编码器（阶段 12，第 15 课）")
    print("=" * 60)

    print("\n路由轨迹：五个提示词通过双编码器流水线")
    print("-" * 60)
    demo_routing()

    data_scale_table()

    print("\n架构概览")
    print("-" * 60)
    print("  输入塔 A（SigLIP） -> ")
    print("  输入塔 B（VQ）      -> 共享 Transformer 主干 ->")
    print("  输出头 1（文本 NTP）或输出头 2（VQ 词元）")
    print("  三个阶段：对齐 -> 统一训练 -> 指令微调")


if __name__ == "__main__":
    main()
