# 采样方法（Sampling Methods）

> 采样是 AI 探索可能性空间的方式。

**Type:** Build
**Language:** Python
**Prerequisites:** 阶段 1，第 06-07 课（概率、贝叶斯定理，Probability, Bayes' Theorem）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 只使用均匀随机数，从零实现逆累积分布函数、拒绝采样和重要性采样
- 为语言模型词元（Token）生成构建温度、top-k 和 top-p（核）采样
- 解释重参数化技巧（Reparameterization Trick），以及它为何使变分自编码器中的反向传播能够穿过采样操作
- 运行 Metropolis-Hastings 马尔可夫链蒙特卡洛（Markov Chain Monte Carlo，MCMC），从未归一化的目标分布中采样

## 问题（The Problem）

语言模型处理完提示词（Prompt），产生一个包含 50,000 个逻辑值（Logits）的向量，词表中的每个词元对应一个。现在它必须选一个，怎么选？

如果总选概率最高的词元，每次回答都一样，确定但单调。如果均匀随机选择，输出就成了乱码。答案介于两个极端之间，而具体落在哪里由采样控制。

采样不只用于文本生成。强化学习（Reinforcement Learning，RL）通过采样轨迹估计策略梯度。变分自编码器（Variational Autoencoder，VAE）从学习到的分布中采样，并让反向传播穿过随机性，从而学习潜在表示。扩散模型（Diffusion Model）通过采样噪声并迭代去噪生成图像。蒙特卡洛方法（Monte Carlo Methods）估计没有闭式解的积分。MCMC 算法探索无法枚举的高维后验分布。

每个生成式 AI 系统都是采样系统。采样策略决定输出的质量、多样性和可控性。本课从零构建各类主要采样方法，从均匀随机数出发，最终掌握驱动现代大语言模型（Large Language Model，LLM）和生成模型的技术。

## 核心概念（The Concept）

### 采样为何重要（Why Sampling Matters）

在 AI 与机器学习（Machine Learning，ML）中，采样承担四种基本角色：

**生成（Generation）。** 语言模型、扩散模型和生成对抗网络（Generative Adversarial Network，GAN）都通过采样产生输出。采样算法直接控制创造性、连贯性与多样性。温度、top-k 和核采样是工程师每天调整的参数。

**训练（Training）。** 随机梯度下降（Stochastic Gradient Descent，SGD）采样小批次。随机失活（Dropout）采样需要停用的神经元。数据增强（Data Augmentation）采样随机变换。重要性采样（Importance Sampling）对样本重新赋权，以降低强化学习（PPO、TRPO）中的梯度方差。

**估计（Estimation）。** 机器学习中的许多量没有闭式解，例如数据分布上的期望损失、能量模型（Energy-Based Model）的配分函数、贝叶斯推断（Bayesian Inference）中的证据。蒙特卡洛估计通过对样本求平均来近似这些量。

**探索（Exploration）。** MCMC 算法探索贝叶斯推断中的后验分布。进化策略（Evolutionary Strategies）采样参数扰动。汤普森采样（Thompson Sampling）在多臂老虎机问题中平衡探索与利用。

核心挑战是：你只能直接从简单分布（均匀、正态）中采样。对其他分布，需要一种方法，将简单样本转换为来自目标分布的样本。

### 均匀随机采样（Uniform Random Sampling）

每种采样方法都从这里开始。均匀随机数生成器产生 [0, 1) 内的值，其中每个等长子区间具有相同概率。

```text
U ~ Uniform(0, 1)

P(a <= U <= b) = b - a    for 0 <= a <= b <= 1

性质：
  E[U] = 0.5
  Var(U) = 1/12
```

要从 n 个元素的离散集合中均匀采样，生成 U 并返回 floor(n * U)。要从连续区间 [a, b] 中采样，计算 a + (b - a) * U。

关键洞见：单个均匀随机数所包含的随机性，恰好足以生成任意分布的一个样本。诀窍在于找到正确的变换。

### 逆累积分布函数法与逆变换采样（Inverse CDF Method (Inverse Transform Sampling)）

累积分布函数（Cumulative Distribution Function，CDF）将数值映射为概率：

