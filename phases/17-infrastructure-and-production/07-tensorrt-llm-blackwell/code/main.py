"""简化的 Blackwell + TRT-LLM 经济性计算器，仅使用 Python 标准库。

计算模型在以下技术栈中的高带宽内存（HBM）占用和解码吞吐量：
  H100 + BF16 + vLLM
  H100 + FP8 + vLLM
  B200 + NVFP4 权重 / FP8 键值缓存（KV Cache）+ TRT-LLM + Dynamo
  GB200 NVL72 + NVFP4 / FP8 + TRT-LLM + Dynamo

解码吞吐量模型受内存带宽限制（Memory-bandwidth-limited）：每秒词元数与
HBM 带宽除以每词元字节数成正比。数值用于教学，展示 2026 年 Blackwell 的经济性趋势。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Stack:
    name: str
    hbm_gb: int               # 单张 GPU 的 HBM 容量
    hbm_bw_tbs: float         # HBM 带宽，单位 TB/s
    weight_bits: float        # 权重的有效精度
    kv_bits: float            # 键值缓存精度
    mtp_factor: float         # 1.0 表示无草稿，1.8 表示启用多词元预测（MTP）
    disagg_factor: float      # 分离式部署（Disaggregation）带来的额外吞吐量系数
    price_per_gpu_hour: float


STACKS = [
    Stack("H100 + BF16 + vLLM",           80, 3.35,  16, 16, 1.0,  1.0,  2.50),
    Stack("H100 + FP8 + vLLM",            80, 3.35,   8,  8, 1.0,  1.0,  2.50),
    Stack("H200 + FP8 + vLLM",           141, 4.80,   8,  8, 1.0,  1.0,  3.50),
    Stack("B200 + NVFP4 + FP8 + TRT-LLM", 192, 8.00,   4,  8, 1.8,  1.6,  4.80),
    Stack("GB200 NVL72 + TRT-LLM + Dyn", 192, 8.00,   4,  8, 1.8,  2.5,  6.20),
]


def hbm_footprint_gb(params_b: float, active_b: float, seq_len: int, stack: Stack) -> tuple[float, float]:
    weight_gb = params_b * stack.weight_bits / 8
    # 典型注意力头配置的 KV 缓存：num_layers * 2 * num_kv_heads * head_dim * seq_len * bytes/element。
    # 以典型 70B 模型结构为基准，按激活参数量缩放。
    layers = 64 * (active_b / 35.0)**0.5
    kv_heads = 8
    head_dim = 128
    kv_gb = layers * 2 * kv_heads * head_dim * seq_len * (stack.kv_bits / 8) / 1e9
    return weight_gb, kv_gb


def decode_throughput(active_b: float, stack: Stack) -> float:
    """受内存带宽限制时，单张 GPU 每秒解码的词元数。
    每个解码词元读取 `active_b * weight_bits/8` 的权重数据量；active_b 以十亿参数为单位。
    """
    bytes_per_token = active_b * 1e9 * stack.weight_bits / 8
    raw_tokens_per_s = stack.hbm_bw_tbs * 1e12 / bytes_per_token
    return raw_tokens_per_s * stack.mtp_factor * stack.disagg_factor


def cost_per_million_tokens(active_b: float, stack: Stack) -> float:
    tps = decode_throughput(active_b, stack)
    tokens_per_hour = tps * 3600
    return stack.price_per_gpu_hour / tokens_per_hour * 1e6


def print_stack(params_b: float, active_b: float, seq_len: int = 8192) -> None:
    print(f"模型：总参数 {params_b}B，激活参数 {active_b}B，上下文（Context）{seq_len:,} 个词元")
    print("-" * 90)
    print(f"{'技术栈':40} {'权重 GB':>7} {'KV GB':>7} {'词元/秒':>9} {'美元/百万词元':>10}")
    for s in STACKS:
        w, kv = hbm_footprint_gb(params_b, active_b, seq_len, s)
        tps = decode_throughput(active_b, s)
        cost = cost_per_million_tokens(active_b, s)
        fits = "" if (w + kv) <= s.hbm_gb else "  （需要多张 GPU）"
        print(f"{s.name:40} {w:7.1f} {kv:7.2f} {tps:9.0f} {cost:10.4f}{fits}")
    print()


def main() -> None:
    print("=" * 90)
    print("简化 Blackwell + TRT-LLM 经济性：受内存带宽限制的解码")
    print("=" * 90)
    print()

    print_stack(70, 70)    # 70B 稠密模型（Dense Model）
    print_stack(120, 36)   # GPT-OSS-120B 混合专家模型（MoE），激活比例 30%
    print_stack(405, 405)  # Llama 3.1 405B 稠密模型
    print_stack(671, 37)   # DeepSeek-V3 规模的 MoE

    print("=" * 90)
    print("关键发现")
    print("-" * 90)
    print("  7 倍成本差距来自四项叠加收益：")
    print("    1. HBM 带宽：H100 为 3.35 TB/s，B200 为 8.0 TB/s，约 2.4 倍")
    print("    2. NVFP4 权重：每词元所需字节数减半，约 2.0 倍")
    print("    3. MTP 草稿：接受词元的收益约 1.8 倍")
    print("    4. 分离式部署（Disaggregation）：Dynamo 约 1.6–2.5 倍，取约 2.0 倍")
    print("  直接相乘约为 14 倍；计入开销和真实流量的接受率 alpha 后，更接近 7 倍。")
    print("  迁移推理密集型工作负载前，先验证 NVFP4 的模型质量。")


if __name__ == "__main__":
    main()
