"""梳理真实工作步骤，并记录观察来源、直接证据、置信度以及工作中的阻力点。

译注：本例仅校验传入记录的结构，不读取屏幕录制或事故材料，也不校准置信度。
grounded 表示顺序等检查通过且至少有一条 direct=True 的证据，不要求每一步都有直接证据。
owner lookup（查找负责人）和 context switching（切换上下文）保留为测试使用的阻力点标签；
证据来源标签及所有诊断原文保留。观察内容和角色动作则可直接中文化。
"""

# 课程示例：审计工作流的证据、顺序、置信度和阻力点。
# 课程正文：phases/14-agent-engineering/48-discover-the-real-workflow/docs/en.md
# 参考原文：Nuseibeh and Easterbrook, Requirements Engineering: A Roadmap.
# 参考原文：Gotel and Finkelstein, ICRE 1994, DOI 10.1109/ICRE.1994.292398.
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Evidence:
    source: str
    observation: str
    direct: bool
    confidence: float


@dataclass(frozen=True)
class WorkflowStep:
    order: int
    actor: str
    action: str
    evidence: tuple[Evidence, ...]
    friction: str = ""


def audit(steps: list[WorkflowStep]) -> dict:
    orders = [step.order for step in steps]
    issues: list[str] = []
    if orders != list(range(1, len(steps) + 1)):
        # 工作流步骤必须从 1 开始，按传入顺序连续编号。
        issues.append("workflow order must be contiguous from one")
    for step in steps:
        if not step.evidence:
            # 这一步没有证据。
            issues.append(f"step {step.order} has no evidence")
        for item in step.evidence:
            if not 0 <= item.confidence <= 1:
                # 这一步的置信度不在 0 到 1 之间。
                issues.append(f"step {step.order} has confidence outside zero to one")
    direct = sum(item.direct for step in steps for item in step.evidence)
    total = sum(len(step.evidence) for step in steps)
    return {
        "status": "grounded" if not issues and direct > 0 else "needs-evidence",
        "issues": issues,
        "direct_evidence_ratio": round(direct / total, 2) if total else 0,
        "friction_points": [step.friction for step in steps if step.friction],
        "steps": [asdict(step) for step in steps],
    }


def example() -> list[WorkflowStep]:
    return [
        WorkflowStep(1, "值班工程师", "打开告警", (Evidence("screen recording 01", "告警未注明服务负责人", True, 0.95),), "owner lookup"),
        WorkflowStep(2, "值班工程师", "搜索仪表板", (Evidence("incident 184", "打开了三个仪表板", True, 0.9),), "context switching"),
        WorkflowStep(3, "事故指挥者", "批准缓解措施", (Evidence("runbook", "生产环境写入操作需要批准", False, 0.8),)),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "workflow-evidence.json"
    output.write_text(json.dumps(audit(example()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