```text
F(x) = P(X <= x)

性质：
  F 单调不减
  F(-inf) = 0
  F(+inf) = 1
  F 将实数轴映射到 [0, 1]
```

逆 CDF 将概率映射回数值。如果 U ~ Uniform(0, 1)，那么 X = F_inverse(U) 就服从目标分布。

```text
算法：
  1. 生成 u ~ Uniform(0, 1)
  2. 返回 F_inverse(u)

原理：
  P(X <= x) = P(F_inverse(U) <= x) = P(U <= F(x)) = F(x)
```

**指数分布示例：**

```text
PDF: f(x) = lambda * exp(-lambda * x),   x >= 0
CDF: F(x) = 1 - exp(-lambda * x)

由 F(x) = u 解出 x：
  u = 1 - exp(-lambda * x)
  exp(-lambda * x) = 1 - u
  x = -ln(1 - u) / lambda

由于 (1 - U) 与 U 具有相同分布：
  x = -ln(u) / lambda
```

能写出 F_inverse 的闭式表达时，这种方法十分适用。正态分布没有闭式逆 CDF，因此需要其他方法，如 Box-Muller 或数值近似。

**离散版本：**对离散分布，通过累加构建 CDF，生成 U，再找出累计和首次超过 U 的索引。这就是第 06 课中 `sample_categorical` 的工作方式。

### 拒绝采样（Rejection Sampling）

无法求逆 CDF，但能计算目标概率密度函数（Probability Density Function，PDF），即使只知道相差一个常数因子的形式时，也可以使用拒绝采样。

```text
目标分布：p(x)（可以求值，可能未归一化）
提议分布：q(x)（可以从中采样）
界：M，使所有 x 都满足 p(x) <= M * q(x)

算法：
  1. 采样 x ~ q(x)
  2. 采样 u ~ Uniform(0, 1)
  3. 如果 u < p(x) / (M * q(x))，接受 x
  4. 否则拒绝，返回第 1 步

接受率 = 1/M
```

界 M 越紧，接受率越高。在低维（1-3 维）中，拒绝采样效果很好。在高维中，大部分提议空间的体积被拒绝，接受率指数下降。这就是拒绝采样的维度灾难（Curse of Dimensionality）。

**示例：从截断正态分布中采样。** 在截断区间上使用均匀提议分布。包络 M 为该区间内正态 PDF 的最大值。

**示例：从半圆中采样。** 在外接矩形中均匀提议，如果点落在半圆内就接受。蒙特卡洛就是这样计算 pi 的：接受率等于面积比 pi/4。

### 重要性采样（Importance Sampling）

有时你并不需要目标分布 p(x) 的样本，而是需要估计 p(x) 下的期望，并且手头有另一个分布 q(x) 的样本。

```text
目标：估计 E_p[f(x)] = integral of f(x) * p(x) dx

改写：
  E_p[f(x)] = integral of f(x) * (p(x)/q(x)) * q(x) dx
            = E_q[f(x) * w(x)]

其中 w(x) = p(x) / q(x) 为重要性权重。

估计量：
  E_p[f(x)] ~ (1/N) * sum(f(x_i) * w(x_i))    where x_i ~ q(x)
```

这在强化学习中至关重要。在近端策略优化（Proximal Policy Optimization，PPO）中，你用旧策略 pi_old 收集轨迹，却希望优化新策略 pi_new。重要性权重为 pi_new(a|s) / pi_old(a|s)。PPO 裁剪这些权重，防止新策略偏离旧策略太远。

重要性采样估计量的方差取决于 q 与 p 有多相似。如果差异很大，少数样本会得到巨大的权重并主导估计。自归一化重要性采样（Self-Normalized Importance Sampling）通过除以权重总和来减轻这个问题：

```text
E_p[f(x)] ~ sum(w_i * f(x_i)) / sum(w_i)
```

### 蒙特卡洛估计（Monte Carlo Estimation）

蒙特卡洛估计通过对随机样本求平均来近似积分，大数定律（Law of Large Numbers）保证其收敛。

