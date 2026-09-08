"""双层缓存模拟器，仅使用 Python 标准库。

在混合工作负载下，模拟 L1 语义缓存（Semantic Cache）与 L2 提示词前缀缓存（Prompt-prefix Cache），
报告费用、命中率和并行请求带来的额外开销。
"""

from __future__ import annotations

from dataclasses import dataclass
import random


BASE_INPUT = 3.00       # 美元/百万输入词元（Token），Claude Sonnet 级定价
BASE_OUTPUT = 15.00     # 美元/百万输出词元
CACHED_INPUT = 0.30     # 缓存读取价格为原价的 1/10
CACHE_WRITE_5MIN = 1.25 * BASE_INPUT  # 生存时间（TTL）为 5 分钟的写入溢价
CACHE_WRITE_1HR = 2.00 * BASE_INPUT   # TTL 为 1 小时的写入溢价


@dataclass
class Request:
    prompt_tokens: int
    prefix_hash: str
    is_parallel_wave: bool
    arrived_at: float


@dataclass
class Config:
    l1_enabled: bool
    l2_enabled: bool
    parallel_penalty: bool  # N 个并行到达的请求同时未命中缓存
    l1_threshold: float
    l1_hit_prob: float
    ttl: str                # "5min" 表示 5 分钟，"1hr" 表示 1 小时


def make_workload(n: int = 500, seed: int = 7) -> list[Request]:
    rng = random.Random(seed)
    reqs = []
    prefixes = [f"prefix_{i}" for i in range(12)]
    now = 0.0
    for i in range(n):
        # 60% 的轮次单个到达，40% 的轮次同时到达 5 个请求。
        if rng.random() < 0.4:
            for _ in range(5):
                reqs.append(Request(rng.choice([2000, 4000, 8000]),
                                    rng.choice(prefixes), True, now))
            now += rng.uniform(0.1, 2.0)
        else:
            reqs.append(Request(rng.choice([2000, 4000, 8000]),
                                rng.choice(prefixes), False, now))
            now += rng.uniform(0.1, 2.0)
    return reqs


def simulate(reqs: list[Request], cfg: Config) -> dict:
    l2_cache: set[str] = set()
    l2_writes = 0
    l2_reads = 0
    l1_hits = 0
    cost = 0.0
    rng = random.Random(11)

    for r in reqs:
        if cfg.l1_enabled and rng.random() < cfg.l1_hit_prob:
            l1_hits += 1
            continue

        if cfg.l2_enabled:
            if r.prefix_hash in l2_cache:
                l2_reads += 1
                cost += (r.prompt_tokens / 1e6) * CACHED_INPUT
            else:
                if cfg.parallel_penalty and r.is_parallel_wave:
                    write_cost = CACHE_WRITE_5MIN if cfg.ttl == "5min" else CACHE_WRITE_1HR
                    cost += (r.prompt_tokens / 1e6) * write_cost
                    l2_writes += 1
                else:
                    write_cost = CACHE_WRITE_5MIN if cfg.ttl == "5min" else CACHE_WRITE_1HR
                    cost += (r.prompt_tokens / 1e6) * write_cost
                    l2_cache.add(r.prefix_hash)
                    l2_writes += 1
        else:
            cost += (r.prompt_tokens / 1e6) * BASE_INPUT

        cost += (200 / 1e6) * BASE_OUTPUT

    return {
        "cost": cost,
        "l1_hits": l1_hits,
        "l2_reads": l2_reads,
        "l2_writes": l2_writes,
    }


def report(label: str, cfg: Config, reqs: list[Request]) -> None:
    res = simulate(reqs, cfg)
    print(f"{label:45}  成本={res['cost']:7.2f} 美元  "
          f"L1 命中={res['l1_hits']:4}  L2 读取={res['l2_reads']:4}  L2 写入={res['l2_writes']:4}")


def main() -> None:
    print("=" * 95)
    print("提示词缓存（Prompt Cache）与语义缓存（Semantic Cache）：500 个请求，Claude Sonnet 级定价")
    print("=" * 95)
    base = make_workload()
    reqs = [Request(r.prompt_tokens, r.prefix_hash, r.is_parallel_wave, r.arrived_at) for r in base]

    report("不使用缓存",
           Config(l1_enabled=False, l2_enabled=False, parallel_penalty=True, l1_threshold=0.95, l1_hit_prob=0.0, ttl="5min"),
           reqs)
    report("L2 保留 5 分钟，存在并行额外开销",
           Config(l1_enabled=False, l2_enabled=True, parallel_penalty=True, l1_threshold=0.95, l1_hit_prob=0.0, ttl="5min"),
           reqs)
    report("L2 保留 5 分钟，首个请求串行化以消除并行额外开销",
           Config(l1_enabled=False, l2_enabled=True, parallel_penalty=False, l1_threshold=0.95, l1_hit_prob=0.0, ttl="5min"),
           reqs)
    report("L2 保留 1 小时 + L1 语义命中率 30%",
           Config(l1_enabled=True, l2_enabled=True, parallel_penalty=False, l1_threshold=0.95, l1_hit_prob=0.30, ttl="1hr"),
           reqs)
    report("L2 保留 1 小时 + L1 语义命中率 70%（结构化常见问题 FAQ）",
           Config(l1_enabled=True, l2_enabled=True, parallel_penalty=False, l1_threshold=0.95, l1_hit_prob=0.70, ttl="1hr"),
           reqs)

    print("\n结果解读：缓存需要遵循协议。合理组织提示词结构和请求批次，才能获得收益。")


if __name__ == "__main__":
    main()
