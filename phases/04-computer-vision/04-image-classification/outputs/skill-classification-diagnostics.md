---
name: skill-classification-diagnostics
description: 给定混淆矩阵和类别名称，揭示逐类别问题并提出影响最大的一项修复建议
version: 1.0.0
phase: 4
lesson: 4
tags: [computer-vision, classification, evaluation, debugging]
---

# 分类诊断（Classification Diagnostics）

用于解读混淆矩阵的工具。总体准确率告诉你分类器是否有效，混淆矩阵则告诉你*它还不知道什么*。

## 使用时机（When to use）

- 首次查看训练后分类器的验证表现。
- 在两次训练之间决定下一步改什么。
- 模型交付前，验证关键类别没有悄悄失败。
- 调试生产回归问题：总体准确率下降一个百分点，需要找到原因。

## 输入（Inputs）

- `cm`：CxC 混淆矩阵（行 = 真实类别，列 = 预测类别）。
- `labels`：按相同顺序排列的 C 个类别名称。
- 可选的 `class_priors`：训练集中每类出现频数，默认使用 `cm` 的行和。

## 步骤（Steps）

1. **计算逐类别指标。** 任何除零情况都表示该类别的相应指标未定义，应报告为 `n/a`，绝不悄悄替换成 0。
   - precision_i = cm[i,i] / sum(cm[:, i])   （从未预测该类别时未定义）
   - recall_i    = cm[i,i] / sum(cm[i, :])   （该类别没有真实样本时未定义）
   - f1_i        = 2 * p * r / (p + r)        （任一组成指标未定义时未定义）

2. **按 F1 排列最多三个最差类别**。若混淆矩阵不足三类，就按实际类别数排列。排除所有指标都未定义的类别。

3. **找到每行最大的非对角线单元格**，即最常夺走该类预测的另一个类别。按 `true -> predicted` 报告。

4. **判断每个最差类别的失败模式**。使用以下定量阈值，使标签可复现：
   - `ambiguity`：与另一类双向混淆，同时满足 `cm[i,j] / sum(cm[i, :]) >= 0.15` 和 `cm[j,i] / sum(cm[j, :]) >= 0.15`。
   - `imbalance`：该类训练样本数为其主要混淆对象的 `< 0.5x`。
   - `label_noise`：`|precision_i - recall_i| >= 0.2`，且该类不属于不平衡或歧义分支。
   - `systematic`：没有单一混淆对象占该类错误的比例超过 0.2；错误分散在三个或更多其他类别中。

5. **建议影响最大的一项下一步操作**：
   - `ambiguity` -> 采集或合成有区分力的样本，加入保留关键区别特征的针对性增强。
   - `imbalance` -> 对少数类过采样，或使用类别加权损失。
   - `label_noise` -> 对该类进行分层抽样审查；任何其他改动之前先修复错标。
   - `systematic` -> 增加该类数据，或提高该类损失权重进行微调。

## 报告（Report）

```
[diagnostics]
  aggregate accuracy: X.XX
  macro F1:           X.XX

[top-3 worst classes]
  1. class <名称>  F1 = X.XX  prec = X.XX  rec = X.XX
     top confusion: <名称> -> <另一类>  （N 例）
     failure mode:  ambiguity | imbalance | label_noise | systematic
     action:        <一句话>

  2. ...
  3. ...

[recommendation]
  single biggest lever: <一句话指出类别和修复方法>
```

## 规则（Rules）

- 最多返回三个类别，更多会掩盖重点。
- 为每个最差类别指出主要混淆对象，绝不笼统说“与很多类别混淆”。
- 每项建议都必须依据混淆矩阵中的证据。不能不指定类别就泛泛地说“增加数据”。
- 当精确率（Precision）和召回率（Recall）相差超过 0.2 时，始终将标签噪声列为可能原因；真实类别训练后的 P 和 R 通常接近。
