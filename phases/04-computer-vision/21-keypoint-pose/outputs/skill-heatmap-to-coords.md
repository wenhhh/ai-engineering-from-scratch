---
name: skill-heatmap-to-coords
description: 编写各生产姿态模型使用的亚像素热图转坐标程序
version: 1.0.0
phase: 4
lesson: 21
tags: [keypoint, pose, subpixel, inference]
---

# 热图转坐标（Heatmap to Coords）

将原始关键点热图转换为亚像素（Sub-pixel）精度坐标。这是姿态流水线中成本最低的准确率提升手段。

## 使用时机（When to use）

- 部署基于热图的关键点模型。
- 测试姿态指标，目标关键点相似度（Object Keypoint Similarity，OKS）对亚像素精度极其敏感。
- 在不同框架间移植姿态代码。

## 输入（Inputs）

- `heatmaps`：`(N, K, H, W)` 张量，模型输出的逐关键点热图。
- `confidence_threshold`：丢弃峰值低于该值的关键点。

## 步骤（Steps）

1. 对每张热图**取最大值索引（Argmax）**，找到整数峰值位置。
2. **一阶差分偏移（First-difference offset）**：根据邻近像素估计亚像素偏移。`0.25` 系数是针对 `sigma >= 1` 的高斯热图校准的启发式值；若需有原理依据的亚像素恢复，使用完整二次拟合（DARK）或高斯拟合。

```
dx = 0.25 * sign(heatmap[y, x+1] - heatmap[y, x-1])
dy = 0.25 * sign(heatmap[y+1, x] - heatmap[y-1, x])
```

对于 DARK / 二次变体，使用局部二次函数近似：

```
dx = -0.5 * (heatmap[y, x+1] - heatmap[y, x-1])
        / (heatmap[y, x+1] - 2 * heatmap[y, x] + heatmap[y, x-1] + eps)
```

二次拟合对峰值明确的热图更准确；热图有噪声时，基于符号的偏移是更稳妥的默认选择。

3. 向整数峰值**添加偏移（Add offset）**。
4. **置信度（Confidence）**：返回每个关键点的峰值，客户端据此屏蔽低置信度预测。
5. **边界情况（Boundary case）**：峰值落在某轴首末像素时，一个邻点会被限制，偏移归零，这是最稳妥的退回行为。

## 输出模板（Output template）

```python
import torch

def heatmap_to_coords_subpixel(heatmaps, threshold=0.2):
    N, K, H, W = heatmaps.shape
    flat = heatmaps.reshape(N, K, -1)
    conf, idx = flat.max(dim=-1)
    ys = (idx // W).float()
    xs = (idx % W).float()

    ys_int = ys.long()
    xs_int = xs.long()

    x_minus = (xs_int - 1).clamp(min=0)
    x_plus = (xs_int + 1).clamp(max=W - 1)
    y_minus = (ys_int - 1).clamp(min=0)
    y_plus = (ys_int + 1).clamp(max=H - 1)

    batch_idx = torch.arange(N).view(-1, 1).expand(-1, K)
    kp_idx = torch.arange(K).view(1, -1).expand(N, -1)

    dx_raw = (heatmaps[batch_idx, kp_idx, ys_int, x_plus]
              - heatmaps[batch_idx, kp_idx, ys_int, x_minus])
    dy_raw = (heatmaps[batch_idx, kp_idx, y_plus, xs_int]
              - heatmaps[batch_idx, kp_idx, y_minus, xs_int])
    dx = 0.25 * torch.sign(dx_raw)
    dy = 0.25 * torch.sign(dy_raw)

    at_left = xs_int == 0
    at_right = xs_int == (W - 1)
    at_top = ys_int == 0
    at_bottom = ys_int == (H - 1)
    dx = torch.where(at_left | at_right, torch.zeros_like(dx), dx)
    dy = torch.where(at_top | at_bottom, torch.zeros_like(dy), dy)

    refined_x = xs + dx
    refined_y = ys + dy
    coords = torch.stack([refined_x, refined_y], dim=-1)
    mask = conf >= threshold
    return coords, conf, mask
```

## 报告（Report）

```
[subpixel decode]
  keypoints:   K
  threshold:   <float>
  valid_rate:  超过阈值的关键点占比
```

## 规则（Rules）

- 始终将邻点索引限制在有效范围；边缘关键点采用零差分偏移，不会崩溃。
- 同时返回坐标与置信度，让客户端屏蔽低置信度点。
- 只有峰值周围热图平滑时，亚像素细化才有帮助；检查训练是否使用 sigma >= 1 的高斯目标。
- 热图分辨率很小，例如 < 48x48 时，考虑先上采样到完整图像大小，再提取坐标；亚像素偏移会随步幅缩放。
