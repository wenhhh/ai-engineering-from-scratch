---
name: skill-feature-selector
description: 选择合适特征选择方法的速查决策树
version: 1.0.0
phase: 2
lesson: 18
tags: [feature-selection, mutual-information, rfe, lasso, tree-importance]
---

# 特征选择策略（Feature Selection Strategy）

选择并应用合适特征选择（Feature Selection）方法的速查指南。

## 第 1 步：先清理（Start with Cleanup）

使用任何方法之前，先移除明显无用的特征：

- **常量特征（Constant Features）：**variance = 0，移除。
- **近常量特征（Near-Constant Features）：**variance < 0.01，或你的阈值，移除。
- **重复特征（Duplicate Features）：**完全相同的列，保留一个，删除其余。
- **ID 列：**每行唯一，没有可泛化信息，移除。

这只需几秒，在杂乱真实数据集中可消除 10–30% 的特征。

## 第 2 步：根据情况选择方法（Choose a Method Based on Your Situation）

### 快速决策树（Quick Decision Tree）

1. **少于 50 个特征？**先按互信息（Mutual Information）排序，保留前 K 个。
2. **50–500 个特征？**先用方差阈值（Variance Threshold）；若采用线性模型，再用 L1（Lasso）；若采用树，则用树重要性（Tree Importance）。
3. **超过 500 个特征？**串联方法：方差阈值 -> 互信息过滤，保留前 50% -> 对剩余特征运行递归特征消除（RFE）。
4. **需要可解释性？**L1 正则化给出精确的零与非零权重，树重要性给出排序得分。
5. **需要捕捉非线性关系？**用互信息或树重要性，避免仅支持线性的 L1。
6. **需要特征交互？**用 RFE 或树重要性，过滤法会遗漏交互。

### 方法参考（Method Reference）

| 方法 | 何时使用 | 何时避免 |
|--------|------------|---------------|
| 方差阈值（Variance Threshold） | 始终作为第一步 | 不要跳过 |
| 互信息（Mutual Information） | 快速排序、非线性关系 | 需要检测特征交互时 |
| 递归特征消除（RFE） | 彻底选择、特征数中等 | 模型非常昂贵或特征超过 1000 时 |
| L1 / Lasso | 线性模型、快速嵌入式选择 | 非线性问题、高度相关特征 |
| 树重要性（Tree Importance） | 非线性关系、特征交互 | 高基数特征会造成偏差 |
| 置换重要性（Permutation Importance） | 与模型无关的验证、最终检查 | 初筛时太慢 |

## 第 3 步：验证选择（Validate Your Selection）

- 比较选中特征与全部特征下的模型性能
- 使用交叉验证，不要只做一次训练/测试划分
- 如果性能下降超过 1–2%，可能移除了有用特征
- 如果性能提升，说明成功去除了噪声

## 第 4 步：处理常见陷阱（Handle Common Pitfalls）

### 相关特征（Correlated Features）
- L1 会从相关特征组中任意选择一个，将其他权重归零
- 先计算相关矩阵，再决定保留哪些相关特征
- 树重要性会将重要性分摊到相关特征之间

### 数据泄漏（Data Leakage）
- 只在训练数据上拟合特征选择
- 对测试数据应用同一选择结果
- 交叉验证中，特征选择必须在每折内部进行

### 特征选择过拟合（Overfitting to Feature Selection）
- RFE 迭代过多可能对训练集过拟合
- 在留出数据上验证，不要使用参与选择的数据
- 使用稳定性选择（Stability Selection），在子样本上重复选择，以获得更鲁棒结果

## 第 5 步：生产清单（Production Checklist）

- [ ] 已将方差阈值作为第一道过滤
- [ ] 特征选择只在训练数据上拟合
- [ ] 已记录选中特征的名称、使用的方法和得分
- [ ] 已比较选中特征与全部特征的性能
- [ ] 已交叉验证，而非单次划分评估
- [ ] 特征选择已集成进训练流水线，非手动执行
- [ ] 已监控特征漂移，选中特征可能逐渐失效
