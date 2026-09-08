"""托管大语言模型（Managed LLM）平台对比器，仅使用 Python 标准库。

使用同一组合成工作负载，对比 Bedrock 按需服务、Azure 预配吞吐量单元（PTU）
和 Vertex 按需服务，报告每日成本、首词元延迟（TTFT）的中位数与 P99，以及
成本归因精度。本例用于教学，价格与延迟采用 2026 年公开资料的近似值。
"""

from __future__ import annotations

from dataclasses import dataclass
import random
import statistics


@dataclass
class Platform:
    name: str
    per_mtok_input: float        # 按需输入价格：美元/百万词元（Token）
    per_mtok_output: float       # 按需输出价格：美元/百万词元
    ptu_hourly: float | None     # 单个预留单元的每小时价格；None 表示不提供
    ptu_tokens_per_hour: int     # 单个 PTU 每小时可处理的词元数
    ttft_median_ms: float        # 共享容量下的 TTFT 中位数
    ttft_p99_ms: float           # 共享容量下的 TTFT P99
    ttft_median_ptu_ms: float    # 专用 PTU 下的 TTFT 中位数
    attribution: str             # 云财务管理（FinOps）能力的定性评级


PLATFORMS = [
    Platform("Bedrock 按需服务",    3.00, 15.00, 21.0, 1_200_000, 75, 180, 55, "A：应用推理配置文件（Application Inference Profiles）"),
    Platform("Azure OpenAI (PTU)",    2.50, 10.00, 10.0, 2_000_000, 50, 140, 38, "B：作用域（Scope）+ 标签（Tag）+ PTU 对象"),
    Platform("Vertex AI Gemini",     1.25,  5.00, None,          0, 60, 160,  0, "B+：BigQuery 账单导出"),
]


def simulate(tokens_in_per_day: int, tokens_out_per_day: int, sla_ttft_ms: float, use_ptu: bool) -> None:
    print(f"\n工作负载：每日输入 {tokens_in_per_day/1e6:.1f} 百万词元，输出 {tokens_out_per_day/1e6:.1f} 百万词元")
    print(f"服务等级协议（SLA）：TTFT P99 < {sla_ttft_ms:.0f} ms   |   PTU 路径：{'启用' if use_ptu else '关闭'}\n")
    header = f"{'平台':25}  {'美元/日':>9}  {'TTFT P50':>10}  {'TTFT P99':>10}  {'SLA':>6}  成本归因"
    print(header)
    print("-" * len(header))

    for p in PLATFORMS:
        cost_ondemand = (tokens_in_per_day / 1e6) * p.per_mtok_input + \
                        (tokens_out_per_day / 1e6) * p.per_mtok_output

        if use_ptu and p.ptu_hourly is not None:
            total_tokens = tokens_in_per_day + tokens_out_per_day
            daily_capacity_per_ptu = p.ptu_tokens_per_hour * 24
            ptu_count = max(1, (total_tokens + daily_capacity_per_ptu - 1) // daily_capacity_per_ptu)
            cost_ptu = ptu_count * p.ptu_hourly * 24
            cost = min(cost_ondemand, cost_ptu)
            ttft_p50 = p.ttft_median_ptu_ms if cost == cost_ptu else p.ttft_median_ms
            ttft_p99 = ttft_p50 * 1.5 if cost == cost_ptu else p.ttft_p99_ms
            path = "PTU" if cost == cost_ptu else "按需（On-demand）"
        else:
            cost = cost_ondemand
            ttft_p50 = p.ttft_median_ms
            ttft_p99 = p.ttft_p99_ms
            path = "按需（On-demand）"

        sla_ok = "通过" if ttft_p99 < sla_ttft_ms else "未通过"
        print(f"{p.name:25}  ${cost:8.2f}  {ttft_p50:7.0f} ms  {ttft_p99:7.0f} ms  {sla_ok:>6}  {p.attribution}  [{path}]")


def break_even_demo() -> None:
    print("\n" + "=" * 80)
    print("PTU 盈亏平衡（Break-even）扫描：Azure OpenAI，GPT-4o 级模型")
    print("=" * 80)
    p = PLATFORMS[1]  # Azure 平台
    print(f"按需价格：{p.per_mtok_output:.2f} 美元/百万输出词元  |  PTU：{p.ptu_hourly:.0f} 美元/小时，{p.ptu_tokens_per_hour/1e6:.1f} 百万词元/小时\n")
    print(f"{'利用率 %':>8}  {'按需成本（美元/日）':>18}  {'PTU 成本（美元/日）':>12}  成本更低的方案")
    for util_pct in (10, 20, 30, 40, 50, 60, 70, 80, 90, 100):
        tokens_per_day = int(p.ptu_tokens_per_hour * 24 * (util_pct / 100.0))
        ondemand = (tokens_per_day / 1e6) * p.per_mtok_output
        ptu = 24 * p.ptu_hourly
        winner = "PTU" if ptu < ondemand else "按需（On-demand）"
        print(f"{util_pct:>7}%  ${ondemand:>16.2f}  ${ptu:>10.2f}  {winner}")


def lock_in_cost() -> None:
    print("\n" + "=" * 80)
    print("至少接入两家供应商：冗余（Redundancy）带来的额外成本")
    print("=" * 80)
    tokens_per_day = 5_000_000
    primary_cost = (tokens_per_day / 1e6) * 10.00
    gateway_overhead_pct = 3.0
    failover_headroom_pct = 10.0
    uplift = primary_cost * (gateway_overhead_pct + failover_headroom_pct) / 100
    print(f"主供应商每日支出：{primary_cost:.2f} 美元")
    print(f"网关（Gateway）开销（{gateway_overhead_pct:.0f}%）：{primary_cost * gateway_overhead_pct / 100:.2f} 美元/日")
    print(f"备用空闲容量（{failover_headroom_pct:.0f}%）：{primary_cost * failover_headroom_pct / 100:.2f} 美元/日")
    print(f"每日额外成本：{uplift:.2f} 美元")
    print(f"每月额外成本：{uplift * 30:.2f} 美元")
    print("没有冗余时，一次持续数小时的区域故障可能带来客户流失、SLA 赔付和应急协作耗时。")


def main() -> None:
    print("=" * 80)
    print("托管大语言模型（Managed LLM）平台对比器：2026 年近似数据")
    print("=" * 80)

    simulate(tokens_in_per_day=3_000_000, tokens_out_per_day=1_000_000, sla_ttft_ms=200, use_ptu=False)
    simulate(tokens_in_per_day=30_000_000, tokens_out_per_day=15_000_000, sla_ttft_ms=100, use_ptu=True)

    break_even_demo()
    lock_in_cost()


if __name__ == "__main__":
    main()