```text
目标：估计定义域 D 上的 I = integral of g(x) dx

方法：
  1. 从 D 中均匀采样 x_1, ..., x_N
  2. I ~ (Volume of D / N) * sum(g(x_i))

误差：O(1 / sqrt(N))，与维数无关
```

误差阶与维数无关。因此，在无法使用网格积分的高维空间中，蒙特卡洛方法占主导地位。

**估计 pi：**

```text
从 [-1, 1] x [-1, 1] 中均匀采样 (x, y)
统计落在单位圆内的点数：x^2 + y^2 <= 1
pi ~ 4 * (count inside) / (total count)
```

**估计期望：**

```text
E[f(X)] ~ (1/N) * sum(f(x_i))    where x_i ~ p(x)

样本均值收敛到真实期望。
估计量方差 = Var(f(X)) / N
```

### 马尔可夫链蒙特卡洛：Metropolis-Hastings（Markov Chain Monte Carlo (MCMC): Metropolis-Hastings）

MCMC 构建一条平稳分布（Stationary Distribution）为目标分布 p(x) 的马尔可夫链（Markov Chain）。经过足够多步后，链上的样本就近似来自 p(x)。

```text
目标：p(x)（已知到一个归一化常数）
提议：q(x'|x)（给定当前状态时，如何提议下一个状态）

Metropolis-Hastings 算法：
  1. 从某个 x_0 开始
  2. 对 t = 1, 2, ..., T：
     a. 提议 x' ~ q(x'|x_t)
     b. 计算接受比：
        alpha = [p(x') * q(x_t|x')] / [p(x_t) * q(x'|x_t)]
     c. 以概率 min(1, alpha) 接受：
        - 如果 u < alpha（u ~ Uniform(0,1)）：x_{t+1} = x'
        - 否则：x_{t+1} = x_t
  3. 丢弃前 B 个样本（预热）
  4. 返回其余样本
```

