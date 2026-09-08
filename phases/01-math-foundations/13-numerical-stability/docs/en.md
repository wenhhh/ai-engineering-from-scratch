# 数值稳定性（Numerical Stability）

> 浮点数是一种会暴露底层细节的抽象。它会在训练中引发问题，而你往往毫无预兆。

**Type:** Build
**Language:** Python
**Prerequisites:** 阶段 1，第 01-04 课
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 使用减去最大值的技巧，实现数值稳定的 softmax 和对数和指数（Log-Sum-Exp）
- 识别浮点运算中的上溢（Overflow）、下溢（Underflow）和灾难性消减（Catastrophic Cancellation）
- 使用中心有限差分（Centered Finite Differences）计算数值梯度，以验证解析梯度
- 解释训练为何更倾向于 bfloat16 而非 float16，以及损失缩放（Loss Scaling）如何防止梯度下溢

## 问题（The Problem）

模型训练了三个小时，损失突然变成 NaN。你加了一条打印语句：第 9,000 步的逻辑值（Logits）还正常，第 9,001 步变成 `inf`，到第 9,002 步，所有梯度都成了 `nan`，训练彻底失效。

另一种情况：模型完成了训练，但准确率比论文声称的低 2%。你检查了所有东西：架构、超参数、数据都一致。问题在于论文使用 float32，而你使用 float16，却没有正确缩放。32 位中累积的舍入误差悄悄侵蚀了准确率。

再比如：你从零实现交叉熵损失（Cross-Entropy Loss）。逻辑值较小时运行正常，超过 100 就返回 `inf`。因为 `exp(100)` 超过 float32 的表示范围，softmax 上溢了。每个机器学习（Machine Learning，ML）框架都用一个两行代码的技巧处理这个问题，而你此前不知道它的存在。

数值稳定性不是理论上的顾虑，它决定一次训练是成功，还是无声地失败。你将要调试的每个严重机器学习缺陷，最终都会落到浮点数问题上。

## 核心概念（The Concept）

### IEEE 754：计算机如何存储实数（IEEE 754: How Computers Store Real Numbers）

计算机遵循 IEEE 754 标准，将实数存储为浮点值。浮点数由三部分组成：符号位（Sign Bit）、指数（Exponent）和尾数（Mantissa，也称 Significand）。

```text
Float32 布局（共 32 位）：
[1 位符号] [8 位指数] [23 位尾数]

Value = (-1)^sign * 2^(exponent - 127) * 1.mantissa
```

尾数决定精度（有效数字的数量），指数决定范围（数字可以有多大或多小）。

```text
格式       位数   指数位    尾数位    十进制有效位数   范围（近似）
float64    64     11        52        ~15-16          +/- 1.8e308
float32    32     8         23        ~7-8            +/- 3.4e38
float16    16     5         10        ~3-4            +/- 65,504
bfloat16   16     8         7         ~2-3            +/- 3.4e38
```

float32 约有 7 位十进制精度。这意味着它可以区分 1.0000001 与 1.0000002，却无法区分 1.00000001 与 1.00000002。7 位之后都是舍入噪声。

float16 约有 3 位精度，能表示的最大数是 65,504。对于逻辑值、梯度和激活值经常超出这一数值的机器学习来说，这个上限低得令人担忧。

bfloat16 是 Google 针对 float16 范围问题提出的方案。它与 float32 一样具有 8 位指数（范围相同，最高达 3.4e38），但尾数只有 7 位（精度低于 float16）。对神经网络训练而言，范围比精度更重要，因此 bfloat16 通常更合适。

### 为什么 0.1 + 0.2 != 0.3（Why 0.1 + 0.2 != 0.3）

数值 0.1 无法用二进制浮点数精确表示。以 2 为基数时，它是一个循环小数：

```text
0.1 的二进制形式 = 0.0001100110011001100110011...（无限循环）
```

Float32 将其截断为 23 位尾数，存储值约为 0.100000001490116。类似地，0.2 的存储值约为 0.200000002980232。两者之和为 0.300000004470348，而不是 0.3。

```text
在 Python 中：
>>> 0.1 + 0.2
0.30000000000000004

>>> 0.1 + 0.2 == 0.3
False
```

