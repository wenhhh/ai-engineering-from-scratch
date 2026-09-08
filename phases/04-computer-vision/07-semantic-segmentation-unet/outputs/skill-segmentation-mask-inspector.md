---
name: skill-segmentation-mask-inspector
description: 报告类别分布、预测掩码统计，以及最可能预测不足或边界模糊的类别
version: 1.0.0
phase: 4
lesson: 7
tags: [computer-vision, segmentation, debugging, evaluation]
---

# 分割掩码检查器（Segmentation Mask Inspector）

诊断“损失下降了”与“掩码确实正确”之间的差距。

## 使用时机（When to use）

- 训练结束后，mIoU 看起来不错，但视觉检查并非如此。
- 部署前，对照真实标签检查预测的类别平衡。
- 大目标的逐类 IoU 高，小目标却低。
- 调试因像素数量少而未反映在 IoU 中的边界伪影。

## 输入（Inputs）

- `preds`：形状为 (N, H, W) 的预测类别 ID 张量。
- `targets`：形状为 (N, H, W) 的真实类别 ID 张量。
- `num_classes`：整数。
- 可选的 `class_names`：包含 C 个字符串的列表。

## 步骤（Steps）

1. **类别像素直方图。** 计算 `preds` 与 `targets` 中每类像素百分比。标记满足 `|pred% - gt%| / max(gt%, 1e-6) > 0.30` 的类别，即相对偏差超过 30%。真实标签中缺失的类别（`gt% == 0`），若预测占比超过 `0.3`，直接标记。

2. **逐类 IoU** 与**逐类边界 F1**。边界 F1 通过将各掩码膨胀 3 个像素、求交并评分计算。IoU > 0.7 但边界 F1 < 0.5 的类别存在边缘模糊。

3. **小目标召回率。** 将每个真实连通分量按尺寸分桶：极小 < 100 像素，小 < 1000 像素，中 < 10000 像素，大 >= 10000 像素。按类别、按桶报告召回率。小目标召回率低于 0.3，而大目标高于 0.9，表明分辨率或感受野有问题。

4. **混淆对。** 对每类找到最常混淆的类别，即该真实掩码范围内最常见的错误预测类别。报告前三对。

5. **饱和检查，需要 `probs` 或 `logits`，而非只有 `preds`。** 若调用方传入原始逐像素概率分布 `probs: (N, C, H, W)`，逐类计算满足 `probs.max(dim=1) > 0.99` 的像素比例。高饱和度，即超过该类像素的 0.9，提示过度自信，可考虑标签平滑或校准。若只有取过最大值索引的 `preds`，跳过此步，并在报告中注明。

## 报告格式（Report format）

```
[mask-inspector]
  classes: C

[class distribution]
  name       gt %    pred %   delta
  ...

[metrics]
  class       IoU     bF1    recall_tiny  recall_small  recall_medium  recall_large
  ...

[confusion pairs]
  类别 A 被混淆为类别 B：<N> 像素（最常见）
  类别 B 被混淆为类别 A：<N> 像素
  ...

[verdict]
  most impactful issue: <一句话>
```

## 规则（Rules）

- 按真实标签像素占比降序排列类别行，让最常见类别在前。
- 将 IoU < 0.4 或边界 F1 < 0.3 的类别标为 `critical`。
- 主要问题是小目标召回时，建议更高分辨率训练、减小最后编码器阶段的步幅，或使用特征金字塔解码器。
- 主要问题是边界 F1 时，建议边界感知损失（Lovasz 或 BoundaryLoss）、带水平翻转的测试时增强（TTA），以及无步幅解码器。
- 绝不只用类别索引作标识；若提供 `class_names`，每行都使用它。
