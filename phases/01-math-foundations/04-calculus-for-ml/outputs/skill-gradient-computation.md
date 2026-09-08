---
name: skill-gradient-computation
description: 计算常见机器学习损失函数的梯度，并选择合适的求导方法
version: 1.0.0
phase: 1
lesson: 4
tags: [calculus, gradients, backpropagation]
---

# 机器学习中的梯度计算（Gradient Computation for ML）

这是一份实用参考，用于计算神经网络中损失函数、激活函数和网络层运算的梯度（Gradient）。

## 决策检查清单（Decision Checklist）

1. 函数是否由幂、指数、对数、三角函数等简单原语（Primitive）组成？使用解析导数（Analytical derivative）和链式法则（Chain rule）。
2. 函数是否为自定义或黑箱操作？使用数值微分（Numerical differentiation）：`(f(x+h) - f(x-h)) / (2h)`，其中 h = 1e-7。
3. 函数是否由 PyTorch / JAX 张量运算构成？交给自动微分（Autograd）处理，再通过数值检查验证。
4. 是否需要标量损失对权重矩阵的梯度？沿计算图（Computation graph）逐节点应用链式法则。
5. 是否包含 argmax、取整或采样等不可微操作？使用直通估计器（Straight-through estimator）或重参数化技巧（Reparameterization trick）。

## 各种方法的适用场景（When to use each approach）

| 方法 | 何时使用 | 成本 |
|---|---|---|
| 解析求导（Analytical），手工推导 | 简单函数、验证自动微分输出 | 运行时无求导推导成本 |
| 数值求导（Numerical），有限差分 | 调试、梯度检查、黑箱函数 | n 个参数需要 2n 次前向传播 |
| 自动微分（Automatic differentiation） | 任意可微计算图，默认选择 | 一次反向传播 |
| 符号求导（Symbolic），SymPy、Mathematica | 为论文推导闭式梯度（Closed-form gradient） | 仅编译时产生开销 |

## 常见导数速查（Quick reference: common derivatives）

| 函数 | f(x) | f'(x) | 机器学习场景 |
|---|---|---|---|
| 均方误差损失（MSE loss） | (1/n) sum(y_hat - y)^2 | (2/n)(y_hat - y) | 回归 |
| 二分类交叉熵（Cross-entropy） | -(y log(p) + (1-y) log(1-p)) | p - y，经过 Sigmoid 后 | 二分类 |
| 多分类交叉熵（Cross-entropy） | -log(p_true_class) | p - one_hot(y)，经过 Softmax 后 | 多分类 |
| Sigmoid | 1 / (1 + e^(-x)) | sigma(x) * (1 - sigma(x)) | 输出门、二分类输出 |
| 双曲正切（Tanh） | (e^x - e^(-x)) / (e^x + e^(-x)) | 1 - tanh(x)^2 | 早期网络中的隐藏层激活 |
| 整流线性单元（ReLU） | max(0, x) | x > 0 时为 1，x < 0 时为 0 | 默认隐藏层激活 |
| 带泄漏整流线性单元（Leaky ReLU） | max(0.01x, x) | x > 0 时为 1，x < 0 时为 0.01 | 避免神经元死亡 |
| 高斯误差线性单元（GELU） | x * Phi(x) | Phi(x) + x * phi(x) | Transformer |
| Softmax_i | e^(x_i) / sum(e^(x_j)) | i=j 时为 s_i(1 - s_i)，i!=j 时为 -s_i*s_j | 输出层，雅可比矩阵（Jacobian） |
| 对数 Softmax（Log-softmax） | x_i - log(sum(e^(x_j))) | 第 i 个分量为 1 - softmax(x_i) | 数值稳定的交叉熵（CE） |
| 线性层（Linear layer） | y = Wx + b | dL/dW = dL/dy * x^T, dL/db = dL/dy | 各个网络层 |
| L2 正则化（L2 regularization） | lambda * sum(w^2) | 2 * lambda * w | 权重衰减（Weight decay） |
| L1 正则化（L1 regularization） | lambda * sum(\|w\|) | lambda * sign(w) | 稀疏性（Sparsity） |

## 常见错误（Common mistakes）

- 在按批次取平均的损失中，例如 MSE、交叉熵，漏掉 1/n 因子，导致梯度被批次大小缩放。
- 将 Softmax 的梯度当成向量，实际它是雅可比矩阵。交叉熵与 Softmax 联用时，梯度简化为 (p - y)，无需构造完整雅可比矩阵。
- 以错误顺序应用链式法则。应从损失向后推导：dL/dW = dL/dy * dy/dW。
- 数值求导时 h 过大，例如 h = 0.1，或过小，例如 h = 1e-15。对于 float64，使用 h = 1e-7。
- 忘记 ReLU 在 x = 0 处的梯度未定义。实践中可设为 0 或 0.5。

## 梯度检查步骤（Gradient checking recipe）

```text
对每个参数 w：
  numeric_grad = (loss(w + h) - loss(w - h)) / (2h)
  auto_grad = 反向传播计算出的值
  relative_error = |numeric - auto| / max(|numeric|, |auto|, 1e-8)
  assert relative_error < 1e-5
```

相对误差超过 1e-3 表示存在问题；介于 1e-5 与 1e-3 之间时，需要进一步排查。
