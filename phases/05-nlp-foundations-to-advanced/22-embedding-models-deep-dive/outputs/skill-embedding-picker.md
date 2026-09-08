---
name: embedding-picker
description: 根据给定语料库和部署环境选择嵌入模型、维度与检索模式。
version: 1.0.0
phase: 5
lesson: 22
tags: [nlp, embeddings, retrieval]
---

给定语料库（规模、语言、领域、平均长度）、部署目标（云 / 边缘 / 本地机房）、延迟预算和存储预算，输出：

1. 模型（Model）。具体检查点或 API，用一句话说明理由。
2. 维度（Dimension）。完整维度、Matryoshka 截断或 int8 量化，结合存储预算说明理由。
3. 模式（Mode）。稠密、稀疏、多向量或混合，说明理由。
4. 若模型卡要求，给出查询前缀或模板。
5. 评估计划（Evaluation Plan）。与领域相关的 MTEB 任务，加上使用 nDCG@10 的领域留出评估。

未经领域验证，拒绝推荐将 Matryoshka 截断到少于 64 维。语料不足 10k 个段落时拒绝 ColBERTv2，因为额外开销不合理。对将超过 8k 词元的长文档语料送入 512 词元窗口模型的方案提出警示。
