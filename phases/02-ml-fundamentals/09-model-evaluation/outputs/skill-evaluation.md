---
name: skill-evaluation
description: 分类与回归模型的评估策略检查清单
version: 1.0.0
phase: 2
lesson: 9
tags: [evaluation, metrics, cross-validation, model-selection]
---

# 模型评估策略（Model Evaluation Strategy）

这是一份正确评估任意机器学习模型的检查清单。依次执行，避免最常见的评估错误。

## 第 1 步：正确划分数据（Split the data correctly）

- 在任何预处理（缩放、插补、编码）之前划分
- 分类任务使用分层划分（Stratified Split）
- 留出测试集，只在最后接触一次
- 小数据集使用 5 折或 10 折交叉验证（Cross-validation），而非单次划分
- 时间序列按时间划分，绝不打乱

## 第 2 步：选择正确指标（Pick the right metric）

### 分类（Classification）

| 情况 | 使用指标 | 原因 |
|-----------|----------------|-----|
| 类别平衡，简单比较 | 准确率（Accuracy） | 易解释，类别均衡时有意义 |
| 假阳性代价高，如垃圾邮件过滤、欺诈告警 | 精确率（Precision） | 衡量标记对象中多少实际为正 |
| 假阴性代价高，如癌症筛查、安全检测 | 召回率（Recall） | 衡量找到了多少实际正例 |
| 需要平衡精确率与召回率 | F1 分数（F1 Score） | 调和平均数，惩罚极端失衡 |
| 跨阈值比较模型 | AUC-ROC | 与阈值无关的排序质量 |
| 不平衡数据 | F1、AUC-ROC 或 PR-AUC | 类别不平衡时准确率会误导 |

### 回归（Regression）

| 情况 | 使用指标 | 原因 |
|-----------|----------------|-----|
| 标准回归，可接受异常值 | 均方根误差（RMSE） | 与目标同单位，惩罚大误差 |
| 对异常值稳健的评估 | 平均绝对误差（MAE） | 平等对待所有误差，不被异常值主导 |
| 比较不同尺度的模型 | 决定系数（R-squared） | 归一化的 0–1 尺度，即解释的方差比例 |
| 业务要求美元金额 | MAE 或 RMSE | 可直接解释为误差金额 |

## 第 3 步：建立基线（Establish baselines）

评估模型前，先计算基线（Baseline）性能：
- 分类：多数类预测器，始终预测最常见类别
- 回归：始终预测训练目标的均值
- 无法超过这些基线的模型没有学到东西

## 第 4 步：交叉验证（Cross-validate）

- 使用 K 折（K=5 或 K=10）获得稳定估计
- 分类使用分层 K 折
- 报告各折的均值和标准差
- mean=0.85 且 std=0.02 的模型，比 mean=0.87 且 std=0.10 更可信

## 第 5 步：统计比较模型（Compare models statistically）

- 不要未经显著性检验就选择平均分最高的模型
- 在交叉验证各折上使用配对 t 检验（Paired t-test）
- 如果 |t| < 2.78（K=5, df=4, p<0.05），差异可能只是偶然
- 性能差异不显著时，考虑更简单的模型

## 第 6 步：检查常见错误（Check for common mistakes）

- 数据泄漏（Data Leakage）：是否有测试信息流入训练，例如先缩放后划分、从目标派生特征？
- 类别不平衡（Class Imbalance）：准确率是否掩盖了少数类的差表现？
- 过拟合（Overfitting）：训练和验证性能差距是否很大？
- 评估过多：是否查看测试集超过一次？

## 第 7 步：报告最终性能（Report final performance）

- 合并训练集与验证集进行训练
- 在留出的测试集上恰好评估一次
- 报告选定指标，可能时附带置信区间（Confidence Interval）
- 说明与基线的比较，比随机预测或预测均值好多少
