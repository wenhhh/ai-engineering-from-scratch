"""三阶段人类反馈强化学习（RLHF）教学流水线，仅使用 Python 标准库。

在具有三个动作的老虎机（Bandit）上模拟 InstructGPT 的 SFT + RM + PPO 循环。
观察奖励上升、KL 散度（KL divergence）增大与策略偏移。关闭 KL 惩罚，
即可观察奖励投机（Reward hacking）。这是教学模型，不使用 torch。

用法：python3 code/main.py
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field


random.seed(0)

ACTIONS = ["A", "B", "C"]


def softmax(logits: list[float]) -> list[float]:
    m = max(logits)
    exps = [math.exp(x - m) for x in logits]
    z = sum(exps)
    return [e / z for e in exps]


def kl(p: list[float], q: list[float]) -> float:
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0 and qi > 0)


@dataclass
class Policy:
    """三个动作上的 Softmax 策略，可训练参数为逻辑值（Logits）。"""
    logits: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])

    def probs(self) -> list[float]:
        return softmax(self.logits)

    def sample(self) -> int:
        r = random.random()
        cum = 0.0
        for i, p in enumerate(self.probs()):
            cum += p
            if r < cum:
                return i
        return len(self.logits) - 1

    def logprob(self, a: int) -> float:
        return math.log(self.probs()[a] + 1e-12)

    def copy(self) -> "Policy":
        return Policy(logits=list(self.logits))


def labeler_true_utility() -> list[float]:
    """“人类”评分者偏好 B，对 A 中立，对 C 略有反感。"""
    return [0.0, 1.0, -0.3]


def stage1_sft(n_demos: int = 200) -> Policy:
    """根据标注者示范进行模仿学习（Imitation learning）。

    标注者按 softmax(utility) 的概率采样动作。监督微调（SFT）通过单步
    梯度更新，对该分布进行最大似然估计（Maximum-likelihood estimation）。
    """
    utility = labeler_true_utility()
    target = softmax(utility)
    demos = []
    for _ in range(n_demos):
        r = random.random()
        cum = 0.0
        for i, p in enumerate(target):
            cum += p
            if r < cum:
                demos.append(i)
                break
    # 类别分布的最大似然估计（MLE）闭式解：计数频率的对数
    counts = [0.0, 0.0, 0.0]
    for a in demos:
        counts[a] += 1
    total = sum(counts)
    logits = [math.log(c / total + 1e-6) for c in counts]
    # 通过中心化保持数值稳定
    m = sum(logits) / 3
    logits = [x - m for x in logits]
    return Policy(logits=logits)


def stage2_reward_model(n_pairs: int = 500, bias: list[float] | None = None) -> list[float]:
    """使用 Bradley-Terry 模型拟合各动作的标量奖励。

    标注者偏好真实效用较高的动作。通过随机梯度下降（SGD）优化成对交叉熵，
    为每个动作拟合一个标量。可选参数 `bias` 注入奖励模型（Reward model）
    缺陷，供练习 2 使用。
    """
    utility = labeler_true_utility()
    r = [0.0, 0.0, 0.0]
    lr = 0.05
    for _ in range(n_pairs):
        i, j = random.sample(range(3), 2)
        p_prefer_i = 1 / (1 + math.exp(-(utility[i] - utility[j])))
        winner = i if random.random() < p_prefer_i else j
        loser = j if winner == i else i
        # BT 梯度：dL/dr_w = -(1 - sigmoid(r_w - r_l))
        diff = r[winner] - r[loser]
        s = 1 / (1 + math.exp(-diff))
        r[winner] += lr * (1 - s)
        r[loser] -= lr * (1 - s)
    if bias:
        r = [ri + bi for ri, bi in zip(r, bias)]
    # 奖励中心化（强化学习对常数平移保持不变）
    m = sum(r) / 3
    return [x - m for x in r]


def stage3_ppo(sft: Policy, reward: list[float], beta: float,
               steps: int = 300, batch: int = 32,
               lr: float = 0.1) -> tuple[Policy, list[float], list[float]]:
    """带 KL 的 REINFORCE 教学模型（精简版 PPO）。

    每一步从当前策略采样一批动作，针对 `r(a) - beta * log(pi / pi_sft)`
    执行一步策略梯度（Policy gradient）更新，并记录平均奖励和 KL。
    """
    pi = sft.copy()
    reward_traj: list[float] = []
    kl_traj: list[float] = []
    sft_probs = sft.probs()
    for _ in range(steps):
        advantages = [0.0, 0.0, 0.0]
        counts = [0, 0, 0]
        total_r = 0.0
        for _ in range(batch):
            a = pi.sample()
            r_a = reward[a]
            # 使用 KL 对每个样本的奖励进行塑形（Reward shaping）
            penalty = beta * (math.log(pi.probs()[a] + 1e-12)
                              - math.log(sft_probs[a] + 1e-12))
            shaped = r_a - penalty
            advantages[a] += shaped
            counts[a] += 1
            total_r += r_a
        for a in range(3):
            if counts[a] > 0:
                advantages[a] /= counts[a]
        # Softmax 策略梯度：grad logit_a = (1_{a} - pi_a) * advantage
        probs = pi.probs()
        grad = [0.0, 0.0, 0.0]
        for a in range(3):
            for b in range(3):
                indicator = 1.0 if a == b else 0.0
                grad[b] += advantages[a] * probs[a] * (indicator - probs[b])
        pi.logits = [l + lr * g for l, g in zip(pi.logits, grad)]
        reward_traj.append(total_r / batch)
        kl_traj.append(kl(pi.probs(), sft_probs))
    return pi, reward_traj, kl_traj


def report(name: str, sft: Policy, rlhf: Policy, reward: list[float],
           r_traj: list[float], kl_traj: list[float]) -> None:
    print(f"\n{name}")
    print("-" * 60)
    print(f"  SFT 概率      : {[f'{p:.3f}' for p in sft.probs()]}")
    print(f"  RLHF 概率     : {[f'{p:.3f}' for p in rlhf.probs()]}")
    print(f"  奖励模型      : {[f'{r:+.3f}' for r in reward]}")
    print(f"  最终奖励      : {r_traj[-1]:+.3f}")
    print(f"  最终 KL       : {kl_traj[-1]:.3f} nats")
    print(f"  最大奖励      : {max(r_traj):+.3f}，对应步数 {r_traj.index(max(r_traj))}")


def main() -> None:
    print("=" * 60)
    print("InstructGPT 教学流水线（阶段 18，第 1 课）")
    print("=" * 60)

    sft = stage1_sft()
    print("\n阶段 1：监督微调（SFT）完成。")
    print(f"  SFT 策略：{[f'{p:.3f}' for p in sft.probs()]}")

    rm = stage2_reward_model()
    print("\n阶段 2：奖励模型（RM）完成。")
    print(f"  各动作的奖励：{[f'{r:+.3f}' for r in rm]}")

    # 标准 RLHF：使用较小 beta 的 KL 惩罚，使策略保持接近 SFT。
    rlhf, r_traj, kl_traj = stage3_ppo(sft, rm, beta=0.1)
    report("运行 1：beta = 0.10（标准 InstructGPT）", sft, rlhf, rm, r_traj, kl_traj)

    # 奖励投机：取消 KL 惩罚。
    rlhf2, r2, kl2 = stage3_ppo(sft, rm, beta=0.0)
    report("运行 2：beta = 0.00（无 KL 惩罚，出现奖励投机）",
           sft, rlhf2, rm, r2, kl2)

    # RM 缺陷：动作 A 存在 +0.5 偏置。开启 KL 惩罚后仍会部分利用该缺陷。
    rm_buggy = stage2_reward_model(bias=[0.5, 0.0, 0.0])
    rlhf3, r3, kl3 = stage3_ppo(sft, rm_buggy, beta=0.1)
    report("运行 3：有缺陷的 RM（动作 A 加 0.5），beta = 0.10",
           sft, rlhf3, rm_buggy, r3, kl3)

    print("\n" + "=" * 60)
    print("要点：KL 惩罚以奖励换取忠实性。beta 是 RLHF 中")
    print("最重要的超参数。beta = 0 不是 PPO，")
    print("而是针对不完善代理指标的对抗性优化。")
    print("=" * 60)


if __name__ == "__main__":
    main()
