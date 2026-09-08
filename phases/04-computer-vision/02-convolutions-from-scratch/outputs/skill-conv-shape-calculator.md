---
name: skill-conv-shape-calculator
description: 逐层遍历 CNN 规格，报告每个模块的输出形状、感受野和参数量
version: 1.0.0
phase: 4
lesson: 2
tags: [computer-vision, cnn, architecture, debugging]
---

# 卷积形状计算器（Conv Shape Calculator）

用于规划或调试卷积神经网络（Convolutional Neural Network，CNN）的确定性辅助工具。给定输入形状和层规格列表，无需运行模型，就能跟踪形状、感受野（Receptive field）和参数量。

## 使用时机（When to use）

- 设计新的 CNN，需要验证每次下采样都得到合适的尺寸。
- 阅读论文，将架构表转换为代码。
- 预训练骨干网络在分类头处因形状不匹配而崩溃，需要知道哪一层改变了空间尺寸。
- 训练前比较两个骨干网络的参数效率。

## 输入（Inputs）

- `input_shape`：`(C, H, W)`。
- `layers`：按顺序排列的层字典列表，支持以下形式：
  - `{type: "conv", c_out, k, s, p, groups=1, bias=true}`
  - `{type: "pool", mode: "max"|"avg", k, s, p=0}`
  - `{type: "adaptive_pool", out_h, out_w}`
  - `{type: "flatten"}`
  - `{type: "linear", out_features, bias=true}`

## 步骤（Steps）

1. **初始化跟踪状态**：形状为 `(C, H, W)`，感受野为 `1`，有效步幅为 `1`，累计参数量为 `0`。

2. **逐层处理**，按以下顺序更新：
   - 计算 `C_out`（卷积/线性层），或直接沿用 `C_in`（池化层）。
   - 卷积和池化的空间输出用 `(H + 2P - K) / S + 1` 计算；自适应池化使用 `out_h/out_w`；线性层前的展平输出形状为 `(C * H * W, 1, 1)`，空间尺寸为 `(1, 1)`；线性层使用标量空间尺寸 `1x1`。
   - 更新感受野和有效步幅：
     - 卷积/池化：`RF_new = RF_old + (K - 1) * effective_stride`，`effective_stride *= S`。
     - 自适应池化：视为有效步幅 `S = H_in / out_h`（向下取整）的池化。`RF_new = RF_old + (H_in - 1) * effective_stride_old`；`effective_stride *= S`。注意，自适应池化的感受野等于上一层的完整空间范围。
     - 展平/线性层：感受野和有效步幅不再有意义；将其固定在展平前的数值，后续行省略这两项。
   - 计算参数量：
     - 卷积：`C_out * (C_in / groups) * K * K + (C_out if bias else 0)`。
     - 线性层：`out_features * in_features + (out_features if bias else 0)`。
     - 池化和展平：0。

3. **检测并标记问题**：
   - 输出尺寸不是整数（步幅/填充不对齐）。
   - 堆叠结束前出现 `H_out <= 0`。
   - 感受野超过输入尺寸（此后可能浪费计算）。
   - 单层参数量突然增长 10 倍，可能表明通道规划错误。

4. **报告**为一张表：

```
idx  layer                C_in  C_out  K  S  P  H_out  W_out  RF    params     cum_params
1    conv 3x3 s=1 p=1     3     32     3  1  1  224    224    3     896        896
2    conv 3x3 s=2 p=1     32    64     3  2  1  112    112    7     18,496     19,392
3    pool max 2x2         64    64     2  2  0  56     56     11    0          19,392
...
```

5. **摘要行**：最终 `(C, H, W)`、最终感受野、总参数量和警告。

## 规则（Rules）

- 空间尺寸始终返回整数。若公式得到非整数，标记为错误，不要悄悄向下取整。
- 当 `groups > 1` 时，验证 `C_in % groups == 0` 和 `C_out % groups == 0`；否则报错。
- 对于逐通道卷积（Depthwise convolution，`groups == C_in`），在 `layer` 列中标明，让读者理解参数量低的原因。
- 若用户提供批归一化（BatchNorm）或激活层，计算形状时忽略它们，但继续累计参数量（每个 BatchNorm 为 `2 * C`）。
- 绝不猜测缺失字段的默认值。每个卷积和池化层都必须提供 `k`、`s`、`p`。
