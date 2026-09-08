---
name: game-rl-designer
description: 为给定领域设计游戏强化学习或推理强化学习训练流水线，选择 AlphaZero / MuZero / GRPO。
version: 1.0.0
phase: 9
lesson: 12
tags: [rl, alphazero, muzero, grpo, self-play]
---

给定目标（完全信息游戏 / 不完全信息 / Atari / 大语言模型推理 / 组合问题），输出：

1. 环境匹配。规则是否已知？是否马尔可夫？是否随机？是否多智能体？据此选择 AlphaZero、MuZero 或 GRPO。
2. 搜索策略。MCTS（带学习先验的 PUCT）、Gumbel 采样、N 选优，或不搜索。
3. 自我对弈计划。对称自我对弈 / 联赛 / 离线数据 / 验证器生成。
4. 目标信号。对局结果 / 验证器奖励 / 偏好 / 学习模型，并包含稳健性计划。
5. 诊断。相对基线胜率、ELO 等级分曲线、验证器通过率、相对参考策略的 KL。

拒绝对不完全信息游戏使用 AlphaZero，转用 CFR。没有可信验证器时拒绝 GRPO。没有固定基线对手集时，拒绝任何游戏强化学习流水线，否则自我对弈 ELO 未经校准。
