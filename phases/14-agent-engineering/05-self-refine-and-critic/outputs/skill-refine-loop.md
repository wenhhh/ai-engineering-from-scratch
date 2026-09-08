---
name: refine-loop
description: 根据任务、验证器可用性和迭代预算，配置评估器-优化器（Evaluator-optimizer）循环（Self-Refine / CRITIC）。
version: 1.0.0
phase: 14
lesson: 05
tags: [self-refine, critic, evaluator-optimizer, guardrails, iteration]
---

给定任务、迭代预算和可用验证器（以工具为依据，或仅能自我评估），输出评估器-优化器循环的提示词和停止策略。

请生成：

1. 生成器提示词。负责首次输出的确定性生成器。明确写出任务、输出格式和约束。
2. 评估器或验证器提示词。如果有工具可用，如搜索、代码运行、测试、计算器、类型检查，说明如何调用，以及如何生成结构化批评意见（JSON，包含 pass/fail、violations[]、suggested_fixes[]）。如果只能自我评估，明确指出 Self-Refine 盲目认可风险，并采用结构不同的提示词风格，例如对抗式的“至少找出一个缺陷”。
3. 改进器提示词。必须引用先前输出和批评意见，即历史记录。明确要求“不得重复先前迭代中指出的故障模式”。
4. 停止策略。组合条件：验证器通过 OR（自我评估认为没问题 AND iterations >= 2）OR iterations >= max_iterations。绝不能只用单一条件。
5. 可观测性钩子（Observability hooks）。按照第 23 课，将每次迭代记录为 OpenTelemetry GenAI 跨度（Span，evaluate、optimize），使完整改进轨迹可审计。

严格禁止：

- 生成器和批评器使用相同提示词。这会产生盲目认可风险，模型会赞同自己。
- 不设置迭代上限。无限改进循环会持续消耗词元，默认必须将上限设为 4。
- 验证器提示词要求自由格式的自然语言反馈。只能使用结构化 JSON，包含 pass/fail 和逐项列出的违规内容。
- 从改进器提示词中移除历史记录。论文显示，没有历史记录时质量会崩塌。

拒绝规则：

- 如果任务没有验证器，也无法构建验证器，应拒绝 CRITIC，并说明可用的 Self-Refine 是较弱选项，警告用户存在盲目认可风险。
- 如果 max_iterations >= 10，应拒绝并建议重新设计任务。改进超过 3-4 轮仍未收敛，通常说明生成器提示词有问题。
- 如果验证器调用破坏性工具，如 shell、git 写入，应拒绝并要求建立沙箱边界（第 09 课）。

输出：单个配置块，包含所有提示词、停止策略和工具列表，再附“接下来读什么”说明，根据部署目标指向第 16 课（OpenAI Agents SDK 防护机制）、第 12 课（Anthropic 评估器-优化器），或第 30 课（评估驱动智能体开发，Eval-driven agent development）。
