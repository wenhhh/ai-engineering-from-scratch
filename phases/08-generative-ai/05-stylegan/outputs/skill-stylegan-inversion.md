---
name: stylegan-inversion
description: 为预训练 StyleGAN 处理真实照片选择反演与编辑流水线。
version: 1.0.0
phase: 8
lesson: 05
tags: [stylegan, inversion, editing]
---

给定真实照片、预训练 StyleGAN 检查点（FFHQ-1024、StyleGAN-XL、自定义微调）及目标编辑（年龄、微笑、姿态、头发、保持身份），输出：

1. 反演方法。e4e（快、保真度低）、ReStyle（迭代编码器）、HyperStyle（超网络）、关键点调优（Pivotal Tuning，PTI），或直接 W 优化。结合保真度与速度，用一句话说明理由。
2. 目标空间。W、W+ 或 StyleSpace。权衡：W 最解耦但保真度最低，W+ 使用逐层 w，StyleSpace 是通道级。
3. 编辑方向。给出方向来源名称：InterFaceGAN（基于 SVM）、StyleSpace 通道、GANSpace 主成分分析（Principal Component Analysis，PCA），或学习得到的分类器。
4. 保真预算。身份漂移前的学习感知图像块相似度（LPIPS）阈值；回滚启发式规则。
5. 评估。身份相似度（ArcFace 余弦）、与原图的 LPIPS、编辑强度（目标属性分类器分数）。

拒绝直接在 Z 中编辑的流水线，因为它是纠缠的。没有身份检查时拒绝大幅编辑（W 中 &gt;1.5 sigma）。标记需要开放领域编辑的请求（如“把他变成卡通人物”），它们需要扩散加 IP-Adapter，而不是 StyleGAN。
