---
name: skill-classification-baseline
description: 在使用复杂模型前建立可靠的分类基线（Classification Baseline）
version: 1.0.0
phase: 2
lesson: 3
tags: [classification, logistic-regression, baseline, preprocessing]
---

# 分类基线指南（Classification Baseline Guide）

尝试复杂模型之前，先用逻辑回归（Logistic Regression）建立基线。它数秒内即可训练完毕，输出概率且完全可解释。许多现实问题都不需要更复杂的方法，其数量可能超出你的预期。

## 决策检查清单（Decision Checklist）

1. 决策边界（Decision Boundary）可能是线性的吗？
   - 是：逻辑回归很可能已经足够
   - 否：仍然需要它作为衡量改进的基线

2. 有多少特征？
   - 少于 50：标准逻辑回归即可
   - 50 到 10,000：加入 L2 正则化（Regularization，Ridge）
   - 超过 10,000（如 TF-IDF 文本特征）：使用 L1 正则化（Lasso）或 LinearSVC

3. 数据集存在类别不平衡（Class Imbalance）吗？
   - 比例低于 5:1：通常无须调整
   - 5:1 到 50:1：在 sklearn 中使用 `class_weight="balanced"`
   - 超过 50:1：结合类别加权与适当指标（精确率、召回率或 F1）

4. 特征的尺度不同吗？
   - 逻辑回归之前始终要做标准化。它采用基于梯度的优化，未缩放特征会减慢收敛或扭曲决策边界。

5. 存在缺失值吗？
   - 拟合前先插补（Imputation）。逻辑回归无法处理 NaN。
   - 数值列用中位数插补，类别列用众数。

## 逻辑回归足够用的场景（When logistic regression is good enough）

- 二分类问题，特征关系大多为线性
- 需要概率输出，而不只是类别标签
- 需要可解释性：标准化后，系数表明特征重要性的方向及相对大小
- 训练数据少，只有几百到几千个样本
- 需要快速模型提供实时服务，推理时只需一次点积
- 监管或合规要求决策可解释

## 何时升级模型（When to upgrade）

- 已尝试特征工程，准确率仍停滞在远低于目标的水平
- 特征与目标之间明显非线性，可检查残差图
- 表格数据量大（10k+ 行）：尝试梯度提升（Gradient Boosting），如 XGBoost 或 LightGBM
- 特征存在多项式特征无法捕捉的复杂交互
- 数据是图像、文本或序列：直接对原始输入使用逻辑回归行不通

## 分类基线的预处理步骤（Preprocessing steps for a classification baseline）

1. 任何预处理前先**划分训练集与测试集**，防止数据泄漏（Data Leakage）。
2. **处理缺失值**：数值列用中位数插补，类别列用众数插补。
3. **编码类别变量**：低基数（少于 10 个取值）使用独热编码（One-hot Encoding），高基数使用目标编码（Target Encoding）。目标编码只在训练折上拟合，并采用折外编码（Out-of-fold Encoding）防止泄漏。
4. **缩放数值变量**：使用 StandardScaler，使均值为零、方差为一。在训练集上拟合，再变换训练集与测试集。
5. 使用 `C=1.0`（默认正则化）**拟合逻辑回归**。
6. **评估**：检查混淆矩阵（Confusion Matrix）、精确率（Precision）、召回率（Recall）和 F1，不能只看准确率。
7. **调整阈值**：默认 0.5 很少是最优值。遍历 0.1 到 0.9，选择符合精确率与召回率优先级的阈值。

## 常见错误（Common mistakes）

- 在不平衡数据上只评估准确率，导致始终预测多数类的无用模型获得高分
- 忘记缩放特征，导致逻辑回归训练缓慢并收敛到更差的解
- 用测试集调整决策阈值，应使用验证集或交叉验证
- 跳过基线直接使用 XGBoost，既失去可解释性，又没有比较参照
- 不检查多重共线性（Multicollinearity）；高度相关的特征会增大系数方差

## 速查表（Quick reference）

| 场景 | 模型 | 正则化 | 关键设置 |
|----------|-------|---------------|-------------|
| 特征少，需要可解释性 | LogisticRegression | L2（默认） | C=1.0 |
| 特征多，部分无关 | LogisticRegression | L1 | penalty="l1", solver="saga" |
| 高维稀疏数据（文本） | SGDClassifier | L1 或 ElasticNet | loss="log_loss" |
| 类别不平衡 | LogisticRegression | L2 | class_weight="balanced" |
| 需要概率 | LogisticRegression | L2 | predict_proba() |
| 只需要类别标签 | LinearSVC | L2 | 大数据上比逻辑回归（LR）更快 |
