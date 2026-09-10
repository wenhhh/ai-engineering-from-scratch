"""从零实现 Transformer 块：层归一化、因果多头注意力、残差、MLP 与残差。

通过同一个标志切换 Pre-LN 和 Post-LN。演示分别构造六层堆叠，使用相同参数初始化，
各执行一次前向和反向传播，再打印输入嵌入的梯度范数。
在课程目录运行：python3 code/main.py

译注：原文据此声称 Pre-LN 梯度大一个数量级，并联系到不使用学习率预热的训练。
实际演示没有优化器或学习率设置，也没有训练循环；损失还是最终层归一化输出的平方和。
因此这里保留实测比值，但不把它当作普遍的梯度比例或“不需要预热”的证明。
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class BlockConfig:
    """自注意力、MLP 和外层 Transformer 块共享的超参数。"""

    d_model: int = 768
    num_heads: int = 12
    context_length: int = 1024
    mlp_expansion: int = 4
    attn_dropout: float = 0.1
    residual_dropout: float = 0.1
    use_bias: bool = True
    pre_ln: bool = True


class LayerNorm(nn.Module):
    """具有可学习缩放和偏移参数的层归一化。

    对每个词元独立地沿最后一个维度（嵌入维度）归一化。
    将与 nn.LayerNorm(d_model) 对应的计算展开，以展示 eps 的位置与参数形状。
    """

    def __init__(self, d_model: int, eps: float = 1e-5) -> None:
        super().__init__()
        self.eps = eps
        self.scale = nn.Parameter(torch.ones(d_model))
        self.shift = nn.Parameter(torch.zeros(d_model))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mean = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        return self.scale * (x - mean) / torch.sqrt(var + self.eps) + self.shift


class MultiHeadAttention(nn.Module):
    """使用融合 QKV 投影的多头因果自注意力。

    用一个输出宽度为 3 * d_model 的线性层代替三个独立投影层。
    因果掩码注册为缓冲区，构造时分配一次，每次前向传播按实际序列长度截取。
    原文将其描述为减少内核启动与矩阵乘法调用；本例没有实际测量内核数或性能。
    """

    def __init__(self, cfg: BlockConfig) -> None:
        super().__init__()
        if cfg.d_model % cfg.num_heads != 0:
            raise ValueError(
                f"d_model ({cfg.d_model}) must be divisible by num_heads ({cfg.num_heads})"
            )
        self.d_model = cfg.d_model
        self.num_heads = cfg.num_heads
        self.head_dim = cfg.d_model // cfg.num_heads
        self.context_length = cfg.context_length

        self.qkv = nn.Linear(cfg.d_model, 3 * cfg.d_model, bias=cfg.use_bias)
        self.out_proj = nn.Linear(cfg.d_model, cfg.d_model, bias=cfg.use_bias)
        self.attn_dropout = nn.Dropout(cfg.attn_dropout)
        self.resid_dropout = nn.Dropout(cfg.residual_dropout)

        mask = torch.triu(
            torch.ones(cfg.context_length, cfg.context_length, dtype=torch.bool),
            diagonal=1,
        )
        self.register_buffer("causal_mask", mask, persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch, seq, dim = x.shape
        if seq > self.context_length:
            raise ValueError(
                f"sequence length {seq} exceeds context length {self.context_length}"
            )

        qkv = self.qkv(x)
        q, k, v = qkv.split(self.d_model, dim=-1)

        q = q.view(batch, seq, self.num_heads, self.head_dim).transpose(1, 2)
        k = k.view(batch, seq, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(batch, seq, self.num_heads, self.head_dim).transpose(1, 2)

        scores = q @ k.transpose(-2, -1) / math.sqrt(self.head_dim)
        mask = self.causal_mask[:seq, :seq]
        scores = scores.masked_fill(mask, float("-inf"))
        attn = F.softmax(scores, dim=-1)
        attn = self.attn_dropout(attn)

        out = attn @ v
        out = out.transpose(1, 2).contiguous().view(batch, seq, dim)
        out = self.out_proj(out)
        out = self.resid_dropout(out)
        return out


class FeedForward(nn.Module):
    """逐位置 MLP。这里不混合不同词元的信息；跨词元交互由自注意力完成。"""

    def __init__(self, cfg: BlockConfig) -> None:
        super().__init__()
        hidden = cfg.mlp_expansion * cfg.d_model
        self.fc1 = nn.Linear(cfg.d_model, hidden, bias=cfg.use_bias)
        self.act = nn.GELU(approximate="tanh")
        self.fc2 = nn.Linear(hidden, cfg.d_model, bias=cfg.use_bias)
        self.dropout = nn.Dropout(cfg.residual_dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        x = self.act(x)
        x = self.fc2(x)
        x = self.dropout(x)
        return x


class TransformerBlock(nn.Module):
    """一个 Transformer 块；通过 pre_ln 切换归一化位置。

    Pre-LN：在残差分支的各子层之前归一化，主残差路径不经过这些归一化操作。
    Post-LN：在残差相加之后归一化，跨块传播的梯度也经过该归一化操作。

    原文据此讨论深层训练的稳定性和学习率预热；本例仅比较一次反向传播的梯度，
    不能据此断言所有 Pre-LN 模型都不需要预热，或所有 Post-LN 模型必然发散。
    """

    def __init__(self, cfg: BlockConfig) -> None:
        super().__init__()
        self.pre_ln = cfg.pre_ln
        self.ln1 = LayerNorm(cfg.d_model)
        self.attn = MultiHeadAttention(cfg)
        self.ln2 = LayerNorm(cfg.d_model)
        self.mlp = FeedForward(cfg)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.pre_ln:
            x = x + self.attn(self.ln1(x))
            x = x + self.mlp(self.ln2(x))
        else:
            x = self.ln1(x + self.attn(x))
            x = self.ln2(x + self.mlp(x))
        return x


class BlockStack(nn.Module):
    """演示使用的小型块堆叠；第 35 课的 GPT 配置采用相同模式，默认包含十二个块。"""

    def __init__(self, cfg: BlockConfig, depth: int) -> None:
        super().__init__()
        self.embed = nn.Embedding(num_embeddings=128, embedding_dim=cfg.d_model)
        self.blocks = nn.ModuleList([TransformerBlock(cfg) for _ in range(depth)])
        self.final_ln = LayerNorm(cfg.d_model)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        x = self.embed(tokens)
        for block in self.blocks:
            x = block(x)
        x = self.final_ln(x)
        return x


def gradient_norm_at_embedding(stack: BlockStack, tokens: torch.Tensor) -> float:
    """对块堆叠执行一次前向和反向传播，返回嵌入参数的梯度范数。

    损失取最终张量的平方和。两种配置使用相同深度和初始化；所得比值只描述
    这一特定损失与输入下的梯度差别，不等于完整训练的收敛或稳定性结论。
    """
    stack.zero_grad(set_to_none=True)
    out = stack(tokens)
    loss = out.pow(2).sum()
    loss.backward()
    grad = stack.embed.weight.grad
    if grad is None:
        return 0.0
    return float(grad.norm().item())


def _set_eval_mode(stack: BlockStack) -> None:
    """关闭 dropout，避免这种随机性影响两种归一化配置的比较。"""
    stack.eval()


def demo() -> None:
    torch.manual_seed(0)
    cfg_pre = BlockConfig(
        d_model=192,
        num_heads=6,
        context_length=64,
        attn_dropout=0.0,
        residual_dropout=0.0,
        pre_ln=True,
    )
    cfg_post = BlockConfig(
        d_model=192,
        num_heads=6,
        context_length=64,
        attn_dropout=0.0,
        residual_dropout=0.0,
        pre_ln=False,
    )

    depth = 6
    pre_stack = BlockStack(cfg_pre, depth=depth)
    post_stack = BlockStack(cfg_post, depth=depth)

    post_stack.load_state_dict(pre_stack.state_dict())
    _set_eval_mode(pre_stack)
    _set_eval_mode(post_stack)

    tokens = torch.randint(0, 128, (2, 32))

    with torch.no_grad():
        pre_out = pre_stack(tokens)
        post_out = post_stack(tokens)

    print("Pre-LN 输出形状 ：", tuple(pre_out.shape))
    print("Post-LN 输出形状：", tuple(post_out.shape))
    assert pre_out.shape == post_out.shape == (2, 32, 192)

    pre_grad = gradient_norm_at_embedding(pre_stack, tokens)
    post_grad = gradient_norm_at_embedding(post_stack, tokens)

    print(f"Pre-LN  嵌入梯度范数：{pre_grad:.6f}")
    print(f"Post-LN 嵌入梯度范数：{post_grad:.6f}")
    if post_grad > 0:
        ratio = pre_grad / post_grad
        print(f"Pre-LN / Post-LN 范数比：{ratio:.2f}x")

    n_params = sum(p.numel() for p in pre_stack.parameters())
    print(f"块堆叠参数总数        ：{n_params:,}")
    print("Transformer 块检查通过。")


if __name__ == "__main__":
    demo()