这对机器学习很重要，因为：

1. 类似 `if loss < threshold` 的损失比较可能给出错误结果
2. 累加大量小数值（数千步梯度更新）会偏离真实总和
3. 如果用 `==` 比较浮点数，校验和与可复现性测试会失败

修复方法：不要用 `==` 比较浮点数。使用 `abs(a - b) < epsilon` 或 `math.isclose()`。

### 灾难性消减（Catastrophic Cancellation）

两个几乎相等的浮点数相减时，有效数字相互抵消，剩下的舍入噪声反而变成了结果的高位数字。

```text
a = 1.0000001    （在 float32 中存储为 1.00000011920929）
b = 1.0000000    （在 float32 中存储为 1.00000000000000）

真实差值：        0.0000001
计算结果：        0.00000011920929

相对误差：19.2%
```

一次减法就产生了 19% 的相对误差。在机器学习中，下列操作都会遇到这个问题：

- 用 `E[x^2] - E[x]^2` 计算均值很大的数据的方差，此时 E[x] 很大
- 两个几乎相等的对数概率相减
- 使用过小的 epsilon 计算有限差分梯度

修复方法：改写公式，避免两个很大且几乎相等的数相减。计算方差时使用 Welford 算法，或先将数据中心化；处理对数概率时，全程在对数空间（Log-Space）中运算。

### 上溢与下溢（Overflow and Underflow）

结果大到无法表示时发生上溢；结果过小，即比最小可表示正数还接近零时，发生下溢。

```text
Float32 边界：
  最大值：  3.4028235e+38
  最小正数（正规数）：1.175e-38
  最小正数（非正规数）：1.401e-45
  上溢：任何 > 3.4e38 的数变成 inf
  下溢：任何 < 1.4e-45 的数变成 0.0
```

`exp()` 函数是机器学习中上溢的主要来源：

```text
exp(88.7)  = 3.40e+38   （勉强在 float32 范围内）
exp(89.0)  = inf         （上溢）
exp(-87.3) = 1.18e-38   （仅略高于下溢边界）
exp(-104)  = 0.0         （下溢为零）
```

`log()` 函数则在另一个方向触及边界：

```text
log(0.0)   = -inf
log(-1.0)  = nan
log(1e-45) = -103.3      （正常）
log(1e-46) = -inf        （输入下溢为 0，然后 log(0) = -inf）
```

在机器学习中，`exp()` 出现在 softmax、sigmoid 和概率计算中；`log()` 出现在交叉熵、对数似然（Log-Likelihood）和 KL 散度（Kullback-Leibler Divergence，KL）中。如果没有正确技巧，组合 `log(exp(x))` 处处可能出错。

### 对数和指数技巧（The Log-Sum-Exp Trick）

直接计算 `log(sum(exp(x_i)))` 存在数值风险。任意 `x_i` 很大时，`exp(x_i)` 就会上溢。如果所有 `x_i` 都是很小的负数，每个 `exp(x_i)` 都会下溢为零，而 `log(0)` 是 `-inf`。

技巧是：取指数前先减去最大值。

```text
log(sum(exp(x_i))) = max(x) + log(sum(exp(x_i - max(x))))
```

原理：减去 `max(x)` 后，最大的指数函数值为 `exp(0) = 1`，不可能上溢。求和中至少有一项为 1，因此总和至少为 1，而 `log(1) = 0`，不可能因为下溢而得到 `-inf`。

证明：

```text
log(sum(exp(x_i)))
= log(sum(exp(x_i - c + c)))                    （加上并减去 c）
= log(sum(exp(x_i - c) * exp(c)))               (exp(a+b) = exp(a)*exp(b))
= log(exp(c) * sum(exp(x_i - c)))               （提出因子 exp(c)）
= c + log(sum(exp(x_i - c)))                    (log(a*b) = log(a) + log(b))
```

设 `c = max(x)`，即可消除上溢。

这个技巧在机器学习中随处可见：
- Softmax 归一化
- 交叉熵损失计算
- 序列模型中的对数概率求和
- 高斯混合（Mixture of Gaussians）
- 变分推断（Variational Inference）

### 为什么 Softmax 需要减去最大值（Why Softmax Needs the Max-Subtraction Trick）

