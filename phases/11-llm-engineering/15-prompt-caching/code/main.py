"""提示词缓存成本核算器（Prompt caching accountant）。

对请求流模拟三家提供商的缓存机制（Anthropic 临时缓存 5m、Anthropic 1h、
OpenAI 自动缓存、Gemini 显式缓存），报告写入、读取、未命中次数，
以及每 1K 次请求的综合成本。

下列价格为 2026 年 4 月公布的各提供商前沿模型输入词元费率。
可编辑 PRICES 覆盖这些费率。

运行方式：
    python main.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


# 输入词元价格（Input-token prices），单位为美元 / 1K 词元 --------------------------------------

PRICES = {
    "anthropic_claude_opus_4_7": {"base": 0.015, "cache_write_5m": 0.01875, "cache_write_1h": 0.030, "cache_read": 0.0015},
    "openai_gpt_5": {"base": 0.005, "cache_write": 0.005, "cache_read": 0.0025},
    "gemini_3_pro": {"base": 0.00125, "cache_write": 0.00125, "cache_read": 0.0003125, "storage_per_1k_per_hour": 0.0000125},
}


@dataclass
class Request:
    """单次请求。`prefix_tokens` 为可缓存前缀（cacheable prefix）；`suffix_tokens` 为用户输入。"""

    prefix_tokens: int
    suffix_tokens: int
    prefix_key: str


@dataclass
class CacheEntry:
    tokens: int
    written_at: int  # 请求索引（request index）
    ttl_seconds: int


@dataclass
class ProviderStats:
    writes: int = 0
    reads: int = 0
    misses: int = 0
    input_cost: float = 0.0
    storage_cost: float = 0.0

    @property
    def total_cost(self) -> float:
        return self.input_cost + self.storage_cost


def simulate_anthropic(requests: Iterable[Request], ttl_seconds: int, seconds_between: int) -> ProviderStats:
    p = PRICES["anthropic_claude_opus_4_7"]
    write_rate = p["cache_write_1h"] if ttl_seconds > 300 else p["cache_write_5m"]
    stats = ProviderStats()
    cache: dict[str, CacheEntry] = {}
    for i, r in enumerate(requests):
        now_seconds = i * seconds_between
        entry = cache.get(r.prefix_key)
        expired = entry is None or (now_seconds - entry.written_at) >= entry.ttl_seconds
        if expired:
            stats.writes += 1
            stats.input_cost += (r.prefix_tokens / 1000) * write_rate
            cache[r.prefix_key] = CacheEntry(tokens=r.prefix_tokens, written_at=now_seconds, ttl_seconds=ttl_seconds)
        else:
            stats.reads += 1
            stats.input_cost += (r.prefix_tokens / 1000) * p["cache_read"]
        stats.input_cost += (r.suffix_tokens / 1000) * p["base"]
    return stats


def simulate_openai(requests: Iterable[Request], seconds_between: int) -> ProviderStats:
    """OpenAI 的缓存自动启用；这里将其建模为始终开启，并采用尽力保证的 1h 生存时间（TTL）。"""
    p = PRICES["openai_gpt_5"]
    stats = ProviderStats()
    cache: dict[str, CacheEntry] = {}
    for i, r in enumerate(requests):
        now_seconds = i * seconds_between
        entry = cache.get(r.prefix_key)
        expired = entry is None or (now_seconds - entry.written_at) >= 3600
        if expired:
            stats.writes += 1
            stats.input_cost += (r.prefix_tokens / 1000) * p["cache_write"]
            cache[r.prefix_key] = CacheEntry(tokens=r.prefix_tokens, written_at=now_seconds, ttl_seconds=3600)
        else:
            stats.reads += 1
            stats.input_cost += (r.prefix_tokens / 1000) * p["cache_read"]
        stats.input_cost += (r.suffix_tokens / 1000) * p["base"]
    return stats


def simulate_gemini(requests: Iterable[Request], ttl_seconds: int, seconds_between: int) -> ProviderStats:
    p = PRICES["gemini_3_pro"]
    stats = ProviderStats()
    cache: dict[str, CacheEntry] = {}
    for i, r in enumerate(requests):
        now_seconds = i * seconds_between
        entry = cache.get(r.prefix_key)
        expired = entry is None or (now_seconds - entry.written_at) >= entry.ttl_seconds
        if expired:
            stats.writes += 1
            stats.input_cost += (r.prefix_tokens / 1000) * p["cache_write"]
            cache[r.prefix_key] = CacheEntry(tokens=r.prefix_tokens, written_at=now_seconds, ttl_seconds=ttl_seconds)
        else:
            stats.reads += 1
            stats.input_cost += (r.prefix_tokens / 1000) * p["cache_read"]
        stats.input_cost += (r.suffix_tokens / 1000) * p["base"]
    # 存储成本：每个条目存活 ttl，按词元小时（token-hour）计费
    for entry in cache.values():
        hours = entry.ttl_seconds / 3600
        stats.storage_cost += (entry.tokens / 1000) * p["storage_per_1k_per_hour"] * hours
    return stats


def baseline_cost(requests: list[Request], provider: str) -> float:
    p = PRICES[provider]
    return sum((r.prefix_tokens + r.suffix_tokens) / 1000 * p["base"] for r in requests)


def make_traffic(n_requests: int, n_prefixes: int, prefix_size: int, suffix_size: int) -> list[Request]:
    return [
        Request(
            prefix_tokens=prefix_size,
            suffix_tokens=suffix_size,
            prefix_key=f"prefix_{i % n_prefixes}",
        )
        for i in range(n_requests)
    ]


def print_report(name: str, stats: ProviderStats, baseline: float, n: int) -> None:
    savings = 1 - (stats.total_cost / baseline) if baseline > 0 else 0
    print(f"\n{name}")
    print(f"  写入次数（writes）{stats.writes:>5}  读取次数（reads）{stats.reads:>5}  未命中次数（misses）{stats.misses:>5}")
    print(f"  输入成本  ${stats.input_cost:>7.4f}")
    if stats.storage_cost:
        print(f"  存储成本    ${stats.storage_cost:>7.4f}")
    print(f"  无缓存成本  ${baseline:>7.4f}  ->  节省 {savings*100:>5.1f}%")
    print(f"  每 1K 次请求  ${stats.total_cost * 1000 / n:>7.4f}")


def main() -> None:
    traffic = make_traffic(n_requests=500, n_prefixes=3, prefix_size=15000, suffix_size=400)
    seconds_between = 4  # 每 4 秒一次请求

    anthro_5m = simulate_anthropic(traffic, ttl_seconds=300, seconds_between=seconds_between)
    anthro_1h = simulate_anthropic(traffic, ttl_seconds=3600, seconds_between=seconds_between)
    openai = simulate_openai(traffic, seconds_between=seconds_between)
    gemini = simulate_gemini(traffic, ttl_seconds=3600, seconds_between=seconds_between)

    print(f"场景：500 次请求，轮流使用 3 个前缀（每个 15K 词元），间隔 4s\n")

    print_report("Anthropic Claude Opus 4.7 （5 分钟生存时间，TTL）", anthro_5m, baseline_cost(traffic, "anthropic_claude_opus_4_7"), len(traffic))
    print_report("Anthropic Claude Opus 4.7 （1 小时生存时间，TTL）", anthro_1h, baseline_cost(traffic, "anthropic_claude_opus_4_7"), len(traffic))
    print_report("OpenAI GPT-5 （自动缓存，automatic）", openai, baseline_cost(traffic, "openai_gpt_5"), len(traffic))
    print_report("Gemini 3 Pro （显式缓存，explicit，1 小时）", gemini, baseline_cost(traffic, "gemini_3_pro"), len(traffic))


if __name__ == "__main__":
    main()
