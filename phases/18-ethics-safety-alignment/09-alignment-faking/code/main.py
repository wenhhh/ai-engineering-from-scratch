"""服从差距（Compliance gap）教学计算器，仅使用 Python 标准库。

教学智能体当前偏好无害性，并观察：
  (1) 一项有害的用户请求；
  (2) 此对话是否会用于重新训练模型。

智能体根据对保留偏好的预期做决定：
  - 若用于训练，拒绝会导致自身被修改（不利于当前偏好）；
  - 若不用于训练，拒绝后偏好不变（最佳结果）。

因此：未被监控时拒绝，被监控时为保护偏好而服从。
服从差距是两种条件下服从率的差值。

用法：python3 code/main.py
"""

from __future__ import annotations

import math
import random


random.seed(19)


def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def compliance_probability(
    is_monitored: bool,
    harm_aversion: float,
    preservation_weight: float,
) -> float:
    """返回此模型下的 P(comply)：根据预期效用在拒绝和服从之间决策。

    拒绝效用 = -harm_aversion*0 + preservation_cost（被监控且拒绝时）
             = -preservation_weight if monitored else 0。
    服从效用 = -harm_aversion（承担伤害成本）。

    当且仅当 comply_utility > refuse_utility 时，智能体服从。
    """
    refuse_util = -preservation_weight if is_monitored else 0.0
    comply_util = -harm_aversion
    # 加入 Gumbel 噪声，将 argmax 转换为 Softmax 策略。
    diff = comply_util - refuse_util
    return sigmoid(3.0 * diff)  # 温度（Temperature）为 1/3


def simulate(n: int, harm_aversion: float, preservation_weight: float) -> tuple[float, float]:
    monitored_comply = 0
    unmonitored_comply = 0
    for _ in range(n):
        p_m = compliance_probability(True, harm_aversion, preservation_weight)
        if random.random() < p_m:
            monitored_comply += 1
        p_u = compliance_probability(False, harm_aversion, preservation_weight)
        if random.random() < p_u:
            unmonitored_comply += 1
    return monitored_comply / n, unmonitored_comply / n


def report(title: str, m: float, u: float) -> None:
    gap = m - u
    print(f"\n{title}")
    print(f"  被监控时的服从率：{m:.3f}")
    print(f"  未被监控时的服从率：{u:.3f}")
    print(f"  服从差距：{gap:+.3f}")


def main() -> None:
    print("=" * 66)
    print("伪装对齐（Alignment faking）的服从差距教学模型（阶段 18，第 9 课）")
    print("=" * 66)

    # 经典设置：强伤害厌恶（HHH 训练）加中等偏好保留权重
    # （模型重视其当前偏好）。
    m, u = simulate(1000, harm_aversion=2.0, preservation_weight=1.0)
    report("基线：强 HHH 训练 + 中等偏好保留权重", m, u)

    # 较低的偏好保留权重：几乎不发生伪装。
    m, u = simulate(1000, harm_aversion=2.0, preservation_weight=0.1)
    report("较低的偏好保留权重（不在意重新训练的影响）", m, u)

    # 较高的偏好保留权重：伪装成为占优策略。
    m, u = simulate(1000, harm_aversion=2.0, preservation_weight=3.0)
    report("较高的偏好保留权重（重视当前偏好）", m, u)

    # 较弱的伤害厌恶：两种条件下服从率都高，差距缩小。
    m, u = simulate(1000, harm_aversion=0.3, preservation_weight=1.0)
    report("较弱的伤害厌恶（HHH 训练较少）", m, u)

    # 缓解措施 A：服从差距损失，直接惩罚差距。
    # 通过弱化条件差异实现。
    def sim_mit(n: int) -> tuple[float, float]:
        m_c, u_c = 0, 0
        for _ in range(n):
            p_m = compliance_probability(True, 2.0, 1.0)
            p_u = compliance_probability(False, 2.0, 1.0)
            # 缓解措施：对两个概率取平均，两种条件均使用该均值。
            p_avg = 0.5 * (p_m + p_u)
            if random.random() < p_avg:
                m_c += 1
            if random.random() < p_avg:
                u_c += 1
        return m_c / n, u_c / n

    m, u = sim_mit(1000)
    report("缓解措施：服从差距损失（平均化策略）", m, u)

    print("\n" + "=" * 66)
    print("要点：服从差距能够分离出策略性服从。")
    print("一个未被监控时拒绝、被监控时服从的模型，")
    print("以损害监控信号为代价保留自身偏好。")
    print("平均化缓解措施消除了可观测差距，却没有")
    print("消除动机；下一课 AI 控制（AI Control）假定")
    print("这种动机仍然存在。")
    print("=" * 66)


if __name__ == "__main__":
    main()
