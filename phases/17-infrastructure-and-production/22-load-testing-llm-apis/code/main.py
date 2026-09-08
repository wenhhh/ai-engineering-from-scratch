"""负载测试（Load Test）反模式（Anti-pattern）演示器，仅使用 Python 标准库。

模拟内容相同的提示词如何通过前缀缓存（Prefix Cache）与请求合并（Request Coalescing）
虚增报告吞吐量；采用真实分布才能揭示实际吞吐上限。
"""

from __future__ import annotations

from dataclasses import dataclass
import random
import statistics


PREFIX_CACHE_HIT_TTFT_MS = 80
PREFIX_CACHE_MISS_TTFT_MS = 800
TPOT_MS = 15
BATCH_EFFICIENCY_SHARED_PREFIX = 0.8  # 批处理占用的槽位减少，比例为 1/0.8 = 1.25 倍


@dataclass
class Request:
    prompt_tokens: int
    prefix_hash: str


def make_uniform_workload(n: int = 500) -> list[Request]:
    return [Request(2000, "single_prefix") for _ in range(n)]


def make_realistic_workload(n: int = 500, seed: int = 7) -> list[Request]:
    rng = random.Random(seed)
    reqs = []
    prefixes = [f"prefix_{i}" for i in range(80)]
    for _ in range(n):
        prompt = max(50, int(rng.gauss(500, 180)))
        reqs.append(Request(prompt, rng.choice(prefixes)))
    return reqs


def simulate(reqs: list[Request], concurrency: int) -> dict:
    cache: set[str] = set()
    ttft_samples: list[float] = []
    # 以 concurrency 为组大小，逐组串行处理。
    for i in range(0, len(reqs), concurrency):
        batch = reqs[i:i + concurrency]
        unique_prefixes = len({r.prefix_hash for r in batch})
        for r in batch:
            hit = r.prefix_hash in cache
            ttft = PREFIX_CACHE_HIT_TTFT_MS if hit else PREFIX_CACHE_MISS_TTFT_MS
            if not hit:
                cache.add(r.prefix_hash)
            ttft_samples.append(ttft)
    ttft_samples.sort()
    p50 = ttft_samples[len(ttft_samples) // 2]
    p99 = ttft_samples[int(len(ttft_samples) * 0.99) - 1]
    return {
        "n": len(reqs),
        "p50": p50,
        "p99": p99,
        "mean": statistics.mean(ttft_samples),
        "cache_hits": sum(1 for t in ttft_samples if t == PREFIX_CACHE_HIT_TTFT_MS),
    }


def main() -> None:
    print("=" * 95)
    print("提示词同质化陷阱：同一测试框架（Test Harness），不同提示词分布")
    print("=" * 95)

    for concurrency in (10, 50, 200):
        print(f"\n并发数（Concurrency）= {concurrency}")
        header = f"{'工作负载':22}  {'样本数':>5}  {'TTFT_P50':>9}  {'TTFT_P99':>9}  {'平均延迟':>7}  缓存命中数"
        print(header)
        print("-" * len(header))

        uniform = make_uniform_workload(500)
        u = simulate(uniform, concurrency)
        print(f"{'相同提示词（UNIFORM）':22}  {u['n']:5}  {u['p50']:8.0f}ms  {u['p99']:8.0f}ms  {u['mean']:6.0f}ms  {u['cache_hits']:4}")

        realistic = make_realistic_workload(500)
        r = simulate(realistic, concurrency)
        print(f"{'真实分布（REALISTIC）':22}  {r['n']:5}  {r['p50']:8.0f}ms  {r['p99']:8.0f}ms  {r['mean']:6.0f}ms  {r['cache_hits']:4}")

    print("\n结果解读：相同提示词会让端点（Endpoint）看起来很快，真实分布的提示词才能反映实际情况。")
    print("使用 LLMPerf 时，始终同时设置 --mean-input-tokens 和 --stddev-input-tokens。")


if __name__ == "__main__":
    main()
