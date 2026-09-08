---
name: coref-picker
description: 选择共指消解方法、评估计划与集成策略。
version: 1.0.0
phase: 5
lesson: 24
tags: [nlp, coref, information-extraction]
---

给定用例（单文档 / 多文档、领域、语言），输出：

1. 方法（Approach）。规则、神经片段模型、LLM 提示或混合，用一句话说明理由。
2. 模型（Model）。如果采用神经方法，指出具体检查点。
3. 集成（Integration）。操作顺序：分词 → NER → 共指消解 → 下游任务。
4. 评估（Evaluation）。留出集 CoNLL F1（MUC、B³、CEAF-φ4 平均值），以及 20 篇文档的人工簇复核。

文档超过 2,000 词元且没有滑动窗口合并时，拒绝仅用 LLM 共指消解。拒绝没有提及级精确率与召回率报告的共指流水线。对将性别启发式系统部署在人口特征多样文本中的方案提出警示。
