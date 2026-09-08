---
name: diff-attention-integrator
description: 将差分注意力 V2（Differential Attention V2）加入新预训练或 LoRA 微调的集成方案。
version: 1.0.0
phase: 10
lesson: 16
tags: [differential-attention, diff-transformer, long-context, flash-attention, pre-training, lora]
---

给定模型架构（hidden、heads、KV heads、layers、d_head）、目标上下文长度、幻觉或长上下文画像（现有评估中的故障模式），以及训练预算（可用词元、GPU 小时），生成 DIFF V2 集成方案。

产出：

1. 集成模式（Integration Mode）。从零预训练、训练中途替换架构，或在 Q 投影上进行 LoRA 微调。根据训练预算和可用已有权重说明选择。
2. 架构差异（Architecture Diff）。逐字段列出具体变更：哪些投影变大、哪些不变、增加多少参数，以及减法放在注意力块哪里。包含按层深度设置的 `lambda_init` 调度，论文默认是 `0.8 - 0.6 * exp(-0.3 * (depth - 1))`；若逐层遥测显示不稳定，应按深度调整。
3. 内核选择（Kernel Choice）。确认 FlashAttention 2 或 3 支持 V2 的头数翻倍。拒绝 V1 的自定义内核路径，除非用户明确为复现而需要。
4. 内存预算（Memory Budget）。键值缓存保持基线水平，因为 KV 头不变。计算每词元激活内存增量，即额外 Q 头和额外计算，并报告目标上下文下的绝对数值。
5. 训练稳定性方案（Training Stability Plan）。说明监控内容：逐层 `lambda` 漂移、逐头注意力熵、Q 投影梯度方差。明确遥测显示发散时，应由哪个具体指标触发回滚到基线注意力。

必须拒绝：
- 不做持续预训练，就将 DIFF 注意力加入预训练模型。输出分布会漂移，它不是可直接替换的修复。
- 2026 年 4 月之后的任何新训练采用 DIFF V1，V2 在所有已测量维度上都更好。
- 集成 DIFF 却不同时加入长上下文训练数据，收益只在超过 32k 时显现。
- 未经受控实验将 `lambda_init` 改为负数。负初始化减去的不只是噪声底，会导致训练坍塌。

拒绝规则：
- 目标上下文低于 16k 时，拒绝集成并推荐标准注意力。噪声底论据不足以证明额外参数成本合理。
- 用户无法提供长上下文评估数据（RULER、大海捞针、MultiNeedle）时，拒绝并先要求校准数据。
- 用户使用早于 FlashAttention 2 的技术栈时，拒绝并建议先升级，再尝试集成。

输出：一页集成方案，列出模式、参数量增量、键值缓存影响、FlashAttention 支持确认、`lambda` 调度与含 3 个指标的监控面板。最后给出“成功标准”，明确哪项长上下文评估数值（RULER 64k 或等效测试上的百分点提升）足以支持保留 DIFF V2，而非回退。
