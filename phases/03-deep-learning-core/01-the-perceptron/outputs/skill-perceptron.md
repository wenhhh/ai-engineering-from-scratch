---
name: skill-perceptron
description: 理解感知机（Perceptron）模式，以及何时使用单层或多层架构
version: 1.0.0
phase: 3
lesson: 1
tags: [perceptron, neural-networks, classification, deep-learning]
---

# 感知机模式（The Perceptron Pattern）

感知机（Perceptron）计算输入的加权和并加上偏置（Bias），再应用阶跃函数（Step Function）产生二元输出。它是神经网络（Neural Network）的基本单元。

```
output = step(w1*x1 + w2*x2 + ... + wn*xn + bias)
```

## 单个感知机何时足够（When a single perceptron is enough）

- 问题是线性可分的（Linearly Separable）：一条直线（或超平面，Hyperplane）就能分开两个类别
- 逻辑门：与（AND）、或（OR）、非（NOT）、与非（NAND）
- 简单的阈值决策：“分数是否高于 X？”
- 数据聚集在两个互不重叠区域中的二元分类器（Binary Classifier）

## 何时需要多层网络（When you need multiple layers）

- 问题线性不可分：不存在一条直线能分开各类别
- 异或（XOR）和奇偶校验（Parity）问题
- 任何需要“满足这个条件，但不满足那个条件”推理的任务（条件组合）
- 现实中的分类：图像、文本、音频，几乎总是非线性的

## 决策检查清单（Decision checklist）

1. 绘图或检查数据。能否用一条笔直的边界分开各类别？
   - 能：单个感知机就够了
   - 不能：至少需要两层
2. 能否将问题分解成更简单的线性决策的 AND/OR 组合？
   - 这种分解可以确定所需的最小网络结构
   - XOR = (A OR B) AND (NOT (A AND B)) = 分为 2 层的 3 个感知机
3. 对于类别数超过两个的问题，每个类别需要一个输出节点

## 训练规则（The training rule）

```
error = expected - predicted
weight_new = weight_old + learning_rate * error * input
bias_new = bias_old + learning_rate * error
```

预测正确时不作任何修改；预测错误时调整权重以减小误差。这条规则只适用于单层感知机，多层网络需要反向传播（Backpropagation）。

## 常见错误（Common mistakes）

- 试图用单个感知机学习非线性模式（它永远不会收敛）
- 学习率（Learning Rate）设得过高（权重振荡）或过低（训练耗时过长）
- 忘记偏置项（没有它，决策边界必须经过原点）
- 混淆感知机的收敛性（对线性可分数据有保证）与一般神经网络的收敛性（没有保证）
