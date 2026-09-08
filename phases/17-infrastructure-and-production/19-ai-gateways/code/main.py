"""AI 网关（Gateway）路由与故障回退（Fallback）模拟器，仅使用 Python 标准库。

模拟统一接入 OpenAI、Anthropic 与自托管服务的网关，为各供应商注入 429/5xx 错误，
比较故障回退策略。
"""

from __future__ import annotations

from dataclasses import dataclass, field
import random


@dataclass
class Provider:
    name: str
    base_latency_ms: float
    error_rate: float
    overhead_ms: float


PROVIDERS = [
    Provider("OpenAI",       180, 0.03, 0),
    Provider("Anthropic",    220, 0.02, 0),
    Provider("自托管（Self-hosted）",  100, 0.05, 0),
]

GATEWAY_OVERHEAD = {
    "LiteLLM": 10,
    "Portkey": 30,
    "Kong":      5,
    "Cloudflare": 2,
}


def call_provider(p: Provider, rng: random.Random) -> tuple[bool, float]:
    if rng.random() < p.error_rate:
        return False, p.base_latency_ms * 0.3  # 请求处理到一半时出错
    return True, p.base_latency_ms


def simulate_fallback(gateway: str, n: int = 1000, seed: int = 7) -> dict:
    rng = random.Random(seed)
    success = 0
    total_latency = 0.0
    retries = 0
    fallback_hits = 0
    gw_ovh = GATEWAY_OVERHEAD[gateway]

    for _ in range(n):
        req_latency = gw_ovh
        done = False
        for attempt, p in enumerate(PROVIDERS):
            ok, ms = call_provider(p, rng)
            req_latency += ms
            if attempt > 0:
                fallback_hits += 1
            if ok:
                success += 1
                done = True
                break
            retries += 1
        total_latency += req_latency

    return {
        "gateway": gateway,
        "success_rate": success / n,
        "mean_latency": total_latency / n,
        "retries": retries,
        "fallback_hits": fallback_hits,
    }


def report(row: dict) -> None:
    print(f"{row['gateway']:12}  成功率={row['success_rate']*100:5.1f}%  "
          f"平均延迟={row['mean_latency']:6.0f}ms  "
          f"重试次数={row['retries']:4}  回退次数={row['fallback_hits']:4}")


def main() -> None:
    print("=" * 80)
    print("AI 网关故障回退：错误注入（Error Injection）下的三供应商调用链")
    print("=" * 80)
    header = f"{'网关':12}  {'成功率':>7}         {'平均延迟':>12}  重试次数  回退次数"
    print(header)
    print("-" * len(header))
    for gw in ("LiteLLM", "Portkey", "Kong", "Cloudflare"):
        report(simulate_fallback(gw))

    print("\n说明：单供应商错误率为 3% 时，成功率为 97%。")
    print("双供应商回退的成功率为 99.94%，即 1 − 0.03 × 0.02。")
    print("三供应商回退的成功率为 99.997%。触发回退时，延迟会上升。")


if __name__ == "__main__":
    main()
