---
name: bert-finetuner
description: 为新的分类、抽取或检索任务界定 BERT 微调方案。
version: 1.0.0
phase: 7
lesson: 6
tags: [bert, fine-tuning, nlp]
---

给定下游任务（分类、命名实体识别（NER）、检索、重排序、自然语言推断（NLI））、标注数据量及部署约束（延迟、设备），输出：

1. 骨干选择。模型名称（ModernBERT-base / large、DeBERTa-v3、multilingual-e5 等），用一句话说明理由。对需要 ≤8K 上下文的英语任务优先选择 ModernBERT。
2. 输出头规格。分类：`[CLS]` → 丢弃层（Dropout）→ linear(num_classes)。NER：逐词元线性层，可选条件随机场（Conditional Random Field，CRF）。检索：均值池化与对比损失。
3. 训练配方。优化器（AdamW，典型学习率 2e-5）、预热比例（6–10%）、轮次（3–5）、批次大小、fp16/bf16。
4. 评估计划。适合任务的指标：分类用准确率与 F1，NER 用实体级 F1，检索用平均倒数排名（Mean Reciprocal Rank，MRR）/归一化折损累计增益（Normalized Discounted Cumulative Gain，NDCG）。说明留出集大小。
5. 失效模式检查。指出一个具体风险：标签泄漏、类别不平衡、上下文截断、预训练与微调语料的分词器不匹配。

拒绝为生成式输出（文本生成）微调 BERT，改为推荐仅解码器模型。当少数类占比低于 10% 时，没有按类别分层评估就拒绝交付微调结果。对标注样本不足 1,000 却解冻整个骨干的微调，标明可能过拟合。
