---
name: skill-depth-to-pointcloud
description: 从深度图构建点云，正确处理内参并导出为 .ply
version: 1.0.0
phase: 4
lesson: 26
tags: [depth, point-cloud, 3d, intrinsics]
---

# 深度转点云（Depth to Point Cloud）

将深度图与彩色图像转换为带纹理的点云，可导出供可视化或后续三维处理。

## 适用场景（When to use）

- 将深度预测可视化为真实三维场景。
- 从单张图像启动稀疏三维重建。
- 运动恢复结构（Structure from Motion，SfM）失败时，为三维高斯泼溅（3D Gaussian Splatting，3DGS）训练生成输入。
- 将预测深度与激光雷达（LiDAR）真值比较。

## 输入（Inputs）

- `depth`：形状为 `(H, W)` 的 numpy 深度数组，单位与期望输出一致，推荐米。
- `rgb`：形状为 `(H, W, 3)` 的 numpy 颜色数组，类型为 uint8 或取值 [0, 1] 的 float32。
- `intrinsics`：以像素为单位的 `(fx, fy, cx, cy)`。
- 可选 `depth_scale`：将预测深度单位转换为米的乘数。

## 流水线（Pipeline）

1. **验证（Validate）**：所有计划纳入的深度必须为正且有限，屏蔽无效像素。
2. **提升（Lift）**：对每个像素计算 `X = (u - cx) * d / fx`、`Y = (v - cy) * d / fy`、`Z = d`。
3. 与 RGB **配对（Pair）**：每个三维点获得对应像素的 `(r, g, b)` 三元组。
4. **导出（Export）**：PLY（可移植）、`.xyz`（轻量）、`.pcd`（Open3D 原生）、`.las` / `.laz`（地理空间）。

## 实现模板（Implementation template）

```python
import numpy as np

def depth_to_point_cloud(depth, intrinsics, depth_scale=1.0, min_depth=0.1, max_depth=100.0):
    H, W = depth.shape
    fx, fy, cx, cy = intrinsics
    v, u = np.meshgrid(np.arange(H), np.arange(W), indexing="ij")
    z = depth.astype(np.float32) * depth_scale
    valid = (z > min_depth) & (z < max_depth) & np.isfinite(z)
    x = (u - cx) * z / fx
    y = (v - cy) * z / fy
    points = np.stack([x, y, z], axis=-1)
    return points, valid


def write_ply(path, points, colors=None, valid_mask=None):
    p = points.reshape(-1, 3)
    if valid_mask is not None:
        p = p[valid_mask.flatten()]
    lines = [
        "ply",
        "format ascii 1.0",
        f"element vertex {p.shape[0]}",
        "property float x", "property float y", "property float z",
    ]
    if colors is not None:
        c = colors.reshape(-1, 3).astype(np.uint8)
        if valid_mask is not None:
            c = c[valid_mask.flatten()]
        lines += ["property uchar red", "property uchar green", "property uchar blue"]
    lines.append("end_header")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")
        if colors is not None:
            for pt, col in zip(p, c):
                f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f} {col[0]} {col[1]} {col[2]}\n")
        else:
            for pt in p:
                f.write(f"{pt[0]:.4f} {pt[1]:.4f} {pt[2]:.4f}\n")
```

## 报告（Report）

```
[export]
  input depth shape:  (H, W)
  valid points:       <N>，总计 <H*W>
  output format:      ply | xyz | pcd | las
  coordinate system:  相机坐标（+X 向右、+Y 向下、+Z 向前）
  scale:              metres | millimetres | normalised
```

## 规则（Rules）

- 始终屏蔽无效深度，包括零、NaN、inf 和饱和值；纳入它们会在原点生成一团无意义点。
- 相对深度模型的预测不要作为度量深度导出；输出文件名加上 `relative_` 前缀，说明这一约定。
- 保持相机坐标约定一致：OpenCV 为 +X 向右、+Y 向下、+Z 向前。如果下游工具使用 OpenGL（+Y 向上），则转换符号。
- 对超过 100 万点的密集场景，提供子采样参数；超过 500 MB 的 PLY 文件在各种环境中都不便加载。
- 不要悄悄裁剪深度以生成“合理”输出；应明确裁剪并警告所用阈值，让用户知道丢弃了什么。
