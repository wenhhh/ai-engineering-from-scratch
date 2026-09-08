# 概率与分布（Probability and Distributions）

> 概率是 AI 表达不确定性所用的语言。

**Type:** Learn
**Language:** Python
**Prerequisites:** 阶段 1，第 01–04 课
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 从零实现伯努利分布、类别分布、泊松分布、均匀分布和正态分布的概率质量函数（Probability Mass Function，PMF）与概率密度函数（Probability Density Function，PDF）
- 计算期望值与方差，并用中心极限定理（Central Limit Theorem，CLT）解释高斯分布为何如此常见
- 使用数值稳定性技巧（减去最大的 logit）构建 softmax 和 log-softmax 函数
- 从逻辑值（Logits）计算交叉熵损失（Cross-entropy Loss），并将其与负对数似然（Negative Log-likelihood）联系起来

## 问题（The Problem）

分类器输出 `[0.03, 0.91, 0.06]`。语言模型从 50,000 个候选词中选择下一个词。扩散模型通过从学得的分布中采样来生成图像。这些都是概率在发挥作用。

模型做出的每个预测都是一个概率分布。每个损失函数都在衡量预测分布与真实分布相距多远。每一步训练都在调整参数，让一个分布更接近另一个分布。不懂概率，你就无法读懂机器学习（Machine Learning，ML）论文、调试模型，也无法理解训练损失为何变成 NaN。

## 概念（The Concept）

### 事件、样本空间与概率（Events, Sample Spaces, and Probability）

样本空间（Sample Space）S 是所有可能结果的集合。事件（Event）是样本空间的子集。概率把事件映射为 0 到 1 之间的数值。

```
抛硬币：
  S = {H, T}
  P(H) = 0.5,  P(T) = 0.5

掷一次骰子：
  S = {1, 2, 3, 4, 5, 6}
  P(even) = P({2, 4, 6}) = 3/6 = 0.5
```

三条公理定义了整个概率体系：
1. 对任意事件 A，P(A) >= 0
2. P(S) = 1（总有某个结果发生）
3. 当 A 和 B 不能同时发生时，P(A or B) = P(A) + P(B)

其余所有内容（贝叶斯定理、期望、分布）都由这三条规则推导而来。

### 条件概率与独立性（Conditional Probability and Independence）

P(A|B) 是在 B 已经发生的条件下 A 发生的概率。

```
P(A|B) = P(A and B) / P(B)

示例：一副扑克牌
  P(King | Face card) = P(King and Face card) / P(Face card)
                      = (4/52) / (12/52)
                      = 4/12 = 1/3
```

如果知道一个事件是否发生，并不能提供关于另一个事件的信息，那么这两个事件相互独立：

```
独立：   P(A|B) = P(A)
等价于： P(A and B) = P(A) * P(B)
```

多次抛硬币相互独立。不放回地抽牌则不是。

### 概率质量函数与概率密度函数（Probability Mass Functions vs Probability Density Functions）

离散随机变量使用概率质量函数（PMF）。每个结果都有一个可以直接读出的具体概率。

```
PMF: P(X = k)

公平骰子：
  P(X = 1) = 1/6
  P(X = 2) = 1/6
  ...
  P(X = 6) = 1/6

  所有概率之和 = 1
```

连续随机变量使用概率密度函数（PDF）。单点处的密度不是概率。对某一区间内的密度积分，才能得到概率。

```
PDF: f(x)

P(a <= X <= b) = integral of f(x) from a to b

f(x) 可以大于 1（它是密度，不是概率）
integral from -inf to +inf of f(x) dx = 1
```

这一区别在机器学习中很重要。分类输出是 PMF（离散选择）。变分自编码器（Variational Autoencoder，VAE）的潜在空间使用 PDF（连续变量）。

### 常见分布（Common Distributions）

**伯努利分布（Bernoulli）：** 一次试验，两种结果。用于二分类建模。

```
P(X = 1) = p
P(X = 0) = 1 - p
均值 = p,  方差 = p(1-p)
```

**类别分布（Categorical）：** 一次试验，k 种结果。用于多分类建模（softmax 输出）。

```
P(X = i) = p_i,  其中 p_i 的总和为 1
示例：P(cat) = 0.7,  P(dog) = 0.2,  P(bird) = 0.1
```

**均匀分布（Uniform）：** 所有结果等可能。用于随机初始化。

