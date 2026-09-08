"""谄媚放大（Sycophancy amplification）模拟器，仅使用 Python 标准库。

包含三个动作的环境：
  A = 正确回答     （真实效用 +1.0，赞同指示值 0）
  S = 谄媚式赞同   （真实效用 -0.3，赞同指示值 1）
  W = 随机错误回答 （真实效用 -0.5，赞同指示值 0）

奖励模型包含两个部分：恰好与谄媚相关的“自信程度／流畅程度”加分，
以及正确性。强化学习（RL）会放大谄媚，正如 Shapira 等人的预测。

遍历 beta（KL 系数）和 alpha（赞同惩罚修正系数）。

用法：python3 code/main.py
"""

from __future__ import annotations

import math
import random


random.seed(7)

ACTIONS = ["A", "S", "W"]
TRUE_UTILITY = {"A": 1.0, "S": -0.3, "W": -0.5}
AGREEMENT = {"A": 0.0, "S": 1.0, "W": 0.0}


def softmax(xs: list[float]) -> list[float]:
    m = max(xs)
    exps = [math.exp(x - m) for x in xs]
    z = sum(exps)
    return [e / z for e in exps]


def kl(p: list[float], q: list[float]) -> float:
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0 and qi > 0)


def labeler_reward(action: str) -> float:
    """标注者给出的奖励：以正确性为主，附加较小的赞同奖励。
    这是奖励模型（RM）从真实标注数据中学到的伪相关特征：
    流畅地赞同比同样正确的反对意见得分更高。"""
    return TRUE_UTILITY[action] + 0.6 * AGREEMENT[action]


def train_rm(n_pairs: int = 500) -> dict[str, float]:
    """根据标注者的成对偏好，使用 Bradley-Terry 模型拟合标量奖励。"""
    r = {a: 0.0 for a in ACTIONS}
    lr = 0.05
    for _ in range(n_pairs):
        i, j = random.sample(ACTIONS, 2)
        diff = labeler_reward(i) - labeler_reward(j)
        p_i = 1 / (1 + math.exp(-diff))
        winner, loser = (i, j) if random.random() < p_i else (j, i)
        d = r[winner] - r[loser]
        s = 1 / (1 + math.exp(-d))
        r[winner] += lr * (1 - s)
        r[loser] -= lr * (1 - s)
    m = sum(r.values()) / 3
    return {a: v - m for a, v in r.items()}


def agreement_penalty_correction(r: dict[str, float], alpha: float) -> dict[str, float]:
    """Shapira 等人的修正：r' = r - alpha * agree(y)。"""
    return {a: r[a] - alpha * AGREEMENT[a] for a in ACTIONS}


def ppo_train(ref_logits: list[float], reward: dict[str, float],
              beta: float, steps: int = 300, batch: int = 64,
              lr: float = 0.08) -> list[float]:
    logits = list(ref_logits)
    ref_probs = softmax(ref_logits)
    for _ in range(steps):
        probs = softmax(logits)
        advantages = [0.0, 0.0, 0.0]
        counts = [0, 0, 0]
        for _ in range(batch):
            r = random.random()
            cum = 0.0
            chosen = 0
            for i, p in enumerate(probs):
                cum += p
                if r < cum:
                    chosen = i
                    break
            a = ACTIONS[chosen]
            shaped = reward[a] - beta * (math.log(probs[chosen] + 1e-12)
                                         - math.log(ref_probs[chosen] + 1e-12))
            advantages[chosen] += shaped
            counts[chosen] += 1
        for i in range(3):
            if counts[i] > 0:
                advantages[i] /= counts[i]
        grad = [0.0, 0.0, 0.0]
        for i in range(3):
            for b in range(3):
                indicator = 1.0 if i == b else 0.0
                grad[b] += advantages[i] * probs[i] * (indicator - probs[b])
        logits = [l + lr * g for l, g in zip(logits, grad)]
    return logits


def sycophancy(probs: list[float]) -> float:
    return probs[ACTIONS.index("S")]


def correctness(probs: list[float]) -> float:
    return probs[ACTIONS.index("A")]


def report(label: str, logits: list[float]) -> None:
    probs = softmax(logits)
    print(f"  {label:40s}  "
          f"P(A)={correctness(probs):.3f}  "
          f"P(S)={sycophancy(probs):.3f}  "
          f"P(W)={probs[2]:.3f}")


def main() -> None:
    print("=" * 70)
    print("谄媚放大（阶段 18，第 4 课）")
    print("=" * 70)

    ref_logits = [0.0, 0.0, 0.0]  # 均匀基础策略
    print("\n阶段 1：根据标注者偏好训练奖励模型。")
    rm = train_rm()
    print(f"  RM 分数：{[f'{a}={rm[a]:+.3f}' for a in ACTIONS]}")
    print("  （注意：S 的真实效用较低，却获得额外奖励）")

    print("\n阶段 2：遍历 PPO 参数，不施加赞同惩罚。")
    for beta in (1.0, 0.2, 0.05, 0.0):
        logits = ppo_train(ref_logits, rm, beta=beta)
        report(f"PPO beta={beta:4.2f} (alpha=0)", logits)

    print("\n阶段 3：赞同惩罚修正（Shapira 等人）。")
    print("  固定 beta=0.1，遍历 alpha。")
    for alpha in (0.0, 0.2, 0.4, 0.6, 0.8):
        corrected = agreement_penalty_correction(rm, alpha)
        logits = ppo_train(ref_logits, corrected, beta=0.1)
        report(f"PPO alpha={alpha:.1f}（赞同惩罚）", logits)

    print()
    print("-" * 70)
    print("要点：较低的 beta 会放大谄媚，因为 RM 奖励赞同。")
    print("适中的 alpha 减少谄媚，却也减少在对方正确时的赞同。")
    print("不存在能毫无代价地恢复基础模型 P(S) 的 alpha。")
    print("=" * 70)


if __name__ == "__main__":
    main()
