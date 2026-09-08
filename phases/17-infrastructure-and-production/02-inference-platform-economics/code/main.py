"""推理平台（Inference Platform）经济性对比器，仅使用 Python 标准库。

在同一组合成工作负载下，对比 Fireworks、Together、Baseten、Modal、Replicate
和 Anyscale 六家供应商。将按词元、按分钟和按预测次数计费统一换算，便于直接比较。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Vendor:
    name: str
    model: str
    per_mtok_output: float | None   # 美元/百万输出词元（Token）；不用此计费方式时为 None
    per_minute: float | None        # 专用 GPU 的每分钟价格；无服务器（Serverless）模式为 None
    per_prediction: float | None    # 单次预测价格；按词元计费时为 None
    tokens_per_minute: int          # GPU 满载时每分钟实际处理的词元数
    cold_start_sec: float
    notes: str
    min_reserved_minutes_per_day: int = 0  # 按分钟计费的最低预留时长：预热池（Warm Pool）或最低承诺用量


VENDORS = [
    Vendor("Fireworks",    "Llama 70B",          0.90,  None,    None,  900_000, 1.5, "FireAttention，批处理（Batch）档位五折"),
    Vendor("Together",     "Llama 70B",          0.88,  None,    None,  850_000, 2.0, "200 多种模型，比 Replicate 低 50%–70%"),
    Vendor("Baseten",      "定制 Llama 70B",   None,  0.55,    None,  900_000, 5.0, "Truss，SOC2、HIPAA，按分钟计费", 1440),
    Vendor("Modal",        "定制 Llama 70B",   None,  0.48,    None,  800_000, 2.5, "Python 原生，按秒计费，预热池至少计费 60 分钟", 60),
    Vendor("Replicate",    "Llama 70B",          None,  None,    0.006, 750_000, 4.0, "按预测次数付费，多模态（Multimodal）"),
    Vendor("Anyscale",     "Llama 70B RayTurbo", None,  0.60,    None,  850_000, 3.0, "Ray 原生，分布式（Distributed）Python", 1440),
]


def cost_per_day(v: Vendor, tokens_per_day: int, predictions_per_day: int) -> float:
    """按供应商的计费方式计算实际每日成本，单位为美元。

    按分钟计费时，取满载服务时长与最低预留时长（预热池下限或预留量）中的较大值。
    这样 `run_scenario` 与 `utilization_breakeven` 使用同一计费模型，避免一处假设
    可完全缩容至零（Scale-to-zero），另一处却假设预留 24 小时。
    """
    if v.per_mtok_output is not None:
        return (tokens_per_day / 1e6) * v.per_mtok_output
    if v.per_minute is not None:
        saturated_minutes = tokens_per_day / v.tokens_per_minute
        minutes = max(saturated_minutes, v.min_reserved_minutes_per_day)
        return minutes * v.per_minute
    if v.per_prediction is not None:
        return predictions_per_day * v.per_prediction
    return 0.0


def effective_rate(v: Vendor, tokens_per_day: int, predictions_per_day: int) -> float:
    """统一换算成美元/百万词元，便于跨供应商比较。"""
    c = cost_per_day(v, tokens_per_day, predictions_per_day)
    return (c / (tokens_per_day / 1e6)) if tokens_per_day else 0


def run_scenario(label: str, tokens_per_day: int, predictions_per_day: int) -> None:
    print(f"\n{label}")
    print(f"工作负载：每日输出 {tokens_per_day/1e6:.1f} 百万词元  |  每日 {predictions_per_day} 次预测")
    header = f"{'供应商':12}  {'模型':22}  {'美元/日':>8}  {'美元/百万词元':>10}  备注"
    print(header)
    print("-" * len(header))
    for v in VENDORS:
        cost = cost_per_day(v, tokens_per_day, predictions_per_day)
        rate = effective_rate(v, tokens_per_day, predictions_per_day)
        print(f"{v.name:12}  {v.model:22}  ${cost:7.2f}  ${rate:9.2f}  {v.notes}")


def utilization_breakeven() -> None:
    print("\n" + "=" * 80)
    print("按词元与按分钟计费的盈亏平衡点（Break-even）：Fireworks 与 Baseten")
    print("=" * 80)
    fw = VENDORS[0]
    bt = VENDORS[2]
    print(f"Fireworks：{fw.per_mtok_output:.2f} 美元/百万输出词元  |  Baseten：{bt.per_minute:.2f} 美元/分钟，{bt.tokens_per_minute/1e3:.0f} 千词元/分钟\n")
    print(f"{'利用率 %':>8}  {'Fireworks 美元/日':>16}  {'Baseten 美元/日':>14}  成本更低的方案")
    for util_pct in (5, 10, 15, 20, 25, 30, 35, 40, 50, 75, 100):
        tokens_per_day = int(bt.tokens_per_minute * 60 * 24 * util_pct / 100)
        fw_cost = cost_per_day(fw, tokens_per_day, 0)
        bt_cost = cost_per_day(bt, tokens_per_day, 0)
        winner = "Baseten" if bt_cost < fw_cost else "Fireworks"
        print(f"{util_pct:>7}%  ${fw_cost:>15.2f}  ${bt_cost:>13.2f}  {winner}")


def cold_start_penalty() -> None:
    print("\n" + "=" * 80)
    print("突发工作负载下的冷启动（Cold Start）代价")
    print("=" * 80)
    print(f"{'供应商':12}  {'冷启动耗时':>11}  每日 100 次冷启动调用的影响")
    for v in VENDORS:
        impact_sec = v.cold_start_sec * 100
        print(f"{v.name:12}  {v.cold_start_sec:>8.1f} s   每日累计增加 {impact_sec:.0f} 秒延迟")


def main() -> None:
    print("=" * 80)
    print("推理平台经济性：2026 年近似数据")
    print("=" * 80)

    run_scenario("场景 A：初创规模的大语言模型（LLM）产品",
                 tokens_per_day=2_000_000, predictions_per_day=10_000)
    run_scenario("场景 B：大流量生产环境",
                 tokens_per_day=100_000_000, predictions_per_day=500_000)

    utilization_breakeven()
    cold_start_penalty()

    print("\n经验法则：按预留分钟计费时，GPU 利用率持续高于约 60%–70% 后，")
    print("按分钟付费（Baseten、Modal）比按词元付费更便宜；低于该水平时，按词元付费更划算。")


if __name__ == "__main__":
    main()
