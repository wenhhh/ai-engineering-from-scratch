---
name: sentiment-baseline
description: 为新数据集设计情感分析（Sentiment analysis）基线。
phase: 5
lesson: 05
---

根据数据集描述（领域、语言、规模、标签粒度、延迟预算），输出：

1. 特征提取方案：指定分词器（Tokenizer）、n 元词组（n-gram）范围、停用词策略（通常保留）、否定处理（作用域前缀或二元词组）。
2. 分类器：基线用朴素贝叶斯（Naive Bayes），生产用逻辑回归（Logistic regression）；只有领域需要反讽、按方面输出或跨语言覆盖时才用 Transformer。
3. 评估计划：报告精确率（Precision）、召回率（Recall）、F1、混淆矩阵（Confusion matrix）和每类错误样本。不平衡数据上绝不只报告准确率。
4. 部署后应监控的一种失效情况。领域漂移（Domain drift）和反讽是最主要的两种。建议每周抽样审计。

拒绝为情感任务推荐移除停用词。类别不平衡时，拒绝将准确率作为唯一指标。指出子词丰富的语言（德语、芬兰语、土耳其语）需要 FastText 或 Transformer 嵌入（Embedding），而不是词级 TF-IDF。