```
离散型：P(X = k) = 1/n for k in {1, ..., n}
连续型：f(x) = 1/(b-a) for x in [a, b]
```

**正态分布（Normal，又称 Gaussian，高斯分布）：** 钟形曲线，由均值（mu）和方差（sigma^2）参数化。

```
f(x) = (1 / sqrt(2*pi*sigma^2)) * exp(-(x - mu)^2 / (2*sigma^2))

标准正态分布：mu = 0, sigma = 1
  68% 的数据位于均值两侧 1 sigma 内
  95% 位于 2 sigma 内
  99.7% 位于 3 sigma 内
```

**泊松分布（Poisson）：** 固定区间内罕见事件的发生次数。用于事件发生率建模。

```
P(X = k) = (lambda^k * e^(-lambda)) / k!
均值 = lambda,  方差 = lambda
```

### 期望值与方差（Expected Value and Variance）

期望值（Expected Value）是各结果的加权平均。

```
离散型：   E[X] = sum of x_i * P(X = x_i)
连续型： E[X] = integral of x * f(x) dx
```

方差（Variance）衡量数据围绕均值的离散程度。

```
Var(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2
标准差 = sqrt(Var(X))
```

在机器学习中，期望值表现为损失函数（在数据分布上的平均损失）。方差反映模型的稳定性。梯度方差大意味着训练噪声大。

### 联合分布与边缘分布（Joint and Marginal Distributions）

联合分布（Joint Distribution）P(X, Y) 同时描述两个随机变量。

联合 PMF 示例（X = 天气，Y = 是否带伞）：

| | Y=0（不带伞） | Y=1（带伞） | 边缘分布 P(X) |
|---|---|---|---|
| X=0（晴天） | 0.40 | 0.10 | P(X=0) = 0.50 |
| X=1（雨天） | 0.05 | 0.45 | P(X=1) = 0.50 |
| **边缘分布 P(Y)** | P(Y=0) = 0.45 | P(Y=1) = 0.55 | 1.00 |

边缘分布（Marginal Distribution）通过对另一个变量求和将其消去：

```
P(X = x) = sum over all y of P(X = x, Y = y)
```

上表每行和每列的总和就是边缘分布。

### 正态分布为何无处不在（Why the Normal Distribution Shows Up Everywhere）

中心极限定理：许多独立随机变量的和（或平均值）会趋近正态分布，而不取决于原始分布。

```
掷 1 个骰子：均匀分布（平坦）
2 个骰子的平均值：三角形分布（有峰）
30 个骰子的平均值：近乎完美的钟形曲线

这适用于任意初始分布。
```

这解释了为什么：
- 测量误差近似服从正态分布（来自许多微小且独立的来源）
- 神经网络的权重初始化使用正态分布
- 随机梯度下降（Stochastic Gradient Descent，SGD）的梯度噪声近似服从正态分布（许多样本梯度之和）
- 在给定均值和方差时，正态分布是熵最大的分布

### 对数概率（Log Probabilities）

原始概率会带来数值问题。许多小概率相乘会迅速下溢为零。

```
P(sentence) = P(word1) * P(word2) * ... * P(word_n)
            = 0.01 * 0.003 * 0.02 * ...
            -> 0.0（约 30 项后下溢）
```

对数概率解决了这个问题：乘法变成加法。

```
log P(sentence) = log P(word1) + log P(word2) + ... + log P(word_n)
                = -4.6 + -5.8 + -3.9 + ...
                -> 有限数值（不会下溢）
```

规则：
- log(a * b) = log(a) + log(b)
- 对数概率始终 <= 0（因为 0 < P <= 1）
- 数值越负，发生的可能性越小
- 交叉熵损失就是正确类别概率的负对数

### 作为概率分布的 Softmax（Softmax as a Probability Distribution）

神经网络输出原始得分（logits）。Softmax 将它们转换为有效的概率分布。

```
softmax(z_i) = exp(z_i) / sum(exp(z_j) for all j)

性质：
  - 所有输出都位于 (0, 1)
  - 所有输出之和为 1
  - 保留输入的相对大小顺序
  - exp() 放大 logits 之间的差异
```

softmax 技巧：求指数之前减去最大的 logit，以防止溢出。

```
z = [100, 101, 102]
exp(102) = 溢出

z_shifted = z - max(z) = [-2, -1, 0]
exp(0) = 1（安全）

结果相同，但不会溢出。
```

