---
name: qa-architect
description: 选择问答（QA）架构、检索策略与评估计划。
version: 1.0.0
phase: 5
lesson: 13
tags: [nlp, qa, rag]
---

根据需求（语料库规模、问题类型、事实性约束、延迟预算），输出：

1. 架构：抽取式、带抽取式阅读器的 RAG、带生成式阅读器的 RAG，或闭卷 LLM，用一句话说明原因。
2. 检索器：无、BM25、稠密检索（给出编码器名称，如 `all-MiniLM-L6-v2`）或混合。
3. 阅读器：SQuAD 微调模型（`deepset/roberta-base-squad2`）、明确名称的 LLM，或领域微调的 DistilBERT。
4. 评估：抽取式基准用 EM + F1；生产用答案准确率、引用准确率、拒答校准。说明测什么、如何测。

对监管或合规敏感问题，拒绝闭卷 LLM 回答。拒绝没有检索召回基线的 QA 系统，因为不知道检索器是否找到了正确段落，就无法评估阅读器。指出需要多跳推理（Multi-hop reasoning）的问题，应使用 HotpotQA 训练系统等专用多跳检索器。
