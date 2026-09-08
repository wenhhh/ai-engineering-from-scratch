---
name: skill-residual-block-reviewer
description: 审查 PyTorch 残差模块的跳跃连接正确性、BN 位置、激活顺序和形状对齐
version: 1.0.0
phase: 4
lesson: 3
tags: [computer-vision, resnet, code-review, pytorch]
---

# 残差模块审查器（Residual Block Reviewer）

专门审查声称实现残差模块（Residual block）的 PyTorch `nn.Module`，捕捉几乎所有出错的 ResNet 重写中都会出现的四类问题。

## 使用时机（When to use）

- 有人编写了自定义 BasicBlock 或 Bottleneck，损失为 NaN 或准确率停滞。
- 在框架之间移植模块，希望验证等价性。
- 审查改变 ResNet 内部实现的 PR，例如预激活、压缩激励、抗混叠。
- 模型在 CIFAR 尺寸输入上能正常运行，但因捷径分支错误，在 ImageNet 分辨率上崩溃。

## 输入（Inputs）

- PyTorch 类定义，可以是源码文本或可导入路径。
- 可选的 `variant`：`basic` | `bottleneck` | `preact` | `seblock`。

## 四项检查（Four checks）

### 1. 捷径分支形状对齐（Shortcut shape alignment）

任何满足 `stride != 1` 或 `in_channels != out_channels` 的模块，其捷径路径**必须**包含匹配形状的模块，通常是 1x1 卷积加 BN。这种情况下若只使用 `nn.Identity()`，前向传播时必然出现形状不匹配错误。

诊断：
```
[shortcut]
  detected:  nn.Identity | 1x1 Conv + BN | 1x1 Conv + BN + ReLU | other
  required:  若 (stride != 1 or in_c != out_c)，需要匹配形状的卷积，否则为 Identity
  verdict:   ok | wrong | unnecessarily heavy
```

### 2. BN 相对于加法的位置（BN placement relative to the addition）

加法 `out + shortcut(x)` 必须发生在最后一次 ReLU **之前**（后激活，即原始 ResNet），或者完全不使用最后一次 ReLU（预激活 ResNet v2）。如果模块先在主分支应用 ReLU，再加上未经处理的捷径分支，就会产生不对称的激活范围，损害训练。

诊断：
```
[activation order]
  pattern:  post-act (conv-BN-ReLU-conv-BN-add-ReLU) | pre-act (BN-ReLU-conv-BN-ReLU-conv-add) | other
  verdict:  ok | suspect
```

### 3. 卷积层偏置（Bias on conv layers）

紧接批归一化（BatchNorm）的卷积应设置 `bias=False`。BN 的 beta 已经参数化了偏置，因此额外的卷积偏置会浪费参数，还可能减慢收敛。

诊断：
```
[bias]
  convs with BN and bias=True: <数量>
  recommended fix: 将这些层设为 bias=False
```

### 4. 原地 ReLU 与自动微分（In-place ReLU and autograd）

对将要与捷径分支相加的张量使用 `nn.ReLU(inplace=True)`，会覆盖残差相加可能仍需要的值。标记所有这样的 `inplace=True`：从它之后到相加之前，没有经过产生新张量的层。

诊断：
```
[in-place]
  risky inplace ops: <列表>
  fix: 在残差相加前使用 inplace=False
```

## 报告（Report）

```
[block-review]
  variant:       basic | bottleneck | preact | se | other
  shortcut:      ok | wrong | heavy
  activation:    ok | suspect
  bias-bn:       ok | <N> 个卷积需要 bias=False
  in-place:      ok | <N> 个风险操作
  summary:       一句话
```

## 规则（Rules）

- 不要重写模块，只报告问题。
- 若模块正确，所有位置都写 `ok`，然后停止，不提建议。
- 若存在多个问题，按上面顺序列出，先说捷径分支，因为它是最常见的崩溃原因。
- 用户已明确指定有意采用预激活或压缩激励变体时，绝不能将该变体误判为错误。