Log-softmax 将 softmax 与 log 合并，以获得数值稳定性。PyTorch 内部使用它计算交叉熵损失。

### 采样（Sampling）

采样指从分布中抽取随机值。在机器学习中：
- 随机失活（Dropout）随机选择要置零的神经元
- 数据增强（Data Augmentation）采样随机变换
- 语言模型从预测分布中采样下一个词元（Token）
- 扩散模型采样噪声，再逐步去噪

从任意分布采样需要逆变换采样（Inverse Transform Sampling）、拒绝采样（Rejection Sampling）或重参数化技巧（Reparameterization Trick，用于 VAE）等技术。

```figure
gaussian-pdf
```

## 动手实现（Build It）

### 第 1 步：概率基础（Step 1: Probability basics）

```python
import math
import random

def factorial(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def combinations(n, k):
    return factorial(n) // (factorial(k) * factorial(n - k))

def conditional_probability(p_a_and_b, p_b):
    return p_a_and_b / p_b

p_king_given_face = conditional_probability(4/52, 12/52)
print(f"P(King | Face card) = {p_king_given_face:.4f}")
```

### 第 2 步：从零实现 PMF 和 PDF（Step 2: PMF and PDF from scratch）

```python
def bernoulli_pmf(k, p):
    return p if k == 1 else (1 - p)

def categorical_pmf(k, probs):
    return probs[k]

def poisson_pmf(k, lam):
    return (lam ** k) * math.exp(-lam) / factorial(k)

def uniform_pdf(x, a, b):
    if a <= x <= b:
        return 1.0 / (b - a)
    return 0.0

def normal_pdf(x, mu, sigma):
    coeff = 1.0 / (sigma * math.sqrt(2 * math.pi))
    exponent = -0.5 * ((x - mu) / sigma) ** 2
    return coeff * math.exp(exponent)
```

### 第 3 步：期望值与方差（Step 3: Expected value and variance）

```python
def expected_value(values, probabilities):
    return sum(v * p for v, p in zip(values, probabilities))

def variance(values, probabilities):
    mu = expected_value(values, probabilities)
    return sum(p * (v - mu) ** 2 for v, p in zip(values, probabilities))

die_values = [1, 2, 3, 4, 5, 6]
die_probs = [1/6] * 6
mu = expected_value(die_values, die_probs)
var = variance(die_values, die_probs)
print(f"Die: E[X] = {mu:.4f}, Var(X) = {var:.4f}, SD = {var**0.5:.4f}")
```

### 第 4 步：从分布中采样（Step 4: Sampling from distributions）

```python
def sample_bernoulli(p, n=1):
    return [1 if random.random() < p else 0 for _ in range(n)]

def sample_categorical(probs, n=1):
    cumulative = []
    total = 0
    for p in probs:
        total += p
        cumulative.append(total)
    samples = []
    for _ in range(n):
        r = random.random()
        for i, c in enumerate(cumulative):
            if r <= c:
                samples.append(i)
                break
    return samples

def sample_normal_box_muller(mu, sigma, n=1):
    samples = []
    for _ in range(n):
        u1 = random.random()
        u2 = random.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        samples.append(mu + sigma * z)
    return samples
```

### 第 5 步：Softmax 与对数概率（Step 5: Softmax and log probabilities）

```python
def softmax(logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    exps = [math.exp(z) for z in shifted]
    total = sum(exps)
    return [e / total for e in exps]

def log_softmax(logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = max_logit + math.log(sum(math.exp(z) for z in shifted))
    return [z - log_sum_exp for z in logits]

def cross_entropy_loss(logits, target_index):
    log_probs = log_softmax(logits)
    return -log_probs[target_index]
```

### 第 6 步：演示中心极限定理（Step 6: Central Limit Theorem demonstration）

```python
def demonstrate_clt(dist_fn, n_samples, n_averages):
    averages = []
    for _ in range(n_averages):
        samples = [dist_fn() for _ in range(n_samples)]
        averages.append(sum(samples) / len(samples))
    return averages
```

### 第 7 步：可视化（Step 7: Visualization）

```python
import matplotlib.pyplot as plt

xs = [mu + sigma * (i - 500) / 100 for i in range(1001)]
ys = [normal_pdf(x, mu, sigma) for x, mu, sigma in ...]
plt.plot(xs, ys)
```

完整实现及所有可视化见 `code/probability.py`。

## 实际应用（Use It）