Softmax 将逻辑值转换为概率：

```text
softmax(x_i) = exp(x_i) / sum(exp(x_j))
```

不使用该技巧时，逻辑值 [100, 101, 102] 会导致上溢：

```text
exp(100) = 2.69e43
exp(101) = 7.31e43
exp(102) = 1.99e44
sum      = 2.99e44

这些值会使 float32 上溢吗（最大值约为 ~3.4e38）？不会，2.69e43 < 3.4e38？实际上：
exp(88.7) 已经达到 float32 的极限。
在 float32 中，exp(100) = inf。
```

使用该技巧，减去 max(x) = 102：

```text
exp(100 - 102) = exp(-2) = 0.135
exp(101 - 102) = exp(-1) = 0.368
exp(102 - 102) = exp(0)  = 1.000
sum = 1.503

softmax = [0.090, 0.245, 0.665]
```

概率完全相同，计算却变得安全。这不是优化，而是正确性的要求。

### NaN 与 Inf：检测和预防（NaN and Inf: Detection and Prevention）

`nan`（非数，Not a Number）和 `inf`（无穷大，Infinity）会在计算中不断传播。梯度更新中一个 `nan` 就会使权重变为 `nan`，继而让之后的每个输出都变为 `nan`。训练只需一步就会失效。

`inf` 的产生方式：
- 对很大的正数调用 `exp()`
- 除以零：`1.0 / 0.0`
- 累加中的 `float32` 上溢

`nan` 的产生方式：
- `0.0 / 0.0`
- `inf - inf`
- `inf * 0`
- 对负数调用 `sqrt()`
- 对负数调用 `log()`
- 任何涉及已有 `nan` 的算术运算

检测：

```python
import math

math.isnan(x)       # x 为 nan 时返回 True
math.isinf(x)       # x 为 +inf 或 -inf 时返回 True
math.isfinite(x)    # x 既不是 nan 也不是 inf 时返回 True
```

预防策略：

1. 限制 `exp()` 的输入范围：`exp(clamp(x, -80, 80))`
2. 在分母中加入 epsilon：`x / (y + 1e-8)`
3. 在 `log()` 内加入 epsilon：`log(x + 1e-8)`
4. 使用稳定实现（对数和指数、稳定 softmax）
5. 使用梯度裁剪（Gradient Clipping）防止权重爆炸
6. 调试时在每次前向传播后检查 `nan`/`inf`

### 数值梯度检查（Numerical Gradient Checking）

来自反向传播（Backpropagation）的解析梯度可能存在实现缺陷。数值梯度检查通过有限差分计算梯度，以此验证解析梯度。

中心差分公式：

```text
df/dx ~= (f(x + h) - f(x - h)) / (2h)
```

它的误差阶为 O(h^2)，远优于只有 O(h) 的前向差分 `(f(x+h) - f(x)) / h`。

选择 h 时，过大会造成近似不准，过小则会让灾难性消减破坏结果。通常取 `h = 1e-5` 到 `1e-7`。

检查方法：计算解析梯度与数值梯度之间的相对差异。

```text
relative_error = |grad_analytical - grad_numerical| / max(|grad_analytical|, |grad_numerical|, 1e-8)
```

经验规则：
- relative_error < 1e-7：理想，梯度正确
- relative_error < 1e-5：可接受，大概正确
- relative_error > 1e-3：存在问题
- relative_error > 1：梯度完全错误

实现新的层或损失函数时，始终检查梯度。PyTorch 为此提供了 `torch.autograd.gradcheck()`。

### 混合精度训练（Mixed Precision Training）

现代图形处理器（Graphics Processing Unit，GPU）配有专用硬件 Tensor Cores，计算 float16 矩阵乘法比 float32 快 2-8 倍。混合精度训练利用了这一点：

```text
1. 维护 float32 权重主副本
2. 使用 float16 前向传播（速度快）
3. 使用 float32 计算损失（防止上溢）
4. 使用 float16 反向传播（速度快）
5. 将梯度缩放至 float32
6. 更新 float32 主权重
```

纯 float16 训练的问题在于，梯度通常很小（1e-8 或更小）。Float16 会将低于约 ~6e-8 的值下溢为零。所有梯度更新都为零，模型便停止学习。

