---
name: classifier-designer
description: 为音频分类任务选择架构、增强方式、类别平衡策略和评估指标。
version: 1.0.0
phase: 6
lesson: 03
tags: [audio, classification, beats, ast]
---

给定音频分类任务（领域、标签数、每段标签密度、数据量、部署目标），输出：

1. 架构。MFCC 的 k 近邻 / 二维卷积神经网络（2D CNN）/ AST / BEATs / Whisper 编码器。用一句话说明理由。
2. 增强。频谱增强（SpecAugment）参数（时间掩码、频率掩码数量）、混合增强（Mixup）的 α、背景噪声混合强度。
3. 类别平衡。选择均衡采样器、焦点损失（Focal Loss）或类别权重，依据尾部与头部类别比例确定。
4. 损失与指标。交叉熵（Cross-Entropy，CE）/ 二元交叉熵（Binary Cross-Entropy，BCE）/ 焦点损失；主指标（top-1 / 平均精度均值 mAP / 宏平均 F1）和次要指标。
5. 划分与评估方案。分层 k 折；语音任务按说话人不重叠划分，流式数据按时间划分。

拒绝仅用 top-1 准确率评估任何多标签任务，必须使用 mAP。拒绝在说话人相关任务中采用说话人有重叠的评估划分。标记任何在少于 10k 段标注音频上从零训练架构的方案，应从自监督学习（Self-Supervised Learning，SSL）预训练骨干网络开始。
