"""从候选工作切片中，优先选择兼顾效果、不确定性降低、成本与可逆性的方案。

先要求 proves 覆盖 required_proof，再按收益与代价之比评分；同分时偏向较少工作量，
再比较名称。名称既用于精确断言也参与排序，证据标签用于集合包含判断，均保留英文。
service-identification 是“服务识别”，operator-trust 是“操作人员信任”。

译注：只检查切片声明的证据标签，不实际验证假设；评分是本课的示意规则，
并不保证选出的切片在所有约束下最小或最优，也没有完整验证所有数值维度。
"""

# 课程示例：选择能产生所需证据的最小工作切片。
# 课程正文：phases/14-agent-engineering/50-choose-the-smallest-testable-slice/docs/en.md
# 参考原文：Boehm, A Spiral Model of Software Development and Enhancement, 1988.
# 参考原文：Lenarduzzi and Taibi, MVP Explained, 2016.
# 运行本文件可生成 outputs/slice-decision.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Slice:
    name: str
    outcome_value: int
    uncertainty_reduced: int
    effort: int
    consequence: int
    reversible: bool
    proves: tuple[str, ...]


def score(item: Slice) -> float:
    if item.effort < 1:
        # 工作量必须为正。
        raise ValueError("effort must be positive")
    risk_penalty = item.consequence * (2 if not item.reversible else 0.5)
    return round((item.outcome_value + item.uncertainty_reduced) / (item.effort + risk_penalty), 3)


def choose(items: list[Slice], required_proof: set[str]) -> Slice:
    candidates = [item for item in items if required_proof <= set(item.proves)]
    if not candidates:
        # 没有候选切片声明能验证全部必需假设。
        raise ValueError("no slice proves the required assumptions")
    return max(candidates, key=lambda item: (score(item), -item.effort, item.name))


def decision(items: list[Slice], required_proof: set[str]) -> dict:
    selected = choose(items, required_proof)
    return {
        "required_proof": sorted(required_proof),
        "selected": {**asdict(selected), "score": score(selected)},
        "alternatives": [{**asdict(item), "score": score(item)} for item in items if item != selected],
    }


def example() -> list[Slice]:
    return [
        # 只读事故回放：用较小、可逆的工作验证服务识别和操作人员信任。
        Slice("read-only incident replay", 4, 5, 2, 1, True, ("service-identification", "operator-trust")),
        # 生产环境自动修复：工作量与后果较大，且不可逆。
        Slice("production auto-remediation", 5, 4, 10, 5, False, ("service-identification", "operator-trust")),
        # 仪表板原型图：只声明能验证操作人员信任。
        Slice("dashboard mockup", 2, 2, 1, 1, True, ("operator-trust",)),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "slice-decision.json"
    output.write_text(json.dumps(decision(example(), {"service-identification", "operator-trust"}), indent=2) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
