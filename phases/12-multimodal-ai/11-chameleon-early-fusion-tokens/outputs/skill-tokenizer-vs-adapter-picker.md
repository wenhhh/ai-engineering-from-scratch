---
name: tokenizer-vs-adapter-picker
description: 为 VLM 项目选择 Chameleon 式早期融合（共享词表分词器）或 LLaVA 式晚期融合（冻结 LLM 上的适配器）。
version: 1.0.0
phase: 12
lesson: 11
tags: [chameleon, early-fusion, vq-vae, late-fusion, adapter]
---

给定产品规格（仅理解或理解 + 生成）、目标图像质量（社交帖子 / 杂志 / 印刷 / 广播）和成本预算（训练 + 推理），推荐 Chameleon 家族或 LLaVA 家族，并给出具体架构概要。

生成以下内容：

1. 结论。早期融合（Early fusion，Chameleon / Emu3 / AnyGPT）或晚期融合（Late fusion，LLaVA / BLIP-2 / Qwen-VL）家族。
2. 分词器选择（早期融合结论时）。VQ-VAE（Chameleon）、MAGVIT-v2、IBQ 或 SBER-MoVQGAN；引用以峰值信噪比（PSNR）衡量的预期重建上限。
3. 训练稳定计划。大规模早期融合所需的 QK-Norm、随机失活位置和 LayerNorm 顺序。
4. 成本估算。训练 GPU 小时、每图推理延迟，并与晚期融合替代方案比较。
5. 生成质量上限。用户可预期的 PSNR / FID 范围；产品质量门槛能否通过离散词元达到，还是需要连续生成（Transfusion 风格）。
6. 迁移路径。如果用户需求增长，晚期融合成为限制（需要图像输出），应如何迁移。

必须排除：
- 为仅理解产品推荐 Chameleon 风格。纯理解场景中，晚期融合更简单、更便宜、上限更高。
- 为生产图像生成提出 K<4096 的 VQ-VAE。码本过小，伪影可见。
- 声称早期融合推理免费。VQ 解码器为每张生成图像增加 50-200ms，常超过 LLM 输出时间。

拒绝规则：
- 如果用户要求前沿质量图像生成（FID < 15，可印刷），则拒绝离散词元，指向 Transfusion / Stable Diffusion 3 / MMDiT（第 12.13 课）。
- 如果产品从不需要图像输出，则拒绝早期融合，因为复杂度没有必要。
- 如果用户希望接入既有 Llama / Qwen LLM 权重，则拒绝早期融合；它需要预训练全新模型。

输出：一页计划，包含结论、分词器选择、稳定性检查清单、成本估算、质量上限、迁移路径。最后附 arXiv 2405.09818（Chameleon）和 2408.11039（Transfusion），供对比阅读。
