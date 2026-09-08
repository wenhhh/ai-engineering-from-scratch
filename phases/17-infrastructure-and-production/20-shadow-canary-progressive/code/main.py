"""金丝雀发布（Canary Rollout）模拟器，仅使用 Python 标准库。

逐步增加候选版本的流量占比，每一步检查五道关卡（Gate）。
任一关卡超限即停止发布，支持注入性能退化（Regression）。
"""

from __future__ import annotations

from dataclasses import dataclass
import random


STAGES = [0.01, 0.10, 0.25, 0.50, 0.75, 1.00]

BASELINE = {
    "latency_p99_ms": 900,
    "cost_per_req": 0.02,
    "error_rate": 0.02,
    "output_len_p99": 450,
    "thumbs_down_rate": 0.03,
}

GATES = {
    "latency_p99_ms": 1.5,
    "cost_per_req": 1.2,
    "error_rate": 2.0,
    "output_len_p99": 1.4,
    "thumbs_down_rate": 1.5,
}


@dataclass
class Regression:
    latency_mult: float = 1.0
    cost_mult: float = 1.0
    error_mult: float = 1.0
    output_len_mult: float = 1.0
    thumbs_down_mult: float = 1.0


def measure_stage(stage: float, reg: Regression, seed: int) -> dict:
    rng = random.Random(seed)
    noise = lambda v: v * rng.uniform(0.92, 1.08)
    return {
        "latency_p99_ms": noise(BASELINE["latency_p99_ms"] * reg.latency_mult),
        "cost_per_req": noise(BASELINE["cost_per_req"] * reg.cost_mult),
        "error_rate": noise(BASELINE["error_rate"] * reg.error_mult),
        "output_len_p99": noise(BASELINE["output_len_p99"] * reg.output_len_mult),
        "thumbs_down_rate": noise(BASELINE["thumbs_down_rate"] * reg.thumbs_down_mult),
    }


def check_gates(metrics: dict) -> list[str]:
    breaches = []
    for k, mult in GATES.items():
        if metrics[k] > BASELINE[k] * mult:
            breaches.append(k)
    return breaches


def rollout(name: str, reg: Regression) -> None:
    print(f"\n{name}")
    print(f"退化倍数：延迟={reg.latency_mult}，成本={reg.cost_mult}，错误率={reg.error_mult}，输出长度={reg.output_len_mult}，负反馈率={reg.thumbs_down_mult}")
    for i, stage in enumerate(STAGES):
        metrics = measure_stage(stage, reg, seed=stage_seed(i))
        breaches = check_gates(metrics)
        status = "通过" if not breaches else f"停止发布（超限字段：{','.join(breaches)}）"
        pct = int(stage * 100)
        print(f"  流量阶段 {pct:3}%  "
              f"P99 延迟={metrics['latency_p99_ms']:5.0f}  "
              f"成本={metrics['cost_per_req']:.4f} 美元  "
              f"错误率={metrics['error_rate']*100:4.1f}%  "
              f"负反馈率={metrics['thumbs_down_rate']*100:4.1f}%  "
              f"{status}")
        if breaches:
            print(f"  → 回滚（Rollback）：切换策略，将固定模型版本恢复为基线")
            return
    print("  → 发布成功，流量提升至 100%")


def stage_seed(i: int) -> int:
    return 11 + i * 3


def main() -> None:
    print("=" * 95)
    print("金丝雀发布（Canary Rollout）：六个阶段、五道关卡、注入性能退化")
    print("=" * 95)

    rollout("无退化的正常发布", Regression())
    rollout("成本小幅上升 10%，未超过关卡阈值", Regression(cost_mult=1.10))
    rollout("成本上升 25%", Regression(cost_mult=1.25))
    rollout("延迟上升 80%", Regression(latency_mult=1.80))
    rollout("负反馈率上升 60%", Regression(thumbs_down_mult=1.60))
    rollout("质量悄然下降，成本逐渐上升", Regression(cost_mult=1.15, thumbs_down_mult=1.45))


if __name__ == "__main__":
    main()
