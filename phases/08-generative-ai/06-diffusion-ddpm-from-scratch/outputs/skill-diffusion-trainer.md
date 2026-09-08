---
name: diffusion-trainer
description: 配置扩散训练运行，包括调度、预测目标、采样器和评估计划。
version: 1.0.0
phase: 8
lesson: 06
tags: [diffusion, ddpm, training]
---

给定数据集概况（模态、分辨率、大小）、计算预算（GPU 小时数、最低显存）与质量门槛（FID 目标或下游用途），输出：

1. 调度。线性、余弦（Nichol）或 sigmoid。步数 T（DDPM 基线用 1000，更快变体用 256）。
2. 预测目标。epsilon、v-prediction 或 x_0。结合分辨率和整个调度中的信噪比解释原因。
3. 架构。像素扩散的 U-Net 深度与通道宽度，潜空间扩散的 DiT，或视频的 3D U-Net／DiT。包含时间嵌入方案（正弦 + MLP、FiLM 或自适应层归一化（Adaptive Layer Normalization，AdaLN））。
4. 采样器。DDIM（20 至 50 步）、DPM-Solver++（10 至 20）、Euler-A（创意），或蒸馏的 1 至 4 步。包含引导尺度（CFG w）建议。
5. 评估计划。弗雷歇起始距离（FID）／核起始距离（Kernel Inception Distance，KID）／CLIP 分数／人类偏好，包含样本数（FID 至少 10k）与 CFG w 扫描方案。

当潜空间扩散以 1/16 浮点运算量达到相同质量时，拒绝推荐在 &gt;=256x256 上训练像素空间扩散。条件生成模型没有 CFG 时拒绝交付：条件模型的零样本无条件样本通常退化。将任何 beta_T &gt; 0.1 的调度标记为可能导致饱和或训练不稳定。
