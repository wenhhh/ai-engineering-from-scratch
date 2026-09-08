"""视觉 Transformer（ViT）：图像分块（Patchify）+ 嵌入（Embedding）前端。

仅用标准库。将一张 24x24x3 玩具图像切成 6x6 图块（Patches），
将各图块投影为 d_model 向量，在开头添加 [CLS]，并加入二维位置信息。
验证形状，并统计真实 ViT 配置的参数量。
"""

import math
import random


def make_image(H, W, C=3, seed=0):
    rng = random.Random(seed)
    return [[[rng.randint(0, 255) / 255.0 for _ in range(C)] for _ in range(W)] for _ in range(H)]


def patchify(image, patch_size):
    H = len(image)
    W = len(image[0])
    C = len(image[0][0])
    assert H % patch_size == 0 and W % patch_size == 0
    patches = []
    grid = []
    for row_idx, i in enumerate(range(0, H, patch_size)):
        grid_row = []
        for col_idx, j in enumerate(range(0, W, patch_size)):
            patch = []
            for di in range(patch_size):
                for dj in range(patch_size):
                    patch.extend(image[i + di][j + dj])
            patches.append(patch)
            grid_row.append((row_idx, col_idx))
        grid.append(grid_row)
    return patches, (H // patch_size, W // patch_size)


def linear_project(patches, d_model, rng=None):
    if rng is None:
        rng = random.Random(0)
    in_dim = len(patches[0])
    scale = math.sqrt(2.0 / (in_dim + d_model))
    W = [[rng.gauss(0, scale) for _ in range(d_model)] for _ in range(in_dim)]
    out = []
    for patch in patches:
        row = [0.0] * d_model
        for i, x in enumerate(patch):
            if x == 0.0:
                continue
            for j in range(d_model):
                row[j] += x * W[i][j]
        out.append(row)
    return out, W


def cls_and_pos(tokens, grid_h, grid_w, rng=None):
    """在开头添加可学习的 [CLS]，并加入二维正弦位置编码（Sinusoidal positional encoding）。"""
    if rng is None:
        rng = random.Random(1)
    d_model = len(tokens[0])
    cls = [rng.gauss(0, 0.02) for _ in range(d_model)]
    pe = pos_2d(grid_h, grid_w, d_model)
    out = [list(cls)]
    idx = 0
    for i in range(grid_h):
        for j in range(grid_w):
            t = [tokens[idx][k] + pe[i][j][k] for k in range(d_model)]
            out.append(t)
            idx += 1
    return out


def pos_2d(H, W, d_model):
    """二维正弦编码：将 d_model 等分为两半，分别编码行和列。"""
    assert d_model % 4 == 0, "二维正弦编码要求 d_model 能被 4 整除"
    half = d_model // 2
    pe = [[[0.0] * d_model for _ in range(W)] for _ in range(H)]
    for i in range(H):
        for j in range(W):
            for k in range(half // 2):
                theta_row = i / (10000 ** (2 * k / half))
                pe[i][j][2 * k] = math.sin(theta_row)
                pe[i][j][2 * k + 1] = math.cos(theta_row)
            for k in range(half // 2):
                theta_col = j / (10000 ** (2 * k / half))
                pe[i][j][half + 2 * k] = math.sin(theta_col)
                pe[i][j][half + 2 * k + 1] = math.cos(theta_col)
    return pe


def param_count_vit(d_model, n_layers, n_heads, ffn_expansion, num_patches, num_classes):
    """估算 ViT 参数量（图块嵌入 + Transformer + 输出头）。"""
    # 图块嵌入（Patch embedding）：(patch_flat_size, d_model)，此处忽略 patch_size，由调用方缩放。
    # 每层自注意力（Self-attention）： 4 * d_model^2 (Q,K,V,O)
    # 每层前馈网络（FFN）： 2 * d_model * (ffn_expansion * d_model)
    # 归一化参数：每层 2 * d_model（LayerNorm gamma+beta）
    per_layer = 4 * d_model ** 2 + 2 * d_model * int(ffn_expansion * d_model) + 4 * d_model
    # 位置嵌入（Position embeddings）： (num_patches + 1) * d_model
    pos_emb = (num_patches + 1) * d_model
    # CLS 词元（Token）： d_model
    # 分类头（Classifier head）： d_model * num_classes
    head = d_model * num_classes
    # 最后一次层归一化（Layer norm）： 2 * d_model
    return per_layer * n_layers + pos_emb + d_model + head + 2 * d_model


def main():
    H, W, C = 24, 24, 3
    patch_size = 6
    d_model = 48

    image = make_image(H, W, C, seed=0)
    patches, grid = patchify(image, patch_size)
    tokens, W_proj = linear_project(patches, d_model, rng=random.Random(42))
    tokens_with_pos = cls_and_pos(tokens, grid[0], grid[1], rng=random.Random(7))

    print("=== ViT 前端合理性检查 ===")
    print(f"图像（Image）：               ({H}, {W}, {C})")
    print(f"图块尺寸（Patch size）：          {patch_size}x{patch_size}")
    print(f"网格（Grid）：                {grid[0]} x {grid[1]} = {grid[0] * grid[1]} 个图块")
    print(f"展平图块尺寸：     {patch_size * patch_size * C}")
    print(f"d_model:             {d_model}")
    print(f"序列长度（Sequence length）：     {len(tokens_with_pos)}  （图块 + CLS）")
    print(f"CLS 的 [0,0] 单元：   {tokens_with_pos[0][0]:.4f}")
    print(f"p1 的 [0,0] 单元：    {tokens_with_pos[1][0]:.4f}")
    print()

    print("=== 参数量估算（Parameter counts）===")
    for name, d, L, H_heads, exp, patch in [
        ("ViT-Tiny/16",   192, 12, 3, 4, 16),
        ("ViT-Small/16",  384, 12, 6, 4, 16),
        ("ViT-Base/16",   768, 12, 12, 4, 16),
        ("ViT-Large/16", 1024, 24, 16, 4, 16),
        ("ViT-Huge/14",  1280, 32, 16, 4, 14),
    ]:
        grid_n = (224 // patch) ** 2
        params = param_count_vit(d, L, H_heads, exp, grid_n, num_classes=1000)
        # 加上图块嵌入： (P*P*3) * d_model
        params += patch * patch * 3 * d
        print(f"  {name:<14}  d={d:<5}  L={L:<3}  注意力头（Heads）={H_heads:<3}  图块（Patches）={grid_n:<4}  ~{params / 1e6:.1f}M 参数")

    print()
    print("要点：ViT 原样复用 BERT 编码器；视觉处理的关键全部在于")
    print("图像分块 + 位置编码方案 + [cls] 池化（Pooling）。")


if __name__ == "__main__":
    main()
