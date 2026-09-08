"""多智能体（Multi-agent）AI 站点可靠性工程（SRE）故障分诊模拟器，仅使用 Python 标准库。

三个专业智能体提出假设，监督者（Supervisor）按一致性排序。
对抗式评估（Adversarial Evaluation）中意见不一致时，上交人工处理。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class AgentHypothesis:
    agent: str
    root_cause: str
    confidence: float
    evidence: list[str]


def log_agent(incident: str) -> AgentHypothesis:
    # 模拟扫描日志，选择最常见的错误词元（Token）。英文根因是后续分组算法的输入，保留原值。
    if "checkout" in incident.lower():
        return AgentHypothesis(
            "LogAgent",
            "vLLM OOM from KV cache spike on /api/llm",  # /api/llm 的 KV 缓存突增导致 vLLM 内存不足（OOM）
            0.78,
            ["频率：每分钟 142 次错误", "模式：'kv_cache_allocation_failed'", "节点：pod-gpu-3"],
        )
    return AgentHypothesis("LogAgent", "unclear", 0.35, ["日志中未发现明显模式"])  # unclear：根因尚不明确


def metric_agent(incident: str) -> AgentHypothesis:
    # 模拟将 PromQL 查询结果与已知模式匹配。
    return AgentHypothesis(
        "MetricAgent",
        "GPU memory utilization hit 98% 4 minutes before error spike",  # 错误激增前 4 分钟，GPU 显存利用率达到 98%
        0.82,
        ["DCGM_FI_DEV_FB_USED >= 97% 持续 240 秒", "与错误开始时间的相关性：0.93"],
    )


def runbook_agent(incident: str) -> AgentHypothesis:
    # 模拟对操作手册（Runbook）仓库执行向量检索（Vector Search）。
    return AgentHypothesis(
        "RunbookAgent",
        "Matches runbook RB-017: KV cache OOM under burst concurrency",  # 匹配手册 RB-017：突发并发下 KV 缓存内存不足
        0.88,
        ["操作手册：RB-017", "上次使用：2026-01-14", "安全操作：重启 Pod，将 --gpu-memory-utilization 降至 0.85"],
    )


def supervisor(hypotheses: list[AgentHypothesis]) -> dict:
    # 按相似根因分组；多个智能体意见一致时，提高置信度（Confidence）。
    root_causes = {}
    for h in hypotheses:
        key = h.root_cause.split(" on ")[0].split(" hit ")[0][:30]
        root_causes.setdefault(key, []).append(h)

    ranked = sorted(root_causes.items(), key=lambda kv: -sum(h.confidence for h in kv[1]))
    top_key, top_agents = ranked[0]
    adversarial_agreement = len(top_agents) >= 2
    action = "重启 Pod，降低 --gpu-memory-utilization"  # 安全操作建议

    return {
        "top_root_cause": top_key,
        "supporting_agents": [h.agent for h in top_agents],
        "aggregated_confidence": sum(h.confidence for h in top_agents) / len(top_agents),
        "adversarial_agreement": adversarial_agreement,
        "proposed_action": action,
        "safety_gate": "需要人工批准" if not adversarial_agreement else "安全操作已自动批准",
    }


def main() -> None:
    print("=" * 80)
    print("AI SRE 故障分诊：多个智能体协同调查生产故障")
    print("=" * 80)
    incident = "High error rate in /checkout/generate-summary, last 6 min"  # 英文匹配样本：该端点最近 6 分钟错误率升高
    print(f"\n故障原始样本：{incident}\n")

    hypotheses = [log_agent(incident), metric_agent(incident), runbook_agent(incident)]
    for h in hypotheses:
        print(f"[{h.agent}] 置信度（Confidence）={h.confidence:.2f}")
        print(f"  根因匹配样本：{h.root_cause}")
        for e in h.evidence:
            print(f"  - {e}")
        print()

    decision = supervisor(hypotheses)
    print("-" * 80)
    print("监督者（Supervisor）")
    print("-" * 80)
    for k, v in decision.items():
        print(f"  {k}: {v}")

    print("\n说明：监督者只提出范围受限的安全操作建议。")
    print("涉及拓扑、代码或身份与访问管理（IAM）等大范围变更时，始终上交人工指挥者。")


if __name__ == "__main__":
    main()
