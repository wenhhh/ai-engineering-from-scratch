"""通过交叉注意力融合视觉信息的文本解码器。

每个解码块依次执行：
  1. 文本词元上的因果自注意力；
  2. 查询来自文本、键和值来自图像记忆的交叉注意力；
  3. 前馈 MLP。

掩码约定：
  - 自注意力使用 (Nt,Nt) 下三角因果掩码；
  - 交叉注意力不加掩码，每个文本位置可看到全部图像记忆。

运行：python3 main.py

译注：CrossAttention 可以接收预先计算的图像键值，但顶层解码器每次 forward
都会重新构建该缓存，没有把它跨生成步持久复用，也没有文本自注意力 KV 缓存。
本课用合成记忆检查计算路径，不调用真实视觉编码器或验证视觉问答能力。"""

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass(frozen=True)
class DecoderConfig:
    hidden: int = 256
    heads: int = 8
    depth: int = 4
    mlp_ratio: float = 4.0
    text_vocab: int = 1024
    max_text_len: int = 32
    vision_dim: int = 256
    vision_tokens: int = 197
    dropout: float = 0.0

    @property
    def head_dim(self) -> int:
        if self.hidden % self.heads != 0:
            # 隐藏维度必须可被头数整除。
            raise ValueError(f"hidden {self.hidden} not divisible by heads {self.heads}")
        return self.hidden // self.heads


def causal_mask(length: int) -> torch.Tensor:
    """形状为 (length,length) 的下三角布尔掩码。

    单元 [i,j] 为 True 表示位置 i 可以关注位置 j，即 j<=i。"""
    return torch.tril(torch.ones(length, length, dtype=torch.bool))


