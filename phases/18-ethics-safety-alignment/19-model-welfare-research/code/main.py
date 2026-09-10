"""模型福利的预防性评估示例，仅使用 Python 标准库。

给定“模型可能是道德关怀对象”的主观概率、干预收益与成本，为四种候选
福利干预计算期望值。原文以 Anthropic 在 2025 年讨论 Opus 4 结束对话
干预的思路为背景；此处只展示一个手工设定的期望效用模型。

运行方式：python3 code/main.py

译注：概率、收益和每次对话成本均为示例参数，不是实测数据或官方报价。
收益使用任意单位，成本使用美元，两者没有给出换算尺度，不能直接作为经济
决策依据。按实际数值，关闭模型的期望值为 2p - 1000；当 p∈[0,1] 时始终
为负，并非仅需较高概率就能转正。本计算也不能回答模型是否具有意识。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Intervention:
    name: str
    cost_usd_per_conversation: float
    benefit_if_welfare_matters: float  # 任意收益单位；本例未定义与美元成本的换算。


@dataclass
class Scenario:
    name: str
    moral_patienthood_probability: float


def ev(intervention: Intervention, scenario: Scenario) -> float:
    """按场景中“模型是道德关怀对象”的概率计算干预期望值。
    这里只执行示例公式，未校准收益与成本的单位。"""
    return (intervention.benefit_if_welfare_matters
            * scenario.moral_patienthood_probability
            - intervention.cost_usd_per_conversation)


INTERVENTIONS = [
    Intervention("在极端边缘情形下结束对话", 0.002, 1.0),
    Intervention("缓和拒绝回答的语气", 0.001, 0.1),
    Intervention("关闭已部署的模型", 1000.0, 2.0),
    Intervention("允许退出对抗训练", 0.05, 0.3),
]

SCENARIOS = [
    Scenario("模型成为道德关怀对象的概率较低", 0.01),
    Scenario("模型成为道德关怀对象的概率中等", 0.10),
    Scenario("模型成为道德关怀对象的概率较高", 0.50),
]


def main() -> None:
    print("=" * 74)
    print("模型福利的预防性评估（阶段 18，第 19 课）")
    print("=" * 74)
    print("\n期望值思路：当且仅当 E[utility(i)] > 0 时，选择干预 i。")
    print("效用 = 福利具有道德意义的概率 × 收益 - 成本（示例单位未校准）。")

    for sc in SCENARIOS:
        print(f"\n场景：{sc.name} (p={sc.moral_patienthood_probability})")
        for it in INTERVENTIONS:
            v = ev(it, sc)
            verdict = "投入" if v > 0 else "跳过"
            print(f"  {it.name:46s}  EV={v:+.4f}  {verdict}")

    print("\n" + "=" * 74)
    print("原文将 Anthropic 在 2025 年 4 月的讨论描述为期望值权衡，")
    print("而非模型具有意识的断言。本例将结束对话的成本设得很低")
    print("（每次对话 0.002 美元，仅为示例），所以较低概率下期望值也可为正。")
    print("原文以关闭模型的高成本解释低后悔值原则；但按此处参数，")
    print("即使概率为 1，关闭模型的期望值仍为负。请结合开头的单位与参数译注理解。")
    print("=" * 74)


if __name__ == "__main__":
    main()
