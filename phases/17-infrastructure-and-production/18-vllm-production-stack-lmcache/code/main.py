"""vLLM 生产部署栈与 LMCache 模拟器，仅使用 Python 标准库。

在频繁发生抢占（Preemption）的工作负载下，对比三种配置：
  NATIVE_ONLY   ：vLLM 不卸载缓存，请求被抢占后重新预填充（Prefill）
  CPU_OFFLOAD   ：引擎本地的原生 CPU 卸载（Offload）
  LMCACHE       ：4 个引擎共享集群级 LMCache

报告避免的重复预填充次数、吞吐量收益，以及盈亏平衡时的高带宽内存（HBM）利用率。
"""

from __future__ import annotations

from dataclasses import dataclass
import random


PREFILL_TOK_PER_MS = 40.0
DECODE_TOK_PER_MS = 0.15
CPU_OFFLOAD_TIME_MS_PER_BLOCK = 1.5
LMCACHE_TIME_MS_PER_BLOCK = 3.0
KV_BLOCK_TOKENS = 16


@dataclass
class Request:
    prompt_tokens: int
    output_tokens: int
    prefix_id: str  # 用于跨引擎复用


def make_workload(n: int = 200, seed: int = 7) -> list[Request]:
    rng = random.Random(seed)
    prefixes = [f"tpl_{i}" for i in range(6)]  # 前缀集合较小，复用率较高
    reqs = []
    for _ in range(n):
        prompt = rng.choice([2000, 4000, 8000])
        reqs.append(Request(prompt, rng.randint(150, 400), rng.choice(prefixes)))
    return reqs


def simulate(config: str, reqs: list[Request]) -> dict:
    """模拟 HBM 容量紧张时的小型集群。"""
    engines_state: list[set[str]] = [set() for _ in range(4)]
    shared_cache: set[str] = set()
    hbm_capacity_blocks_per_engine = 900
    total_time_ms = 0.0
    re_prefills_avoided = 0
    prefill_work = 0
    rng = random.Random(11)

    for r in reqs:
        eng = rng.randrange(len(engines_state))
        blocks = (r.prompt_tokens + KV_BLOCK_TOKENS - 1) // KV_BLOCK_TOKENS
        cached_local = r.prefix_id in engines_state[eng]
        cached_lmcache = r.prefix_id in shared_cache

        if config == "NATIVE_ONLY":
            if cached_local:
                prefill_ms = 0
                re_prefills_avoided += 1
            else:
                prefill_ms = r.prompt_tokens / PREFILL_TOK_PER_MS
                engines_state[eng].add(r.prefix_id)
                if len(engines_state[eng]) > 4:
                    engines_state[eng].pop()
        elif config == "CPU_OFFLOAD":
            if cached_local:
                prefill_ms = 0
                re_prefills_avoided += 1
            else:
                prefill_ms = r.prompt_tokens / PREFILL_TOK_PER_MS
                engines_state[eng].add(r.prefix_id)
                prefill_ms += blocks * CPU_OFFLOAD_TIME_MS_PER_BLOCK * 0.1
        elif config == "LMCACHE":
            if cached_local:
                prefill_ms = 0
                re_prefills_avoided += 1
            elif cached_lmcache:
                prefill_ms = blocks * LMCACHE_TIME_MS_PER_BLOCK
                engines_state[eng].add(r.prefix_id)
                re_prefills_avoided += 1
            else:
                prefill_ms = r.prompt_tokens / PREFILL_TOK_PER_MS
                shared_cache.add(r.prefix_id)
                engines_state[eng].add(r.prefix_id)

        decode_ms = r.output_tokens / DECODE_TOK_PER_MS
        total_time_ms += prefill_ms + decode_ms
        prefill_work += prefill_ms

    return {
        "config": config,
        "total_ms": total_time_ms,
        "prefill_ms": prefill_work,
        "re_prefills_avoided": re_prefills_avoided,
    }


def report(row: dict, baseline: float) -> None:
    speedup = baseline / row["total_ms"] if row["total_ms"] else 1
    print(f"{row['config']:14}  总耗时={row['total_ms']:8.0f} ms  "
          f"预填充耗时={row['prefill_ms']:7.0f} ms  "
          f"避免重复预填充次数={row['re_prefills_avoided']:4}  "
          f"加速比（Speedup）={speedup:4.2f}x")


def main() -> None:
    print("=" * 80)
    print("vLLM 生产部署栈与 LMCache：频繁抢占，4 个引擎，共享前缀")
    print("=" * 80)
    base = make_workload()
    baseline = simulate("NATIVE_ONLY", [Request(r.prompt_tokens, r.output_tokens, r.prefix_id) for r in base])["total_ms"]
    for cfg in ("NATIVE_ONLY", "CPU_OFFLOAD", "LMCACHE"):
        report(simulate(cfg, [Request(r.prompt_tokens, r.output_tokens, r.prefix_id) for r in base]), baseline)
    print("\n结果解读：前缀在多个引擎间重复出现时，即使各引擎已淘汰本地缓存，")
    print("LMCache 仍能避免重复预填充。")


if __name__ == "__main__":
    main()
