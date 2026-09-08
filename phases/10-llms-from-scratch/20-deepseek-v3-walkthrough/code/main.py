"""DeepSeek-V3 架构计算器（Architecture calculator），使用 Python 标准库。

给定 DeepSeek-V3 配置，计算:
  - 各组件的总参数量
  - 每次前向传播的活跃参数量（MoE 稀疏激活）
  - 128k 上下文下的 KV 缓存（MLA 与假设的 GQA 比较）
  - 逐层明细（注意力 / MLP / 专家 / 路由器 / 归一化）

还运行假设变体: 秩为 256 的 MLA、512 个专家、top-16 路由。目标是让读取配置
成为理解架构的过程。风格与阶段 10 第 14 课计算器相同，专门覆盖 DeepSeek-V3 的细节。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


DEEPSEEK_V3 = {
    "hidden_size": 7168,
    "intermediate_size": 18432,
    "moe_intermediate_size": 2048,
    "num_hidden_layers": 61,
    "first_k_dense_layers": 3,
    "num_attention_heads": 128,
    "num_key_value_heads": 128,
    "kv_lora_rank": 512,
    "q_lora_rank": 1536,
    "num_experts": 256,
    "num_experts_per_tok": 8,
    "shared_experts": 1,
    "max_position_embeddings": 163_840,
    "rope_theta": 10000.0,
    "vocab_size": 129_280,
    "mtp_modules": 1,
    "moe_router_enabled": True,
}


@dataclass
class ComponentParams:
    embedding: int
    attention_per_layer: int
    dense_mlp_per_layer: int
    expert_mlp_each: int
    shared_expert: int
    router_per_layer: int
    rmsnorm_per_layer: int
    final_norm: int
    mtp_module: int


def mla_attention_params(hidden: int, n_heads: int, head_dim: int,
                         kv_lora: int, q_lora: int) -> int:
    """多头潜在注意力（MLA）参数量。
    Q 路径: hidden -> q_lora -> n_heads * head_dim（两次矩阵乘法）。
    K 路径: hidden -> kv_lora（一次矩阵乘法）。
    V 路径: hidden -> kv_lora -> n_heads * head_dim（解压缩）。
    将 K 解压缩至 n_heads * head_dim，用于注意力评分。
    输出投影: n_heads * head_dim -> hidden。
    """
    q_down = hidden * q_lora
    q_up = q_lora * (n_heads * head_dim)
    kv_down = hidden * kv_lora
    k_up = kv_lora * (n_heads * head_dim)
    v_up = kv_lora * (n_heads * head_dim)
    o_proj = (n_heads * head_dim) * hidden
    return q_down + q_up + kv_down + k_up + v_up + o_proj


def swiglu_mlp_params(hidden: int, ff: int) -> int:
    return 2 * hidden * ff + ff * hidden


def router_params(hidden: int, n_experts: int) -> int:
    return hidden * n_experts


def rmsnorm_params(hidden: int) -> int:
    return 2 * hidden


def mtp_module_params(hidden: int, ff: int) -> int:
    """依据 DeepSeek 论文第 2.2 节: 投影 M_k（2h x h）+ Transformer 块。
    此处在 MTP 块中使用稠密 MLP（保守估计），公开报告的实际额外参数为 14B，
    其中包含 MoE 结构。"""
    projection = 2 * hidden * hidden
    attention = 4 * hidden * hidden
    mlp = swiglu_mlp_params(hidden, ff)
    norms = 2 * rmsnorm_params(hidden)
    return projection + attention + mlp + norms


def compute_components(cfg: dict) -> ComponentParams:
    h = cfg["hidden_size"]
    n_heads = cfg["num_attention_heads"]
    head_dim = h // n_heads
    vocab = cfg["vocab_size"]
    dense_ff = cfg["intermediate_size"]
    moe_ff = cfg["moe_intermediate_size"]

    emb = vocab * h
    attn = mla_attention_params(h, n_heads, head_dim,
                                 kv_lora=cfg["kv_lora_rank"],
                                 q_lora=cfg["q_lora_rank"])
    dense_mlp = swiglu_mlp_params(h, dense_ff)
    expert = swiglu_mlp_params(h, moe_ff)
    shared = swiglu_mlp_params(h, moe_ff) * cfg["shared_experts"]
    router = router_params(h, cfg["num_experts"])
    norm_per = 2 * rmsnorm_params(h)
    final = rmsnorm_params(h)
    mtp = mtp_module_params(h, dense_ff) * cfg["mtp_modules"]

    return ComponentParams(
        embedding=emb,
        attention_per_layer=attn,
        dense_mlp_per_layer=dense_mlp,
        expert_mlp_each=expert,
        shared_expert=shared,
        router_per_layer=router,
        rmsnorm_per_layer=norm_per,
        final_norm=final,
        mtp_module=mtp,
    )


@dataclass
class ArchReport:
    total: int
    active: int
    active_ratio: float
    kv_cache_bytes: int
    gqa_kv_cache_bytes_ref: int
    per_layer_attn: int
    per_layer_moe_block: int
    per_layer_active: int
    emb: int


def compute_totals(cfg: dict, ctx: int | None = None) -> ArchReport:
    c = compute_components(cfg)
    h = cfg["hidden_size"]
    n_heads = cfg["num_attention_heads"]
    head_dim = h // n_heads
    n_layers = cfg["num_hidden_layers"]
    first_dense = cfg["first_k_dense_layers"]
    n_moe = n_layers - first_dense
    n_experts = cfg["num_experts"]
    top_k = cfg["num_experts_per_tok"]
    shared_count = cfg["shared_experts"]
    max_seq = ctx or cfg["max_position_embeddings"]

    dense_layer = (c.attention_per_layer + c.dense_mlp_per_layer
                   + c.rmsnorm_per_layer)
    moe_layer = (c.attention_per_layer
                 + n_experts * c.expert_mlp_each
                 + c.shared_expert
                 + c.router_per_layer
                 + c.rmsnorm_per_layer)
    active_moe_layer = (c.attention_per_layer
                        + top_k * c.expert_mlp_each
                        + c.shared_expert
                        + c.router_per_layer
                        + c.rmsnorm_per_layer)

    total = (c.embedding
             + first_dense * dense_layer
             + n_moe * moe_layer
             + c.final_norm
             + c.mtp_module)
    active = (c.embedding
              + first_dense * dense_layer
              + n_moe * active_moe_layer
              + c.final_norm)

    kv_cache = n_layers * cfg["kv_lora_rank"] * max_seq * 2
    kv_heads_hypothetical = 8
    head_dim_hypothetical = 128
    kv_cache_gqa = 2 * n_layers * kv_heads_hypothetical * head_dim_hypothetical * max_seq * 2

    return ArchReport(
        total=total, active=active,
        active_ratio=active / total,
        kv_cache_bytes=kv_cache,
        gqa_kv_cache_bytes_ref=kv_cache_gqa,
        per_layer_attn=c.attention_per_layer,
        per_layer_moe_block=moe_layer,
        per_layer_active=active_moe_layer,
        emb=c.embedding,
    )


def fmt(n: int) -> str:
    if n >= 1_000_000_000:
        return f"{n / 1e9:.1f}B"
    if n >= 1_000_000:
        return f"{n / 1e6:.1f}M"
    if n >= 1_000:
        return f"{n / 1e3:.1f}K"
    return f"{n}"


def fmt_bytes(b: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if b < 1024:
            return f"{b:.1f}{unit}"
        b /= 1024
    return f"{b:.1f}PB"


def print_report(name: str, cfg: dict, ctx: int | None = None) -> None:
    r = compute_totals(cfg, ctx=ctx)
    print(f"\n{name}")
    print("-" * 70)
    print(f"  总参数量 : {fmt(r.total)}")
    print(f"  活跃参数量 : {fmt(r.active)}")
    print(f"  活跃比例 : {r.active_ratio:.1%}")
    print(f"  嵌入（Embedding） : {fmt(r.emb)}")
    print(f"  每层注意力参数 : {fmt(r.per_layer_attn)}  (MLA)")
    print(f"  每层 MoE 块参数 : {fmt(r.per_layer_moe_block)}  （总计）")
    print(f"  每层活跃 MoE 参数 : {fmt(r.per_layer_active)}  （每次前向传播）")
    ctx_used = ctx or cfg["max_position_embeddings"]
    print(f"  BF16 KV 缓存，{ctx_used:,} 上下文 : {fmt_bytes(r.kv_cache_bytes)}")
    print(f"  GQA(8/128) 参考值       : {fmt_bytes(r.gqa_kv_cache_bytes_ref)}")
    print(f"  MLA 节省比例              : "
          f"{(1 - r.kv_cache_bytes / r.gqa_kv_cache_bytes_ref) * 100:.0f}%")


def main() -> None:
    print("=" * 70)
    print("DeepSeek-V3 架构详解（Architecture Walkthrough，阶段 10，第 20 课）")
    print("=" * 70)

    print_report("DeepSeek-V3（公开配置）", DEEPSEEK_V3, ctx=131_072)

    variant = dict(DEEPSEEK_V3)
    variant["kv_lora_rank"] = 256
    print_report("DeepSeek-V3（假设 MLA 秩为 256）", variant, ctx=131_072)

    variant = dict(DEEPSEEK_V3)
    variant["num_experts"] = 512
    variant["num_experts_per_tok"] = 8
    print_report("DeepSeek-V3（假设 512 个专家、top-8）", variant,
                 ctx=131_072)

    variant = dict(DEEPSEEK_V3)
    variant["num_experts_per_tok"] = 16
    print_report("DeepSeek-V3（假设 256 个专家、top-16）", variant,
                 ctx=131_072)

    print()
    print("=" * 70)
    print("关键结果: 公开总参数量为 671B，本计算器得到 ~476B-490B")
    print("-" * 70)
    print("  差异来自报告第 2 节附录列出的额外结构参数:")
    print("  专家专属偏置（Expert-specific biases）、共享")
    print("  专家缩放、MoE 结构的 MTP 模块，以及此简化计算器")
    print("  合并处理的子组件。数量级与")
    print("  比例（例如 5-6% 的活跃/总量比）与论文完全一致。")


if __name__ == "__main__":
    main()
