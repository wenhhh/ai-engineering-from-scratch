---
name: img2img-chooser
description: 根据成对或无配对数据、领域专一程度及延迟预算，选择图像到图像方法。
version: 1.0.0
phase: 8
lesson: 04
tags: [pix2pix, img2img, conditional]
---

给定任务描述（源领域、目标领域、数据可用性：成对／无配对／N 个样本、延迟预算、质量门槛），输出：

1. 方法。Pix2Pix（成对、窄领域）、Pix2PixHD（成对、高分辨率）、CycleGAN（无配对）、SPADE（分割到图像），或 SD3／Flux.1 上的 ControlNet 变体（通用、开放领域）。
2. 训练数据规范。最少配对数、分辨率、数据增强、许可证考虑。
3. 架构。G（U-Net 深度、通道宽度）、D（PatchGAN 感受野、谱归一化）、损失权重（对抗、L1、VGG 感知损失）。
4. 推理延迟。单个消费级 GPU（RTX 4090、M3 Max）上的目标毫秒／图像，以及分辨率权衡。
5. 评估。在留出的成对数据上计算学习感知图像块相似度（LPIPS），在 5k 样本上计算弗雷歇起始距离（FID），计算任务专用指标（分割任务的平均交并比（Mean Intersection over Union，mIoU）、超分辨率的峰值信噪比（PSNR））并评估人类偏好。

数据无配对时拒绝推荐 Pix2Pix，改用 CycleGAN 或 ControlNet。少于 500 对数据时，若没有数据增强／预训练建议，拒绝训练成对模型。标记任何提到“任意文本提示词”的请求，这类需求应使用扩散加 ControlNet，而非成对 GAN。
