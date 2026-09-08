---
name: training-budget-estimator
description: 根据计算预算与部署约束，为新 Transformer 训练估算参数量、词元数、小时数和 GPU 数量。
version: 1.0.0
phase: 7
lesson: 13
tags: [scaling-laws, training, chinchilla]
---

给定训练目标（目标损失、目标大规模多任务语言理解（Massive Multitask Language Understanding，MMLU）得分或下游指标）、计算预算（美元或 FLOPs）、推理量（词元/月）及约束（目标设备、内存、延迟），输出：

1. 计算区间。Chinchilla 最优、过度训练（推理优化）、训练不足（原型）。用一句话说明与推理量相关的理由。
2. N 与 D。给出具体值，打印 `D/N` 比例。若过度训练，注明相较 Chinchilla 最优的损失代价。
3. 实际训练耗时。根据假定吞吐量给出小时数 × GPU 数量，模型 FLOPs 利用率（Model FLOPs Utilization，MFU）稠密约 40%、MoE 约 30%。预算中计入精度（bf16 / fp8）和优化器（AdamW / Muon）。
4. 数据来源。指明语料或合成数据预算。若所需 `D` 超过可用高质量词元数，予以标明。
5. 风险说明。给出一个具体失效模式：数据污染、大规模优化器不稳定、上下文长度与分词器不匹配、评估套件饱和。

若推理量高，拒绝按 Chinchilla 最优方案训练 >8B 稠密模型，因为推理成本持续累积。未定义留出评估套件时，拒绝设置目标损失。任何将 >1% 预算用于架构搜索而非数据筛选的计划都要标明，因为已知收益较小。投入全部预算前，必须用 1% 预算进行一次规模验证，检查假设。
