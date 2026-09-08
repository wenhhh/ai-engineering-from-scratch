---
name: skill-sampling-strategy
description: 为生成、估计或推断选择合适的采样方法
version: 1.0.0
phase: 1
lesson: 16
tags: [sampling, mcmc, generation]
---

# 采样策略选择（Sampling Strategy Selection）

如何为文本生成、贝叶斯推断（Bayesian Inference）、蒙特卡洛估计（Monte Carlo Estimation）和训练选择合适的采样方法。

## 决策检查清单（Decision Checklist）

1. 你是在生成输出（文本、图像），还是估计某个量（积分、期望）？
2. 能直接从目标分布采样，还是只能计算其密度？
3. 目标分布是离散的，还是连续的？
4. 样本空间有多少维？低维（< 5）、中维（5-100），还是高维（> 100）？
5. 需要精确样本还是近似样本？
6. 是否需要梯度通过采样操作？

## 各方法的适用场景（When to use each method）

| 方法 | 适用场景 | 复杂度 | 是否精确？ |
|---|---|---|---|
| 直接采样（Direct Sampling） | 有 CDF 或能使用库函数 | 每个样本 O(1) | 是 |
| 逆累积分布函数（Inverse CDF） | 已知 CDF 的闭式逆函数（指数、柯西） | 每个样本 O(1) | 是 |
| Box-Muller | 不用库而需要正态样本 | 每个样本 O(1) | 是 |
| 拒绝采样（Rejection Sampling） | 能计算目标 PDF，维度低（1-3） | 每个样本 O(1/acceptance) | 是 |
| 重要性采样（Importance Sampling） | 需要期望，而非单独的样本 | n 个样本 O(n) | 近似 |
| 分层采样（Stratified Sampling） | 蒙特卡洛估计，希望降低方差 | n 个样本 O(n) | 近似 |
| Metropolis-Hastings | 高维，能计算未归一化密度 | 每步 O(1) + 预热 | 渐近精确 |
| 吉布斯采样（Gibbs Sampling） | 能从每个条件分布采样 | 每轮完整扫描 O(d) | 渐近精确 |
| 哈密顿蒙特卡洛/不掉头采样器（HMC/NUTS） | 高维连续、密度平滑 | 每步 O(L * d) | 渐近精确 |
| 温度采样（Temperature Sampling） | 大语言模型文本生成，控制创造性 | 词表大小为 V 时 O(V) | 不适用 |
| Top-k 采样（Top-k Sampling） | 大语言模型生成，移除低概率词元 | O(V log k) | 不适用 |
| Top-p 核采样（Nucleus Sampling） | 大语言模型生成，自适应候选集合 | O(V log V) | 不适用 |
| 重参数化（Reparameterization） | 需要梯度通过高斯采样（VAE） | O(d) | 是 |
| Gumbel-Softmax | 需要梯度通过类别采样 | k 个类别 O(k) | 近似 |

## 大语言模型生成设置（LLM generation settings）

| 场景 | 温度（Temperature） | Top-p | Top-k | 说明 |
|---|---|---|---|---|
| 事实性问答 | 0.0（贪心） | -- | -- | 确定性，无随机性 |
| 代码生成 | 0.2-0.5 | 0.9 | -- | 创造性低，连贯性高 |
| 一般聊天 | 0.7 | 0.9 | -- | 均衡 |
| 创意写作 | 0.9-1.2 | 0.95 | -- | 多样性更高 |
| 头脑风暴 | 1.0-1.5 | 0.95 | -- | 最大化多样性，可能失去连贯性 |

温度与 top-p 可以组合。先应用温度（缩放逻辑值），再应用 top-p 过滤。

## MCMC 方法选择（MCMC method selection）

| 属性 | Metropolis-Hastings | 吉布斯（Gibbs） | HMC/NUTS |
|---|---|---|---|
| 维数 | 任意 | 任意（最好 < 100） | 高维（100+） |
| 是否需要条件分布 | 否 | 是 | 否 |
| 是否需要梯度 | 否 | 否 | 是 |
| 接受率 | 调到 ~23% | 始终 100% | 调到 ~65% |
| 相关性 | 高（随机游走） | 中等 | 低 |
| 预热（Burn-in） | 长 | 中等 | 短 |
| 最适合 | 探索、简单模型 | 共轭模型、贝叶斯网络 | 连续后验、深度概率模型 |

## 常见错误（Common mistakes）

- 在高维使用拒绝采样。接受率随维数指数下降，超过 5 维时切换到马尔可夫链蒙特卡洛（Markov Chain Monte Carlo，MCMC）。
- 将 MCMC 提议方差设得过高或过低。过高：大多数提议被拒绝，链停滞；过低：所有提议都接受，但链移动缓慢。随机游走 MH 的目标接受率约为 ~23%。
- 忘记预热。MCMC 的前 N 个样本受起点影响而有偏。至少丢弃 1000 步，复杂分布需要更多。
- 重要性采样的提议分布与目标差异过大。少数样本获得巨大权重，使估计不可靠。监控有效样本量（Effective Sample Size，ESS）：ESS = (sum w_i)^2 / sum(w_i^2)。
- 对需要确定性输出的任务（如分类、结构化抽取）使用 temperature > 0。改用贪心（T=0）或束搜索（Beam Search）。
- 没有将 top-p 与温度组合。仅靠温度无法移除长尾中的无效词元，top-p 可以。
- 让反向传播穿过标准采样操作。连续分布（高斯）使用重参数化技巧，离散分布（类别）使用 Gumbel-Softmax。

## 速查：方差缩减技术（Quick reference: variance reduction techniques）

| 技术 | 原理 | 方差缩减 |
|---|---|---|
| 分层采样（Stratified Sampling） | 将空间分层，从每层采样 | 始终 <= 标准蒙特卡洛 |
| 对偶变量（Antithetic Variates） | 同时使用 U 和 1-U | 对单调函数有效 |
| 控制变量（Control Variates） | 减去均值已知的变量 | 与相关性成正比 |
| 重要性采样（Importance Sampling） | 对更好提议分布中的样本重新赋权 | 取决于提议质量 |
| 拉丁超立方（Latin Hypercube） | 独立地对每个维度分层 | 高维中优于分层采样 |
