"""失败模式：MAST 分类器、熔断器和重试放大模拟。

仅使用 Python 标准库。下游初始错误率设为 10%，随后按累计调用数增加错误率。
对比有无熔断器时的调用数、成功请求数和短路请求数。

译注：每个请求最多尝试四次，因此总调用量最多为请求数的四倍，不能产生原文
所称的十倍放大。load 来自累计调用数，不是实时并发负载，也不会随请求结束降低。
紧密循环通常来不及等待冷却，默认演示不充分覆盖半开恢复。MAST 百分比及
STRATUS 的倍数沿用原文说明，不是此模拟测得或本轮重新核验的统计结论。
"""
from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from enum import Enum


# ---------- MAST 分类器 ----------

MAST_CATEGORIES = {
    "spec": "规格问题（原文占比：41.77%）",
    "coord": "协调失败（原文占比：36.94%）",
    "verify": "验证缺口（原文占比：21.30%）",
}

GROUPTHINK = {
    "monoculture": "同质化坍缩（相同基础模型 -> 相关错误）",
    "conformity": "从众偏差（智能体跟随最强势的同伴）",
    "tom": "心智建模不足（无法建立对其他智能体的预期）",
    "mixed_motive": "混合动机偏移（折中结果不能满足任何一方）",
    "cascade": "可靠性级联失效（重试风暴）",
}


def categorize_incident(symptoms: dict) -> tuple[str, str]:
    if symptoms.get("role_conflict") or symptoms.get("task_ambiguity"):
        return "spec", MAST_CATEGORIES["spec"]
    if symptoms.get("state_drift") or symptoms.get("message_lost") or symptoms.get("sync_error"):
        return "coord", MAST_CATEGORIES["coord"]
    if symptoms.get("no_verifier") or symptoms.get("hallucination_propagation"):
        return "verify", MAST_CATEGORIES["verify"]
    return "unknown", "未匹配到 MAST 类别"


def detect_groupthink(symptoms: dict) -> list[tuple[str, str]]:
    hits = []
    if symptoms.get("correlated_errors"):
        hits.append(("monoculture", GROUPTHINK["monoculture"]))
    if symptoms.get("agreement_rate_spike"):
        hits.append(("conformity", GROUPTHINK["conformity"]))
    if symptoms.get("coordination_drop_long_horizon"):
        hits.append(("tom", GROUPTHINK["tom"]))
    if symptoms.get("compromise_outputs"):
        hits.append(("mixed_motive", GROUPTHINK["mixed_motive"]))
    if symptoms.get("retry_amplification"):
        hits.append(("cascade", GROUPTHINK["cascade"]))
    return hits


# ---------- 熔断器 ----------

class BreakerState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    failure_threshold: float = 0.5
    window_size: int = 20
    open_cooldown_s: float = 0.5
    state: BreakerState = BreakerState.CLOSED
    outcomes: list[bool] = field(default_factory=list)
    opened_at: float = 0.0

    def _error_rate(self) -> float:
        if not self.outcomes:
            return 0.0
        recent = self.outcomes[-self.window_size:]
        return 1.0 - (sum(recent) / len(recent))

    def allow(self) -> bool:
        if self.state == BreakerState.OPEN:
            if time.monotonic() - self.opened_at >= self.open_cooldown_s:
                self.state = BreakerState.HALF_OPEN
            else:
                return False
        return True

    def record(self, success: bool) -> None:
        self.outcomes.append(success)
        if self.state == BreakerState.HALF_OPEN:
            if success:
                self.state = BreakerState.CLOSED
            else:
                self.state = BreakerState.OPEN
                self.opened_at = time.monotonic()
        elif self.state == BreakerState.CLOSED:
            if self._error_rate() > self.failure_threshold and len(self.outcomes) >= self.window_size:
                self.state = BreakerState.OPEN
                self.opened_at = time.monotonic()


# ---------- 重试放大模拟 ----------

@dataclass
class DownstreamService:
    base_failure_rate: float = 0.1
    load: int = 0

    def handle(self, rng: random.Random) -> bool:
        # 设定的负载代理值增加 -> 失败率上升（简化退化模型）
        effective_rate = self.base_failure_rate + (self.load * 0.02)
        effective_rate = min(effective_rate, 0.99)
        return rng.random() > effective_rate


def simulate_retry_storm(requests: int, use_breaker: bool, seed: int = 0) -> tuple[int, int, int]:
    rng = random.Random(seed)
    service = DownstreamService()
    breaker = CircuitBreaker()
    total_calls = 0
    successes = 0
    short_circuits = 0

    for _ in range(requests):
        attempts_for_req = 0
        while attempts_for_req < 4:
            if use_breaker and not breaker.allow():
                short_circuits += 1
                break
            service.load = min(total_calls // 10, 50)
            total_calls += 1
            ok = service.handle(rng)
            if use_breaker:
                breaker.record(ok)
            if ok:
                successes += 1
                break
            attempts_for_req += 1
    return total_calls, successes, short_circuits


def demo_incident_categorization() -> None:
    print("=" * 72)
    print("事件分类——将症状映射到 MAST 与群体思维问题类别")
    print("=" * 72)
    incidents = [
        {"role_conflict": True, "name": "两个智能体都在审阅，角色冲突"},
        {"state_drift": True, "name": "智能体 A 认为已完成，智能体 B 仍在运行"},
        {"no_verifier": True, "hallucination_propagation": True, "name": "错误事实在智能体之间传播"},
        {"correlated_errors": True, "agreement_rate_spike": True, "name": "三个智能体给出同一个错误答案"},
        {"retry_amplification": True, "name": "支付重试引发库存侧级联请求"},
    ]
    for inc in incidents:
        name = inc.pop("name")
        cat, desc = categorize_incident(inc)
        gt = detect_groupthink(inc)
        print(f"\n  事件：{name}")
        print(f"    MAST:       {cat} — {desc}")
        if gt:
            for code, d in gt:
                print(f"    群体思维问题：{code} — {d}")


def demo_retry_storm() -> None:
    print("\n" + "=" * 72)
    print("重试放大——200 个请求，服务初始失败率 10%，随后随累计调用上升")
    print("=" * 72)
    total_no_cb, succ_no_cb, _ = simulate_retry_storm(200, use_breaker=False, seed=0)
    total_cb, succ_cb, sc = simulate_retry_storm(200, use_breaker=True, seed=0)
    print(f"  无熔断器：总调用数={total_no_cb:4d}  成功请求数={succ_no_cb:4d}")
    print(f"  有熔断器：总调用数={total_cb:4d}  成功请求数={succ_cb:4d}  短路请求数={sc}")
    print("  满足窗口样本量且错误率超过阈值后，熔断器拒绝继续调用，")
    print("  限制本例的请求放大；成功数可能降低，但不能仅凭模拟断言真实下游一定存活。")


def main() -> None:
    demo_incident_categorization()
    demo_retry_storm()
    print("\n要点：")
    print("  MAST 类别帮助描述失败，但给问题命名并不等于已经修复。")
    print("  熔断器可用于限制级联调用；还需验证恢复路径、容量及重试策略。")
    print("  原文声称 STRATUS 风格检测、诊断与验证可提高缓解成功率至 1.5 倍；本例未复现。")
    print("  可监测一致率、重试率等慢性失效信号；是否能提前发现问题仍需实际验证。")


if __name__ == "__main__":
    main()
