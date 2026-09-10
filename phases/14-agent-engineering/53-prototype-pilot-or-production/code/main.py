"""根据是否需要真实用户或数据、后果、可逆性和运营就绪度，给出构建阶段建议。

prototype/pilot/production 分别表示原型、试点、生产阶段。控制项为已有回归测试使用的标签，
保留英文并逐项加注中文；学习问题可直接翻译。

译注：这只是对输入布尔值与风险分数执行的一组启发式规则，不审计真实运营就绪度，
也不验证控制措施已落实。尤其高后果或不可逆行为被归为 pilot，不意味着这种试点已获授权
或本身安全；实际执行仍需要明确权限和可接受的风险边界。
"""

# 课程示例：为原型、试点或生产阶段选择控制要求。
# 课程正文：phases/14-agent-engineering/53-prototype-pilot-or-production/docs/en.md
# 参考原文：Boehm, A Spiral Model of Software Development and Enhancement, 1988.
# 参考原文：Fagerholm et al., Building Blocks for Continuous Experimentation, 2014.
# 运行本文件可生成 outputs/stage-decisions.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class BuildDecision:
    unknown: str
    real_users_required: bool
    real_data_required: bool
    consequence: int
    reversible: bool
    operational_readiness: bool


def choose_stage(decision: BuildDecision) -> str:
    if not 1 <= decision.consequence <= 5:
        # 后果等级必须在 1 到 5 之间。
        raise ValueError("consequence must be from one to five")
    if not decision.real_users_required and not decision.real_data_required:
        return "prototype"
    if not decision.operational_readiness or decision.consequence >= 4 or not decision.reversible:
        return "pilot"
    return "production"


def required_controls(stage: str) -> list[str]:
    controls = {
        # 原型控制：使用合成或录制的输入。
        # 原型控制：实现可以丢弃。
        # 原型控制：明确要回答的学习问题。
        "prototype": ["synthetic or recorded inputs", "discardable implementation", "learning question"],
        # 试点控制：限制参与人群。
        # 控制要求：可回滚。
        # 试点控制：明确人工负责人。
        # 试点控制：保留审计记录。
        # 试点控制：明确退出条件。
        "pilot": ["limited audience", "rollback", "human owner", "audit trail", "exit criteria"],
        "production": [
            # 生产控制：服务等级目标。
            "service level objective",
            # 生产控制：值班负责人。
            "on-call owner",
            # 生产控制：安全审查。
            "security review",
            # 生产控制：成本与容量控制。
            "cost and capacity controls",
            # 控制要求：可回滚。
            "rollback",
            # 生产控制：恢复能力。
            "recovery",
            # 生产控制：持续监控。
            "continuous monitoring",
            # 生产控制：退役路径。
            "retirement path",
        ],
    }
    if stage not in controls:
        # 未知的构建阶段。
        raise ValueError("unknown stage")
    return controls[stage]


def plan(decision: BuildDecision) -> dict:
    stage = choose_stage(decision)
    return {"stage": stage, "decision": asdict(decision), "required_controls": required_controls(stage)}


def examples() -> list[BuildDecision]:
    return [
        BuildDecision("能否从告警识别对应服务？", False, False, 2, True, False),
        BuildDecision("工程师是否会信任建议？", True, True, 4, True, False),
        BuildDecision("工作流能否满足其服务等级目标（SLO）？", True, True, 2, True, True),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "stage-decisions.json"
    output.write_text(json.dumps([plan(item) for item in examples()], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