class CausalSelfAttention(nn.Module):
    def __init__(self, cfg: DecoderConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.qkv = nn.Linear(cfg.hidden, cfg.hidden * 3, bias=True)
        self.out = nn.Linear(cfg.hidden, cfg.hidden, bias=True)
        self.drop = nn.Dropout(cfg.dropout)
        self.scale = 1.0 / math.sqrt(cfg.head_dim)

    def forward(self, x: torch.Tensor, mask: torch.Tensor | None = None) -> torch.Tensor:
        b, n, d = x.shape
        h, hd = self.cfg.heads, self.cfg.head_dim
        qkv = self.qkv(x).reshape(b, n, 3, h, hd).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        scores = (q @ k.transpose(-2, -1)) * self.scale
        if mask is not None:
            if mask.shape != (n, n):
                raise ValueError(
                    # 因果掩码形状应为 (n,n)。
                    f"causal mask shape {tuple(mask.shape)} does not match (n, n) = ({n}, {n})"
                )
            scores = scores.masked_fill(~mask.unsqueeze(0).unsqueeze(0), float("-inf"))
        attn = F.softmax(scores, dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(b, n, d)
        return self.drop(self.out(out))


class CrossAttention(nn.Module):
    """多头交叉注意力。

    查询来自文本词元，键和值来自图像记忆。kv_cache 参数允许调用方
    复用已计算的图像键值；这里只校验缓存形状，不校验它是否属于当前图像。
    顶层解码器的 use_cache 路径仍会在每次 forward 内重新投影记忆。"""

    def __init__(self, cfg: DecoderConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.q_proj = nn.Linear(cfg.hidden, cfg.hidden, bias=True)
        self.kv_proj = nn.Linear(cfg.vision_dim, cfg.hidden * 2, bias=True)
        self.out = nn.Linear(cfg.hidden, cfg.hidden, bias=True)
        self.drop = nn.Dropout(cfg.dropout)
        self.scale = 1.0 / math.sqrt(cfg.head_dim)

    def project_memory(self, memory: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        if memory.dim() != 3:
            # 图像记忆应为 (B,Nv,vision_dim)。
            raise ValueError(f"expected (B, Nv, vision_dim), got {tuple(memory.shape)}")
        b, nv, _ = memory.shape
        h, hd = self.cfg.heads, self.cfg.head_dim
        kv = self.kv_proj(memory).reshape(b, nv, 2, h, hd).permute(2, 0, 3, 1, 4)
        return kv[0], kv[1]

    def forward(self, x: torch.Tensor, memory: torch.Tensor,
                kv_cache: tuple[torch.Tensor, torch.Tensor] | None = None
                ) -> torch.Tensor:
        if x.dim() != 3:
            # 文本隐藏状态应为 (B,Nt,hidden)。
            raise ValueError(f"expected (B, Nt, hidden), got {tuple(x.shape)}")
        if memory.shape[0] != x.shape[0]:
            raise ValueError(
                # 文本与图像记忆的批量大小不符。
                f"batch mismatch: text {x.shape[0]} vs memory {memory.shape[0]}"
            )
        b, nt, d = x.shape
        h, hd = self.cfg.heads, self.cfg.head_dim

        q = self.q_proj(x).reshape(b, nt, h, hd).transpose(1, 2)
        if kv_cache is None:
            k, v = self.project_memory(memory)
        else:
            k, v = kv_cache
            expected = (b, h, memory.shape[1], hd)
            if k.shape != expected or v.shape != expected:
                raise ValueError(
                    # 缓存键和值应具有指定的批量、头数、视觉长度与每头维度。
                    f"kv_cache must be (B,H,Nv,hd)={expected}, got "
                    f"k={tuple(k.shape)} v={tuple(v.shape)}"
                )

        scores = (q @ k.transpose(-2, -1)) * self.scale
        attn = F.softmax(scores, dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(b, nt, d)
        return self.drop(self.out(out))


class FeedForward(nn.Module):
    def __init__(self, cfg: DecoderConfig) -> None:
        super().__init__()
        inner = int(cfg.hidden * cfg.mlp_ratio)
        self.fc1 = nn.Linear(cfg.hidden, inner)
        self.fc2 = nn.Linear(inner, cfg.hidden)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc2(F.gelu(self.fc1(x)))


class DecoderBlock(nn.Module):
    def __init__(self, cfg: DecoderConfig) -> None:
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.self_attn = CausalSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.cross_attn = CrossAttention(cfg)
        self.ln3 = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.ffn = FeedForward(cfg)

    def forward(self, x: torch.Tensor, memory: torch.Tensor,
                text_mask: torch.Tensor,
                kv_cache: tuple[torch.Tensor, torch.Tensor] | None = None,
                ) -> torch.Tensor:
        x = x + self.self_attn(self.ln1(x), mask=text_mask)
        x = x + self.cross_attn(self.ln2(x), memory, kv_cache=kv_cache)
        x = x + self.ffn(self.ln3(x))
        return x


class VisionLanguageDecoder(nn.Module):
    def __init__(self, cfg: DecoderConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.tok_emb = nn.Embedding(cfg.text_vocab, cfg.hidden)
        self.pos_emb = nn.Embedding(cfg.max_text_len, cfg.hidden)
        self.blocks = nn.ModuleList([DecoderBlock(cfg) for _ in range(cfg.depth)])
        self.norm = nn.LayerNorm(cfg.hidden, eps=1e-6)
        self.head = nn.Linear(cfg.hidden, cfg.text_vocab, bias=False)

    def build_kv_cache(self, memory: torch.Tensor) -> list[tuple[torch.Tensor, torch.Tensor]]:
        cache = []
        for block in self.blocks:
            k, v = block.cross_attn.project_memory(memory)
            cache.append((k, v))
        return cache

    def forward(self, text_ids: torch.Tensor, memory: torch.Tensor,
                use_cache: bool = False) -> torch.Tensor:
        if text_ids.dim() != 2:
            # 文本词元 ID 应为 (B,Nt)。
            raise ValueError(f"expected (B, Nt) ids, got {tuple(text_ids.shape)}")
        b, nt = text_ids.shape
        if nt > self.cfg.max_text_len:
            # 文本长度超过位置表上限。
            raise ValueError(f"text length {nt} exceeds max {self.cfg.max_text_len}")

        positions = torch.arange(nt, device=text_ids.device)
        x = self.tok_emb(text_ids) + self.pos_emb(positions).unsqueeze(0)

        mask = causal_mask(nt).to(text_ids.device)

        cache = self.build_kv_cache(memory) if use_cache else [None] * len(self.blocks)

        for block, kv in zip(self.blocks, cache):
            x = block(x, memory=memory, text_mask=mask, kv_cache=kv)

        x = self.norm(x)
        return self.head(x)


def synth_memory(batch: int, n_tokens: int, dim: int, seed: int) -> torch.Tensor:
    gen = torch.Generator().manual_seed(seed)
    return torch.randn(batch, n_tokens, dim, generator=gen)


def synth_text(batch: int, length: int, vocab: int, seed: int) -> torch.Tensor:
    gen = torch.Generator().manual_seed(seed + 1)
    return torch.randint(low=0, high=vocab, size=(batch, length), generator=gen)


def main() -> None:
    print("=" * 60)
    print("交叉注意力融合解码器")
    print("=" * 60)

    cfg = DecoderConfig()
    print(f"  隐藏维度 : {cfg.hidden}")
    print(f"  注意力头数 : {cfg.heads} (每头维度 {cfg.head_dim})")
    print(f"  层数 : {cfg.depth}")
    print(f"  文本词表大小 : {cfg.text_vocab}")
    print(f"  文本最大长度 : {cfg.max_text_len}")
    print(f"  视觉词元数 : {cfg.vision_tokens}")
    print(f"  视觉维度 : {cfg.vision_dim}")

    torch.manual_seed(0)
    decoder = VisionLanguageDecoder(cfg).eval()
    n_params = sum(p.numel() for p in decoder.parameters())
    print(f"\n解码器参数量 : {n_params:,}")

    text_ids = synth_text(batch=2, length=10, vocab=cfg.text_vocab, seed=0)
    memory = synth_memory(batch=2, n_tokens=cfg.vision_tokens, dim=cfg.vision_dim, seed=1)
    print(f"\ntext_ids 形状 : {tuple(text_ids.shape)}")
    print(f"图像记忆形状 : {tuple(memory.shape)}")

    mask = causal_mask(10)
    print(f"\n因果掩码形状 : {tuple(mask.shape)}")
    print("因果掩码左上角 5×5：")
    for row in mask[:5, :5].int().tolist():
        print("  " + " ".join(str(v) for v in row))

    with torch.no_grad():
        logits = decoder(text_ids, memory, use_cache=False)
        logits_cached = decoder(text_ids, memory, use_cache=True)
    print(f"\n未缓存路径的 logits 形状 : {tuple(logits.shape)}")
    print(f"缓存路径的 logits 形状 : {tuple(logits_cached.shape)}")
    drift = (logits - logits_cached).abs().max().item()
    print(f"缓存与未缓存路径的最大差异 : {drift:.6e}")
    if drift < 1e-4:
        print("  通过：KV 缓存路径与未缓存路径一致")
    else:
        print("  失败：缓存路径差异超过容差")

    print("\n第 0 个样本各文本位置的交叉注意力输出范数（所有头合并并投影后）：")
    block = decoder.blocks[0]
    ln_x = block.ln2(decoder.tok_emb(text_ids) + decoder.pos_emb(torch.arange(10)))
    with torch.no_grad():
        cross_out = block.cross_attn(ln_x, memory)
    norms = cross_out[0].norm(dim=-1).tolist()
    for i, val in enumerate(norms):
        print(f"  位置 {i:2d}  范数 {val:.3f}")

    print("\n完成。")


if __name__ == "__main__":
    main()
