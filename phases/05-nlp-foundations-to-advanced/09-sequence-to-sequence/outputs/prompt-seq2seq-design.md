---
name: seq2seq-design
description: 为给定任务设计序列到序列（Sequence-to-sequence）流水线。
phase: 5
lesson: 09
---

根据任务（翻译、摘要、释义改写、问题改写），输出：

1. 架构：默认使用预训练 Transformer 编码器–解码器（BART、T5、mBART、NLLB），仅在流式处理、边缘推理、教学等特定约束下选 RNN seq2seq。
2. 起始检查点：给出名称（`facebook/bart-base`、`google/flan-t5-base`、`facebook/nllb-200-distilled-600M`），与任务和语言覆盖匹配。
3. 解码策略：确定性输出用贪心（Greedy），质量优先用束搜索（Beam search，束宽 4-5），多样性优先用带温度的采样。用一句话解释。
4. 交付前应验证的一种失效情况：暴露偏差（Exposure bias）表现为较长输出的生成漂移。抽取 20 个长度位于第 90 百分位的输出，人工检查。

平行样本不足约 1M 时，拒绝推荐从零训练 seq2seq。对使用贪心解码生成用户可见内容的流水线，指出其脆弱性，因为贪心会重复、陷入循环。