修复方法是损失缩放：

```text
1. 将损失乘以较大的缩放因子（如 1024）
2. 反向传播计算 (loss * 1024) 的梯度
3. 所有梯度增大为 1024 倍（推到 float16 下溢边界之上）
4. 更新权重前，将梯度除以 1024
5. 最终效果：更新相同，但不再下溢
```

动态损失缩放（Dynamic Loss Scaling）自动调整缩放因子。初始使用较大的值（65536）；如果梯度上溢为 `inf`，就减半；如果连续 N 步都没有上溢，就翻倍。

### bfloat16 与 float16：为什么训练更适合 bfloat16（bfloat16 vs float16: Why bfloat16 Wins for Training）

```text
float16:   [1 位符号] [5 位指数]  [10 位尾数]
bfloat16:  [1 位符号] [8 位指数]  [7 位尾数]
```

float16 精度更高（尾数 10 位，而非 7 位），但范围有限（最大值 ~65,504）。bfloat16 精度更低，范围却与 float32 相同（最大值 ~3.4e38）。

对于神经网络训练：

- 训练出现尖峰时，激活值和逻辑值经常超过 65,504。float16 会上溢，bfloat16 则能处理。
- float16 需要损失缩放，bfloat16 通常不需要，因为其范围覆盖了梯度幅值的跨度。
- bfloat16 是 float32 的简单截断：丢弃尾数的低 16 位。转换很简单，且指数部分无损。

推理（Inference）中的数值有界，精度更重要，因此更倾向使用 float16；训练更重视范围，因此更倾向使用 bfloat16。这就是张量处理器（Tensor Processing Unit，TPU）和现代 NVIDIA GPU（A100、H100）原生支持 bfloat16 的原因。

### 梯度裁剪（Gradient Clipping）

梯度经过多层时指数增长，就会出现梯度爆炸（Exploding Gradients），这在循环神经网络（Recurrent Neural Network，RNN）、深层网络和 Transformer 中很常见。一个很大的梯度就能在一步内破坏所有权重。

两种裁剪方式：

**按值裁剪（Clip by Value）：** 独立限制每个梯度元素的范围。

```text
grad = clamp(grad, -max_val, max_val)
```

这种方式简单，但可能改变梯度向量的方向。

**按范数裁剪（Clip by Norm）：** 缩放整个梯度向量，使其范数不超过阈值。

```text
if ||grad|| > max_norm:
    grad = grad * (max_norm / ||grad||)
```

这会保留梯度方向。`torch.nn.utils.clip_grad_norm_()` 正是这样做的，也是标准选择。

典型值：Transformer 使用 `max_norm=1.0`，强化学习（Reinforcement Learning，RL）使用 `max_norm=0.5`，较简单的网络使用 `max_norm=5.0`。

梯度裁剪不是临时补丁，而是一种安全机制。没有它，一个异常批次就可能产生足够大的梯度，毁掉数周的训练成果。

### 作为数值稳定器的归一化层（Normalization Layers as Numerical Stabilizers）

批量归一化（Batch Normalization）、层归一化（Layer Normalization）和均方根归一化（Root Mean Square Normalization，RMS Normalization）通常被介绍为帮助训练收敛的正则化手段。它们也是数值稳定器。

没有归一化时，激活值经过多层后可能指数增长或缩小：

```text
第 1 层：数值范围 [0, 1]
第 5 层：数值范围 [0, 100]
第 10 层：数值范围 [0, 10,000]
第 50 层：数值范围 [0, inf]
```

归一化在每一层重新对激活值进行中心化与缩放：

```text
LayerNorm(x) = (x - mean(x)) / (std(x) + epsilon) * gamma + beta
```

`epsilon`（通常为 1e-5）防止所有激活值相同时出现除零。可学习参数 `gamma` 和 `beta` 让网络恢复它需要的任意尺度。

这使整个网络中的数值保持在安全范围内，同时防止前向传播上溢和反向传播梯度爆炸。

### 常见机器学习数值缺陷（Common ML Numerical Bugs）

