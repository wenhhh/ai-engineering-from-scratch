"""带安全平面（Safety Plane）关卡的混沌工程（Chaos Engineering）执行器，仅使用 Python 标准库。

运行三项大语言模型（LLM）专用实验，以错误预算消耗速率（Burn Rate）和影响范围（Blast Radius）设置安全关卡。
"""

from __future__ import annotations

from dataclasses import dataclass


ERROR_BUDGET_PER_DAY = 0.001   # 服务等级目标（SLO）为 99.9%
EXPECTED_ERROR_RATE = 0.0005


@dataclass
class Experiment:
    name: str
    duration_min: int
    induced_error_rate: float
    blast_radius_pct: float


EXPERIMENTS = [
    Experiment("终止 Pod，涉及 1 个解码副本",     5, 0.002, 0.05),
    Experiment("供应商返回 429 后回退（Fallback）",           5, 0.015, 0.30),
    Experiment("畸形提示词使分词器（Tokenizer）停滞",3, 0.040, 0.10),
]


def run_experiment(e: Experiment) -> dict:
    burn_rate = e.induced_error_rate / max(EXPECTED_ERROR_RATE, 0.0001)
    paused = burn_rate > 2.0 and e.blast_radius_pct > 0.2
    return {
        "experiment": e.name,
        "duration": e.duration_min,
        "error_rate": e.induced_error_rate,
        "burn_rate_x": burn_rate,
        "blast_radius": e.blast_radius_pct,
        "paused_by_safety_plane": paused,
        "status": "已中止：消耗速率保护触发" if paused else "已完成",
    }


def main() -> None:
    print("=" * 90)
    print("混沌实验执行器：安全平面联合检查消耗速率与影响范围")
    print("=" * 90)
    print(f"SLO 错误预算（Error Budget）：每日 {ERROR_BUDGET_PER_DAY*100:.2f}%")
    print(f"预期基线错误率：{EXPECTED_ERROR_RATE*100:.3f}%")
    print(f"消耗速率关卡：超过预期的 2.0 倍，并且影响范围超过 20%\n")

    header = f"{'实验':38}  {'分钟':>4}  {'错误率 %':>6}  {'消耗倍数':>6}  {'影响范围':>6}  状态"
    print(header)
    print("-" * len(header))
    for e in EXPERIMENTS:
        r = run_experiment(e)
        print(f"{r['experiment']:38}  {r['duration']:>4}  "
              f"{r['error_rate']*100:>5.2f}%  "
              f"{r['burn_rate_x']:>5.1f}x  "
              f"{r['blast_radius']*100:>5.0f}%  "
              f"{r['status']}")

    print("\n结果解读：影响范围较小的实验，即使消耗速率很高，也可以运行至完成。")
    print("影响范围大且消耗速率高时则中止。实验期间需要告警抑制窗口（Suppression Window）")
    print("与轨迹 ID（Trace ID）标签，对告警去重。")


if __name__ == "__main__":
    main()
