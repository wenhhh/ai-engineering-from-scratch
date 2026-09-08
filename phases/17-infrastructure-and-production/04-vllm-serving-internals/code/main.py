"""简化的连续批处理（Continuous Batching）调度器，仅使用 Python 标准库。

在同一组工作负载下模拟四种推理服务模式：
  NAIVE            ：逐个处理请求，不组批
  STATIC           ：填充至批次边界，等待最慢的请求完成
  CONTINUOUS       ：每次迭代都可接纳新请求、释放已完成请求
  CONTINUOUS+CHUNK ：连续批处理加分块预填充（Chunked Prefill），每块 512 个词元

报告吞吐量（每模拟秒的词元数）、平均首词元延迟（TTFT）和 P99 词元间延迟（ITL），
无需 GPU 即可复现 vLLM 基准测试的趋势。本例用于教学，延迟常量是示意值，并非实测数据。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from collections import deque
import random
import statistics


FORWARD_LATENCY_PER_TOKEN = 0.0005   # 批次中每个解码（Decode）词元耗时 0.5 ms
PREFILL_LATENCY_PER_TOKEN = 0.00004  # 单词元预填充（Prefill）成本约为解码的 1/12
BATCH_OVERHEAD = 0.0002              # 每次前向计算（Forward Pass）的固定开销
CHUNK_SIZE = 512
KV_BLOCK_SIZE = 16
KV_BLOCKS_AVAILABLE = 1800           # 简化模型的键值缓存（KV Cache）块预算


@dataclass
class Request:
    req_id: int
    prompt_len: int
    output_len: int
    arrived_at: float
    prefilled: int = 0
    generated: int = 0
    ttft: float | None = None
    last_token_at: float | None = None
    itl_samples: list[float] = field(default_factory=list)

    @property
    def in_prefill(self) -> bool:
        return self.prefilled < self.prompt_len

    @property
    def done(self) -> bool:
        return self.generated >= self.output_len

    def blocks_needed(self) -> int:
        total = self.prompt_len + self.output_len
        return (total + KV_BLOCK_SIZE - 1) // KV_BLOCK_SIZE


def make_workload(n: int = 60, seed: int = 7) -> list[Request]:
    rng = random.Random(seed)
    reqs = []
    now = 0.0
    for i in range(n):
        now += rng.expovariate(40.0)   # 平均每秒到达约 40 个请求
        prompt_len = rng.choice([128, 256, 512, 2048, 8192])
        out_len = rng.randint(50, 300)
        reqs.append(Request(i, prompt_len, out_len, now))
    return reqs


def report(label: str, reqs: list[Request], sim_end: float) -> None:
    ttfts = [r.ttft - r.arrived_at for r in reqs if r.ttft is not None]
    itls = [dt for r in reqs for dt in r.itl_samples]
    total_out = sum(r.generated for r in reqs)
    throughput = total_out / sim_end if sim_end else 0
    mean_ttft = statistics.mean(ttfts) * 1000 if ttfts else 0
    p99_itl = sorted(itls)[int(0.99 * len(itls)) - 1] * 1000 if itls else 0
    print(f"{label:28}  吞吐量={throughput:6.0f} 词元/秒   "
          f"平均 TTFT={mean_ttft:6.1f} ms   "
          f"P99 ITL={p99_itl:5.1f} ms   已完成={sum(r.done for r in reqs)}/{len(reqs)}")


def simulate_naive(reqs: list[Request]) -> float:
    """逐个处理请求：先预填充完整提示词（Prompt），再解码至完成。"""
    now = 0.0
    for r in reqs:
        if now < r.arrived_at:
            now = r.arrived_at
        now += r.prompt_len * PREFILL_LATENCY_PER_TOKEN + BATCH_OVERHEAD
        r.prefilled = r.prompt_len
        r.ttft = now
        r.last_token_at = now
        for _ in range(r.output_len):
            prev = r.last_token_at
            now += FORWARD_LATENCY_PER_TOKEN + BATCH_OVERHEAD
            r.generated += 1
            r.itl_samples.append(now - prev)
            r.last_token_at = now
    return now


def simulate_static(reqs: list[Request], batch: int = 16) -> float:
    """组成固定批次，等待批内最慢的请求完成。"""
    now = 0.0
    i = 0
    while i < len(reqs):
        window = reqs[i:i + batch]
        i += batch
        now = max(now, max(r.arrived_at for r in window))
        pad_prompt = max(r.prompt_len for r in window)
        pad_output = max(r.output_len for r in window)
        now += pad_prompt * PREFILL_LATENCY_PER_TOKEN + BATCH_OVERHEAD
        for r in window:
            r.prefilled = r.prompt_len
            r.ttft = now
            r.last_token_at = now
        for _ in range(pad_output):
            prev_now = now
            now += FORWARD_LATENCY_PER_TOKEN * len(window) / 16 + BATCH_OVERHEAD
            for r in window:
                if r.generated < r.output_len:
                    r.generated += 1
                    r.itl_samples.append(now - prev_now)
                    r.last_token_at = now
    return now


def simulate_continuous(reqs: list[Request], chunked: bool) -> float:
    waiting = deque(sorted(reqs, key=lambda r: r.arrived_at))
    running: list[Request] = []
    blocks_used = 0
    now = 0.0
    while waiting or running:
        if waiting and running and now < waiting[0].arrived_at and not running:
            now = waiting[0].arrived_at
        while waiting and waiting[0].arrived_at <= now:
            r = waiting[0]
            if blocks_used + r.blocks_needed() > KV_BLOCKS_AVAILABLE:
                break
            blocks_used += r.blocks_needed()
            running.append(waiting.popleft())
        if not running:
            if not waiting:
                break
            now = waiting[0].arrived_at
            continue

        batch_tokens = 0
        prefill_work = 0
        decoded: list[Request] = []
        for r in running:
            if r.in_prefill:
                remaining = r.prompt_len - r.prefilled
                take = min(CHUNK_SIZE if chunked else remaining, remaining)
                r.prefilled += take
                prefill_work += take
                if r.prefilled >= r.prompt_len:
                    r.ttft = now + prefill_work * PREFILL_LATENCY_PER_TOKEN
            else:
                decoded.append(r)
                batch_tokens += 1

        dt = (prefill_work * PREFILL_LATENCY_PER_TOKEN
              + batch_tokens * FORWARD_LATENCY_PER_TOKEN
              + BATCH_OVERHEAD)
        now += dt
        for r in decoded:
            prev = r.last_token_at or r.ttft or now
            r.generated += 1
            r.itl_samples.append(now - prev)
            r.last_token_at = now
            if r.ttft is None:
                r.ttft = now

        finished = [r for r in running if r.done]
        for r in finished:
            blocks_used -= r.blocks_needed()
            running.remove(r)
    return now


def main() -> None:
    print("=" * 80)
    print("简化 vLLM 调度器：同一组 60 个请求，四种服务模式")
    print("=" * 80)

    base = make_workload()
    w1 = [Request(r.req_id, r.prompt_len, r.output_len, r.arrived_at) for r in base]
    end = simulate_naive(w1)
    report("朴素逐请求（NAIVE）", w1, end)

    w2 = [Request(r.req_id, r.prompt_len, r.output_len, r.arrived_at) for r in base]
    end = simulate_static(w2)
    report("静态批处理（STATIC，批大小 16，填充）", w2, end)

    w3 = [Request(r.req_id, r.prompt_len, r.output_len, r.arrived_at) for r in base]
    end = simulate_continuous(w3, chunked=False)
    report("连续批处理（CONTINUOUS，不分块）", w3, end)

    w4 = [Request(r.req_id, r.prompt_len, r.output_len, r.arrived_at) for r in base]
    end = simulate_continuous(w4, chunked=True)
    report("连续批处理与分块预填充（CONTINUOUS + CHUNKED）", w4, end)

    print()
    print("请看 CONTINUOUS+CHUNKED 行，这就是 vLLM 默认采用的方案。")
    print("静态批处理与连续批处理之间的差距，正是 vLLM 的价值所在。")


if __name__ == "__main__":
    main()
