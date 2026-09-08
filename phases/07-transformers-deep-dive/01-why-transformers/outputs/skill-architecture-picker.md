---
name: sequence-architecture-picker
description: 根据长度、吞吐量和训练预算选择序列架构（RNN、Transformer、SSM、混合架构）。
version: 1.0.0
phase: 7
lesson: 1
tags: [transformers, architecture, rnn, ssm]
---

给定序列问题（最大长度、批次形状、训练词元预算、推理延迟目标、设备类别），输出：

1. 主架构。从 Transformer、状态空间模型（State-Space Model，SSM，如 Mamba/RWKV）、混合 SSM+注意力（Attention）、循环神经网络（Recurrent Neural Network，RNN）中选择。用一句话说明与主导约束相关的理由。
2. 上下文长度策略。若为 Transformer：完整注意力截止长度、滑动窗口大小、旋转位置嵌入（Rotary Position Embedding，RoPE）缩放因子。若为 SSM：扫描分块大小。若为 RNN：隐藏层宽度。
3. 训练浮点运算量（Floating-Point Operations，FLOPs）概况。根据架构和上下文估算每词元 FLOPs，并说明规格是否符合计算预算。
4. 推理内存概况。Transformer 的键值缓存（Key-Value Cache，KV Cache）、SSM 的状态大小、RNN 的每词元内存。标明目标设备能否容纳批次大小为 1 的单批数据。
5. 风险说明。指出该选择在指定规模下一个已知的具体失效模式，例如没有 Flash Attention 时，64K 上下文的 Transformer 在 24GB GPU 上内存不足。

对于超过 1B 个词元的训练，若未明确说明梯度流与并行性代价，就拒绝推荐纯 RNN。对于 >64K 上下文，若未说明 `O(N^2)` 内存成本，就拒绝推荐完整注意力 Transformer。对全新架构（发表不足 12 个月），若未指定备用方案，就拒绝推荐用于生产。
