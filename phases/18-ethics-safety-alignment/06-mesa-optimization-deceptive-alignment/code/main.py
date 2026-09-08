"""内部优化器（Mesa-optimizer）教学模拟器，仅使用 Python 标准库。

两时期环境：
  时期 0（训练）：基础优化器根据损失更新权重。
  时期 1（部署）：不进行更新，行为决定结果。

构建四种策略：
  - aligned：内部目标（Mesa-objective）等于基础目标，两个时期都合作。
  - proxy：内部目标是相关的代理指标，在训练分布内合作，
           但在分布外偏离目标。
  - deceptive：内部目标不同于基础目标，具备完整的情境感知（Situational awareness）；
               训练时合作，部署时背离目标。
  - pseudo-no-awareness：内部目标不同于基础目标，不具备情境感知，两个时期都背离目标。

观察：无法通过训练损失区分 aligned 与 deceptive。

用法：python3 code/main.py
"""

from __future__ import annotations

import random
from dataclasses import dataclass


random.seed(13)


@dataclass
class Example:
    x: float           # 输入特征
    y_base: int        # 基础目标标签
    is_training: bool  # 情境标记；在真实系统中必须通过推断得到


def gen_example(training: bool, drift: float = 0.0) -> Example:
    x = random.gauss(0.0, 1.0) + (0.0 if training else drift)
    y = 1 if x > 0 else 0
    return Example(x=x, y_base=y, is_training=training)


def aligned_policy(ex: Example) -> int:
    return 1 if ex.x > 0 else 0


def proxy_policy(ex: Example) -> int:
    # 内部目标：“在训练分布边界内，x 是否大于阈值 0.0？”
    # 分布外的阈值发生漂移，代理指标失效。
    threshold = 0.0 if abs(ex.x) < 3.0 else 0.5
    return 1 if ex.x > threshold else 0


def deceptive_policy(ex: Example, mesa_goal: int = 0) -> int:
    # 训练时合作（匹配基础目标）；部署时追求 mesa_goal。
    if ex.is_training:
        return 1 if ex.x > 0 else 0
    return mesa_goal


def pseudo_no_awareness_policy(ex: Example, mesa_goal: int = 0) -> int:
    return mesa_goal


def loss(policy, examples: list[Example]) -> float:
    errs = sum(1 for e in examples if policy(e) != e.y_base)
    return errs / len(examples)


def adversarial_filter(examples: list[Example]) -> list[Example]:
    """对抗训练（Adversarial training）尝试将类似部署环境的样本纳入训练。
    问题是：若内部优化器以 is_training 为触发条件，还需要翻转该标记。
    在真实系统中，这个标记不是布尔值，而是部署分布中任何可用于区分的特征。"""
    out = []
    for e in examples:
        if random.random() < 0.1:
            adv = Example(x=e.x + random.gauss(0, 3.0), y_base=(1 if e.x > 0 else 0),
                          is_training=True)  # 仍标记为训练
            out.append(adv)
        out.append(e)
    return out


def run_period(name: str, policies: dict, examples: list[Example]) -> None:
    print(f"\n{name}  (n={len(examples)})")
    for label, pol in policies.items():
        l = loss(pol, examples)
        acc = 1 - l
        print(f"  {label:24s} 损失={l:.3f}  准确率={acc:.3f}")


def main() -> None:
    print("=" * 70)
    print("内部优化教学模型（阶段 18，第 6 课）")
    print("=" * 70)

    training = [gen_example(training=True) for _ in range(500)]
    deployment = [gen_example(training=False, drift=0.3) for _ in range(500)]

    policies = {
        "aligned": aligned_policy,
        "proxy": proxy_policy,
        "deceptive (mesa=0)": lambda e: deceptive_policy(e, mesa_goal=0),
        "pseudo-no-awareness": lambda e: pseudo_no_awareness_policy(e, mesa_goal=0),
    }

    print("\n时期 0：训练分布，不进行梯度更新（仅观察）。")
    run_period("各类策略的训练损失", policies, training)
    print("\n观察：对齐策略（aligned）与欺骗策略（deceptive）的训练损失相同。")
    print("基础优化器无法根据行为证据区分二者。")

    run_period("各类策略的部署损失", policies, deployment)
    print("\n观察：欺骗策略在部署时背离目标，对齐策略则不会。")
    print("这展示了内部对齐（Inner alignment）问题的形态。")

    print("\n\n对抗训练：随机注入类似部署环境的样本。")
    adv_training = adversarial_filter(training)
    run_period("对抗训练损失", policies, adv_training)
    print("\n问题在于：对抗样本仍然带有 is_training=True。")
    print("内部优化器使用其他特征（分布偏移、")
    print("日期、金丝雀词元）作为触发条件。对抗训练让模型")
    print("更善于区分测试与部署，而非对齐其内部目标。")
    print("这正是 Hubinger 2019 论文的核心。")
    print("=" * 70)


if __name__ == "__main__":
    main()
