---
name: positional-encoding-picker
description: 根据上下文长度和训练预算选择位置编码（RoPE、ALiBi、正弦）与缩放策略。
version: 1.0.0
phase: 7
lesson: 4
tags: [transformers, positional-encoding, rope, alibi]
---

给定 Transformer 规格（推理目标上下文长度、训练上下文长度、外推需求、以词元计的微调预算），输出：

1. 基础编码。从 RoPE、ALiBi、正弦编码、可学习绝对位置编码中选择，用一句话说明理由。
2. 超参数。若为 RoPE：`base` 值、`d_head` 的偶数拆分要求。若为 ALiBi：斜率公式。若为正弦编码：`max_len`。
3. 扩展策略。若目标长度 > 训练长度：给出 NTK 感知缩放因子、YaRN 配置、LongRoPE 规格或位置插值比例。说明微调词元预算。
4. 测试计划。最大上下文下的大海捞针（Needle-in-a-Haystack，NIAH）通过率目标，以及相对训练长度基线的困惑度差距应在 X 以内。
5. 备用方案。长上下文评估失败时如何处理：用更大的 `base` 重新训练、切换 ALiBi 或限制部署上下文长度。

拒绝为 2026 年的新模型推荐正弦或可学习绝对位置编码：它们不能外推，现代技术栈均假设使用 RoPE 或 ALiBi。没有微调阶段时，拒绝将 RoPE 扩展到训练长度的 8 倍以上。没有在完整部署长度上运行 NIAH 时，拒绝交付长上下文配置。
