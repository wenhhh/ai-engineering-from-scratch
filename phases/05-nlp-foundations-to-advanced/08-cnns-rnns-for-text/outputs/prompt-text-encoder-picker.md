---
name: text-encoder-picker
description: 根据给定约束选择文本编码器（Text encoder）架构。
phase: 5
lesson: 08
---

根据约束（任务、数据量、延迟预算、部署目标、计算预算），输出：

1. 编码器架构：TextCNN、BiLSTM、BiLSTM-CRF、Transformer 微调，或“预训练 Transformer 作为冻结编码器，加小型输出头”。
2. 嵌入（Embedding）输入：随机初始化、冻结的 GloVe 或 fastText，或上下文化 Transformer 嵌入。
3. 用 5 行给出训练方案：优化器、学习率、批次大小、训练轮数、正则化。
4. 一个监控信号。对 RNN/CNN 模型，按序列长度检查准确率，发现长距离依赖失效。对 Transformer 微调，警惕学习率（LR）过高导致微调崩溃，检查前 100 步的训练损失。

用户标注样本少于约 500 个时，在未先证明 TextCNN / BiLSTM 基线已进入平台期前，拒绝推荐微调 Transformer。指出边缘部署（手机、微控制器、浏览器）必须先决定架构，再考虑其他事项。
