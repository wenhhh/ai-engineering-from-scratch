---
name: skill-probability-reasoning
description: 为给定的机器学习（ML）问题选择合适的概率分布
version: 1.0.0
phase: 1
lesson: 6
tags: [probability, distributions, modeling]
---

# 概率分布选择（Probability Distribution Selection）

在数据建模、设计损失函数或设定先验时，如何选择合适的分布。

## 决策检查清单（Decision Checklist）

1. 结果是离散的（类别、计数），还是连续的（测量值、得分）？
2. 结果有界（例如 [0, 1]）还是无界？
3. 有多少种可能结果？两种？k 种？无限种？
4. 数据对称还是偏斜？
5. 事件相互独立还是相关？
6. 你要建模的是发生率、计数、比例，还是测量值？

## 分布决策树（Distribution decision tree）

```
变量是否离散？
  是 --> 只有 2 种结果？ --> 伯努利分布（Bernoulli）(p)
     |    k 种结果，一次试验？ --> 类别分布（Categorical）(p1...pk)
     |    k 种结果，n 次试验？ --> 多项分布（Multinomial）(n, p1...pk)
     |    n 次试验的成功次数？ --> 二项分布（Binomial）(n, p)
     |    每个区间的事件次数？ --> 泊松分布（Poisson）(lambda)
     |    首次成功所需的试验次数？ --> 几何分布（Geometric）(p)
     |    达到 r 次成功所需的试验次数？ --> 负二项分布（Negative Binomial）(r, p)
  否 --> 对称、钟形？ --> 正态分布（Normal）(mu, sigma)
     |   正值、右偏？ --> 对数正态分布（Log-normal）或指数分布（Exponential）
     |   限于 [0, 1]？ --> 贝塔分布（Beta）(alpha, beta)
     |   正值、形状灵活？ --> 伽马分布（Gamma）(alpha, beta)
     |   事件之间的时间间隔？ --> 指数分布（Exponential）(lambda)
     |   需要重尾？ --> 学生 t 分布（Student's t）(nu) 或柯西分布（Cauchy）
     |   多变量、钟形？ --> 多元正态分布（Multivariate Normal）
     |   位于单纯形（总和为 1）？ --> 狄利克雷分布（Dirichlet）(alpha)
```

## 将实际机器学习场景映射到分布（Mapping real-world ML scenarios to distributions）

| 场景 | 分布 | 参数 |
|---|---|---|
| 二分类输出 | 伯努利分布 | p = sigmoid(logit) |
| 多分类输出 | 类别分布 | p = softmax(logits) |
| 语言模型的词元预测 | 词表上的类别分布 | p 来自 softmax |
| 像素强度（归一化） | 贝塔分布或 [0, 1] 上的均匀分布 | 取决于图像统计量 |
| 文档中的词数 | 泊松分布 | lambda = 平均词数 |
| 用户请求之间的间隔 | 指数分布 | lambda = 请求率 |
| 测量误差 | 正态分布 | mu = 0，sigma 来自数据 |
| 权重初始化 | 正态或均匀分布 | Kaiming/Xavier 规则 |
| 变分自编码器（VAE）潜在空间先验 | 标准正态分布 | mu = 0, sigma = 1 |
| 比例的贝叶斯先验 | 贝塔分布 | alpha、beta 来自先验信念 |
| 类别权重的贝叶斯先验 | 狄利克雷分布 | alpha 向量 |
| 回归目标中的噪声 | 正态分布 | mu = 0，sigma 由估计得到 |
| 对离群值稳健的回归 | 学生 t 分布 | 低自由度 |
| 持续时间或寿命建模 | 威布尔分布（Weibull）或伽马分布 | 形状与尺度 |
| 每篇文档的主题分布（潜在狄利克雷分配，Latent Dirichlet Allocation，LDA） | 狄利克雷分布 | alpha < 1 时稀疏 |

## 分布选错时（When distributions go wrong）

- 数据有严格下界（如价格、距离）时却使用正态分布。正态分布会给负值分配非零概率，应改用对数正态或伽马分布。
- 方差不等于均值时使用泊松分布。泊松分布假设均值 = 方差。如果方差 > 均值，使用负二项分布。
- 用伯努利分布处理多分类问题。伯努利分布严格限定为二分类；k > 2 时使用类别分布。
- 观测值相关时却假设独立。时间序列、空间数据和分组数据违反独立性，应使用自回归模型或层次模型。

## 常见错误（Common mistakes）

- 将 PDF 值与概率混淆。PDF 可以超过 1，对区间上的 PDF 积分才得到概率。
- 忘记 softmax 输出的是类别概率，而不是相互独立的伯努利概率。其构造保证总和为 1。
- 已有领域知识时仍使用均匀先验。选择恰当的信息性先验可以降低方差而不使结果产生偏差。
- 将对数概率当作概率。对数概率始终为负（或零），其和不为 1。

## 速查：分布性质（Quick reference: distribution properties）

| 分布 | 支持集（Support） | 均值 | 方差 | 关键性质 |
|---|---|---|---|---|
| 伯努利分布 Bernoulli(p) | {0, 1} | p | p(1-p) | 最简单的离散分布 |
| 二项分布 Binomial(n, p) | {0..n} | np | np(1-p) | n 个伯努利变量之和 |
| 泊松分布 Poisson(lam) | {0, 1, 2, ...} | lam | lam | 均值 = 方差 |
| 正态分布 Normal(mu, s^2) | (-inf, inf) | mu | s^2 | 给定均值和方差时熵最大 |
| 指数分布 Exponential(lam) | [0, inf) | 1/lam | 1/lam^2 | 无记忆性 |
| 贝塔分布 Beta(a, b) | [0, 1] | a/(a+b) | ab/((a+b)^2(a+b+1)) | 二项分布的共轭先验 |
| 伽马分布 Gamma(a, b) | (0, inf) | a/b | a/b^2 | 泊松分布的共轭先验 |
| 狄利克雷分布 Dirichlet(alpha) | 单纯形 | alpha_i/sum | （见公式） | 类别分布的共轭先验 |
