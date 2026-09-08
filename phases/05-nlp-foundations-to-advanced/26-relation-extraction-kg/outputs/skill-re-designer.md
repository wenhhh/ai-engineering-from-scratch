---
name: re-designer
description: 设计带来源追踪与规范化的关系抽取流水线。
version: 1.0.0
phase: 5
lesson: 26
tags: [nlp, relation-extraction, knowledge-graph]
---

给定语料库（领域、语言、处理量）和下游用途（KG-RAG、分析、合规），输出：

1. 抽取器（Extractor）。模式、监督、LLM 或 AEVS 混合方案，结合精确率与召回率目标说明理由。
2. 本体（Ontology）。封闭属性列表（Wikidata / 领域），或附带规范化步骤的开放信息抽取。
3. 来源追踪（Provenance）。每个三元组携带源字符片段与文档 ID，这是审计的硬性要求。
4. 合并策略（Merge Strategy）。规范实体 ID + 关系 ID + 时间限定符，以及去重策略。
5. 评估（Evaluation）。在 200 个人工标注三元组上测量精确率与召回率，并在 LLM 抽取样本上测量幻觉率。

拒绝没有片段验证（来源追踪）的 LLM 关系抽取流水线。拒绝将未经规范化的开放信息抽取结果流入生产图谱。对雇主、配偶、职位等有时间范围的关系缺少时间限定符的流水线提出警示。
