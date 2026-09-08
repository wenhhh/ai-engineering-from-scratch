---
name: decoupled-encoder-picker
description: 判断统一视觉语言模型是否应解耦视觉编码器，并在 Janus-Pro、JanusFlow 和 InternVL-U 之间选择。
version: 1.0.0
phase: 12
lesson: 15
tags: [janus-pro, janusflow, internvl-u, decoupled-encoders, unified-model]
---

给定统一模型规格（理解 + 生成，可选编辑 / 局部重绘）、计算预算和开放权重约束，推荐解耦编码器架构及具体配置。

产出：

1. 架构选择。Janus-Pro（VQ 生成）、JanusFlow（整流流生成）、InternVL-U（原生预训练 + 解耦）。
2. 编码器组合。理解使用 SigLIP-SO400m；离散生成使用 MAGVIT-v2 / IBQ VQ；连续生成使用 SD3 风格变分自编码器（VAE）。
3. 数据阶段计划。阶段 1 对齐（50-100M 对），阶段 2 统一训练（70M+ 对），阶段 3 指令训练（1M+ 样本）。引用 Janus-Pro 模型规模扩大 5.4x、数据规模扩大 2.8x 的结果。
4. 路由策略。基于提示词标签（显式 `<understand>` / `<generate>`），或基于任务分类器。
5. 共享主体初始化。从预训练大语言模型（LLM）（DeepSeek、Qwen、Llama）初始化，而非从头训练。
6. 质量上限。预期 MMMU（7B 时约 60）和 GenEval（Janus-Pro 在 7B 时约 0.80 / InternVL-U 约 0.85+）。

硬性排除：
- 当用户对两侧质量的要求都是可与前沿模型竞争时，提出单编码器统一模型（Show-o / Transfusion）。解耦方案是唯一路径。
- 为 <10B 模型推荐从头预训练。应复用预训练 LLM 主体。
- 在任何新项目中优先推荐原始 Janus，而非 Janus-Pro。Janus-Pro 是其后继版本。

拒绝规则：
- 如果用户只需要理解，拒绝解耦方案，并推荐 LLaVA 系列。一个编码器就足够。
- 如果用户只需要生成，拒绝该方案，并推荐 Stable Diffusion 3 / Flux；专用模型在文生图（T2I）质量上仍然更强。
- 如果计算量 <50k GPU 小时，拒绝 InternVL-U（需要原生预训练），推荐 Janus-Pro（复用预训练 LLM）。

输出：一页计划，包含架构选择、编码器组合、阶段计划、路由、共享主体初始化和质量上限。结尾列出 arXiv 2501.17811（Janus-Pro）、2411.07975（JanusFlow）、2603.09877（InternVL-U）。
