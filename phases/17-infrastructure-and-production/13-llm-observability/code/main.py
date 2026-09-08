"""可观测性（Observability）采样与成本模拟器，仅使用 Python 标准库。

模拟每天 100 万条调用轨迹（Trace）在不同保留策略下的结果，报告存储成本与丢失的数据。
本例用于教学，成本采用 2026 年近似值。
"""

from __future__ import annotations

from dataclasses import dataclass
import random


BYTES_PER_TRACE = 4_500            # 提示词（Prompt）+ 响应 + 元数据（Metadata）
COST_PER_GB_MONTH = 0.023          # S3 标准存储
OBSERVABILITY_INGEST_PER_GB = 0.50 # 例如 Datadog 级别的平台
ARIZE_AX_PER_GB = 0.005            # 零拷贝（Zero-copy）方案的宣称价格


@dataclass
class Strategy:
    name: str
    sample_rate: float
    keep_errors: bool
    keep_highcost: bool


STRATEGIES = [
    Strategy("保留 100%",                1.00, True, True),
    Strategy("随机采样 10%",          0.10, False, False),
    Strategy("5% 成功轨迹 + 全部错误",   0.05, True, False),
    Strategy("5% 成功轨迹 + 错误 + 高成本轨迹",  0.05, True, True),
    Strategy("仅 1% 聚合数据",         0.01, True, True),
]


def simulate_day(strategy: Strategy, traces_per_day: int = 1_000_000) -> dict:
    rng = random.Random(7)
    retained = 0
    lost = 0
    for i in range(traces_per_day):
        is_error = rng.random() < 0.02
        is_highcost = rng.random() < 0.01
        keep = rng.random() < strategy.sample_rate
        if strategy.keep_errors and is_error:
            keep = True
        if strategy.keep_highcost and is_highcost:
            keep = True
        if keep:
            retained += 1
        else:
            lost += 1
    bytes_retained = retained * BYTES_PER_TRACE
    gb = bytes_retained / 1e9
    return {
        "name": strategy.name,
        "retained": retained,
        "lost": lost,
        "gb_per_day": gb,
        "s3_month": gb * 30 * COST_PER_GB_MONTH,
        "monolithic_month": gb * 30 * OBSERVABILITY_INGEST_PER_GB,
        "arize_month": gb * 30 * ARIZE_AX_PER_GB,
    }


def report(row: dict) -> None:
    print(f"{row['name']:30}  保留={row['retained']:7}  "
          f"丢失={row['lost']:7}  {row['gb_per_day']:6.2f} GB/日  "
          f"一体化平台月费={row['monolithic_month']:8.2f} 美元  "
          f"Arize 月费={row['arize_month']:6.2f} 美元  "
          f"S3 月费={row['s3_month']:5.2f} 美元")


def main() -> None:
    print("=" * 120)
    print("可观测性采样：每天 100 万条轨迹，采用 2026 年近似价格")
    print("=" * 120)
    for s in STRATEGIES:
        report(simulate_day(s))

    print()
    print("结果解读：在 Datadog 级平台上保留全部轨迹，每天花费数百美元。")
    print("保留 5% 成功轨迹、全部错误及高成本轨迹，可以留住关键信号，将账单降低 90%。")
    print("如果已有数据湖（Data Lake），Arize AX 的零拷贝（Zero-copy）模式在大规模场景下更有优势。")


if __name__ == "__main__":
    main()
