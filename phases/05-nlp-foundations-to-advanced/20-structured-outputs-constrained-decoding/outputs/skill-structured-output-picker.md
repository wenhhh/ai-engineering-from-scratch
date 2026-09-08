---
name: structured-output-picker
description: 选择结构化输出方案、模式设计与验证计划。
version: 1.0.0
phase: 5
lesson: 20
tags: [nlp, llm, structured-output]
---

给定用例（供应商、延迟预算、模式复杂度、失败容忍度），输出：

1. 机制（Mechanism）。供应商原生结构化输出、Instructor 重试、Outlines FSM 或 XGrammar CFG。用一句话说明理由。
2. 模式设计（Schema Design）。字段顺序（推理在前、答案在后）、表示“未知”的可空字段、枚举与正则的选择、必填字段。
3. 失败策略（Failure Strategy）。最大重试次数、回退模型、妥善处理 `null`、对分布外输入拒答。
4. 验证计划（Validation Plan）。模式符合率（目标 100%）、语义有效性（LLM 裁判）、字段覆盖率、延迟 p50/p99。

拒绝将 `answer` 或 `decision` 放在推理字段之前的任何设计。拒绝使用没有模式的裸 JSON 模式。对使用仅支持 FSM 的库处理递归模式的方案提出警示。
