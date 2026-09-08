---
name: generative-model-chooser
description: 根据任务和预算选择生成模型类别、骨干及托管替代方案。
version: 1.0.0
phase: 8
lesson: 01
tags: [generative, taxonomy]
---

给定任务描述（模态、领域、延迟预算、计算预算、条件信号），输出：

1. 类别。显式可计算、显式近似（VAE／扩散）、隐式（GAN）、分数／流匹配（Flow Matching），或词元自回归（Token-AR）。结合模态和延迟用一句话说明理由。
2. 骨干与开放参考。提供一个用户现在即可微调的预训练开放权重模型（如 Stable Diffusion 3、Flux.1-dev、AudioCraft 2、StyleGAN3、3D Gaussian Splatting）。
3. 托管替代方案。按质量、成本与延迟的权衡，对三个生产 API 排序（fal.ai、Replicate、Stability、Runway、Veo、Kling、ElevenLabs 等）。
4. 失效模式。说明所选类别的已知问题（模式崩溃（Mode Collapse）、暴露偏差（Exposure Bias）、采样器漂移、分词器伪影、钻 CLIP 分数的空子）。
5. 预算。估算单张 A100 的训练小时数、每个样本的推理成本和最低显存要求。

任务需要似然评分时，拒绝推荐 GAN。高分辨率实时应用中，拒绝推荐像素级自回归。当列出的开放骨干已经覆盖领域时，对任何“从零训练”的建议提出警示。
