"""分层费用控制器模拟器，仅使用 Python 标准库。

模拟智能体从第 30 轮开始陷入更高消耗的轮询循环，比较三种配置：不使用常规上限、
仅使用月度上限，以及单请求、轮数、会话费用、消费速率和月度预算共同组成的分层限制。
输出执行轮数、词元总量、模拟美元费用及停止原因。

译注：DOLLARS_PER_KTOK 按每千词元 0.003 美元计费，不是每词元价格；
它只是固定原文的演示假设，不是本轮核验的产品报价。所有情形还有 10,000 轮的
模拟上限。默认参数下累计费用不足 500 美元月度上限，消费速率也远低于 5 美元/分钟，
所以这两种控制不会按原结尾描述触发；分层配置首先由 200 轮上限停止。
月度限制只比较本次运行累计费用，没有真正的跨会话月度账本。停止原因标签保留原值。
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ---------- 模拟运行的消耗参数 ----------

NORMAL_TURN_TOKENS = 2_500
LOOP_TURN_TOKENS = 8_000
LOOP_STARTS_AT = 30

# 美元/千词元（输入输出混合演示价）；原文标为 2026 年中 Sonnet 级模型价格，未重新核验。
DOLLARS_PER_KTOK = 0.003


def turn_cost(turn: int) -> int:
    return LOOP_TURN_TOKENS if turn >= LOOP_STARTS_AT else NORMAL_TURN_TOKENS


# ---------- 费用控制器 ----------

@dataclass
class Governor:
    max_tokens_per_request: int = 10_000
    max_turns: int = 200
    max_budget_usd: float = 50.0
    velocity_usd_per_min: float = 5.0       # 滚动消费速率超过此值时停止
    velocity_window_min: float = 10.0
    monthly_cap_usd: float = 500.0

    enable_request_cap: bool = True
    enable_iter_cap: bool = True
    enable_velocity: bool = True
    enable_session_cap: bool = True
    enable_monthly_cap: bool = True

    # 模拟中每轮占用的秒数，用来计算消费速率
    seconds_per_turn: float = 30.0


@dataclass
class Run:
    turns: int = 0
    tokens: int = 0
    dollars: float = 0.0
    history: list[tuple[float, float]] = field(default_factory=list)  # （分钟时点，该时点累计美元费用）
    stopped_by: str = ""


EPSILON_MIN = 1e-9


def velocity_exceeded(run: Run, gov: Governor, now_min: float) -> bool:
    if not run.history:
        return False
    cutoff = now_min - gov.velocity_window_min
    window = [(t, d) for (t, d) in run.history if t >= cutoff]
    if not window:
        return False
    start_min, start_dollars = window[0]
    window_dollars = run.dollars - start_dollars
    # 使用窗口内实际经过的时间，而不是名义上的完整窗口宽度。
    # 在预热阶段（now_min < velocity_window_min），这样可以避免
    # 因分母过大而低估消费速率。
    elapsed = max(now_min - start_min, EPSILON_MIN)
    rate = window_dollars / elapsed
    return rate > gov.velocity_usd_per_min


def simulate(gov: Governor, label: str) -> Run:
    run = Run()
    now_min = 0.0

    for turn in range(1, 10_001):
        tok = turn_cost(turn)
        if gov.enable_request_cap and tok > gov.max_tokens_per_request:
            tok = gov.max_tokens_per_request
        run.turns = turn
        run.tokens += tok
        run.dollars += (tok / 1000.0) * DOLLARS_PER_KTOK
        now_min += gov.seconds_per_turn / 60.0
        run.history.append((now_min, run.dollars))

        if gov.enable_iter_cap and turn >= gov.max_turns:
            run.stopped_by = "max_turns"
            break
        if gov.enable_session_cap and run.dollars >= gov.max_budget_usd:
            run.stopped_by = "max_budget_usd"
            break
        if gov.enable_velocity and velocity_exceeded(run, gov, now_min):
            run.stopped_by = "velocity_limit"
            break
        if gov.enable_monthly_cap and run.dollars >= gov.monthly_cap_usd:
            run.stopped_by = "monthly_cap"
            break

    if not run.stopped_by:
        # 停止原因：达到内置模拟轮数上限；保留原始状态文本。
        run.stopped_by = "ran out of simulated turns"

    print(f"  {label:<24}  轮数={run.turns:>5}  词元={run.tokens:>8,}  "
          f"费用=${run.dollars:>7.2f}  停止原因={run.stopped_by}")
    return run


def main() -> None:
    print("=" * 85)
    print("分层费用控制器（阶段 15，第 13 课）")
    print("=" * 85)
    print()
    print("智能体从第 30 轮开始进入轮询循环。")
    print("-" * 85)

    # 1. 不启用常规费用限制
    g = Governor(
        enable_request_cap=False,
        enable_iter_cap=False,
        enable_velocity=False,
        enable_session_cap=False,
        enable_monthly_cap=False,
    )
    # 为使模拟能够结束，仍启用较大的轮数上限；所以并非真正无限运行。
    g.max_turns = 10_000
    g.enable_iter_cap = True
    simulate(g, "无常规限制（模拟 1 万轮）")

    # 2. 仅启用月度上限
    g = Governor(
        enable_request_cap=False,
        enable_iter_cap=False,
        enable_velocity=False,
        enable_session_cap=False,
        enable_monthly_cap=True,
    )
    simulate(g, "仅月度上限")

    # 3. 启用分层限制
    g = Governor()
    simulate(g, "分层限制")

    print()
    print("=" * 85)
    print("要点：不同故障发生在不同时间尺度，需要分层限制")
    print("-" * 85)
    print("  月度上限通常较粗；本例默认的 500 美元阈值在模拟结束前不会触发。")
    print("  消费速率限制可识别突增，但本例默认速率达不到每分钟 5 美元。")
    print("  轮数上限限制单次运行的步数；默认分层配置首先触发这一项。")
    print("  单请求上限在模拟中截断本轮词元数量。")
    print("  会话美元上限（max_budget_usd）限制单次会话累计费用。")
    print("  各层针对不同风险，如循环、持续消耗、突增或上线后的费用变化。")


if __name__ == "__main__":
    main()
