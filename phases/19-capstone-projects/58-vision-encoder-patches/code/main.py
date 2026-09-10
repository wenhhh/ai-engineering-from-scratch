"""视觉编码器前端：图像块嵌入与二维正弦位置编码。

将 224×224×3 图像转换为 196 个图像块词元，并在前面加入一个 CLS 词元。
图像块投影使用卷积核大小、步幅均等于块大小的 Conv2d；相同权重下，
其计算与“展平后作线性投影”等价。位置编码采用固定二维正弦表，
嵌入维度的一半编码行位置，另一半编码列位置，各自使用多个频率。

运行：python3 main.py

译注：仅演示随机初始化前端的形状、数值与批次一致性，没有训练视觉语义。
前端中的 CLS 尚未与图像块交互，不能把它当作已经汇总了图像内容的向量。"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn


@dataclass(frozen=True)
class FrontEndConfig:
    image_size: int = 224
    patch_size: int = 16
    in_channels: int = 3
    hidden: int = 768

    @property
    def grid_size(self) -> int:
        if self.image_size % self.patch_size != 0:
            raise ValueError(
                # 图像块边长必须整除图像边长。
                f"patch_size {self.patch_size} must divide image_size {self.image_size}"
            )
        return self.image_size // self.patch_size

    @property
    def num_patches(self) -> int:
        return self.grid_size * self.grid_size


def sinusoidal_2d(grid_h: int, grid_w: int, dim: int) -> torch.Tensor:
    """构建形状为 (grid_h * grid_w, dim) 的确定性二维正弦位置表。

    一半维度编码行位置，另一半编码列位置；每一半使用不同频率的正弦/余弦。
    相同输入始终产生相同输出，不含可学习状态。"""
    if dim % 4 != 0:
        # 二维位置编码维度必须是 4 的倍数。
        raise ValueError(f"sinusoidal_2d dim must be divisible by 4, got {dim}")
    half = dim // 2
    quarter = half // 2

    freq = torch.arange(quarter, dtype=torch.float32)
    inv = torch.exp(-math.log(10000.0) * freq / max(1, quarter))

    rows = torch.arange(grid_h, dtype=torch.float32).unsqueeze(1) * inv.unsqueeze(0)
    cols = torch.arange(grid_w, dtype=torch.float32).unsqueeze(1) * inv.unsqueeze(0)

    row_emb = torch.cat([torch.sin(rows), torch.cos(rows)], dim=1)
    col_emb = torch.cat([torch.sin(cols), torch.cos(cols)], dim=1)

    table = torch.zeros(grid_h, grid_w, dim)
    table[:, :, :half] = row_emb.unsqueeze(1).expand(-1, grid_w, -1)
    table[:, :, half:] = col_emb.unsqueeze(0).expand(grid_h, -1, -1)
    return table.reshape(grid_h * grid_w, dim)


class PatchEmbed(nn.Module):
    """用带步幅的 Conv2d 对图像块进行投影。

    输入形状为 (B,C,H,W)，输出为 (B,N,hidden)，
    其中 N=(H/patch_size)*(W/patch_size)，要求尺寸可整除。"""

    def __init__(self, cfg: FrontEndConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.proj = nn.Conv2d(
            cfg.in_channels,
            cfg.hidden,
            kernel_size=cfg.patch_size,
            stride=cfg.patch_size,
            bias=True,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() != 4:
            # 输入必须为四维 (B,C,H,W)。
            raise ValueError(f"expected 4D input (B,C,H,W), got shape {tuple(x.shape)}")
        if x.shape[1] != self.cfg.in_channels:
            raise ValueError(
                # 输入通道数与配置不符。
                f"channel mismatch: got {x.shape[1]}, expected {self.cfg.in_channels}"
            )
        if x.shape[2] != self.cfg.image_size or x.shape[3] != self.cfg.image_size:
            raise ValueError(
                # 输入空间尺寸与配置不符。
                f"spatial mismatch: got {tuple(x.shape[2:])}, expected "
                f"({self.cfg.image_size}, {self.cfg.image_size})"
            )
        out = self.proj(x)
        b = out.shape[0]
        out = out.flatten(2).transpose(1, 2)
        return out


class VisionFrontEnd(nn.Module):
    """图像块嵌入、前置 CLS 词元，再加二维正弦位置编码。

    输出形状为 (B,num_patches+1,hidden)。位置表是非持久缓冲区，
    不写入 state_dict，重建模型时会按配置重新生成。"""

    def __init__(self, cfg: FrontEndConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.patch = PatchEmbed(cfg)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, cfg.hidden))
        nn.init.trunc_normal_(self.cls_token, std=0.02)

        pos = sinusoidal_2d(cfg.grid_size, cfg.grid_size, cfg.hidden)
        cls_pos = torch.zeros(1, cfg.hidden)
        full = torch.cat([cls_pos, pos], dim=0).unsqueeze(0)
        self.register_buffer("pos_embed", full, persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        tokens = self.patch(x)
        b = tokens.shape[0]
        cls = self.cls_token.expand(b, -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)
        tokens = tokens + self.pos_embed
        return tokens


def synthesize_image(seed: int, image_size: int = 224, channels: int = 3) -> torch.Tensor:
    """用 NumPy 随机数生成确定性图像夹具，默认形状为 1×3×224×224。

    数值为 [0,1] 范围内的 float32。在噪声上叠加平滑梯度，
    使图像块投影同时接收到高频和低频内容。
    梯度固定堆叠三个通道，channels 参数不代表任意通道数都受支持。"""
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal((channels, image_size, image_size)).astype("float32") * 0.1
    y_coords = np.linspace(0.0, 1.0, image_size, dtype="float32")
    x_coords = np.linspace(0.0, 1.0, image_size, dtype="float32")
    gx, gy = np.meshgrid(x_coords, y_coords, indexing="xy")
    gradient = np.stack([gx, gy, (gx + gy) * 0.5], axis=0).astype("float32")
    img = np.clip(gradient + noise + 0.5, 0.0, 1.0)
    return torch.from_numpy(img).unsqueeze(0)


def unfold_then_linear(x: torch.Tensor, weight: torch.Tensor, bias: torch.Tensor, patch_size: int) -> torch.Tensor:
    """用 unfold 与矩阵乘法实现图像块投影的参考版本。

    测试用它验证 Conv2d 投影与“展平后作线性投影”的数值一致性。"""
    if x.dim() != 4:
        # 参考投影要求四维输入。
        raise ValueError(f"expected 4D input, got {tuple(x.shape)}")
    patches = x.unfold(2, patch_size, patch_size).unfold(3, patch_size, patch_size)
    b, c, gh, gw, ph, pw = patches.shape
    flat = patches.permute(0, 2, 3, 1, 4, 5).reshape(b, gh * gw, c * ph * pw)
    w_flat = weight.reshape(weight.shape[0], -1)
    return flat @ w_flat.T + bias


def describe_token_norms(tokens: torch.Tensor, max_show: int = 8) -> str:
    """返回前几个词元的 L2 范数文本，供基本检查；函数本身不打印。"""
    norms = tokens.detach().norm(dim=-1)[0].tolist()
    head = norms[:max_show]
    return ", ".join(f"{v:.3f}" for v in head)


def main() -> None:
    print("=" * 60)
    print("视觉编码器：图像块")
    print("=" * 60)

    cfg = FrontEndConfig()
    print(f"  图像边长 : {cfg.image_size}")
    print(f"  图像块边长 : {cfg.patch_size}")
    print(f"  网格大小 : {cfg.grid_size}x{cfg.grid_size}")
    print(f"  图像块数 : {cfg.num_patches}")
    print(f"  隐藏维度 : {cfg.hidden}")
    print(f"  序列长度 : {cfg.num_patches + 1}（包含 CLS）")

    torch.manual_seed(0)
    img = synthesize_image(seed=0)
    print(f"\n夹具图像形状 : {tuple(img.shape)}")
    print(f"夹具图像数据类型 : {img.dtype}")
    print(f"夹具像素范围 : [{img.min().item():.3f}, {img.max().item():.3f}]")

    model = VisionFrontEnd(cfg).eval()
    n_params = sum(p.numel() for p in model.parameters())
    print(f"\n前端参数量 : {n_params:,}")

    with torch.no_grad():
        tokens = model(img)

    print(f"输出词元形状 : {tuple(tokens.shape)}")
    print(f"CLS 词元范数 : {tokens[0, 0].norm().item():.3f}")
    print(f"前 8 个词元范数 : {describe_token_norms(tokens)}")

    print("\n位置编码行的数值特征：")
    pos_row = model.pos_embed[0, 1, :8].tolist()
    print("  pos[1, :8] =", ", ".join(f"{v:+.3f}" for v in pos_row))

    print("\n批次一致性检查：")
    img_b4 = synthesize_image(seed=1).repeat(4, 1, 1, 1)
    with torch.no_grad():
        out_b4 = model(img_b4)
    print(f"  批量大小为 4 时的输出形状：{tuple(out_b4.shape)}")
    drift = (out_b4 - out_b4[0:1]).abs().max().item()
    print(f"  相同批次样本间的最大差异：{drift:.6f}")

    print("\nunfold 参考实现与 Conv2d 投影对照：")
    weight = model.patch.proj.weight.detach()
    bias = model.patch.proj.bias.detach()
    ref = unfold_then_linear(img, weight, bias, cfg.patch_size)
    conv = model.patch(img)
    diff = (ref - conv).abs().max().item()
    print(f"  最大绝对差：{diff:.6e}")
    if diff < 1e-4:
        print("  通过：unfold 参考实现与 Conv2d 在浮点容差内一致")
    else:
        print("  失败：投影结果偏离参考值")

    print("\n完成。")


if __name__ == "__main__":
    main()
