"""简化的推测解码（Speculative Decoding）分析器，仅使用 Python 标准库。

遍历 (alpha, K, verify_overhead, concurrency) 参数组合，计算 EAGLE-3 式推测解码的
预期加速比（Speedup）和盈亏平衡接受率 alpha。本例用于教学，数值体现趋势，
不代表绝对延迟。
"""

from __future__ import annotations

from dataclasses import dataclass
import random
import statistics


@dataclass
class SpecPoint:
    alpha: float      # 接受率（Acceptance Rate），范围 0..1
    k: int            # 草稿（Draft）长度
    verify_overhead: float  # 目标模型每次前向计算的额外成本比例
    concurrency: int  # 解码时的批大小（Batch Size）


def expected_speedup(p: SpecPoint) -> float:
    """常规解码：目标模型每次前向计算生成 1 个词元（Token）。
    参数为 (alpha, K) 的推测解码：每次前向计算预计生成 1 + K*alpha 个词元，
    但成本为常规解码的 (1 + verify_overhead) 倍。
    并发会增加 verify_overhead，因为更多序列共用验证计算。
    """
    effective_overhead = p.verify_overhead * (1 + p.concurrency / 256)
    tokens_per_target = 1 + p.k * p.alpha
    cost_per_target = 1 + effective_overhead
    return tokens_per_target / cost_per_target


def breakeven_alpha(k: int, verify_overhead: float, concurrency: int) -> float:
    effective_overhead = verify_overhead * (1 + concurrency / 256)
    # 盈亏平衡条件：speedup = (1 + K*alpha) / (1 + eff_overhead) = 1
    # 解得接受率：alpha = eff_overhead / K
    return effective_overhead / k


def simulate_tail(p: SpecPoint, n_tokens: int = 1000, seed: int = 3) -> tuple[float, float]:
    """模拟单词元延迟分布。
    常规解码：单词元延迟近似固定，叠加小幅抖动（Jitter）。
    推测解码：接受的词元成批输出；草稿被拒绝时需要两次目标模型计算。
    返回 (mean_ms, p99_ms)，即平均延迟与 P99 延迟，单位均为毫秒。
    """
    rng = random.Random(seed)
    base_target_ms = 8.0
    effective_overhead = p.verify_overhead * (1 + p.concurrency / 256)
    verify_ms = base_target_ms * (1 + effective_overhead)
    reroll_ms = base_target_ms  # 草稿提前被拒绝时，第二次计算的耗时

    latencies: list[float] = []
    tokens_emitted = 0
    while tokens_emitted < n_tokens:
        # 生成 K 个草稿词元，再进行验证。
        accepted = 0
        for _ in range(p.k):
            if rng.random() < p.alpha:
                accepted += 1
            else:
                break
        batch_lat = verify_ms + (reroll_ms if accepted < p.k else 0)
        # 输出词元数：accepted + 1，其中 1 是末尾经过验证的词元。
        batch_tokens = max(1, accepted + 1)
        per_tok = batch_lat / batch_tokens
        for _ in range(batch_tokens):
            jitter = rng.gauss(0, per_tok * 0.1)
            latencies.append(max(0.1, per_tok + jitter))
            tokens_emitted += 1
            if tokens_emitted >= n_tokens:
                break
    latencies.sort()
    p99 = latencies[int(0.99 * len(latencies)) - 1]
    return statistics.mean(latencies), p99


def plain_tail(concurrency: int, n_tokens: int = 1000, seed: int = 5) -> tuple[float, float]:
    rng = random.Random(seed)
    base = 8.0 * (1 + concurrency / 512)
    lats = [max(0.1, base + rng.gauss(0, base * 0.08)) for _ in range(n_tokens)]
    lats.sort()
    return statistics.mean(lats), lats[int(0.99 * len(lats)) - 1]


def print_table(title: str, rows: list[tuple[str, float, float, float, float, float]]) -> None:
    print(title)
    print("-" * 80)
    print(f"{'配置':28} {'加速比':>8} {'盈亏平衡 alpha':>10} {'平均毫秒':>10} {'P99 毫秒':>10}")
    for label, speedup, be_alpha, mean, p99, delta_p99 in rows:
        tag = "  正常" if delta_p99 <= 0 else "  尾延迟恶化（TAIL）"
        print(f"{label:28} {speedup:8.2f} {be_alpha:10.3f} {mean:10.2f} {p99:10.2f}{tag}")


def main() -> None:
    print("=" * 80)
    print("简化 EAGLE-3 推测解码（Speculative Decoding）分析器")
    print("=" * 80)
    print()

    base_overhead = 0.15
    k = 5

    print(f"配置：K={k}，基础验证开销 verify_overhead={base_overhead}")
    print()

    for concurrency in [32, 128, 256]:
        be = breakeven_alpha(k, base_overhead, concurrency)
        plain_mean, plain_p99 = plain_tail(concurrency)
        rows = []
        for alpha in [0.30, 0.45, 0.55, 0.70, 0.80]:
            p = SpecPoint(alpha=alpha, k=k,
                          verify_overhead=base_overhead, concurrency=concurrency)
            s = expected_speedup(p)
            mean_ms, p99_ms = simulate_tail(p)
            delta = p99_ms - plain_p99
            rows.append((f"alpha={alpha:.2f} 并发数={concurrency}", s, be, mean_ms, p99_ms, delta))
        print(f"  --- 并发数 {concurrency} ---  常规解码 P99 = {plain_p99:.2f} ms")
        print_table(f"  推测解码", rows)
        print()

    print("=" * 80)
    print("关键发现")
    print("-" * 80)
    print("  盈亏平衡接受率 alpha 随并发数上升。并发数为 32 时，约高于 0.1 即可受益；")
    print("  并发数为 256 时，门槛约为 0.4。低于该门槛，即使预期加速比公式显示有收益，")
    print("  P99 尾延迟（Tail Latency）仍会恶化。")
    print("  上线前应使用真实流量测量 alpha。")


if __name__ == "__main__":
    main()
