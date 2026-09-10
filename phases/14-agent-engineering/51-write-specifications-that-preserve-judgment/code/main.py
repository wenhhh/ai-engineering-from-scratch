"""规格既约束不可违背的要求，也保留智能体可以自行判断的空间。

locked 表示固定决策，bounded 表示在明确边界内选择，delegated 表示交由智能体判断。
编译结果分别列出人工检查点、有边界决策和可自主决策；模式值与诊断字符串保持原样。

译注：compile_contract 仅整理数据并检查字段，不执行证明、不强制权限，也不调用智能体。
状态 executable 表示这组结构检查通过，不表示规格已能自动执行或生产安全。
有边界决策的示例问句和界限受到精确断言约束，中文含义写在旁注中。
"""

# 课程示例：将规格整理为明确的决策边界。
# 课程正文：phases/14-agent-engineering/51-write-specifications-that-preserve-judgment/docs/en.md
# 参考原文：Zave and Jackson, Four Dark Corners of Requirements Engineering, 1997.
# 参考原文：Gotel and Finkelstein, Requirements Traceability, IEEE ICRE 1994.
# 运行本文件可生成 outputs/executable-specification.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Decision:
    question: str
    mode: str
    rationale: str


@dataclass
class Specification:
    outcome: str
    invariants: list[str]
    examples: list[str]
    non_goals: list[str]
    decisions: list[Decision]
    proof: list[str]


VALID_MODES = {"locked", "bounded", "delegated"}


def validate(specification: Specification) -> list[str]:
    issues: list[str] = []
    for field_name in ("outcome", "invariants", "examples", "non_goals", "decisions", "proof"):
        if not getattr(specification, field_name):
            # 必填规格字段为空。
            issues.append(f"{field_name} is empty")
    for decision in specification.decisions:
        if decision.mode not in VALID_MODES:
            # 决策模式无效。
            issues.append(f"invalid decision mode: {decision.mode}")
        if decision.mode != "delegated" and not decision.rationale.strip():
            # 受约束的决策缺少理由或边界说明。
            issues.append(f"constrained decision lacks rationale: {decision.question}")
    return issues


def compile_contract(specification: Specification) -> dict:
    issues = validate(specification)
    return {
        "status": "executable" if not issues else "incomplete",
        "issues": issues,
        "contract": asdict(specification),
        "agent_may_decide": [item.question for item in specification.decisions if item.mode == "delegated"],
        "bounded_decisions": [
            {"question": item.question, "boundary": item.rationale}
            for item in specification.decisions
            if item.mode == "bounded"
        ],
        "human_checkpoint": [item.question for item in specification.decisions if item.mode == "locked"],
    }


def example() -> Specification:
    return Specification(
        outcome="在两分钟内从事故告警识别受影响的服务",
        invariants=["诊断只允许只读操作", "每个信息来源都必须纳入审计记录"],
        examples=["带部署 ID 的告警应能定位到对应的服务负责人"],
        non_goals=["自动修复", "更改告警路由"],
        decisions=[
            Decision("应先查询哪个只读数据源？", "delegated", ""),
            Decision("系统能否向生产环境写入？", "locked", "生产环境操作权限由事故指挥者掌握"),
            # 有边界的决策：最多可以查询多少个来源？
            # 决策边界：查询五个来源或经过两分钟后停止。
            Decision("How many sources may be queried?", "bounded", "Stop after five sources or two minutes"),
        ],
        proof=["十次已记录的事故回放", "生产环境写入次数为零"],
    )


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "executable-specification.json"
    output.write_text(json.dumps(compile_contract(example()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
