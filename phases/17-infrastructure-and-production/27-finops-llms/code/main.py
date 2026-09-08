"""带分级管控的多租户（Multi-tenant）LLM 云财务管理（FinOps）模拟器，仅使用 Python 标准库。

三层管控：
  1. 按租户限流（Rate Limit）
  2. 按租户设置每日支出上限（Spend Cap）
  3. 支出的标准分数（Z-score）大于 4 时，触发紧急停止开关（Kill Switch）
"""

from __future__ import annotations

from dataclasses import dataclass, field
import random
import statistics


@dataclass
class TenantPolicy:
    contracted_daily_usd: float
    rate_limit_per_min: int
    spend_cap_multiplier: float = 2.0
    kill_z_score: float = 4.0


@dataclass
class TenantState:
    spend_today_usd: float = 0.0
    minute_count: int = 0
    daily_history: list = field(default_factory=list)
    paused: bool = False


TENANTS = {
    "tenant_A_normal":  (TenantPolicy(100.0, rate_limit_per_min=120), TenantState(), 1.0),
    "tenant_B_growing": (TenantPolicy(50.0,  rate_limit_per_min=60),  TenantState(), 2.5),
    "tenant_C_abusive": (TenantPolicy(20.0,  rate_limit_per_min=40),  TenantState(), 25.0),
}


def simulate_day(day: int, verbose: bool) -> None:
    for name, (policy, state, traffic_mult) in TENANTS.items():
        if state.paused:
            continue
        requests = int(100 * traffic_mult * random.uniform(0.8, 1.3))
        tokens_per_req = int(random.gauss(600, 150))
        cost_per_req = (tokens_per_req / 1e6) * 10.0
        total_spend = requests * cost_per_req
        state.spend_today_usd += total_spend

        if state.spend_today_usd > policy.contracted_daily_usd * policy.spend_cap_multiplier:
            if verbose:
                print(f"  [超过支出上限] {name}：{state.spend_today_usd:.2f} 美元 > 上限 {policy.contracted_daily_usd * policy.spend_cap_multiplier:.2f} 美元 → 收紧限流并通知客户成功团队（CS）")

        if len(state.daily_history) >= 5:
            mean = statistics.mean(state.daily_history)
            sd = statistics.stdev(state.daily_history) or 1
            z = (state.spend_today_usd - mean) / sd
            if z > policy.kill_z_score:
                state.paused = True
                if verbose:
                    print(f"  [紧急停止开关（KILL SWITCH）] {name}：z={z:.2f}，支出 {state.spend_today_usd:.2f} 美元，基线 {mean:.2f} ± {sd:.2f} 美元 → 自动暂停并呼叫值班人员（On-call）")


def main() -> None:
    print("=" * 95)
    print("FinOps 管控：模拟三个租户的十天支出，滥用租户触发紧急停止开关")
    print("=" * 95)
    random.seed(7)

    for day in range(1, 11):
        print(f"\n— 第 {day} 天 —")
        simulate_day(day, verbose=True)
        for name, (policy, state, _) in TENANTS.items():
            status = "已暂停" if state.paused else "运行中"
            print(f"  {name}：支出={state.spend_today_usd:7.2f} 美元，合同额度={policy.contracted_daily_usd:.2f} 美元  [{status}]")
            state.daily_history.append(state.spend_today_usd)
            if not state.paused:
                state.spend_today_usd = 0.0
    print("\n结果解读：速率限制用于节流，支出上限用于触发告警，紧急停止开关用于拦截支出失控。")


if __name__ == "__main__":
    main()
