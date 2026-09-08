---
name: skill-information-theory
description: 将信息论（Information Theory）概念应用于机器学习损失函数、模型评估和特征选择
version: 1.0.0
phase: 1
lesson: 9
tags: [information-theory, entropy, loss-functions]
---

# 面向机器学习的信息论（Information Theory for ML）

何时在机器学习系统中使用熵、交叉熵、KL 散度和互信息。

## 决策检查清单（Decision Checklist）

1. 衡量单个分布的不确定性？使用**熵（Entropy）**。
2. 衡量模型对真实标签的逼近程度？使用**交叉熵（Cross-entropy）**，也就是分类损失。
3. 衡量两个分布之间的距离？使用 **KL 散度（Kullback–Leibler Divergence，KL）**。
4. 检查两个变量是否相关？使用**互信息（Mutual Information）**。
5. 报告语言模型质量？使用**困惑度（Perplexity）**，即交叉熵的指数。
6. 将一个模型蒸馏到另一个模型？最小化从教师到学生的 **KL 散度**。

## 各度量的适用场景（When to use each measure）

| 度量 | 公式 | 使用场景 | 机器学习应用 |
|---|---|---|---|
| 熵 H(P) | -sum(p log p) | 分布有多不确定？ | 数据复杂度、最大熵模型 |
| 交叉熵 H(P,Q) | -sum(p log q) | 模型 Q 预测真实 P 的效果如何？ | 分类损失、语言模型损失 |
| KL 散度 D(P\|\|Q) | sum(p log(p/q)) | P 与 Q 差异多大？ | VAE 损失（证据下界，Evidence Lower Bound，ELBO）、知识蒸馏、RLHF |
| 互信息 I(X;Y) | H(X) - H(X\|Y) | Y 提供多少关于 X 的信息？ | 特征选择、表示学习 |
| 困惑度 | exp(H(P,Q)) 或 2^H | 模型有多困惑？ | 语言模型评估 |
| 条件熵 H(X\|Y) | -sum(p(x,y) log p(x\|y)) | 知道 Y 后 X 剩余的不确定性 | 特征的信息量 |

## 关键关系（Key relationships）

```
交叉熵        = 熵 + KL 散度
H(P, Q)        = H(P)   + D_KL(P || Q)

由于训练中 H(P) 恒定：
  最小化交叉熵 = 最小化 KL 散度

互信息 = 熵 - 条件熵
I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)

困惑度 = exp(以奈特为单位的交叉熵)
       = 2^(以比特为单位的交叉熵)
```

## 速查：公式与单位（Quick reference: formulas and units）

| 公式 | 比特（Bits，以 2 为底） | 奈特（Nats，以 e 为底） |
|---|---|---|
| 信息量：-log(p) | -log2(p) | -ln(p) |
| 熵：-sum(p log p) | 比特 | 奈特 |
| 1 nat = | 1.4427 bits | 1 nat |
| PyTorch 默认 | -- | 奈特 |
| 信息论论文 | 比特 | -- |

## 解读数值（Interpreting values）

| 熵值 | 含义 |
|---|---|
| 0 | 确定性。某个结果的概率为 1。 |
| log(n) | 最大不确定性。n 个结果上的均匀分布。 |
| 低 | 分布集中，模型有信心。 |
| 高 | 分布平坦，模型不确定。 |

| 困惑度值 | 语言模型质量 |
|---|---|
| 1 | 完美预测（实践中不会发生） |
| 10 | 平均相当于从约 10 个等可能词元中选择 |
| 50 | 标准基准上的 GPT-2 水平 |
| < 10 | 在数据充分覆盖的领域中达到最先进水平 |

## 常见错误（Common mistakes）

- 计算 KL 散度后将其视为对称量。D_KL(P||Q) != D_KL(Q||P)。若需要对称度量，使用詹森–香农散度（Jensen-Shannon Divergence）：JS = 0.5 * KL(P||M) + 0.5 * KL(Q||M)，其中 M = 0.5*(P+Q)。
- 忘记独热标签的交叉熵可简化为 -log(p_true_class)。真实分布为独热时，无需对所有类别求和。
- 代码使用以 2 为底的对数，却报告奈特（或反过来）。PyTorch 默认使用自然对数。奈特乘以 log2(e) = 1.4427 即可转为比特。
- 计算空事件或零概率事件的熵。约定 0 * log(0) = 0，因为 lim(p->0) p*log(p) = 0。
- 跨不同词表比较困惑度。词表大小 50k、困惑度 30 的模型，不能直接与词表大小 10k、困惑度 30 的模型比较。

## 各概念在生产机器学习中的位置（Where each concept appears in production ML）

| 概念 | 出现场景 |
|---|---|
| 交叉熵损失 | 每个分类模型（nn.CrossEntropyLoss） |
| KL 散度 | VAE 的 ELBO、近端策略优化（Proximal Policy Optimization，PPO）裁剪、知识蒸馏 |
| 熵正则化（Entropy Regularization） | 强化学习（Reinforcement Learning，RL）的探索奖励（熵越高 = 探索越多） |
| 互信息 | 特征选择、InfoNCE 损失（对比学习） |
| 困惑度 | 语言模型基准（越低越好） |
| 标签平滑（Label Smoothing） | 用软目标替代独热目标，减轻交叉熵导致的过度自信 |
| 温度缩放（Temperature Scaling） | softmax 前将 logits 除以 T，控制输出的熵 |
