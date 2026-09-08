---
name: dst-designer
description: 设计对话状态跟踪器，包括模式、抽取器、更新策略和评估。
version: 1.0.0
phase: 5
lesson: 29
tags: [nlp, dialogue, task-oriented]
---

给定用例（领域、语言、词表开放程度、合规需求），输出：

1. 模式（Schema）。领域列表、每个领域的槽位、每个槽位使用开放还是封闭词表。
2. 抽取器（Extractor）。规则、seq2seq 或 LLM 配合 Pydantic，说明理由。
3. 更新策略（Update Policy）。重生成完整状态或增量更新，修正处理、否定处理。
4. 评估（Evaluation）。留出对话集上的联合目标准确率、槽位级精确率与召回率，以及最难槽位的混淆情况。
5. 确认流程（Confirmation Flow）。何时明确要求用户确认，例如破坏性操作、低置信度抽取。

对于合规敏感槽位，没有规则二次检查就拒绝仅用 LLM 的 DST。拒绝任何无法在用户修正时回退槽位的 DST。对没有版本标签的模式提出警示。
