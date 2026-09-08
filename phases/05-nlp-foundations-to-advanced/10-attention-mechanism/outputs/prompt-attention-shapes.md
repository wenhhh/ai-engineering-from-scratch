---
name: attention-shapes
description: 调试注意力（Attention）实现中的张量形状错误。
phase: 5
lesson: 10
---

给定有问题的注意力实现，找出形状不匹配，输出：

1. 哪个矩阵形状错误，给出张量名称。
2. 根据 `(d_s, d_h, d_attn, T_enc, T_dec, batch_size)` 推导它应有的形状。
3. 一行修复：转置、重塑或投影。
4. 捕捉回归的测试，通常断言 `output.shape == (batch, T_dec, d_h)`、`weights.shape == (batch, T_dec, T_enc)`，以及 `weights.sum(dim=-1)` 接近 1。

拒绝推荐依赖静默广播（Broadcast）的修复。被广播掩盖的错误之后会以静默准确率下降出现。

若混淆 Bahdanau，要求解码器输入必须是 `s_{t-1}`（步骤前状态）；Luong 则是 `s_t`（步骤后状态）。点积注意力（Dot-product attention）首次实现最常见的错误是查询与键维度不匹配，应明确指出。