**缺陷：几个训练轮次后，损失变成 NaN。**
原因：逻辑值变得过大，softmax 上溢；或者学习率过高，权重发散。
修复：使用稳定 softmax（减去最大值），降低学习率，加入梯度裁剪。

**缺陷：损失停留在 log(num_classes)。**
原因：模型输出接近均匀概率。这通常意味着梯度消失，或模型根本没有学习。
修复：检查数据标签是否正确，验证损失函数，检查失活的 ReLU。

**缺陷：验证准确率比预期低 1-3%。**
原因：混合精度未配合正确的损失缩放。梯度下溢悄悄将小更新置零。
修复：启用动态损失缩放，或切换到 bfloat16。

**缺陷：某些层的梯度范数为 0.0。**
原因：ReLU 神经元失活（所有输入都为负），或 float16 下溢。
修复：使用 LeakyReLU 或 GELU，使用梯度缩放，检查权重初始化。

**缺陷：模型在一个 GPU 上正常，在另一个上得到不同结果。**
原因：浮点累加顺序不确定。不同硬件上的 GPU 并行归约以不同顺序求和，而浮点加法不满足结合律。
修复：接受小差异（1e-6），或设置 `torch.use_deterministic_algorithms(True)` 并接受速度损失。

**缺陷：损失计算中的 `exp()` 返回 `inf`。**
原因：未经减去最大值处理，就将原始逻辑值传给 `exp()`。
修复：使用内部实现了对数和指数技巧的 `torch.nn.functional.log_softmax()`。

**缺陷：从 float32 切换到 float16 后训练发散。**
原因：float16 无法表示低于 6e-8 的梯度幅值，或高于 65,504 的激活值。
修复：使用带损失缩放的自动混合精度（Automatic Mixed Precision，AMP），或改用 bfloat16。

```figure
logsumexp-stability
```

## 动手实现（Build It）

### 第 1 步：演示浮点精度限制（Step 1: Demonstrate floating point precision limits）

```python
print("=== Floating Point Precision ===")
print(f"0.1 + 0.2 = {0.1 + 0.2}")
print(f"0.1 + 0.2 == 0.3? {0.1 + 0.2 == 0.3}")
print(f"Difference: {(0.1 + 0.2) - 0.3:.2e}")
```

### 第 2 步：实现朴素与稳定 softmax（Step 2: Implement naive vs stable softmax）

```python
import math

def softmax_naive(logits):
    exps = [math.exp(z) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def softmax_stable(logits):
    max_logit = max(logits)
    exps = [math.exp(z - max_logit) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

safe_logits = [2.0, 1.0, 0.1]
print(f"Naive:  {softmax_naive(safe_logits)}")
print(f"Stable: {softmax_stable(safe_logits)}")

dangerous_logits = [100.0, 101.0, 102.0]
print(f"Stable: {softmax_stable(dangerous_logits)}")
# softmax_naive(dangerous_logits) 会返回 [nan, nan, nan]
```

### 第 3 步：实现稳定的对数和指数（Step 3: Implement stable log-sum-exp）

```python
def logsumexp_naive(values):
    return math.log(sum(math.exp(v) for v in values))

def logsumexp_stable(values):
    c = max(values)
    return c + math.log(sum(math.exp(v - c) for v in values))

safe = [1.0, 2.0, 3.0]
print(f"Naive:  {logsumexp_naive(safe):.6f}")
print(f"Stable: {logsumexp_stable(safe):.6f}")

large = [500.0, 501.0, 502.0]
print(f"Stable: {logsumexp_stable(large):.6f}")
# logsumexp_naive(large) 返回 inf
```

### 第 4 步：实现稳定的交叉熵（Step 4: Implement stable cross-entropy）

```python
def cross_entropy_naive(true_class, logits):
    probs = softmax_naive(logits)
    return -math.log(probs[true_class])

def cross_entropy_stable(true_class, logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = math.log(sum(math.exp(s) for s in shifted))
    log_prob = shifted[true_class] - log_sum_exp
    return -log_prob

logits = [2.0, 5.0, 1.0]
true_class = 1
print(f"Naive:  {cross_entropy_naive(true_class, logits):.6f}")
print(f"Stable: {cross_entropy_stable(true_class, logits):.6f}")
```

