---
name: skill-ensemble-builder
description: 为你的问题选择合适的集成方法并完成配置
version: 1.0.0
phase: 2
lesson: 11
tags: [ensemble, bagging, boosting, random-forest, xgboost, stacking]
---

# 集成方法选择指南（Ensemble Method Selection Guide）

集成（Ensembles）组合多个模型，得到优于任一单模型的预测。始终需要回答的问题是：何时采用哪一种集成？

## 决策清单（Decision Checklist）

1. 当前模型的主要问题是什么？
   - 高方差（过拟合）：使用装袋（Bagging），例如随机森林（Random Forest）
   - 高偏差（欠拟合）：使用提升（Boosting），例如梯度提升（Gradient Boosting）、XGBoost
   - 两者兼有，或希望得到最高准确率：使用堆叠（Stacking）

2. 数据量有多大？
   - 少于 1,000 行：随机森林（鲁棒，难以配置失当）
   - 1,000 到 100,000 行：XGBoost 或 LightGBM（表格数据上的综合表现最好）
   - 超过 100,000 行：LightGBM（最快的梯度提升，擅长处理大数据）

3. 能投入多少调参时间？
   - 很少：使用默认参数的随机森林（几乎总能奏效）
   - 中等：XGBoost 设置 learning_rate=0.1，通过早停调整 n_estimators
   - 充分：LightGBM 或 XGBoost，配合贝叶斯超参数搜索（Bayesian Hyperparameter Search）

4. 是否需要可解释性（Interpretability）？
   - 是：单棵决策树，或具有特征重要性的小型随机森林
   - 部分需要：梯度提升配合 SHAP 值
   - 否：堆叠或深度集成（Deep Ensembles）

5. 数据是否有噪声和大量离群点？
   - 是：随机森林（装袋对噪声具有鲁棒性）
   - 否：梯度提升（可以在干净数据上进一步提高准确率）

## 各方法的适用时机（When to Use Each Method）

**随机森林，装袋（Random Forest / Bagging）**：稳妥的首选。在自助样本上训练多棵树后求平均，在不增加偏差的情况下降低方差。在中等规模数据上几乎不可能过拟合。只需少量调参：设置 n_estimators=100-500，其余保留默认值。

**AdaBoost**：通过样本重新加权进行顺序提升。与简单基学习器（决策树桩）配合效果良好。由于会提高误分类点的权重，对离群点和噪声标签敏感。实践中已很大程度上被梯度提升取代。

**梯度提升（Gradient Boosting）**：让每棵新树拟合当前集成的残差（Residuals），降低偏差。它是表格数据最强大的方法。需要调整 learning_rate、n_estimators、max_depth、min_child_weight、subsample。

**XGBoost**：结合正则化、二阶优化和系统级加速的梯度提升。原生处理缺失值，是 Kaggle 竞赛和表格数据生产机器学习的默认选择。

**LightGBM**：按叶生长而非按层生长的梯度提升。在大数据集上比 XGBoost 快，采用基于直方图的分裂，最适合超过 50k 行的数据集。

**CatBoost**：原生处理类别特征的梯度提升，无须独热编码。类别特征很多时适用。

**堆叠（Stacking）**：在多个多样化基模型的预测上训练元学习器（Meta-Learner）。需要尽可能高的准确率且计算资源充足时使用。始终通过交叉验证生成基模型预测，以避免泄漏。

**投票（Voting）**：最简单的集成。硬投票（Hard Voting）取多数类别，软投票（Soft Voting）对概率求平均。无须元学习器即可快速组合 2–3 个多样化模型。

## 常见错误（Common Mistakes）

- 梯度提升不使用早停（轮数过多会过拟合）
- learning_rate 设置过高（超过 0.3 通常导致不稳定）
- 梯度提升不调整 max_depth（默认无限深或很深的树会过拟合）
- 堆叠中的模型全部属于同一类型（多样性正是堆叠的意义）
- 在噪声数据上使用 AdaBoost（离群点的权重逐轮升高）
- 期望随机森林解决欠拟合（它降低方差，而非偏差）

## 各方法的调参优先级（Tuning Priorities by Method）

**随机森林（Random Forest）：**
1. n_estimators: 100-500（更多树很少更差，只会更慢）
2. max_depth: None（让树完全生长），或为加速限制为 10-20
3. max_features: 分类用 "sqrt"，回归用 "log2" 或 n/3

**XGBoost / LightGBM：**
1. learning_rate: 0.01-0.3（若有算力训练更多树，较低值更好）
2. n_estimators: 在验证集上使用早停，不要猜测
3. max_depth: 3-8（从 6 开始）
4. min_child_weight / min_data_in_leaf: 1-20（较高值可防止过拟合）
5. subsample: 0.7-1.0
6. colsample_bytree: 0.7-1.0
7. reg_alpha（L1）和 reg_lambda（L2）：0-10

## 速查表（Quick Reference）

| 方法 | 降低的误差 | 速度 | 调参投入 | 最适合 |
|--------|---------|-------|--------------|----------|
| 随机森林（Random Forest） | 方差 | 快 | 低 | 噪声数据、快速基线 |
| AdaBoost | 偏差 | 快 | 低 | 简单基学习器、干净数据 |
| 梯度提升（Gradient Boosting） | 偏差 | 中等 | 高 | 表格数据、竞赛 |
| XGBoost | 两者 | 快 | 高 | 生产环境中的表格机器学习 |
| LightGBM | 两者 | 最快 | 高 | 大数据集（50k 行以上） |
| CatBoost | 两者 | 中等 | 中等 | 大量类别特征 |
| 堆叠（Stacking） | 两者 | 慢 | 高 | 最高准确率、多样化模型 |
| 投票（Voting） | 方差 | 快 | 无 | 快速组合 2–3 个模型 |
