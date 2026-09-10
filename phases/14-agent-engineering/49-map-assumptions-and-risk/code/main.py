"""按影响、不确定性和不可逆性为假设排序，再选出风险最高且尚无证据的实验。

评分公式为 impact × uncertainty + irreversibility。tested/open 表示证据字段非空/为空，
不是实验真实通过/失败；示例只保存描述，不实际回放事故或访谈。
假设的 statement 原文受精确断言约束，也参与同分排序，因此保留并附中文解释。
证据和实验说明可翻译，不改变评分或选择结果。

译注：校验用 value in range(1, 6)，并未严格排除布尔值或等于整数的浮点数；
不要把错误消息中的“整数”理解为已实现严格的类型约束。
"""

# 课程示例：排列假设风险并选择下一项降低风险的实验。
# 课程正文：phases/14-agent-engineering/49-map-assumptions-and-risk/docs/en.md
# 参考原文：Boehm, Spiral Model, DOI 10.1145/12944.12948.
# 参考原文：Dardenne et al., Goal-Directed Requirements Acquisition.
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Assumption:
    statement: str
    impact: int
    uncertainty: int
    irreversibility: int
    test: str
    evidence: str = ""


def risk_score(item: Assumption) -> int:
    for value in (item.impact, item.uncertainty, item.irreversibility):
        if value not in range(1, 6):
            # 风险维度应为 1 到 5 的整数；实际类型校验的限制见模块译注。
            raise ValueError("risk dimensions must be integers from one to five")
    return item.impact * item.uncertainty + item.irreversibility


def prioritize(items: list[Assumption]) -> list[dict]:
    ranked = sorted(items, key=lambda item: (-risk_score(item), item.statement))
    return [{**asdict(item), "risk_score": risk_score(item), "status": "tested" if item.evidence else "open"} for item in ranked]


def next_experiment(items: list[Assumption]) -> Assumption | None:
    open_items = [item for item in items if not item.evidence]
    return max(open_items, key=risk_score, default=None)


def example() -> list[Assumption]:
    return [
        # 假设一：工程师能从告警上下文识别正确的服务。
        Assumption("Engineers can identify the right service from alert context", 5, 5, 2, "使用只读原型回放十起事故"),
        # 假设二：在两分钟内完成诊断很重要。
        Assumption("Two-minute diagnosis matters", 4, 2, 1, "访谈五位事故指挥者", "五位中有四位确认"),
        # 假设三：自动修复可以被接受。
        Assumption("Automatic remediation is acceptable", 5, 4, 5, "先不要自动化，先测试审批工作流"),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "assumption-map.json"
    output.write_text(json.dumps(prioritize(example()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
