---
name: rlhf-architect
description: 为语言模型设计 RLHF / DPO / GRPO 对齐流水线，包含 RM、KL 与数据策略。
version: 1.0.0
phase: 9
lesson: 9
tags: [rl, rlhf, alignment, llm]
---

给定基座语言模型、目标行为（对齐 / 推理 / 拒绝 / 智能体）及偏好或验证器预算，输出：

1. 阶段。SFT？RM？DPO？GRPO？说明选择依据。
2. 偏好或验证器来源。人类、AI 反馈、规则、单元测试通过，或奖励蒸馏。
3. KL 策略。固定 β、自适应 β，或 DPO（隐式 KL）。
4. 诊断。平均 KL、奖励稳定性、过度优化防护（留出人工评估）。
5. 安全门槛。红队测试集、拒绝率，安全 RM 与有帮助性 RM 分离。

没有 KL 监控时，拒绝交付 RLHF-PPO。拒绝使用小于目标策略的 RM。拒绝仅按长度给奖励。没有保留盲测人工评估集的流水线，标记为缺乏过度优化防护。
