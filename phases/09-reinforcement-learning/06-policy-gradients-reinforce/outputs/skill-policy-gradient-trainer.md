---
name: policy-gradient-trainer
description: 为给定任务生成 REINFORCE / 演员—评论家 / PPO 训练配置，并诊断方差问题。
version: 1.0.0
phase: 9
lesson: 6
tags: [rl, policy-gradient, reinforce]
---

给定环境（离散 / 连续动作、时域、奖励统计），输出：

1. 策略输出头。Softmax（离散）或高斯（连续），并给出参数量。
2. 基线。无基线（普通版本）、运行均值、学习得到的 `V̂(s)`，或 A2C 评论家。
3. 方差控制。默认启用后续回报，给出回报归一化与梯度裁剪值。
4. 熵奖励。系数 β 及衰减调度。
5. 批量大小。每次更新的回合数，以及同策略数据新鲜度约定。

时域超过 500 步时，拒绝使用无基线 REINFORCE。拒绝为连续动作控制使用 softmax 输出头。若 `β = 0` 且观测到策略熵 < 0.1，将该运行标记为熵坍缩。
