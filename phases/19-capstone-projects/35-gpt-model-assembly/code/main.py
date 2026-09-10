"""将第 34 课的 Transformer 块组装成约 1.24 亿参数的 GPT 模型。

参考配置包含十二个块、词元嵌入、可学习位置嵌入、最终层归一化和语言模型输出头。
输出头与词元嵌入共享权重时，参数量约为 1.24 亿。演示还使用微型配置执行生成，
展示温度、top-k、多项分布采样与滑动上下文窗口。
在课程目录运行：python3 code/main.py

译注：参考模型在本地从随机参数构建，未载入预训练权重。生成的是词元 ID，
并不代表已获得语言能力。滑动窗口每步重新计算整个活动窗口，没有 KV 缓存；
显示“距 1.24 亿的差距”不是一项独立的 5% 阈值断言。
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class GPTConfig:
    """与 GPT-2 small 基本架构对应的约 1.24 亿参数参考配置；不代表加载了预训练模型。"""

    vocab_size: int = 50257
    context_length: int = 1024
    d_model: int = 768
    num_heads: int = 12
    num_layers: int = 12
    mlp_expansion: int = 4
    dropout: float = 0.1
    use_bias: bool = True
    weight_tying: bool = True


class LayerNorm(nn.Module):
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
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        if cfg.d_model % cfg.num_heads != 0:
            raise ValueError("d_model must be divisible by num_heads")
        self.d_model = cfg.d_model
        self.num_heads = cfg.num_heads
        self.head_dim = cfg.d_model // cfg.num_heads
        self.context_length = cfg.context_length

        self.qkv = nn.Linear(cfg.d_model, 3 * cfg.d_model, bias=cfg.use_bias)
        self.out_proj = nn.Linear(cfg.d_model, cfg.d_model, bias=cfg.use_bias)
        self.attn_dropout = nn.Dropout(cfg.dropout)
        self.resid_dropout = nn.Dropout(cfg.dropout)

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
    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        hidden = cfg.mlp_expansion * cfg.d_model
        self.fc1 = nn.Linear(cfg.d_model, hidden, bias=cfg.use_bias)
        self.act = nn.GELU(approximate="tanh")
        self.fc2 = nn.Linear(hidden, cfg.d_model, bias=cfg.use_bias)
        self.dropout = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(self.fc2(self.act(self.fc1(x))))


class TransformerBlock(nn.Module):
    """Pre-LN 块。第 34 课说明两种归一化位置；此处采用 GPT-2 参考配置的 Pre-LN。"""

    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        self.ln1 = LayerNorm(cfg.d_model)
        self.attn = MultiHeadAttention(cfg)
        self.ln2 = LayerNorm(cfg.d_model)
        self.mlp = FeedForward(cfg)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x


class GPTModel(nn.Module):
    """仅含解码器的 Transformer 语言模型，可将输出头权重与词元嵌入绑定。"""

    def __init__(self, cfg: GPTConfig) -> None:
        super().__init__()
        self.cfg = cfg
        self.tok_embed = nn.Embedding(cfg.vocab_size, cfg.d_model)
        self.pos_embed = nn.Embedding(cfg.context_length, cfg.d_model)
        self.embed_dropout = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList([TransformerBlock(cfg) for _ in range(cfg.num_layers)])
        self.final_ln = LayerNorm(cfg.d_model)
        self.lm_head = nn.Linear(cfg.d_model, cfg.vocab_size, bias=False)

        if cfg.weight_tying:
            self.lm_head.weight = self.tok_embed.weight

        position_ids = torch.arange(cfg.context_length, dtype=torch.long)
        self.register_buffer("position_ids", position_ids, persistent=False)

        self.apply(self._init_weights)
        self._scale_residual_projections()

    def _init_weights(self, module: nn.Module) -> None:
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def _scale_residual_projections(self) -> None:
        scale = 1.0 / math.sqrt(2 * self.cfg.num_layers)
        for block in self.blocks:
            block.attn.out_proj.weight.data.mul_(scale)
            block.mlp.fc2.weight.data.mul_(scale)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        batch, seq = tokens.shape
        if seq > self.cfg.context_length:
            raise ValueError(
                f"sequence length {seq} exceeds context length {self.cfg.context_length}"
            )
        tok = self.tok_embed(tokens)
        pos = self.pos_embed(self.position_ids[:seq])
        x = self.embed_dropout(tok + pos)
        for block in self.blocks:
            x = block(x)
        x = self.final_ln(x)
        logits = self.lm_head(x)
        return logits


def count_parameters(model: nn.Module) -> int:
    """统计不重复的参数；共享权重只计一次。"""
    seen: dict[int, int] = {}
    for param in model.parameters():
        seen[id(param)] = param.numel()
    return sum(seen.values())


def top_k_filter(logits: torch.Tensor, top_k: int) -> torch.Tensor:
    if top_k is None or top_k <= 0:
        return logits
    top_k = min(top_k, logits.size(-1))
    values, _ = torch.topk(logits, top_k, dim=-1)
    threshold = values[..., -1:]
    return torch.where(logits < threshold, torch.full_like(logits, float("-inf")), logits)


def generate(
    model: GPTModel,
    prompt: torch.Tensor,
    max_new_tokens: int,
    temperature: float = 1.0,
    top_k: int | None = None,
    seed: int | None = None,
) -> torch.Tensor:
    """使用温度、top-k 和多项分布采样进行自回归生成。

    将活动窗口限制在 model.cfg.context_length 内，序列过长时不再向模型传入
    最早的词元。返回值仍保留完整提示和所有新增词元，而不是仅返回活动窗口。
    """
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    if seed is not None:
        torch.manual_seed(seed)

    was_training = model.training
    model.eval()
    tokens = prompt.clone()
    try:
        with torch.no_grad():
            for _ in range(max_new_tokens):
                window = tokens[:, -model.cfg.context_length:]
                logits = model(window)
                next_logits = logits[:, -1, :] / temperature
                next_logits = top_k_filter(next_logits, top_k)
                probs = F.softmax(next_logits, dim=-1)
                next_token = torch.multinomial(probs, num_samples=1)
                tokens = torch.cat([tokens, next_token], dim=1)
        return tokens
    finally:
        model.train(was_training)


def demo() -> None:
    torch.manual_seed(0)

    print("构建约 1.24 亿参数的参考 GPT……")
    ref_cfg = GPTConfig()
    ref_model = GPTModel(ref_cfg)
    ref_params = count_parameters(ref_model)
    print(f"  参考模型参数量          ：{ref_params:,}")
    print(f"  距 1.24 亿参数的相对差距（目标在 5% 内）：{abs(ref_params - 124_000_000) / 124_000_000:.2%}")

    head_tied = ref_model.lm_head.weight.data_ptr() == ref_model.tok_embed.weight.data_ptr()
    print(f"  权重是否实际共享        ：{head_tied}")
    assert head_tied, "weight tying should share storage"

    print("\n取消权重绑定，重新计数以检查约 3800 万参数的差额……")
    untied_cfg = GPTConfig(weight_tying=False)
    untied_model = GPTModel(untied_cfg)
    untied_params = count_parameters(untied_model)
    delta = untied_params - ref_params
    expected_delta = ref_cfg.vocab_size * ref_cfg.d_model
    print(f"  未绑定时的参数量        ：{untied_params:,}")
    print(f"  参数差额                ：{delta:,}")
    print(f"  预期差额（词表大小×嵌入维度）：{expected_delta:,}")
    assert delta == expected_delta

    print("\n对参考模型执行一次前向传播：批大小 1，序列长度 32……")
    tokens = torch.randint(0, ref_cfg.vocab_size, (1, 32))
    with torch.no_grad():
        logits = ref_model(tokens)
    print(f"  logits 形状             ：{tuple(logits.shape)}")
    assert logits.shape == (1, 32, ref_cfg.vocab_size)

    print("\n使用微型模型完成生成流程，以缩短演示耗时……")
    tiny_cfg = GPTConfig(
        vocab_size=512,
        context_length=64,
        d_model=64,
        num_heads=4,
        num_layers=2,
        dropout=0.0,
    )
    tiny_model = GPTModel(tiny_cfg)
    tiny_params = count_parameters(tiny_model)
    print(f"  微型模型参数量          ：{tiny_params:,}")

    prompt = torch.tensor([[1, 2, 3, 4, 5]], dtype=torch.long)
    generated = generate(
        tiny_model,
        prompt,
        max_new_tokens=12,
        temperature=0.8,
        top_k=20,
        seed=42,
    )
    print(f"  提示词元 ID             ：{prompt.tolist()[0]}")
    print(f"  完整生成序列的词元 ID   ：{generated.tolist()[0]}")
    assert generated.shape == (1, prompt.shape[1] + 12)

    print("\n滑动窗口检查：提示长度超过上下文窗口……")
    long_prompt = torch.randint(0, tiny_cfg.vocab_size, (1, 80))
    generated_long = generate(tiny_model, long_prompt, max_new_tokens=4, temperature=1.0, top_k=10, seed=0)
    print(f"  长提示形状              ：{tuple(long_prompt.shape)}")
    print(f"  完整生成序列形状        ：{tuple(generated_long.shape)}")
    assert generated_long.shape == (1, 84)
    print("\n模型组装检查通过。")


if __name__ == "__main__":
    demo()
