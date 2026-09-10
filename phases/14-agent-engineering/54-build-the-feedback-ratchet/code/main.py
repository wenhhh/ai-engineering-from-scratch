"""把反馈分类到评测、策略、上下文、运行时或待办，并记录负责人、持久产物与验证要求。

分类依赖英文关键词，因此 observation 保留英文并加中文解释；来源、负责人、目标类别
和产物路径也保留。改进说明、验证要求和退役提示可中文化，不改变优先级与路由。

译注：这里只生成待办记录，不执行改进、写入对应产物、采集验证证据或追踪退役日期。
相同反馈不会自动去重；expires_after_days 仅用于说明文字，没有正值或到期校验。
"""

# 课程示例：将反馈转化为有负责人和验证证据的系统改进。
# 课程正文：phases/14-agent-engineering/54-build-the-feedback-ratchet/docs/en.md
# 参考原文：Basili, Caldiera, and Rombach, The Goal Question Metric Approach.
# 参考原文：Fagerholm et al., Building Blocks for Continuous Experimentation, 2014.
# 运行本文件可生成 outputs/feedback-backlog.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Signal:
    source: str
    observation: str
    severity: int
    frequency: int
    owner: str
    expires_after_days: int


@dataclass(frozen=True)
class RatchetAction:
    priority: int
    destination: str
    change: str
    owner: str
    durable_artifact: str
    verification_evidence: str
    retirement_check: str


def destination(signal: Signal) -> str:
    text = signal.observation.lower()
    if any(word in text for word in ("regression", "wrong result", "false positive")):
        return "evaluation"
    if any(word in text for word in ("permission", "unsafe", "production write")):
        return "policy"
    if any(word in text for word in ("missing context", "could not find", "duplicate")):
        return "context"
    if any(word in text for word in ("timeout", "retry", "unavailable")):
        return "runtime"
    return "backlog"


def promote(signal: Signal) -> RatchetAction:
    if signal.severity not in range(1, 6) or signal.frequency < 1:
        # 严重程度须为 1 到 5，发生频次须为正。
        raise ValueError("severity must be one to five and frequency positive")
    target = destination(signal)
    priority = signal.severity * signal.frequency
    durable_artifact = {
        "evaluation": "evaluations/regression-suite.json",
        "policy": "policies/authority-boundaries.json",
        "context": "context/retrieval-guidance.md",
        "runtime": "runtime/reliability-controls.json",
        "backlog": "backlog/shaped-work.json",
    }[target]
    verification_evidence = {
        "evaluation": "记录一次通过的回归评测",
        "policy": "记录一次通过的权限边界场景验证",
        "context": "记录一次包含所需上下文的回放",
        "runtime": "记录一次在预算内完成的超时与重试场景验证",
        "backlog": "记录依据效果定义进行的审查",
    }[target]
    return RatchetAction(
        priority,
        target,
        f"防止以下问题再次发生：{signal.observation}",
        signal.owner,
        durable_artifact,
        verification_evidence,
        f"连续 {signal.expires_after_days} 天未复发后移除或修订",
    )


def backlog(signals: list[Signal]) -> list[RatchetAction]:
    actions = [promote(signal) for signal in signals]
    return sorted(actions, key=lambda item: (-item.priority, item.destination, item.change))


def example() -> list[Signal]:
    return [
        # 反馈：上下文缺失导致重复查找服务；保留英文以匹配 context 路由。
        Signal("incident 184", "missing context caused duplicate service lookup", 4, 3, "platform", 90),
        # 反馈：曾尝试向生产环境写入；保留英文以匹配 policy 路由。
        Signal("pilot audit", "production write was attempted", 5, 1, "security", 180),
        # 反馈：对过期部署产生误报；保留英文以匹配 evaluation 路由。
        Signal("evaluation run", "false positive on a stale deployment", 3, 4, "evaluation", 60),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "feedback-backlog.json"
    output.write_text(json.dumps([asdict(item) for item in backlog(example())], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
