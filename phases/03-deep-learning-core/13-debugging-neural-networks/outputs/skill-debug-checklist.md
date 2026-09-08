---
name: skill-debug-checklist
description: 用于调试神经网络训练故障的决策树清单
version: 1.0.0
phase: 3
lesson: 13
tags: [debugging, neural-networks, training, diagnostics, deep-learning]
---

# 神经网络调试清单（Neural Network Debug Checklist）

训练出错时使用的系统化调试流程。按顺序执行以下步骤，大多数错误都能在前 3 步中发现。

## 训练前：预防错误（Before training (prevent bugs)）

1. 打印模型架构与参数数量。这个规模对你的数据而言是否合理？
2. 用随机输入执行一次前向传播（Forward Pass）。输出形状是否与目标形状匹配？
3. 检查标签的数据类型（Dtype）是否正确（CrossEntropyLoss 需要 Long，BCELoss 需要 Float）
4. 验证数据归一化（Normalization）：输入的均值应接近 0，标准差应接近 1
5. 打印 5 组随机的输入与标签配对。标签是否符合预期？
6. 确认训练集与测试集之间没有重复样本

## 单批次过拟合测试：60 秒，发现 80% 的错误（Overfit-one-batch test (60 seconds, catches 80% of bugs)）

1. 从训练集中取 8–32 个样本
2. 使用合理的学习率训练 200 步
3. 损失应接近 0，训练准确率应达到 100%
4. 如果失败：错误在模型、损失函数或训练循环中，而不在数据或超参数中
5. 如果通过：继续进行完整训练

## 损失不下降（Loss not decreasing）

1. 检查学习率。尝试 3 个值：current/10、current、current*10
2. 打印每层的梯度范数（Gradient Norms）。全为零意味着网络已经死亡或计算图被分离
3. 检查参数是否设置了 `requires_grad=True`，并检查是否调用了 `loss.backward()`
4. 检查是否在 `loss.backward()` 之前调用了 `optimizer.zero_grad()`
5. 检查是否在 `loss.backward()` 之后调用了 `optimizer.step()`
6. 验证模型参数是否传给了优化器：`optimizer = Adam(model.parameters())`

## 损失为 NaN 或 Inf（Loss is NaN or Inf）

1. 将学习率降至原来的 1/10
2. 在所有 log() 调用中加入 epsilon：`torch.log(x + 1e-7)`
3. 在所有除法中加入 epsilon：`x / (y + 1e-8)`
4. 在计算二元交叉熵（BCE）损失之前限制预测值：`torch.clamp(pred, 1e-7, 1 - 1e-7)`
5. 使用 `torch.autograd.detect_anomaly()` 找到具体出错的操作
6. 检查输入数据中的 NaN：`assert not torch.isnan(x).any()`

## 损失振荡（Loss oscillating）

1. 将学习率降至原来的 1/3–1/10
2. 增大批大小（Batch Size），以减少梯度噪声
3. 添加梯度裁剪（Gradient Clipping）：`torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)`
4. 从 SGD 切换到 Adam（为每个参数自适应调整学习率）
5. 在训练的前 5–10% 加入学习率预热（Learning Rate Warmup）

## 过拟合：训练准确率高，测试准确率低（Overfitting (train acc high, test acc low)）

1. 添加随机失活（Dropout），从 p=0.1 开始，逐步增大到 0.5
2. 为优化器添加权重衰减（Weight Decay）：`Adam(params, weight_decay=1e-4)`
3. 缩小模型（减少层数或缩窄各层）
4. 添加数据增强（Data Augmentation）
5. 使用早停（Early Stopping）：验证损失连续 5 个或更多轮次上升时停止
6. 检查训练集与测试集之间是否存在数据泄漏（Data Leakage）

## 欠拟合：训练和测试准确率都低（Underfitting (both train and test acc low)）

1. 增大模型容量（Model Capacity），增加层数或加宽各层
2. 训练更多轮次（Epochs）
3. 提高学习率，并留意变化
4. 暂时移除正则化（Regularization），验证模型是否能够学习
5. 检查模型是否具有完成任务所需的表达能力

## ReLU 神经元死亡（Dead ReLU neurons）

1. 检查每层零激活值的比例。超过 50% 就存在问题
2. 改用 LeakyReLU(0.01) 或 GELU
3. 对权重使用 Kaiming 初始化（Kaiming Initialization）
4. 降低学习率（大幅更新可能把神经元推入死亡区）
5. 在激活函数之前添加批归一化（Batch Normalization）

## 速查：学习率起始值（Quick reference: learning rate starting points）

| 优化器（Optimizer） | 任务（Task） | 起始学习率（Starting LR） |
|-----------|------|------------|
| Adam | 从零训练 | 1e-3 |
| Adam | 微调预训练模型 | 1e-5 |
| SGD + 动量（Momentum） | 从零训练 | 1e-1 |
| SGD + 动量（Momentum） | 微调预训练模型 | 1e-3 |
| AdamW | Transformer 训练 | 3e-4 |

## 速查：批大小的影响（Quick reference: batch size effects）

| 批大小（Batch Size） | 梯度噪声（Gradient Noise） | 内存（Memory） | 泛化（Generalization） |
|-----------|---------------|--------|---------------|
| 8-16 | 高（噪声大） | 低 | 通常更好 |
| 32-64 | 中等 | 中等 | 合适的默认选择 |
| 128-256 | 低（平滑） | 高 | 可能需要预热 |
| 512+ | 很低 | 很高 | 需要缩放学习率 |

## 所有方法都无效时（When nothing works）

1. 将模型简化到只有 1 个隐藏层（Hidden Layer）。它能学习吗？
2. 将数据缩减到 100 个样本。它会过拟合吗？
3. 将损失函数替换为均方误差（MSE）。它会收敛吗？
4. 将优化器替换为 SGD(lr=0.01)。训练会有进展吗？
5. 将数据替换为合成数据（例如 y = x[0] > 0）。它能学习吗？
6. 如果以上方法都无效：错误位于你尚未关注的代码中（数据加载、预处理、张量形状）