对对称提议（q(x'|x) = q(x|x')），比值简化为 p(x')/p(x)。这就是最初的 Metropolis 算法。

**原理。** 接受规则保证细致平衡（Detailed Balance）：处于 x 并移到 x' 的概率，等于处于 x' 并移到 x 的概率。细致平衡意味着 p(x) 是该链的平稳分布。

**实践注意事项：**
- 预热（Burn-in）：丢弃链达到平衡前的早期样本
- 抽稀（Thinning）：每 k 个样本保留一个，以减少自相关
- 提议尺度：过小则链移动缓慢（接受率高、探索慢）；过大则大部分提议被拒绝（接受率低、停在原地）
- 高维高斯提议的最佳接受率约为 0.234

### 吉布斯采样（Gibbs Sampling）

吉布斯采样是用于多变量分布的 MCMC 特例。它不一次提议所有维度的移动，而是每次从条件分布中更新一个变量。

```text
目标：p(x_1, x_2, ..., x_d)

算法：
  每次迭代 t：
    采样 x_1^{t+1} ~ p(x_1 | x_2^t, x_3^t, ..., x_d^t)
    采样 x_2^{t+1} ~ p(x_2 | x_1^{t+1}, x_3^t, ..., x_d^t)
    ...
    采样 x_d^{t+1} ~ p(x_d | x_1^{t+1}, x_2^{t+1}, ..., x_{d-1}^{t+1})
```

吉布斯采样要求能够从每个条件分布 p(x_i | x_{-i}) 中采样。对许多模型来说，这很直接：
- 贝叶斯网络（Bayesian Network）：条件分布由图结构得到
- 高斯混合（Gaussian Mixture）：条件分布为高斯分布
- 伊辛模型（Ising Model）：每个自旋的条件分布仅依赖其邻居

接受率始终为 1（每个提议都接受），因为从精确条件分布采样会自动满足细致平衡。

**局限。** 变量高度相关时，吉布斯采样混合缓慢，因为一次只更新一个变量，无法沿分布的对角方向大步移动。

### 温度采样：用于大语言模型（Temperature Sampling (Used in LLMs)）

语言模型为词表中的每个词元输出逻辑值 z_1, ..., z_V。Softmax 将其转换为概率。温度（Temperature）在 softmax 前重新缩放逻辑值：

```text
p_i = exp(z_i / T) / sum(exp(z_j / T))

T = 1.0: 标准 softmax（原始分布）
T -> 0:  argmax（确定性，总选逻辑值最高的词元）
T -> inf: 均匀（所有词元等概率）
T < 1.0: 使分布更尖锐（更有把握、多样性更低）
T > 1.0: 使分布更平坦（把握更低、多样性更高）
```

**原理。** 将逻辑值除以 T < 1 会放大它们之间的差异。如果 z_1 = 2 且 z_2 = 1，除以 T = 0.5 后得到 z_1/T = 4 和 z_2/T = 2，差距更大。经过 softmax，逻辑值最高的词元会获得大得多的概率份额。

**实践中：**
- T = 0.0：贪心解码（Greedy Decoding），最适合事实性问答
- T = 0.3-0.7：略具创造性，适合代码生成
- T = 0.7-1.0：较均衡，适合一般对话
- T = 1.0-1.5：创意写作、头脑风暴
- T > 1.5：越来越随机，很少有用

温度不改变哪些词元可能被选中，而是改变分配给每个词元的概率质量。

### Top-k 采样（Top-k Sampling）

Top-k 采样将候选集合限制为概率最高的 k 个词元，再归一化，并从这个受限集合中采样。

```text
算法：
  1. 计算全部 V 个词元的 softmax 概率
  2. 按概率对词元降序排序
  3. 只保留前 k 个词元
  4. 重新归一化：p_i' = p_i / sum(p_j for j in top-k)
  5. 从重新归一化的分布中采样

k = 1:  贪心解码
k = V:  不过滤（标准采样）
k = 40: 典型设置，移除不太可能出现的词元长尾
```

Top-k 防止模型选中词表分布长尾中极不可能的词元（错字、无意义内容）。问题在于 k 固定，不随上下文变化。模型很有把握时（一个词元概率为 95%），k = 40 仍允许 39 个备选项。模型不确定时（概率分散在 1000 个词元上），k = 40 又会排除合理选项。

### Top-p 核采样（Top-p (Nucleus) Sampling）

Top-p 采样动态调整候选集合大小。它不保留固定数量的词元，而是保留累计概率超过 p 的最小词元集合。

```text
算法：
  1. 计算全部 V 个词元的 softmax 概率
  2. 按概率对词元降序排序
  3. 找到使前 k 个概率之和 >= p 的最小 k
  4. 只保留这 k 个词元
  5. 重新归一化并采样

p = 0.9:  保留覆盖 90% 概率质量的词元
p = 1.0:  不过滤
p = 0.1:  限制很强，接近贪心
```

模型有把握时，核采样（Nucleus Sampling）只保留少数词元（可能 2-3 个）；模型不确定时，则保留很多（可能 200 个）。这种自适应行为使核采样通常比 top-k 生成更好的文本。

**常见组合：**
- 温度 0.7 + top-p 0.9：良好的通用设置
- 温度 0.0（贪心）：最适合确定性任务
- 温度 1.0 + top-k 50：Fan 等人（2018）原论文设置

Top-k 与 top-p 可以组合，先应用 top-k，再对剩余集合应用 top-p。

### 重参数化技巧：用于变分自编码器（Reparameterization Trick (Used in VAEs)）

变分自编码器（VAE）将输入编码为潜在空间中的分布，从该分布中采样，再将样本解码回来，以此学习。问题在于：反向传播无法穿过采样操作。

```text
标准采样（不可微）：
  z ~ N(mu, sigma^2)

  随机性阻断梯度流。
  d/d_mu [sample from N(mu, sigma^2)] = ???
```

重参数化技巧将随机性与参数分离：

```text
重参数化采样：
  epsilon ~ N(0, 1)          （固定的随机噪声，无参数）
  z = mu + sigma * epsilon   （参数的确定性函数）

  现在 z 是 mu 和 sigma 的确定性可微函数。
  d(z)/d(mu) = 1
  d(z)/d(sigma) = epsilon

  梯度通过 mu 和 sigma 流动。
```

这种方法有效，是因为 N(mu, sigma^2) 与 mu + sigma * N(0, 1) 具有相同分布。关键洞见是：把随机性移到无参数的来源（epsilon），再将样本表达为参数的可微变换。

**在 VAE 训练循环中：**
1. 编码器为每个输入输出 mu 和 log(sigma^2)
2. 采样 epsilon ~ N(0, 1)
3. 计算 z = mu + sigma * epsilon
4. 解码 z 以重建输入
5. 通过步骤 4、3、2、1 反向传播（第 3 步可微，因此能够实现）

没有重参数化技巧，就无法用标准反向传播训练 VAE。正是这一个洞见使 VAE 成为实用方法。

### Gumbel-Softmax：可微类别采样（Gumbel-Softmax (Differentiable Categorical Sampling)）

重参数化技巧适用于连续分布（高斯）。对离散类别分布，需要另一种方法。Gumbel-Softmax 提供了类别采样（Categorical Sampling）的可微近似。

**Gumbel-Max 技巧（不可微）：**

```text
要从对数概率为 log(p_1), ..., log(p_k) 的类别分布中采样：
  1. 为每个类别采样 g_i ~ Gumbel(0, 1)
     (g = -log(-log(u)), where u ~ Uniform(0, 1))
  2. 返回 argmax(log(p_i) + g_i)

这会产生精确的类别样本。
```

**Gumbel-Softmax（可微近似）：**

```text
用软性的 softmax 替代硬性的 argmax：
  y_i = exp((log(p_i) + g_i) / tau) / sum(exp((log(p_j) + g_j) / tau))

tau（温度）控制近似程度：
  tau -> 0:  接近独热向量（硬类别）
  tau -> inf: 接近均匀分布 (1/k, 1/k, ..., 1/k)
  tau = 1.0: 软近似
```

Gumbel-Softmax 产生离散样本的连续松弛（Continuous Relaxation）。输出是概率向量（软独热），而不是硬独热。梯度通过 softmax 流动。训练时可以使用直通估计器（Straight-Through Estimator）：前向传播使用硬 argmax，反向传播则使用软 Gumbel-Softmax 梯度。

**应用：**
- VAE 中的离散潜变量
- 神经架构搜索（Neural Architecture Search，选择离散操作）
- 硬注意力（Hard Attention）机制
- 具有离散动作的强化学习

### 分层采样（Stratified Sampling）

标准蒙特卡洛采样可能偶然在样本空间中留下空隙。分层采样将空间划分为若干层，并从每层采样，以确保均匀覆盖。

```text
标准蒙特卡洛：
  从 [0, 1] 中均匀采样 N 个点
  某些区域可能聚集了样本，另一些存在空隙

分层采样：
  将 [0, 1] 划分为 N 个等大的层：[0, 1/N), [1/N, 2/N), ..., [(N-1)/N, 1)
  在每层内均匀采样一个点
  x_i = (i + u_i) / N   where u_i ~ Uniform(0, 1),  i = 0, ..., N-1
```

分层采样的方差始终小于或等于标准蒙特卡洛：

```text
Var(stratified) <= Var(standard Monte Carlo)

f(x) 平滑变化时，改进最大。
对于分段常数函数，分层采样是精确的。
```

**应用：**
- 数值积分（拟蒙特卡洛，Quasi-Monte Carlo）
- 训练数据划分（确保每折类别平衡）
- 带分层的重要性采样（组合两种技术）
- 神经辐射场（Neural Radiance Fields，NeRF）沿相机射线使用分层采样

### 与扩散模型的联系（Connection to Diffusion Models）

扩散模型通过采样过程生成图像。前向过程分 T 步向图像加入高斯噪声，直到变成纯噪声。反向过程学习去噪，逐步恢复原始图像。

```text
前向过程（已知）：
  x_t = sqrt(alpha_t) * x_{t-1} + sqrt(1 - alpha_t) * epsilon
  where epsilon ~ N(0, I)

  T 步后：x_T ~ N(0, I)（纯噪声）

反向过程（学习得到）：
  x_{t-1} = (1/sqrt(alpha_t)) * (x_t - (1 - alpha_t)/sqrt(1 - alpha_bar_t) * epsilon_theta(x_t, t)) + sigma_t * z
  where z ~ N(0, I)

  每个去噪步骤都是采样步骤。
```

与本课方法的联系：
- 每个去噪步骤都使用重参数化技巧（采样噪声，再应用确定性变换）
- 噪声调度 {alpha_t} 控制一种温度退火（Temperature Annealing）过程
- 训练使用蒙特卡洛估计近似证据下界（Evidence Lower Bound，ELBO）
- 扩散模型中的祖先采样（Ancestral Sampling）是一条马尔可夫链，每一步仅依赖当前状态

整个图像生成过程就是迭代采样：从噪声开始，每一步以学习到的去噪模型为条件，采样一个噪声略少的版本。

```figure
monte-carlo-pi
```

## 动手实现（Build It）

### 第 1 步：均匀与逆 CDF 采样（Step 1: Uniform and inverse CDF sampling）

```python
import math
import random

def sample_uniform(a, b):
    return a + (b - a) * random.random()

def sample_exponential_inverse_cdf(lam):
    u = random.random()
    return -math.log(u) / lam
```

生成 10,000 个指数分布样本，验证均值为 1/lambda。

### 第 2 步：拒绝采样（Step 2: Rejection sampling）

```python
def rejection_sample(target_pdf, proposal_sample, proposal_pdf, M):
    while True:
        x = proposal_sample()
        u = random.random()
        if u < target_pdf(x) / (M * proposal_pdf(x)):
            return x
```

使用拒绝采样从截断正态分布抽样。绘制样本直方图，验证分布形状。

### 第 3 步：重要性采样（Step 3: Importance sampling）

```python
def importance_sampling_estimate(f, target_pdf, proposal_pdf, proposal_sample, n):
    total = 0
    for _ in range(n):
        x = proposal_sample()
        w = target_pdf(x) / proposal_pdf(x)
        total += f(x) * w
    return total / n
```

使用均匀提议分布估计正态分布下的 E[X^2]，与已知答案（mu^2 + sigma^2）对比。

### 第 4 步：蒙特卡洛估计 pi（Step 4: Monte Carlo estimation of pi）

```python
def monte_carlo_pi(n):
    inside = 0
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        if x*x + y*y <= 1:
            inside += 1
    return 4 * inside / n
```

### 第 5 步：Metropolis-Hastings MCMC（Step 5: Metropolis-Hastings MCMC）

```python
def metropolis_hastings(target_log_pdf, proposal_sample, proposal_log_pdf, x0, n_samples, burn_in):
    samples = []
    x = x0
    for i in range(n_samples + burn_in):
        x_new = proposal_sample(x)
        log_alpha = (target_log_pdf(x_new) + proposal_log_pdf(x, x_new)
                     - target_log_pdf(x) - proposal_log_pdf(x_new, x))
        if math.log(random.random()) < log_alpha:
            x = x_new
        if i >= burn_in:
            samples.append(x)
    return samples
```

从双峰分布（两个高斯分布的混合）中采样，并可视化链的轨迹。

### 第 6 步：吉布斯采样（Step 6: Gibbs sampling）

```python
def gibbs_sampling_2d(conditional_x_given_y, conditional_y_given_x, x0, y0, n_samples, burn_in):
    x, y = x0, y0
    samples = []
    for i in range(n_samples + burn_in):
        x = conditional_x_given_y(y)
        y = conditional_y_given_x(x)
        if i >= burn_in:
            samples.append((x, y))
    return samples
```

### 第 7 步：温度采样（Step 7: Temperature sampling）

```python
def softmax(logits):
    max_l = max(logits)
    exps = [math.exp(z - max_l) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def temperature_sample(logits, temperature):
    scaled = [z / temperature for z in logits]
    probs = softmax(scaled)
    return sample_from_probs(probs)
```

展示温度如何改变一组词元逻辑值对应的输出分布。

### 第 8 步：Top-k 与 top-p 采样（Step 8: Top-k and top-p sampling）

```python
def top_k_sample(logits, k):
    indexed = sorted(enumerate(logits), key=lambda x: -x[1])
    top = indexed[:k]
    top_logits = [l for _, l in top]
    probs = softmax(top_logits)
    idx = sample_from_probs(probs)
    return top[idx][0]

def top_p_sample(logits, p):
    probs = softmax(logits)
    indexed = sorted(enumerate(probs), key=lambda x: -x[1])
    cumsum = 0
    selected = []
    for token_idx, prob in indexed:
        cumsum += prob
        selected.append((token_idx, prob))
        if cumsum >= p:
            break
    sel_probs = [pr for _, pr in selected]
    total = sum(sel_probs)
    sel_probs = [pr / total for pr in sel_probs]
    idx = sample_from_probs(sel_probs)
    return selected[idx][0]
```

### 第 9 步：重参数化技巧（Step 9: Reparameterization trick）

```python
def reparam_sample(mu, sigma):
    epsilon = random.gauss(0, 1)
    return mu + sigma * epsilon

def reparam_gradient(mu, sigma, epsilon):
    dz_dmu = 1.0
    dz_dsigma = epsilon
    return dz_dmu, dz_dsigma
```

演示梯度能够通过重参数化样本流动，但不能通过直接采样。

### 第 10 步：Gumbel-Softmax（Step 10: Gumbel-Softmax）

```python
def gumbel_sample():
    u = random.random()
    return -math.log(-math.log(u))

def gumbel_softmax(logits, temperature):
    gumbels = [math.log(p) + gumbel_sample() for p in logits]
    return softmax([g / temperature for g in gumbels])
```

展示降低温度如何使输出接近独热向量。

完整实现与所有可视化见 `code/sampling.py`。

## 实际应用（Use It）

使用 NumPy 和 SciPy 的生产版本如下：

```python
import numpy as np

rng = np.random.default_rng(42)

exponential_samples = rng.exponential(scale=2.0, size=10000)
print(f"Exponential mean: {exponential_samples.mean():.4f} (expected 2.0)")

from scipy import stats
normal = stats.norm(loc=0, scale=1)
print(f"CDF at 1.96: {normal.cdf(1.96):.4f}")
print(f"Inverse CDF at 0.975: {normal.ppf(0.975):.4f}")

logits = np.array([2.0, 1.0, 0.5, 0.1, -1.0])
temperature = 0.7
scaled = logits / temperature
probs = np.exp(scaled - scaled.max()) / np.exp(scaled - scaled.max()).sum()
token = rng.choice(len(logits), p=probs)
print(f"Sampled token index: {token}")
```

大规模 MCMC 使用专用库：
- PyMC：使用不掉头采样器（No-U-Turn Sampler，NUTS，即自适应哈密顿蒙特卡洛（Hamiltonian Monte Carlo，HMC））的完整贝叶斯建模
- emcee：集成 MCMC 采样器
- NumPyro/JAX：图形处理器（Graphics Processing Unit，GPU）加速的 MCMC

你已从零实现这些方法，现在知道库调用在做什么了。

## 练习（Exercises）

1. 为柯西分布（Cauchy Distribution）实现逆 CDF 采样。CDF 为 F(x) = 0.5 + arctan(x)/pi。生成 10,000 个样本，将直方图与真实 PDF 对照绘制。注意重尾现象，即远离中心的极端值。

2. 使用 Uniform(0, 1) 提议分布，通过拒绝采样生成 Beta(2, 5) 分布的样本。将接受的样本与真实 Beta PDF 对照绘制。理论接受率是多少？

3. 分别使用 1,000、10,000 和 100,000 个样本，通过蒙特卡洛估计 sin(x) 从 0 到 pi 的积分。比较各样本量下的误差，验证误差按 O(1/sqrt(N)) 缩放。

4. 实现 Metropolis-Hastings，从二维分布 p(x, y) 中采样，其密度正比于 exp(-(x^2 * y^2 + x^2 + y^2 - 8*x - 8*y) / 2)。绘制样本与链轨迹，尝试不同的提议标准差。

5. 构建完整的文本生成演示：给定一个含 10 个词及其逻辑值的词表，分别用 (a) 贪心、(b) temperature=0.7、(c) top-k=3、(d) top-p=0.9 生成 20 个词元的序列。比较 5 次运行的输出多样性。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 采样（Sampling） | “抽取随机值” | 按概率分布生成数值，是所有生成式 AI 背后的机制 |
| 均匀分布（Uniform Distribution） | “全部等可能” | [a, b] 中每个值的概率密度都为 1/(b-a)，是所有采样方法的起点 |
| 逆累积分布函数（Inverse CDF） | “概率变换” | F_inverse(U) 将均匀样本转换为任意已知 CDF 的分布样本，精确且高效 |
| 拒绝采样（Rejection Sampling） | “提议并接受/拒绝” | 从简单提议分布生成样本，以正比于目标/提议密度比的概率接受，精确但浪费样本 |
| 重要性采样（Importance Sampling） | “重新赋权” | 使用 q(x) 的样本估计 p(x) 下的期望，每个样本权重为 p(x)/q(x)，是强化学习 PPO 的核心 |
| 蒙特卡洛（Monte Carlo） | “对随机样本求平均” | 以样本平均近似积分，误差为 O(1/sqrt(N))，与维数无关 |
| 马尔可夫链蒙特卡洛（Markov Chain Monte Carlo，MCMC） | “会收敛的随机游走” | 构建平稳分布为目标分布的马尔可夫链，Metropolis-Hastings 是基础算法 |
| Metropolis-Hastings | “上坡接受，下坡有时接受” | 提议移动，根据密度比决定是否接受，细致平衡保证收敛到目标分布 |
| 吉布斯采样（Gibbs Sampling） | “一次一个变量” | 固定其余变量，从条件分布中更新每个变量，接受率为 100% |
| 温度（Temperature） | “把握程度旋钮” | softmax 前将逻辑值除以 T。T<1 使分布尖锐（更有把握），T>1 使其平坦（更多样） |
| Top-k 采样（Top-k Sampling） | “保留最好的 k 个” | 除概率最高的 k 个词元外全部置零，重新归一化并采样，候选集合大小固定 |
| 核采样（Nucleus Sampling，top-p） | “保留可能的那些” | 保留累计概率超过 p 的最小词元集合，候选集合大小自适应 |
| 重参数化技巧（Reparameterization Trick） | “将随机性移到外面” | 写成 z = mu + sigma * epsilon，其中 epsilon ~ N(0,1)，使采样可微，是 VAE 训练的关键 |
| Gumbel-Softmax | “软类别采样” | 使用 Gumbel 噪声与带温度的 softmax，得到类别采样的可微近似 |
| 分层采样（Stratified Sampling） | “强制覆盖” | 将样本空间分层，从每层采样，方差始终低于朴素蒙特卡洛 |
| 预热（Burn-in） | “热身期” | 在链达到平稳分布之前丢弃的初始 MCMC 样本 |
| 细致平衡（Detailed Balance） | “可逆性条件” | p(x) * T(x->y) = p(y) * T(y->x)，是 p 成为马尔可夫链平稳分布的充分条件 |
| 扩散采样（Diffusion Sampling） | “迭代去噪” | 从噪声出发，应用学习到的去噪步骤生成数据，每一步都是条件采样操作 |

## 延伸阅读（Further Reading）

- [Holbrook（2023）：Metropolis-Hastings 算法](https://arxiv.org/abs/2304.07010)：MCMC 基础的详细教程
- [Jang、Gu、Poole（2017）：使用 Gumbel-Softmax 的类别重参数化](https://arxiv.org/abs/1611.01144)：Gumbel-Softmax 原论文
- [Holtzman 等（2020）：神经文本退化的奇特现象](https://arxiv.org/abs/1904.09751)：核采样（top-p）论文
- [Kingma 与 Welling（2014）：自编码变分贝叶斯](https://arxiv.org/abs/1312.6114)：引入重参数化技巧的 VAE 论文
- [Ho、Jain、Abbeel（2020）：去噪扩散概率模型（Denoising Diffusion Probabilistic Models，DDPM）](https://arxiv.org/abs/2006.11239)：DDPM 将采样与图像生成联系起来
