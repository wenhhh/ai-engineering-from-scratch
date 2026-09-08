---
name: skill-freeze-inspector
description: 报告哪些参数可训练、哪些 BatchNorm 层处于评估模式，以及优化器是否实际使用可训练参数
version: 1.0.0
phase: 4
lesson: 5
tags: [computer-vision, transfer-learning, debugging, pytorch]
---

# 冻结状态检查器（Freeze Inspector）

迁移学习错误藏在三个位置：该冻结却未冻结的参数、该训练却不可训练的参数，以及在冻结状态改变前构建的优化器。本技能一次检查就揭示这三类问题。

## 使用时机（When to use）

- 刚对部分参数设置 `requires_grad` 之后。
- 微调的第一个训练步骤之前。
- 调用 `freeze_bn_stats` 或任何切换 BN 模式的辅助函数之后。
- 验证准确率停留在随机水平，怀疑实际上没有任何参数在训练。

## 输入（Inputs）

- `model`：PyTorch `nn.Module`。
- `optimizer`：即将用于训练的优化器。
- 可选的 `expected_frozen_prefixes`：应被冻结的参数名前缀列表，例如 `["conv1", "bn1", "layer1"]`。

## 步骤（Steps）

1. **遍历参数。** 对每个 `(name, param)`：
   - 记录 `requires_grad`
   - 记录 `shape` 和 `numel`

2. **遍历模块。** 对每个模块：
   - 若为 BatchNorm，记录它是否处于评估模式，以及仿射参数是否可训练。

3. **检查优化器。** 对每个参数组：
   - 将其 `params` 展平为 `id(p)` 的集合。
   - 与所有满足 `requires_grad == True` 的参数的 `id(p)` 集合比较。

4. **检测四种失败模式：**
   - `leaked_train`：参数满足 `requires_grad=True`，却未出现在优化器中，梯度被计算但从未应用。
   - `ghost_train`：参数出现在优化器中，却满足 `requires_grad=False`，浪费优化器状态；以后重新启用 requires_grad 时还可能造成问题。
   - `bn_mismatch`：(a) BN 层处于训练模式、累积运行统计量，但仿射参数（`weight`、`bias`）被冻结；或 (b) BN 层处于评估模式、统计量冻结，但仿射参数可训练。两种状态均不一致，几乎总是错误。
   - `expected_vs_actual`：`expected_frozen_prefixes` 中列出的某个前缀下，仍有可训练参数。

## 报告（Report）

```
[freeze-inspector]
  model trainable params: <N>
  model frozen params:    <N>
  batchnorm layers in eval mode: <数量>
  batchnorm layers in train mode: <数量>

[optimizer coverage]
  trainable params fed to optimizer: <N> 中的 <M>
  leaked_train: <名称列表>（可训练，但不在优化器中）
  ghost_train:  <名称列表>（在优化器中，但已冻结）

[bn audit]
  mismatched layers: <名称列表>

[expectations]
  expected_frozen_prefixes: <...>
  violating params:         <列表>

[verdict]
  ok | <一句话总结最严重问题>
```

## 规则（Rules）

- 只报告参数名，绝不打印权重本身。
- 每个列表都按参数名字母顺序排序。
- 优化器覆盖率为 100%，且不存在不匹配时，返回 `ok` 并停止。
- 对 `leaked_train`，始终建议在冻结状态改变后重建优化器。
- 对 `ghost_train`，建议移除该参数组；若本意是训练它，则设置 `requires_grad=True`。
