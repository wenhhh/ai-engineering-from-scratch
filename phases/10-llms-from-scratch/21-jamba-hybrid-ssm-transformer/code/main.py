"""Jamba / Mamba-3 内存计算器（Memory calculator），使用 Python 标准库。

为一系列混合配置计算 KV 缓存、状态空间模型（SSM）状态与注意力层总内存:
纯 Transformer、Jamba 1:7、1:3、1:15 和纯 SSM。
打印 8k、64k、128k、256k 上下文下的比较结果。

数值用于说明原理，并非精确的生产内存预算。重点是解释混合比例为何重要，
以及 Jamba 声称能在 80GB 上运行 256k 上下文的依据。
"""

from __future__ import annotations

from dataclasses import dataclass


BYTES_BF16 = 2
BYTES_FP8 = 1


@dataclass
class HybridConfig:
    name: str
    total_layers: int
    attn_layers: int
    hidden: int
    n_q_heads: int
    n_kv_heads: int
    head_dim: int
    ssm_state_size: int


def kv_cache_bytes(cfg: HybridConfig, ctx: int, bytes_per_elem: int) -> int:
    return (2 * cfg.attn_layers * cfg.n_kv_heads * cfg.head_dim * ctx
            * bytes_per_elem)


def ssm_state_bytes(cfg: HybridConfig, bytes_per_elem: int) -> int:
    ssm_layers = cfg.total_layers - cfg.attn_layers
    return ssm_layers * cfg.hidden * cfg.ssm_state_size * bytes_per_elem


def fmt_bytes(b: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if b < 1024:
            return f"{b:.2f}{unit}"
        b /= 1024
    return f"{b:.2f}PB"


def main() -> None:
    print("=" * 74)
    print("Jamba 混合 SSM-Transformer 内存计算器（阶段 10，第 21 课）")
    print("=" * 74)
    print()

    configs = [
        HybridConfig(
            name="纯 Transformer 32L",
            total_layers=32, attn_layers=32,
            hidden=4096, n_q_heads=32, n_kv_heads=32, head_dim=128,
            ssm_state_size=0,
        ),
        HybridConfig(
            name="纯 Transformer 32L (GQA 8)",
            total_layers=32, attn_layers=32,
            hidden=4096, n_q_heads=32, n_kv_heads=8, head_dim=128,
            ssm_state_size=0,
        ),
        HybridConfig(
            name="Jamba 1:7 混合（Hybrid）32L",
            total_layers=32, attn_layers=4,
            hidden=4096, n_q_heads=32, n_kv_heads=32, head_dim=128,
            ssm_state_size=16,
        ),
        HybridConfig(
            name="Jamba 1:3 混合（Hybrid）32L",
            total_layers=32, attn_layers=8,
            hidden=4096, n_q_heads=32, n_kv_heads=32, head_dim=128,
            ssm_state_size=16,
        ),
        HybridConfig(
            name="Jamba 1:15 混合（Hybrid）32L",
            total_layers=32, attn_layers=2,
            hidden=4096, n_q_heads=32, n_kv_heads=32, head_dim=128,
            ssm_state_size=16,
        ),
        HybridConfig(
            name="纯 Mamba 32L",
            total_layers=32, attn_layers=0,
            hidden=4096, n_q_heads=0, n_kv_heads=0, head_dim=128,
            ssm_state_size=16,
        ),
    ]

    contexts = [8_192, 65_536, 131_072, 262_144]

    print("-" * 74)
    print("BF16 内存占用（每元素 2 字节）")
    print("-" * 74)
    header = "  " + "配置（Config）".ljust(32)
    for ctx in contexts:
        header += f"{ctx // 1000}k".rjust(10)
    print(header)
    for cfg in configs:
        row = "  " + cfg.name.ljust(32)
        for ctx in contexts:
            kv = kv_cache_bytes(cfg, ctx, BYTES_BF16)
            ss = ssm_state_bytes(cfg, BYTES_BF16)
            total = kv + ss
            row += fmt_bytes(total).rjust(10)
        print(row)
    print()

    print("-" * 74)
    print("256k 上下文（BF16）下相对纯 Transformer 全 MHA 的主要节省")
    print("-" * 74)
    baseline = kv_cache_bytes(configs[0], 262_144, BYTES_BF16)
    for cfg in configs:
        kv = kv_cache_bytes(cfg, 262_144, BYTES_BF16)
        ss = ssm_state_bytes(cfg, BYTES_BF16)
        total = kv + ss
        savings = (1 - total / baseline) * 100
        print(f"  {cfg.name:<32} 总计 {fmt_bytes(total):>10}  "
              f"({savings:+.1f}% 相对基线）")
    print()

    print("-" * 74)
    print("256k（BF16）下的注意力层占比与内存占比")
    print("-" * 74)
    for cfg in configs:
        attn_frac = cfg.attn_layers / cfg.total_layers if cfg.total_layers else 0
        kv = kv_cache_bytes(cfg, 262_144, BYTES_BF16)
        ss = ssm_state_bytes(cfg, BYTES_BF16)
        mem_frac = kv / (kv + ss + 1) if (kv + ss) > 0 else 0
        print(f"  {cfg.name:<32} attn_frac={attn_frac:.3f}  "
              f"kv_frac_of_total_cache={mem_frac:.3f}")
    print()

    print("=" * 74)
    print("要点（Takeaway）")
    print("-" * 74)
    print("  纯 Transformer 在 256k 时仅 KV 缓存就需要 67 GB，")
    print("  加上权重和激活后，无法装入 80GB 单 GPU 部署。")
    print("  Jamba 1:7 = 8.4 GB KV 缓存 + ~4 MB SSM 状态，可以容纳且有余量。")
    print("  这具体说明了 AI21 论文中单 GPU 支持 256k 上下文的主张。")
    print("  Mamba-3 进一步推进纯 SSM；混合架构可能会采用它，")
    print("  作为下一代方案中的 SSM 部分。")


if __name__ == "__main__":
    main()
