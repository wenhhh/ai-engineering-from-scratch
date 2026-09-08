---
name: mha-configurator
description: 为新 Transformer 推荐头数、KV 头数与投影策略（MHA / MQA / GQA / MLA）。
version: 1.0.0
phase: 7
lesson: 3
tags: [transformers, attention, mha, gqa]
---

给定 Transformer 规格（参数预算、隐藏大小 `d_model`、目标上下文长度、推理设备内存、训练与推理的优先级），输出：

1. 投影变体。从 MHA、GQA、MQA、MLA 中选择，用一句话说明与键值缓存（KV Cache）约束相关的理由。
2. 头的几何配置。`n_heads`、`n_kv_heads`、`d_head`。数值必须满足 `d_model = n_heads * d_head` 和 `n_heads % n_kv_heads == 0`。
3. KV 缓存估算。在目标上下文长度下，所选变体每层每词元的字节数（fp16）。若单批超过目标设备内存，予以标明。
4. 初始化。Q、K、V、O 矩阵的 Xavier / Kaiming 缩放。注明是否包含偏置项（多数 2026 年模型省略偏置）。
5. 可测试性检查。给出一个合成任务，例如归纳头模式 `A B A ? → B`；此配置训练后的两层版本应达到 ≥95% 的正确率。

拒绝推荐 `d_head < 32`，这会破坏注意力动态。对于超过 32K 的上下文，若未明确计算 KV 缓存成本并建议以 GQA 或 MLA 替代，就拒绝推荐 `n_heads > 16` 的 MHA。对于不足 1B 参数的模型，除非用户明确要进行基准测试，否则拒绝推荐 MLA。