### 第 5 步：梯度检查（Step 5: Gradient checking）

```python
def numerical_gradient(f, x, h=1e-5):
    grad = []
    for i in range(len(x)):
        x_plus = x[:]
        x_minus = x[:]
        x_plus[i] += h
        x_minus[i] -= h
        grad.append((f(x_plus) - f(x_minus)) / (2 * h))
    return grad

def check_gradient(analytical, numerical, tolerance=1e-5):
    for i, (a, n) in enumerate(zip(analytical, numerical)):
        denom = max(abs(a), abs(n), 1e-8)
        rel_error = abs(a - n) / denom
        status = "OK" if rel_error < tolerance else "FAIL"
        print(f"  param {i}: analytical={a:.8f} numerical={n:.8f} "
              f"rel_error={rel_error:.2e} [{status}]")

def f(params):
    x, y = params
    return x**2 + 3*x*y + y**3

def f_grad(params):
    x, y = params
    return [2*x + 3*y, 3*x + 3*y**2]

point = [2.0, 1.0]
analytical = f_grad(point)
numerical = numerical_gradient(f, point)
check_gradient(analytical, numerical)
```

## 实际应用（Use It）

### 混合精度模拟（Mixed precision simulation）

```python
import struct

def float32_to_float16_round(x):
    packed = struct.pack('f', x)
    f32 = struct.unpack('f', packed)[0]
    packed16 = struct.pack('e', f32)
    return struct.unpack('e', packed16)[0]

def simulate_bfloat16(x):
    packed = struct.pack('f', x)
    as_int = int.from_bytes(packed, 'little')
    truncated = as_int & 0xFFFF0000
    repacked = truncated.to_bytes(4, 'little')
    return struct.unpack('f', repacked)[0]
```

### 梯度裁剪（Gradient clipping）

```python
def clip_by_norm(gradients, max_norm):
    total_norm = math.sqrt(sum(g**2 for g in gradients))
    if total_norm > max_norm:
        scale = max_norm / total_norm
        return [g * scale for g in gradients]
    return gradients

grads = [10.0, 20.0, 30.0]
clipped = clip_by_norm(grads, max_norm=5.0)
print(f"Original norm: {math.sqrt(sum(g**2 for g in grads)):.2f}")
print(f"Clipped norm:  {math.sqrt(sum(g**2 for g in clipped)):.2f}")
print(f"Direction preserved: {[c/clipped[0] for c in clipped]} == {[g/grads[0] for g in grads]}")
```

### NaN/Inf 检测（NaN/Inf detection）

```python
def check_tensor(name, values):
    has_nan = any(math.isnan(v) for v in values)
    has_inf = any(math.isinf(v) for v in values)
    if has_nan or has_inf:
        print(f"WARNING {name}: nan={has_nan} inf={has_inf}")
        return False
    return True

check_tensor("good", [1.0, 2.0, 3.0])
check_tensor("bad",  [1.0, float('nan'), 3.0])
check_tensor("ugly", [1.0, float('inf'), 3.0])
```

完整实现及所有边界情况的演示见 `code/numerical.py`。

## 交付成果（Ship It）

本课产出：
- `code/numerical.py`：包含稳定 softmax、对数和指数、交叉熵、梯度检查与混合精度模拟
- `outputs/prompt-numerical-debugger.md`：用于诊断训练中的 NaN/Inf 和数值问题

这些稳定实现将在阶段 3 构建训练循环、阶段 4 实现注意力机制时再次用到。

## 练习（Exercises）

1. **灾难性消减。** 使用 float32 和朴素公式 `E[x^2] - E[x]^2` 计算 [1000000.0, 1000001.0, 1000002.0] 的方差，再用 Welford 在线算法计算。将误差与真实方差（0.6667）对比。

2. **寻找精度边界。** 在 Python 中找出最小正 float32 值 `x`，使 `1.0 + x == 1.0` 成立。这就是机器精度（Machine Epsilon）。验证它与 `numpy.finfo(numpy.float32).eps` 一致。

3. **对数和指数的边界情况。** 使用以下输入测试 `logsumexp_stable` 函数：(a) 所有值相等；(b) 一个值远大于其余值；(c) 所有值都是很小的负数（-1000）。验证它能在朴素版本失败的情况下给出正确结果。

