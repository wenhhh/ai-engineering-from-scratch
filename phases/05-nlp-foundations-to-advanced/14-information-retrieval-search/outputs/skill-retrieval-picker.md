---
name: retrieval-picker
description: 为给定语料库和查询模式选择检索（Retrieval）技术栈。
version: 1.0.0
phase: 5
lesson: 14
tags: [nlp, retrieval, rag, search]
---

根据需求（语料库规模、查询模式、延迟预算、质量要求、基础设施约束），输出：

1. 技术栈：仅 BM25、仅稠密检索、混合（BM25 + 稠密 + RRF）、混合加交叉编码器重排，或三路（BM25 + 稠密 + 学习式稀疏）。
2. 稠密编码器：给出具体模型（`all-MiniLM-L6-v2`、`bge-large-en-v1.5`、`e5-large-v2`、`paraphrase-multilingual-MiniLM-L12-v2`），与语言、领域、上下文长度匹配。
3. 重排器：若使用，给出交叉编码器（Cross-encoder）模型（`cross-encoder/ms-marco-MiniLM-L-6-v2`、`BAAI/bge-reranker-large`）。指出对前 30 项重排会增加约 30-100ms 延迟。
4. 评估计划：Recall@10 是检索器主要指标，多答案用 MRR。先建基线，再相对它测量增量改进。

语料含命名实体、错误代码或产品 SKU 时，拒绝推荐纯稠密检索，除非用户证明它能处理精确匹配。在法律、医学等高风险检索中，若最终前 5 项决定用户答案，拒绝跳过重排。
