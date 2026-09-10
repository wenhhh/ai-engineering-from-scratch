"""视觉 Transformer 图块分词器与几何计算器——仅使用 Python 标准库。

给定 ViT 配置（图块大小、分辨率、隐藏维度、深度、注意力头数），计算：
  - 图块词元化后的网格形状和序列长度
  - 各组件的参数量（图块嵌入、位置嵌入、Transformer 块、层归一化）
  - 每次前向传播的浮点运算量（FLOPs，主要来自注意力和 MLP）
  - 2026 年典型编码器的对比表

还会让一幅简化的 8×8 灰度图依次经过切块、展平和投影流程，
把这些基本操作具体呈现出来。不依赖 NumPy 或 PyTorch，只用整数和列表。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ViTConfig:
    name: str
    image_size: int
    patch_size: int
    hidden: int
    depth: int
    heads: int
    registers: int = 0
    cls_token: bool = True


ZOO = [
    ViTConfig("ViT-B/16 @ 224", 224, 16, 768, 12, 12),
    ViTConfig("ViT-L/14 @ 336 (CLIP)", 336, 14, 1024, 24, 16),
    ViTConfig("DINOv2 ViT-g/14 @ 224", 224, 14, 1536, 40, 24, registers=4),
    ViTConfig("SigLIP SO400m/14 @ 378", 378, 14, 1152, 27, 16, registers=4,
              cls_token=False),
    ViTConfig("Qwen2.5-VL ViT @ 896x896", 896, 14, 1280, 32, 16),
]


def grid_shape(image_size: int, patch_size: int) -> tuple[int, int]:
    if image_size <= 0 or patch_size <= 0:
        raise ValueError(f"image_size 和 patch_size 必须为正数，实际为 {image_size=} {patch_size=}")
    if image_size % patch_size != 0:
        raise ValueError(f"image_size ({image_size}) 必须能被 patch_size 整除（patch_size={patch_size}）")
    g = image_size // patch_size
    return (g, g)


def seq_length(cfg: ViTConfig) -> int:
    h, w = grid_shape(cfg.image_size, cfg.patch_size)
    extra = (1 if cfg.cls_token else 0) + cfg.registers
    return h * w + extra


def patch_embed_params(cfg: ViTConfig) -> int:
    p = cfg.patch_size
    return 3 * p * p * cfg.hidden + cfg.hidden


def pos_embed_params(cfg: ViTConfig) -> int:
    return seq_length(cfg) * cfg.hidden


def cls_register_params(cfg: ViTConfig) -> int:
    n = (1 if cfg.cls_token else 0) + cfg.registers
    return n * cfg.hidden


def block_params(cfg: ViTConfig) -> int:
    d = cfg.hidden
    qkvo = 4 * d * d + 4 * d
    mlp = 2 * d * 4 * d + d + 4 * d
    ln = 2 * 2 * d
    return qkvo + mlp + ln


def total_params(cfg: ViTConfig) -> dict:
    pe = patch_embed_params(cfg)
    po = pos_embed_params(cfg)
    cr = cls_register_params(cfg)
    bl = block_params(cfg) * cfg.depth
    fl = 2 * cfg.hidden
    total = pe + po + cr + bl + fl
    return {"patch_embed": pe, "position": po, "cls+reg": cr,
            "blocks": bl, "final_ln": fl, "total": total}


def flops_per_forward(cfg: ViTConfig) -> int:
    n = seq_length(cfg)
    d = cfg.hidden
    attn = 4 * n * d * d + 2 * n * n * d
    mlp = 2 * n * d * 4 * d * 2
    return cfg.depth * (attn + mlp)


def fmt(n: int) -> str:
    if n >= 1_000_000_000:
        return f"{n / 1e9:.2f}B"
    if n >= 1_000_000:
        return f"{n / 1e6:.1f}M"
    if n >= 1_000:
        return f"{n / 1e3:.1f}K"
    return str(n)


def patch_toy_image() -> None:
    """使用 P=4，对一幅 8×8 灰度图进行图块词元化。
    网格为 2×2，共生成 4 个词元。每个图块展平后包含 4×4=16 个像素。"""
    print("\n示例图像的图块词元化（8×8 灰度图，patch_size=4）")
    print("-" * 60)
    img = [[(r * 8 + c) % 256 for c in range(8)] for r in range(8)]
    print("像素网格（第 0..7 行）：")
    for row in img:
        print("  " + " ".join(f"{v:3d}" for v in row))

    P = 4
    patches = []
    for pr in range(0, 8, P):
        for pc in range(0, 8, P):
            patch = []
            for dr in range(P):
                for dc in range(P):
                    patch.append(img[pr + dr][pc + dc])
            patches.append(patch)

    print(f"\n图块（共 {len(patches)} 个，每个长度为 {P*P}）：")
    for i, p in enumerate(patches):
        print(f"  图块 {i}: {p}")

    fake_W = [[((i + j) % 5) - 2 for j in range(P * P)] for i in range(4)]
    embeddings = []
    for patch in patches:
        emb = []
        for row in fake_W:
            s = sum(r * v for r, v in zip(row, patch, strict=True))
            emb.append(s)
        embeddings.append(emb)

    print("\n线性投影（P*P=16 -> hidden=4）：")
    for i, emb in enumerate(embeddings):
        print(f"  词元 {i}: {emb}")
    print("→ 得到 4 个维度为 4 的词元，可以输入 Transformer。")


def print_config(cfg: ViTConfig) -> None:
    params = total_params(cfg)
    seq = seq_length(cfg)
    gh, gw = grid_shape(cfg.image_size, cfg.patch_size)
    fl = flops_per_forward(cfg)
    print(f"\n{cfg.name}")
    print("-" * 60)
    print(f"  图像尺寸           : {cfg.image_size}x{cfg.image_size}")
    print(f"  图块大小           : {cfg.patch_size}")
    print(f"  网格形状           : {gh}x{gw}")
    print(f"  序列长度           : {seq}（CLS 标记：{'CLS' if cfg.cls_token else '无 CLS'}，"
          f" {cfg.registers} 个寄存器词元）")
    print(f"  隐藏维度 / 深度    : {cfg.hidden} / {cfg.depth}")
    print(f"  图块嵌入参数量     : {fmt(params['patch_embed'])}")
    print(f"  位置嵌入参数量     : {fmt(params['position'])}")
    print(f"  Transformer 块参数总量: {fmt(params['blocks'])}")
    print(f"  ** 总参数量 **     : {fmt(params['total'])}")
    print(f"  每次前向传播 FLOPs : {fmt(fl)}")


def main() -> None:
    print("=" * 60)
    print("ViT 图块词元几何计算器（阶段 12，第 01 课）")
    print("=" * 60)

    patch_toy_image()

    for cfg in ZOO:
        print_config(cfg)

    print("\n" + "=" * 60)
    print("关键比例")
    print("-" * 60)
    vit_b = ZOO[0]
    qwen = ZOO[-1]
    print(f"  ViT-B/16 @ 224    序列长度：{seq_length(vit_b)}")
    print(f"  Qwen2.5-VL @ 896  序列长度：{seq_length(qwen)}")
    print(f"  词元数量之比：{seq_length(qwen) / seq_length(vit_b):.1f} 倍")
    print("  这就是高分辨率视觉语言模型（VLM）需要词元合并或池化的原因。")


if __name__ == "__main__":
    main()
