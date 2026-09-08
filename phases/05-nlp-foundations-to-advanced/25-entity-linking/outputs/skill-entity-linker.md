---
name: entity-linker
description: 设计实体链接流水线，包括知识库、候选生成器、消歧器与评估。
version: 1.0.0
phase: 5
lesson: 25
tags: [nlp, entity-linking, knowledge-graph]
---

给定用例（领域知识库、语言、处理量、延迟预算），输出：

1. 知识库（Knowledge Base）。Wikidata、Wikipedia 或自定义知识库，注明版本日期和刷新周期。
2. 候选生成器（Candidate Generator）。别名索引、嵌入或混合，给出目标提及 recall @ K。
3. 消歧器（Disambiguator）。先验 + 上下文、基于嵌入、生成式或 LLM 提示式。
4. NIL 策略。最高分阈值、分类器或显式 NIL 候选。
5. 评估（Evaluation）。留出集提及 recall @ 30、top-1 准确率和 NIL 检测 F1。

拒绝没有提及召回率基线的实体链接流水线；不知道候选生成是否找出正确实体，就无法评估消歧器。拒绝未将输出约束为有效知识库 ID 的 LLM 提示式实体链接流水线。对于流行度偏差影响少数实体（例如同名冲突），却没有进行领域微调的系统，提出警示。