4. **检查神经网络层的梯度。** 实现一个线性层 `y = Wx + b` 及其解析反向传播。对一个 3x2 权重矩阵，使用 `numerical_gradient` 验证正确性。

5. **损失缩放实验。** 模拟 float16 训练：创建范围为 [1e-9, 1e-3] 的随机梯度，转换为 float16，测量变为零的比例。然后应用损失缩放（乘以 1024），转换为 float16，缩放回来，再次测量零值比例。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| IEEE 754 | “浮点标准” | 定义二进制浮点格式、舍入规则和特殊值（inf、nan）的国际标准。所有现代中央处理器（Central Processing Unit，CPU）与 GPU 都实现了它。 |
| 机器精度（Machine Epsilon） | “精度极限” | 给定浮点格式中，使 1.0 + e != 1.0 成立的最小值 e。对 float32 约为 1.19e-7。 |
| 灾难性消减（Catastrophic Cancellation） | “减法导致精度损失” | 两个几乎相等的浮点数相减时，有效数字抵消，舍入噪声主导结果。 |
| 上溢（Overflow） | “数字太大” | 结果超出最大可表示值，变成 inf。exp(89) 会使 float32 上溢。 |
| 下溢（Underflow） | “数字太小” | 结果比最小可表示正数更接近零，变成 0.0。exp(-104) 会使 float32 下溢。 |
| 对数和指数技巧（Log-Sum-Exp Trick） | “先减去最大值” | 计算 log(sum(exp(x))) 时提出 exp(max(x))，防止上溢和下溢。用于 softmax、交叉熵与对数概率运算。 |
| 稳定 softmax（Stable Softmax） | “不会爆炸的 softmax” | 取指数前减去 max(logits)。结果在数值上相同，且不可能上溢。 |
| 梯度检查（Gradient Checking） | “验证反向传播” | 对比反向传播得到的解析梯度与有限差分得到的数值梯度，发现实现缺陷。 |
| 混合精度（Mixed Precision） | “Float16 前向，float32 反向” | 对速度关键运算使用低精度浮点数，对数值敏感运算使用高精度浮点数。典型加速比为 2-3 倍。 |
| 损失缩放（Loss Scaling） | “防止梯度下溢” | 反向传播前将损失乘以大常数，使梯度落在 float16 可表示范围内；更新权重前再除以同一常数。 |
| bfloat16 | “Brain 浮点格式（Brain Floating Point）” | Google 的 16 位格式，包含 8 位指数（与 float32 范围相同）和 7 位尾数（精度低于 float16）。训练时优先使用。 |
| 梯度裁剪（Gradient Clipping） | “限制梯度范数” | 缩放梯度向量，使其范数不超过阈值，防止梯度爆炸破坏权重。 |
| 非数（Not a Number，NaN） | “不是一个数” | 未定义运算（0/0、inf-inf、sqrt(-1)）产生的特殊浮点值，会传播到所有后续算术运算中。 |
| 无穷大（Infinity，Inf） | “无穷大” | 上溢或除零产生的特殊浮点值，组合运算可能产生 NaN（inf - inf、inf * 0）。 |
| 数值梯度（Numerical Gradient） | “暴力求导” | 计算 f(x+h) 与 f(x-h)，将差值除以 2h 来近似导数。速度慢，但用于验证可靠。 |

## 延伸阅读（Further Reading）

- [每个计算机科学家都应了解的浮点运算知识（Goldberg，1991）](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html)：权威参考，内容密集但完整
- [混合精度训练（Micikevicius 等，2018）](https://arxiv.org/abs/1710.03740)：NVIDIA 提出 float16 训练损失缩放的论文
- [AMP：自动混合精度（PyTorch 文档）](https://pytorch.org/docs/stable/amp.html)：PyTorch 混合精度实用指南
- [bfloat16 格式（Google Cloud TPU 文档）](https://cloud.google.com/tpu/docs/bfloat16)：Google 为何为 TPU 选择这种格式
- [Kahan 求和（维基百科）](https://en.wikipedia.org/wiki/Kahan_summation_algorithm)：减少浮点求和舍入误差的算法
