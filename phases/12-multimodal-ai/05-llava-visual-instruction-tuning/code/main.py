"""LLaVA 两层 MLP 投影器与提示词构建器——仅使用 Python 标准库。

逐步演示 LLaVA 的前向传播：
  - 简化的 ViT 输出 16 个图块词元，每个维度为 16
  - 两层 MLP 将每个图块投影到 24 维（即本示例中“LLM”的维度）
  - 构建 LLaVA 格式的提示词，将 <image> 占位符替换为 16 个投影后的词元
  - 报告 LLM 在 2k / 32k / 128k 窗口下的上下文预算

不依赖 NumPy 或 PyTorch；线性层和 GELU 均手工实现。

译注：英文 system/user 示例会参与按空白切分的词元数估计，因此保留原值。
系统提示表达“一个好奇的人与人工智能助手之间的对话”；用户请求为
“详细描述你在这张图像中看到的内容”。SYSTEM、USER、ASSISTANT 和 <image>
是示例格式的一部分，保持原样。
"""

from __future__ import annotations

import math
import random

rng = random.Random(11)

PATCH_COUNT = 16
PATCH_DIM = 16
HIDDEN_DIM = 32
LLM_DIM = 24


def vec(n: int) -> list[float]:
    return [rng.gauss(0, 0.3) for _ in range(n)]


def mat(rows: int, cols: int) -> list[list[float]]:
    return [vec(cols) for _ in range(rows)]


def linear(W: list[list[float]], b: list[float], x: list[float]) -> list[float]:
    return [sum(r * v for r, v in zip(row, x)) + bi
            for row, bi in zip(W, b)]


def gelu(x: float) -> float:
    return 0.5 * x * (1.0 + math.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * x * x * x)))


def gelu_vec(v: list[float]) -> list[float]:
    return [gelu(x) for x in v]


class MLPProjector:
    def __init__(self, in_dim: int, hidden: int, out_dim: int):
        self.W1 = mat(hidden, in_dim)
        self.b1 = [0.0] * hidden
        self.W2 = mat(out_dim, hidden)
        self.b2 = [0.0] * out_dim

    def forward(self, x: list[float]) -> list[float]:
        h = gelu_vec(linear(self.W1, self.b1, x))
        return linear(self.W2, self.b2, h)

    def num_params(self) -> int:
        return (len(self.W1) * len(self.W1[0]) + len(self.b1)
                + len(self.W2) * len(self.W2[0]) + len(self.b2))


def fake_vit_output() -> list[list[float]]:
    return [vec(PATCH_DIM) for _ in range(PATCH_COUNT)]


def build_llava_prompt(system: str, user: str, image_tokens: int) -> dict:
    placeholder = "<image>"
    template = (
        f"SYSTEM: {system}\n"
        f"USER: {placeholder} {user}\n"
        f"ASSISTANT: "
    )
    return {
        "raw_prompt": template,
        "placeholder": placeholder,
        "image_tokens": image_tokens,
        "text_token_estimate": len(template.split()) + 10,
    }


def visualize_context(num_image_tokens: int, text_tokens: int) -> None:
    print("\n不同 LLM 窗口下的上下文预算")
    print("-" * 60)
    totals = (2048, 8192, 32768, 131072)
    for t in totals:
        used = num_image_tokens + text_tokens
        remain = t - used
        pct_image = 100 * num_image_tokens / t
        print(f"  窗口 {t:>6d}：图像 {pct_image:5.1f}% | "
              f"文本 {100*text_tokens/t:4.1f}% | 剩余 {max(remain, 0):>6d} 个词元")


def demo_projector() -> None:
    print("\n演示 1：两层 MLP 投影器的前向传播")
    print("-" * 60)
    patches = fake_vit_output()
    proj = MLPProjector(PATCH_DIM, HIDDEN_DIM, LLM_DIM)

    print(f"  ViT 输出：{PATCH_COUNT} 个图块，维度为 {PATCH_DIM}")
    print(f"  MLP:     {PATCH_DIM} -> {HIDDEN_DIM} -> {LLM_DIM}")
    print(f"  参数量：{proj.num_params():,}")

    visual_tokens = [proj.forward(p) for p in patches]
    print(f"  输出：{len(visual_tokens)} 个视觉词元，维度为 "
          f"{len(visual_tokens[0])}")
    print(f"  词元 0 的部分数值：{[round(x, 3) for x in visual_tokens[0][:6]]}")


def demo_prompt() -> None:
    print("\n演示 2：LLaVA 提示词模板")
    print("-" * 60)
    system = ("A chat between a curious human and an artificial intelligence "
              "assistant.")
    user = "Describe what you see in this image in detail."
    prompt = build_llava_prompt(system, user, image_tokens=576)

    print("  原始提示词（替换图像词元后输入 LLM）：")
    print("  " + "-" * 56)
    for line in prompt["raw_prompt"].split("\n"):
        print(f"    {line}")
    print(f"  <image> 占位符 -> 替换为 {prompt['image_tokens']} "
          "个视觉词元")
    print(f"  文本词元估计：约 {prompt['text_token_estimate']} 个词元")
    visualize_context(prompt["image_tokens"], prompt["text_token_estimate"])


def demo_anyres() -> None:
    print("\n演示 3：LLaVA-NeXT AnyRes 的词元开销")
    print("-" * 60)
    tile_tokens = 576
    configs = [
        ("336x336（基础配置）", 1, 0),
        ("672x336 (1x2)", 2, 1),
        ("672x672 (2x2)", 4, 1),
        ("1344x672 (2x4)", 8, 1),
        ("1344x1344 (4x4)", 16, 1),
    ]
    for name, tiles, thumb in configs:
        total = tiles * tile_tokens + thumb * tile_tokens
        print(f"  {name:20s}: {tiles:2d} 个切片 + {thumb} 个缩略图 "
              f"= {total:5d} 个词元")


def main() -> None:
    print("=" * 60)
    print("LLaVA 视觉指令微调（阶段 12，第 05 课）")
    print("=" * 60)
    demo_projector()
    demo_prompt()
    demo_anyres()
    print("\n" + "=" * 60)
    print("要点")
    print("-" * 60)
    print("  · 两层 MLP 投影器：2200 万参数（相较于 70 亿参数的 LLM 很小）")
    print("  · <image> 占位符 -> 替换为 N 个投影后的视觉词元")
    print("  · 基础版 LLaVA：每幅图像 576 个词元（占 2k 上下文的 30%）")
    print("  · AnyRes：高分辨率 OCR / 图表输入最多使用 2880 个词元")
    print("  · 阶段 1：仅训练投影器（耗时数小时）")
    print("  · 阶段 2：使用 15.8 万条 GPT-4 指令，训练投影器和 LLM")


if __name__ == "__main__":
    main()
