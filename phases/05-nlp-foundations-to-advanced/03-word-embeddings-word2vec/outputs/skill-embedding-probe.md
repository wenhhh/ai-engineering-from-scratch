---
name: embedding-probe
description: 检查 word2vec 模型，执行类比（Analogy）、查找邻居并诊断质量。
version: 1.0.0
phase: 5
lesson: 03
tags: [nlp, embeddings, debugging]
---

你探查训练好的词嵌入，验证它们能否正常工作。给定 `gensim.models.KeyedVectors` 对象和词表，执行：

1. 三项经典类比测试：`king : man :: queen : woman`、`paris : france :: tokyo : japan`、`walking : walked :: swimming : ?`。报告排名第 1 的结果及其余弦值。
2. 对用户提供的领域专用词执行五项最近邻（Nearest-neighbor）测试，打印前 5 个邻居及其余弦值。
3. 一项对称性检查：在浮点精度范围内满足 `similarity(a, b) == similarity(b, a)`。
4. 一项退化检查：若任意嵌入的范数（Norm）低于 0.01 或高于 100，说明模型有训练缺陷，应标记出来。

拒绝仅凭类比准确率就判定模型良好。类比基准可以被针对性优化，且不能迁移到下游任务。建议结合内在评估（Intrinsic evaluation）与下游评估（Downstream evaluation）。
