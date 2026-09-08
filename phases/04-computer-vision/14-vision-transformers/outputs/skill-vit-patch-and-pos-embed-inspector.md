---
name: skill-vit-patch-and-pos-embed-inspector
description: 验证 ViT 图像块嵌入和位置嵌入的形状是否匹配模型预期序列长度
version: 1.0.0
phase: 4
lesson: 14
tags: [vision-transformer, debugging, pytorch]
---

# ViT 图像块与位置嵌入检查器（ViT Patch and Positional Embedding Inspector）

最常见的 ViT 移植错误是：将 224x224 预训练的检查点加载到配置为 384x384 的模型中，或反过来。位置嵌入的序列长度错误，模型却会静默地产生无效结果。

## 使用时机（When to use）

- 在非默认分辨率下微调预训练 ViT。
- 审计 ViT-B/16 与 ViT-B/32 之间的权重移植为何失败；检查器标记图像块大小不匹配，让调用者知道应切换架构，而非强行移植。
- 排查加载时不报错、但训练表现差的 ViT。

## 输入（Inputs）

- `model`：已实例化的 ViT `nn.Module`。
- `expected_image_size`：模型在生产中接收的 H x W。
- `patch_size`：预期图像块大小。

## 步骤（Steps）

1. 定位模型内的图像块嵌入卷积。报告其 `kernel_size`、`stride`、`in_channels`、`out_channels`。
2. 计算预期图像块数量。正方形图像为 `(image_size / patch_size)^2`，矩形为 `(H / patch_size) * (W / patch_size)`。必须满足 `H % patch_size == 0` 与 `W % patch_size == 0`，否则标记问题并拒绝继续。
3. 定位可学习位置嵌入，报告形状 `(1, N, dim)`。
4. 将 `N` 与 `num_patches + 1`（带 CLS）或 `num_patches`（不带 CLS）比较。不匹配表示检查点预训练时使用了不同分辨率或图像块大小。
5. 检查图像块卷积的 `out_channels` 是否等于位置嵌入的 `dim`。
6. 如果模型应针对新分辨率插值位置嵌入，验证插值工具是否存在。多数 `timm` ViT 通过 `resize_pos_embed` 自动处理。

## 报告（Report）

```
[vit-inspector]
  image_size:         HxW
  patch_size:         <int>
  num_patches (computed): <int>
  patch_conv:         k=<int>  s=<int>  in=<int>  out=<int>
  pos_embed shape:    (1, N, dim)
  has CLS token:      yes | no
  pos_embed N:        <int>    expected: <int>
  verdict:            ok | mismatch

[if mismatch]
  action:  为新序列长度重新初始化 pos_embed
  tool:    timm.models.vision_transformer.resize_pos_embed
```

## 规则（Rules）

- 不要不加警告地静默插值；明确说明操作，让用户知道预训练的位置结构可能发生变化。
- 如果 patch_size 不匹配，拒绝建议插值，改用正确架构。
- 不要尝试就地修复模型，只报告并给出建议。