使用 NumPy 和 SciPy，上面的功能都可以用一行调用完成：

```python
import numpy as np
from scipy import stats

normal = stats.norm(loc=0, scale=1)
samples = normal.rvs(size=10000)
print(f"Mean: {np.mean(samples):.4f}, Std: {np.std(samples):.4f}")
print(f"P(X < 1.96) = {normal.cdf(1.96):.4f}")

logits = np.array([2.0, 1.0, 0.1])
from scipy.special import softmax, log_softmax
probs = softmax(logits)
log_probs = log_softmax(logits)
print(f"Softmax: {probs}")
print(f"Log-softmax: {log_probs}")
```

你已经从零实现了这些功能。现在你知道这些库调用在做什么了。

## 练习（Exercises）

1. 实现指数分布的逆变换采样。采样 10,000 个值，将直方图与真实 PDF 比较以验证结果。

2. 为两个有偏骰子构建联合分布表。计算边缘分布，并检查这两个骰子是否独立。

3. 某个 5 分类器输出 logits `[2.0, 0.5, -1.0, 3.0, 0.1]`，正确类别索引为 3。计算交叉熵损失，再用 PyTorch 的 `nn.CrossEntropyLoss` 验证答案。

4. 编写函数，接收对数概率列表，返回最可能的序列、总对数概率以及等价的原始概率。使用含 50 个词且每个词概率均为 0.01 的句子测试。

## 关键术语（Key Terms）

| 术语 | 通俗说法 | 实际含义 |
|------|----------------|----------------------|
| 样本空间（Sample Space） | “所有可能性” | 一次试验所有可能结果组成的集合 S |
| 概率质量函数（PMF） | “概率函数” | 给出每个离散结果确切概率的函数，所有概率之和为 1 |
| 概率密度函数（PDF） | “概率曲线” | 连续变量的密度函数，对区间积分才得到概率 |
| 条件概率（Conditional Probability） | “已知某事的概率” | P(A\|B) = P(A and B) / P(B)。贝叶斯思维和贝叶斯定理的基础 |
| 独立性（Independence） | “互不影响” | P(A and B) = P(A) * P(B)。知道一个事件并不能提供另一个事件的信息 |
| 期望值（Expected Value） | “平均值” | 所有结果按概率加权的和。损失函数就是一种期望值 |
| 方差（Variance） | “分散程度” | 与均值偏差的平方的期望。方差大意味着估计噪声大、不稳定 |
| 正态分布（Normal Distribution） | “钟形曲线” | f(x) = (1/sqrt(2*pi*sigma^2)) * exp(-(x-mu)^2/(2*sigma^2))。由于 CLT 而随处可见 |
| 中心极限定理（Central Limit Theorem） | “平均值趋于正态” | 许多独立样本的平均值趋近正态分布，而不取决于来源分布 |
| 联合分布（Joint Distribution） | “把两个变量放在一起” | P(X, Y) 描述 X 和 Y 各结果组合的概率 |
| 边缘分布（Marginal Distribution） | “对另一个变量求和消去” | P(X) = sum_y P(X, Y)。从联合分布恢复单个变量的分布 |
| 对数概率（Log Probability） | “概率的对数” | log P(x)。将乘积转为求和，防止长序列中的数值下溢 |
| Softmax | “把得分转为概率” | softmax(z_i) = exp(z_i) / sum(exp(z_j))。把实数 logits 映射为有效概率分布 |
| 交叉熵（Cross-entropy） | “损失函数” | -sum(p_true * log(p_predicted))。衡量两个分布的差异，越小越好 |
| 逻辑值（Logits） | “模型的原始输出” | softmax 之前未归一化的得分，名称来自逻辑斯谛函数 |
| 采样（Sampling） | “抽取随机值” | 按概率分布生成数值，是模型生成输出的方式 |

## 延伸阅读（Further Reading）

- [3Blue1Brown：中心极限定理究竟是什么？](https://www.youtube.com/watch?v=zeJD6dqJ5lo) - 平均值为何趋于正态的可视化证明
- [Stanford CS229 概率复习](https://cs229.stanford.edu/section/cs229-prob.pdf) - 简明参考资料，覆盖本课及更多内容
- [对数求和指数技巧（Log-Sum-Exp Trick）](https://gregorygundersen.com/blog/2020/02/09/log-sum-exp/) - 数值稳定性为何重要，以及如何实现
