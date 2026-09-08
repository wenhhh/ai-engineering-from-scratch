---
name: skill-point-cloud-loader
description: 为 .ply / .pcd / .xyz 文件编写 PyTorch Dataset，正确执行归一化、中心化和点采样
version: 1.0.0
phase: 4
lesson: 13
tags: [3d-vision, point-cloud, data-loading, pytorch]
---

# 点云加载器（Point Cloud Loader）

将三维扫描文件目录转换为可直接训练的 PyTorch `Dataset`。

## 使用时机（When to use）

- 开始新的点云分类或分割项目。
- 在 `.ply`、`.pcd` 与 `.xyz` 格式之间切换。
- 排查训练不报错却收敛不佳的模型；原因往往是数据加载器的归一化有误。

## 输入（Inputs）

- `data_root`：点云文件目录，以及可选的标签 CSV 文件。
- `file_format`：ply | pcd | xyz | npy。
- `num_points`：固定采样点数，通常为 1024 或 2048。
- `augmentation`：none | rotate | jitter | mixup。

## 归一化策略（Normalisation policy）

每条生产点云流水线按顺序执行：

1. **中心化（Centre）**点云：减去质心。
2. **缩放（Scale）**至单位球：除以到中心的最大距离。
3. **采样（Sample）** `num_points` 个点。如果点数更多，使用**最远点采样（Farthest Point Sampling，FPS）**忠实保留形状，或用随机采样提高速度。如果点数不足，则重复点。
4. **打乱（Shuffle）**点的顺序。模型本就不应依赖顺序，但打乱可破除意外的顺序依赖。

## 输出模板（Output template）

```python
import numpy as np
import torch
from torch.utils.data import Dataset

try:
    import open3d as o3d
    HAS_O3D = True
except ImportError:
    HAS_O3D = False

def _read_ply(path):
    if HAS_O3D:
        pc = o3d.io.read_point_cloud(path)
        return np.asarray(pc.points, dtype=np.float32)
    # Fallback: minimal ascii-ply reader
    ...

def _fps(points, k):
    idx = np.zeros(k, dtype=np.int64)
    dist = np.full(len(points), np.inf)
    seed = np.random.randint(len(points))
    idx[0] = seed
    for i in range(1, k):
        dist = np.minimum(dist, ((points - points[idx[i-1]]) ** 2).sum(axis=1))
        idx[i] = int(np.argmax(dist))
    return idx

def normalise(points):
    centre = points.mean(axis=0)
    points = points - centre
    scale = np.max(np.linalg.norm(points, axis=1))
    return points / max(scale, 1e-8)

class PointCloudDataset(Dataset):
    def __init__(self, files, labels, num_points=1024, augment=False):
        self.files = files
        self.labels = labels
        self.num_points = num_points
        self.augment = augment

    def __len__(self):
        return len(self.files)

    def __getitem__(self, i):
        pts = _read_ply(self.files[i])
        pts = normalise(pts)
        if len(pts) >= self.num_points:
            idx = _fps(pts, self.num_points)
            pts = pts[idx]
        else:
            reps = int(np.ceil(self.num_points / len(pts)))
            pts = np.tile(pts, (reps, 1))[:self.num_points]
        # Shuffle point order to break any accidental dependencies (especially
        # important when tiling repeats points in deterministic order).
        np.random.shuffle(pts)
        if self.augment:
            theta = np.random.uniform(0, 2 * np.pi)
            R = np.array([[np.cos(theta), 0, np.sin(theta)],
                          [0, 1, 0],
                          [-np.sin(theta), 0, np.cos(theta)]], dtype=np.float32)
            pts = pts @ R
            pts = pts + np.random.normal(0, 0.02, pts.shape).astype(np.float32)
        pts = np.ascontiguousarray(pts, dtype=np.float32)
        return torch.from_numpy(pts).transpose(0, 1), int(self.labels[i])
```

## 报告（Report）

```
[dataset]
  files:          <N>
  format:         <ply|pcd|xyz|npy>
  points_per_sample: <int>
  normalise:      中心化 + 单位球
  sampling:       FPS | random
  augmentation:   <列表>
```

## 规则（Rules）

- 始终先中心化，再缩放；交换顺序会改变“单位球”的含义。
- 形状任务优先使用 FPS 而非随机采样；分割中每个点都重要，随机采样可以接受。
- 不得在评估时进行增强，只能在训练时增强。
- 如果点云文件的额外通道包含颜色或法向量，扩展 Dataset，使其返回 `(3 + C, num_points)` 张量，而非只有 xyz。
