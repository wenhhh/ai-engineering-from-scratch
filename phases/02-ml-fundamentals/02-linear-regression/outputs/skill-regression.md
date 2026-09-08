---
name: skill-regression
description: 根据数据特征和问题约束选择合适的回归（Regression）方法
version: 1.0.0
phase: 2
lesson: 2
tags: [regression, linear-regression, polynomial-regression, ridge, regularization]
---

# 回归策略指南（Regression Strategy Guide）

回归预测连续值。选择什么方法取决于特征与目标的关系、特征数量和过拟合（Overfitting）风险。

## 决策检查清单（Decision Checklist）

1. 特征与目标之间的关系近似线性吗？
   - 是：从普通线性回归（Ordinary Linear Regression）开始
   - 否：尝试多项式特征（Polynomial Features）或非线性模型

2. 相对于样本数量，你有多少特征？
   - 特征少、样本多：普通线性回归就能胜任
   - 特征多、样本少：使用正则化（Regularization），如 Ridge 或 Lasso
   - 特征比样本还多：用 Lasso（L1）选择特征，或用岭回归（Ridge，L2）收缩所有权重

3. 需要可解释性（Interpretability）吗？
   - 是：使用少量特征的线性回归，或用 Lasso 自动选择特征
   - 否：采用多项式特征，或转向基于树的模型或神经网络

4. 数据集是否较小（少于 10,000 行）？
   - 为提高速度，使用正规方程（Normal Equation）的闭式解（Closed-form Solution）
   - 要可靠评估，交叉验证（Cross-validation）必不可少

5. 数据集是否很大（数百万行）？
   - 使用随机梯度下降（Stochastic Gradient Descent，SGD）或小批量梯度下降（Mini-batch Gradient Descent）
   - 正规方程中的矩阵求逆为 O(n^3)，速度过慢

## 各种方法的适用场景（When to use each approach）

**普通线性回归（Ordinary Linear Regression）**：任何回归任务的基线。从这里开始；若决定系数（R-squared）可接受且模型简单，就不必继续增加复杂度。

**多项式回归（Polynomial Regression）**：散点图呈现曲线而非直线时使用。从 2 次开始，只有验证性能支持时才提高次数。次数 > 5 几乎总会过拟合。

**岭回归（Ridge Regression，L2）**：存在许多相关特征时使用。所有权重向零收缩，但不会恰好变为零。适用于你认为所有特征都有贡献的情况。

**Lasso 回归（Lasso Regression，L1）**：特征很多，但你怀疑只有少数重要。Lasso 将无关特征的权重压到恰好为零，从而自动选择特征。

**弹性网络（Elastic Net）**：结合 L1 与 L2 惩罚。存在许多相关特征，且希望进行一定程度的特征选择时使用。

## 常见错误（Common mistakes）

- 梯度下降前不做特征缩放（Feature Scaling），导致收敛极慢
- 根据测试集性能调整超参数，应使用验证集或交叉验证
- 拟合高次多项式却不检查验证误差，训练 R^2 总会随次数增加而提高
- 忽略残差图（Residual Plot）；如果残差呈现模式，R^2 可能造成误导
- 只看 R^2；还应检查残差分布、平均绝对误差（Mean Absolute Error，MAE）及领域特定阈值

## 速查表（Quick reference）

| 方法 | 适用场景 | 正则化 | 特征选择 |
|--------|------------|---------------|-------------------|
| 普通最小二乘（Ordinary Least Squares，OLS） | 基线，少量特征 | 无 | 手动 |
| 岭回归（Ridge） | 特征多且均相关 | L2（收缩） | 无 |
| Lasso | 特征多，少数相关 | L1（置零） | 自动 |
| 弹性网络（Elastic Net） | 许多彼此相关的特征 | L1 + L2 | 部分 |
| 多项式（Polynomial） | 非线性关系 | 在此基础上加入 Ridge/Lasso | 手动选择次数 |
