---
name: skill-image-tensor-inspector
description: 检查任意图像形状的张量或数组，报告数据类型、布局、范围，以及其看起来属于原始、归一化还是标准化数据
version: 1.0.0
phase: 4
lesson: 1
tags: [computer-vision, debugging, preprocessing, tensors]
---

# 图像张量检查器（Image Tensor Inspector）

这项诊断技能适用于视觉流水线中的任意位置：当你手中有一个图像形状的数组，并需要准确了解它当前所处的状态时使用。

## 使用时机（When to use）

- 预训练模型输出无意义的预测，你怀疑预处理有问题。
- 在 OpenCV 与 torchvision 之间迁移流水线，通道顺序不明确。
- 叠加来自多个框架的层，批次轴总出现在错误的位置。
- 调试损失停留在 `log(num_classes)` 的训练循环。

## 输入（Inputs）

- `x`：任意二维、三维或四维类数组对象（NumPy、PyTorch、JAX）。
- 可选的 `expected`：要核对的不变量字典，例如 `{"layout": "CHW", "range": "standardized"}`。

## 步骤（Steps）

1. **识别后端（Resolve backend）**：检测 `x` 来自 NumPy、Torch 还是 JAX。在不修改原对象的前提下转成 NumPy，以便检查。

2. **判断维数（Classify rank）**：
   - 二维 -> 单通道图像 (H, W)。
   - 三维 -> 若最后一轴大小为 1、3 或 4，且严格小于另外两轴，则为 `HWC`；否则为 `CHW`。
   - 四维 -> 若第 1 轴属于 {1, 3, 4}，**并且**第 2 或第 3 轴大于 16，优先判断为 `NCHW`；否则优先判断为 `NHWC`。只检查第 1 轴会误判小图像 NHWC 批次，例如 `(3, 4, 224, 3)`。
   - 始终将有歧义的情况（例如 `(1, 3, 3, 3)`）标记为 `ambiguous`，不要猜测；要求调用方提供 `expected`。

3. **判断数据类型与范围（Classify dtype and range）**：
   - 位于 [0, 255] 的 `uint8` -> `raw`。
   - 满足 min >= 0 且 max <= 1.01 的 `float*` -> `normalized`。
   - 满足 min < 0、|mean| < 0.5 且 0.5 <= std <= 1.5 的 `float*` -> `standardized`。
   - 其他情况 -> `unusual`，打印直方图。

4. **逐通道统计（Per-channel stats）**：报告每个通道的均值和标准差。若数组看起来已经标准化，则与 ImageNet 均值/标准差比较，并给出匹配置信度。

5. **报告（Report）**：严格使用以下格式：

```
[inspector]
  backend:   numpy | torch | jax
  rank:      2 | 3 | 4
  layout:    HW | HWC | CHW | NHWC | NCHW
  dtype:     <dtype>
  shape:     <shape>
  range:     raw | normalized | standardized | unusual
  min/max:   <min> / <max>
  per-channel mean: [ ... ]
  per-channel std:  [ ... ]
  likely source:    camera | PIL | OpenCV | torchvision | random init
  likely target:    display | training | inference
```

6. **建议下一步操作（Recommend next action）**：依据 `likely target`：
   - 对于 `display`：转置为 HWC，裁剪数值范围，转换为 uint8。
   - 对于 `training`：使用数据集统计量标准化，转置为 CHW，添加批次轴。
   - 对于 `inference`：精确匹配模型卡中的不变量。

## 规则（Rules）

- 绝不修改输入，只打印诊断信息。
- 若提供了 `expected`，用 `[expected X got Y]` 标记每一项不匹配。
- 当布局或通道顺序不明确时，指出静默失败风险。
- 每次只建议一项操作，不给出一串备选方案。
