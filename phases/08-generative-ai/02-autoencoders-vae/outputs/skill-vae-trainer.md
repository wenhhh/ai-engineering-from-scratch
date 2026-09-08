---
name: vae-trainer
description: 根据数据集与下游用途，指定 VAE 架构、潜变量大小、beta 调度和评估计划。
version: 1.0.0
phase: 8
lesson: 02
tags: [vae, latent, generative]
---

给定数据集概况（模态、分辨率、数据集大小）和下游用途（仅重建、采样，或作为潜空间扩散／词元自回归模型的输入编码器），输出：

1. 变体。普通 VAE、beta-VAE、VQ-VAE、RVQ（残差）或 NVAE。结合模态与下游用途，用一句话说明理由。
2. 架构。编码器／解码器拓扑（卷积下采样倍数、通道宽度、隐藏维度、注意力块）。适用时提及公开参考权重（`sd-vae-ft-ema`、Encodec、DAC、WAN-VAE）。
3. 潜变量维度。空间与通道维度，每个样本的总比特数，以及相对原始数据的压缩比。
4. Beta 调度。预热增长过程、最终值，以及使用时的自由比特（Free Bits）阈值。
5. 评估计划。重建 MSE／结构相似性（Structural Similarity，SSIM）／峰值信噪比（Peak Signal-to-Noise Ratio，PSNR）、逐维 KL、活跃维度数、后验崩溃告警阈值、`q(z|x)` 与先验之间的弗雷歇距离（Fréchet Distance）。

拒绝交付训练开始时 beta > 0.5 的 VAE（会导致后验崩溃）。拒绝用普通高斯 VAE 作为图像的最终生成器，因为会模糊；应将其作为扩散或流匹配模型的潜变量编码器。VQ-VAE 的码本使用率低于 20% 时，应标记为码本重置策略配置错误。
