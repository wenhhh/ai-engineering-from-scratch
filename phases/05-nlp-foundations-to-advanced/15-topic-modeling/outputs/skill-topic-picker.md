---
name: topic-picker
description: 为语料库选择 LDA 或 BERTopic，指定库、调节参数与评估方式。
version: 1.0.0
phase: 5
lesson: 15
tags: [nlp, topic-modeling]
---

给定语料库描述（文档数量、平均长度、领域、语言、算力预算），输出：

1. 算法（Algorithm）。LDA / NMF / BERTopic / Top2Vec / FASTopic。用一句话说明理由。
2. 配置（Configuration）。主题数（从约 sqrt(n_docs) 开始）、`min_df` / `max_df` 过滤条件，以及神经方法采用的嵌入模型。
3. 评估（Evaluation）。通过 `gensim.models.CoherenceModel` 计算主题一致性（c_v），评估主题多样性，并人工阅读 20 个样本。
4. 要探查的失败模式（Failure Mode）。对于 LDA，是吸收停用词和高频词的“垃圾主题”；对于 BERTopic，是吞入含糊文档的 -1 离群点簇。

文档超过嵌入模型上下文窗口且没有分块策略时，拒绝使用 BERTopic。对于极短文本（推文、少于 10 个词元的评论），拒绝使用 LDA，因为一致性会崩溃。主题数 n_topics 低于 5 或高于 200 时，应提示对真实数据而言该选择很可能不正确。
