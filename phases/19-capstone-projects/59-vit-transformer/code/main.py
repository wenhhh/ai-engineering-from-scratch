"""基于第 58 课图像块前端构建的视觉 Transformer 编码器。

默认使用 12 个 Pre-LN 块、12 个注意力头，以及按 4 倍维度扩展的 GELU 前馈层。
编码器接收 224×224×3 的夹具图像，返回上下文化的词元序列，
并提供 CLS 位置的汇总向量，供下游任务头使用。

运行：python3 main.py

译注：默认模型随机初始化；形状、注意力归一化和梯度存在不等于学到了视觉语义。
演示打印梯度范数，没有在该处独立断言其大小；相应测试另行检查。
原测试对最终 LayerNorm 后的 CLS 求和，在单位缩放、零偏置下该和理论上恒为零；
本轮两版均得到零梯度并触发原有断言失败。这不等于编码器的所有损失都无法反传。
注意力基本检查直接调用注意力子层，没有经过正常块中的 ln1，不能当作完整块的注意力轨迹。"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

THIS_DIR = Path(__file__).resolve().parent
LESSON_58 = THIS_DIR.parent.parent / "58-vision-encoder-patches" / "code"


def _load_front_end_module():
    import importlib.util

    name = "vision_front_end_lesson58"
    if name in sys.modules:
        return sys.modules[name]
    src = LESSON_58 / "main.py"
    spec = importlib.util.spec_from_file_location(name, src)
    if spec is None or spec.loader is None:
        # 无法从给定路径加载第 58 课 main.py。
        raise ImportError(f"could not load lesson 58 main.py at {src}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_front_module = _load_front_end_module()
FrontEndConfig = _front_module.FrontEndConfig
VisionFrontEnd = _front_module.VisionFrontEnd
synthesize_image = _front_module.synthesize_image


@dataclass(frozen=True)
class ViTConfig:
    image_size: int = 224
    patch_size: int = 16
    in_channels: int = 3
    hidden: int = 768
    depth: int = 12
    heads: int = 12
    mlp_ratio: float = 4.0
    dropout: float = 0.0

    @property
    def head_dim(self) -> int:
        if self.hidden % self.heads != 0:
            # 隐藏维度必须能被注意力头数整除。
            raise ValueError(f"hidden {self.hidden} not divisible by heads {self.heads}")
        return self.hidden // self.heads

    def front_end_config(self) -> FrontEndConfig:
        return FrontEndConfig(
            image_size=self.image_size,
            patch_size=self.patch_size,
            in_channels=self.in_channels,
            hidden=self.hidden,
        )


class MultiHeadSelfAttention(nn.Module):
    def __init__(self, cfg: ViTConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.qkv = nn.Linear(cfg.hidden, cfg.hidden * 3, bias=True)
        self.out = nn.Linear(cfg.hidden, cfg.hidden, bias=True)
        self.drop = nn.Dropout(cfg.dropout)
        self.scale = 1.0 / math.sqrt(cfg.head_dim)
        self.last_attn: torch.Tensor | None = None

    def forward(self, x: torch.Tensor, store_attn: bool = False) -> torch.Tensor:
        if x.dim() != 3:
            # 输入形状必须为 (B,N,D)。
            raise ValueError(f"expected (B, N, D), got {tuple(x.shape)}")
        b, n, d = x.shape
        h = self.cfg.heads
        hd = self.cfg.head_dim

        qkv = self.qkv(x).reshape(b, n, 3, h, hd).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        scores = (q @ k.transpose(-2, -1)) * self.scale
        attn = F.softmax(scores, dim=-1)
        if store_attn:
            self.last_attn = attn.detach()

        out = attn @ v
        out = out.transpose(1, 2).reshape(b, n, d)
        out = self.out(out)
        out = self.drop(out)
        return out


class FeedForward(nn.Module):
    def __init__(self, cfg: ViTConfig) -> None:
        super().__init__()
        inner = int(cfg.hidden * cfg.mlp_ratio)
        self.fc1 = nn.Linear(cfg.hidden, inner)
        self.fc2 = nn.Linear(inner, cfg.hidden)
        self.drop = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        x = F.gelu(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x


class Block(nn.Module):
    def __init__(self, cfg: ViTConfig) -> None:
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.attn = MultiHeadSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.ffn = FeedForward(cfg)

    def forward(self, x: torch.Tensor, store_attn: bool = False) -> torch.Tensor:
        x = x + self.attn(self.ln1(x), store_attn=store_attn)
        x = x + self.ffn(self.ln2(x))
        return x


class ViT(nn.Module):
    def __init__(self, cfg: ViTConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.blocks = nn.ModuleList([Block(cfg) for _ in range(cfg.depth)])
        self.norm = nn.LayerNorm(cfg.hidden, eps=1e-6)

    def forward(self, x: torch.Tensor, store_attn: bool = False) -> torch.Tensor:
        for block in self.blocks:
            x = block(x, store_attn=store_attn)
        return self.norm(x)


class VisionEncoder(nn.Module):
    """完整编码器：图像块前端加 ViT 堆叠。

    返回 (tokens,cls)。tokens 形状为 (B,num_patches+1,hidden)，
    cls 形状为 (B,hidden)，取最终序列的第一个位置。"""

    def __init__(self, cfg: ViTConfig | None = None) -> None:
        super().__init__()
        self.cfg = cfg or ViTConfig()
        self.front = VisionFrontEnd(self.cfg.front_end_config())
        self.vit = ViT(self.cfg)

    def forward(self, x: torch.Tensor, store_attn: bool = False) -> tuple[torch.Tensor, torch.Tensor]:
        tokens = self.front(x)
        tokens = self.vit(tokens, store_attn=store_attn)
        cls = tokens[:, 0]
        return tokens, cls


def count_params(module: nn.Module) -> int:
    return sum(p.numel() for p in module.parameters())


def main() -> None:
    print("=" * 60)
    print("视觉 Transformer 编码器")
    print("=" * 60)

    cfg = ViTConfig()
    print(f"  图像边长 : {cfg.image_size}")
    print(f"  图像块边长 : {cfg.patch_size}")
    print(f"  隐藏维度 : {cfg.hidden}")
    print(f"  层数 × 头数 : {cfg.depth} x {cfg.heads} (每头维度 {cfg.head_dim})")
    print(f"  MLP 扩展倍数 : {cfg.mlp_ratio}")

    torch.manual_seed(0)
    encoder = VisionEncoder(cfg).eval()
    print(f"\n前端参数量 : {count_params(encoder.front):,}")
    print(f"ViT 参数量 : {count_params(encoder.vit):,}")
    print(f"总参数量 : {count_params(encoder):,}")

    img = synthesize_image(seed=0)
    print(f"\n夹具图像形状 : {tuple(img.shape)}")

    with torch.no_grad():
        tokens, cls = encoder(img)
    print(f"输出词元形状 : {tuple(tokens.shape)}")
    print(f"CLS 形状 : {tuple(cls.shape)}")
    print(f"CLS 的 L2 范数 : {cls.norm().item():.3f}")

    print("\n逐层 CLS 范数轨迹：")
    with torch.no_grad():
        x = encoder.front(img)
        print(f"  第 0 层（前端之后）：CLS 范数 {x[0, 0].norm().item():.3f}")
        for i, block in enumerate(encoder.vit.blocks, start=1):
            x = block(x)
            if i % 2 == 0 or i == cfg.depth:
                print(f"  层 {i:2d}：CLS 范数 {x[0, 0].norm().item():.3f}")
        x = encoder.vit.norm(x)
        print(f"  最终层归一化：CLS 范数 {x[0, 0].norm().item():.3f}")

    print("\n注意力基本检查：")
    encoder.vit.blocks[0].attn(encoder.front(img), store_attn=True)
    attn = encoder.vit.blocks[0].attn.last_attn
    if attn is not None:
        row_sums = attn[0, 0, 0].sum().item()
        print(f"  第 0 块、第 0 头的 CLS 行和（应为 1.0）：{row_sums:.6f}")
        spread = attn[0, 0, 0].std().item()
        print(f"  第 0 块、第 0 头的 CLS 行标准差：{spread:.4f}")

    print("\n梯度基本检查：")
    img2 = synthesize_image(seed=2)
    enc2 = VisionEncoder(cfg)
    _, c = enc2(img2)
    loss = (c * c).sum()
    loss.backward()
    grad_norm = enc2.front.patch.proj.weight.grad.norm().item()
    cls_grad = enc2.front.cls_token.grad.norm().item()
    print(f"  patch.proj.weight 梯度范数：{grad_norm:.3e}")
    print(f"  front.cls_token 梯度范数：{cls_grad:.3e}")
    print("  演示完成：以上列出从 CLS 反传到编码器的梯度范数")

    print("\n完成。")


if __name__ == "__main__":
    main()
