# 从零构建三维高斯泼溅（3D Gaussian Splatting from Scratch）

> 场景是由数百万个三维高斯构成的点云。每个高斯都有位置、朝向、尺度、不透明度，以及随观察方向变化的颜色。将它们光栅化，再穿过光栅化反向传播，就完成了。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 4 第 13 课（三维视觉与 NeRF），阶段 1 第 12 课（张量运算），阶段 4 第 10 课（扩散基础，可选）
**Time:** 约 90 分钟

## 学习目标（Learning Objectives）

- 解释为什么三维高斯泼溅在 2026 年取代 NeRF，成为逼真三维重建的生产默认方案
- 列出每个高斯的六类参数：位置、旋转四元数、尺度、不透明度、球谐颜色、可选特征，以及各占多少浮点数
- 从零实现使用 `alpha` 合成的二维高斯泼溅光栅器，再说明三维情况如何投影到相同循环
- 使用 `nerfstudio`、`gsplat` 或 `SuperSplat` 从 20-50 张照片重建场景，导出为 glTF 扩展 `KHR_gaussian_splatting` 或 OpenUSD 26.03 的 `UsdVolParticleField3DGaussianSplat` 模式

## 问题（The Problem）

神经辐射场（Neural Radiance Field，NeRF）将场景存为多层感知机（Multilayer Perceptron，MLP）权重。每个渲染像素都要沿光线查询 MLP 数百次。训练数小时，渲染数秒，而且权重无法直接编辑；想移动场景中的椅子，就得重新训练。

三维高斯泼溅（3D Gaussian Splatting，3DGS；Kerbl、Kopanas、Leimkühler、Drettakis，SIGGRAPH 2023）改变了这一切。场景是显式三维高斯集合，GPU 光栅化渲染超过每秒 100 帧，训练只需数分钟。编辑直接进行：平移部分高斯，就移动了椅子。到 2026 年，Khronos Group 已批准高斯泼溅 glTF 扩展，OpenUSD 26.03 提供高斯泼溅模式，Zillow 与 Apartments.com 用其渲染房产，大多数新的三维重建论文都是核心 3DGS 思路的变体。

理解框架很简单，但数学中涉及不少环节，多数介绍从光栅化开始，跳过投影和球谐。本课构建完整流程，先做二维版本，再扩展到三维。

## 概念（The Concept）

### 一个高斯携带什么（What a Gaussian carries）

一个三维高斯是空间中的参数化分布，具有以下属性：

```
位置             mu         (3,)    世界坐标中的中心
旋转             q          (4,)    编码朝向的单位四元数
尺度             s          (3,)    各轴对数尺度，渲染时取指数
不透明度         alpha      (1,)    sigmoid 后的不透明度 [0, 1]
SH 系数          c_lm       (3 * (L+1)^2,)   视角相关颜色
```

旋转与尺度构成 3x3 协方差（Covariance）：`Sigma = R S S^T R^T`，定义高斯的三维形状。球谐函数（Spherical Harmonics，SH）让颜色随观察方向变化，表达镜面高光、细微光泽、视角相关辉光，而无需存储逐视角纹理。SH 阶数为 3 时，每颜色通道有 16 个系数，仅颜色每个高斯就占 48 个浮点数。

场景通常有 100 万至 500 万个高斯，每个约存储 60 个浮点数，即 3 + 4 + 3 + 1 + 48 + 其他。五百万高斯场景因此为 240 MB，远小于带逐点纹理的等效点云，也比高分辨率重渲染对应的 NeRF MLP 权重小一个数量级。

### 光栅化，而非光线步进（Rasterisation, not ray marching）

```mermaid
flowchart LR
    SCENE["数百万三维高斯<br/>（位置、旋转、尺度、<br/>不透明度、SH 颜色）"] --> PROJ["投影到二维<br/>（相机外参与内参）"]
    PROJ --> TILES["分配到瓦片<br/>（屏幕空间 16x16）"]
    TILES --> SORT["每瓦片<br/>按深度排序"]
    SORT --> ALPHA["从前到后<br/>Alpha 合成"]
    ALPHA --> PIX["像素颜色"]

    style SCENE fill:#dbeafe,stroke:#2563eb
    style ALPHA fill:#fef3c7,stroke:#d97706
    style PIX fill:#dcfce7,stroke:#16a34a
```

五步都适合 GPU，无需逐像素查询 MLP。单张 RTX 3080 Ti 可按每秒 147 帧渲染 600 万个泼溅图元。

### 投影步骤（The projection step）

世界位置为 `mu`、三维协方差为 `Sigma` 的三维高斯，投影成屏幕位置 `mu'`、二维协方差 `Sigma'` 的二维高斯：

```
mu' = project(mu)
Sigma' = J W Sigma W^T J^T          (2 x 2)

W = 视图变换（相机旋转与平移）
J = mu' 处透视投影的雅可比矩阵
```

二维高斯的覆盖范围是椭圆，其轴由 `Sigma'` 的特征向量给出。椭圆内每个像素接收高斯贡献，权重为 `exp(-0.5 * (p - mu')^T Sigma'^-1 (p - mu'))`。

### Alpha 合成规则（The alpha-compositing rule）

对于一个像素，覆盖它的高斯按从后到前排序，或使用反向公式等价地从前到后排序。颜色采用自 20 世纪 80 年代以来所有半透明光栅器使用的相同方程合成：

```
C_pixel = sum_i alpha_i * T_i * c_i

T_i = prod_{j < i} (1 - alpha_j)       到 i 为止的透射率
alpha_i = opacity_i * exp(-0.5 * d^T Sigma'^-1 d)   局部贡献
c_i = eval_SH(SH_i, view_direction)    视角相关颜色
```

这与 **NeRF 体渲染的方程相同**，只是作用于显式稀疏高斯集合，而不是沿光线的稠密采样。这种一致性解释了为何渲染质量能匹配 NeRF，两者积分的是同一个辐射场方程。

### 为什么可微（Why this is differentiable）

每一步，包括投影、瓦片分配、alpha 合成、SH 求值，都对高斯参数可微。给定真值图像，计算渲染像素损失，穿过光栅器反向传播，用梯度下降更新全部 `(mu, q, s, alpha, c_lm)`。约 30,000 次迭代后，高斯找到合适的位置、尺度和颜色。

### 致密化与剪枝（Densification and pruning）

固定高斯集合无法覆盖复杂场景。训练包含两种自适应机制：

- 当高斯梯度幅值高、尺度小时，在当前位置**克隆（Clone）**它，表示此处重建需要更多细节。
- 当大尺度高斯梯度高时，将其**分裂（Split）**为两个更小高斯，因为一个大高斯过于平滑，无法拟合该区域。
- **剪枝（Prune）**不透明度低于阈值的高斯，它们没有贡献。

每 N 次迭代执行致密化。场景通常从由运动恢复结构（Structure from Motion，SfM）点初始化的约 100k 个高斯，增长到训练结束的 1-5M。

### 一段话理解球谐函数（Spherical harmonics in one paragraph）

视角相关颜色是单位球面上的函数 `c(direction)`。球谐函数是球面的傅里叶基。截断到阶数 `L`，每个通道得到 `(L+1)^2` 个基函数。新视角颜色的求值，就是可学习 SH 系数与在观察方向处求值的基之间做点积。0 阶等于一个系数，即常量颜色。3 阶等于 16 个系数，足以表达朗伯明暗、镜面高光与轻微反射。SD Gaussian Splatting 论文默认使用 3 阶。

### 2026 年生产技术栈（The 2026 production stack）

```
1. 采集            智能手机 / DJI 无人机 / 手持扫描仪
2. SfM / 多视图立体视觉（MVS）  COLMAP 或 GLOMAP 求相机位姿与稀疏点
3. 训练 3DGS       nerfstudio / gsplat / inria 官方 / PostShot（RTX 4090 上约 10-30 分钟）
4. 编辑            SuperSplat / SplatForge（清理漂浮伪影、分割）
5. 导出            .ply -> glTF KHR_gaussian_splatting 或 .usd（OpenUSD 26.03）
6. 查看            Cesium / Unreal / Babylon.js / Three.js / Vision Pro
```

### 四维与生成式变体（4D and generative variants）

- **四维高斯泼溅（4D Gaussian Splatting）**：高斯随时间变化，用于体积视频，例如 2026 年《Superman》和 A$AP Rocky 的《Helicopter》。
- **生成式泼溅（Generative splats）**：从文本生成高斯泼溅的模型，例如 World Labs 的 Marble，可以生成整个场景。
- **三维高斯无迹变换（3D Gaussian Unscented Transform）**：NVIDIA NuRec 用于自动驾驶仿真的变体。

```figure
cv3-gaussian-splat
```

## 动手构建（Build It）

### 第 1 步：二维高斯（Step 1: A 2D Gaussian）

先构建二维光栅器，三维情况投影后可归约为它。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def eval_2d_gaussian(means, covs, points):
    """
    means:  (G, 2)      centres
    covs:   (G, 2, 2)   covariance matrices
    points: (H, W, 2)   pixel coordinates
    returns: (G, H, W)  density at every pixel for every Gaussian
    """
    G = means.size(0)
    H, W, _ = points.shape
    flat = points.view(-1, 2)
    inv = torch.linalg.inv(covs)
    diff = flat[None, :, :] - means[:, None, :]
    d = torch.einsum("gpi,gij,gpj->gp", diff, inv, diff)
    density = torch.exp(-0.5 * d)
    return density.view(G, H, W)
```

`einsum` 对每个高斯、像素对计算二次型 `diff^T Sigma^-1 diff`。

### 第 2 步：二维泼溅光栅器（Step 2: 2D splatting rasteriser）

从前到后执行 alpha 合成。二维中深度没有意义，因此为每个高斯学习一个标量用于排序。

```python
def rasterise_2d(means, covs, colours, opacities, depths, image_size):
    """
    means:     (G, 2)
    covs:      (G, 2, 2)
    colours:   (G, 3)
    opacities: (G,)     in [0, 1]
    depths:    (G,)     per-Gaussian scalar used for ordering
    image_size: (H, W)
    returns:   (H, W, 3) rendered image
    """
    H, W = image_size
    yy, xx = torch.meshgrid(
        torch.arange(H, dtype=torch.float32, device=means.device),
        torch.arange(W, dtype=torch.float32, device=means.device),
        indexing="ij",
    )
    points = torch.stack([xx, yy], dim=-1)

    densities = eval_2d_gaussian(means, covs, points)
    alphas = opacities[:, None, None] * densities
    alphas = alphas.clamp(0.0, 0.99)

    order = torch.argsort(depths)
    alphas = alphas[order]
    colours_sorted = colours[order]

    T = torch.ones(H, W, device=means.device)
    out = torch.zeros(H, W, 3, device=means.device)
    for i in range(means.size(0)):
        a = alphas[i]
        out += (T * a)[..., None] * colours_sorted[i][None, None, :]
        T = T * (1.0 - a)
    return out
```

速度不快，实际实现使用基于瓦片的 CUDA 内核，但数学完全正确，而且完全可微。

### 第 3 步：可训练二维泼溅场景（Step 3: A trainable 2D splat scene）

```python
class Splats2D(nn.Module):
    def __init__(self, num_splats=128, image_size=64, seed=0):
        super().__init__()
        g = torch.Generator().manual_seed(seed)
        H, W = image_size, image_size
        self.means = nn.Parameter(torch.rand(num_splats, 2, generator=g) * torch.tensor([W, H]))
        self.log_scale = nn.Parameter(torch.ones(num_splats, 2) * math.log(2.0))
        self.rot = nn.Parameter(torch.zeros(num_splats))  # single angle in 2D
        self.colour_logits = nn.Parameter(torch.randn(num_splats, 3, generator=g) * 0.5)
        self.opacity_logit = nn.Parameter(torch.zeros(num_splats))
        self.depth = nn.Parameter(torch.rand(num_splats, generator=g))

    def covs(self):
        s = torch.exp(self.log_scale)
        c, si = torch.cos(self.rot), torch.sin(self.rot)
        R = torch.stack([
            torch.stack([c, -si], dim=-1),
            torch.stack([si, c], dim=-1),
        ], dim=-2)
        S = torch.diag_embed(s ** 2)
        return R @ S @ R.transpose(-1, -2)

    def forward(self, image_size):
        covs = self.covs()
        colours = torch.sigmoid(self.colour_logits)
        opacities = torch.sigmoid(self.opacity_logit)
        return rasterise_2d(self.means, covs, colours, opacities, self.depth, image_size)
```

`log_scale`、`opacity_logit`、`colour_logits` 都是无约束参数，渲染时经适当激活函数映射。这是所有 3DGS 实现的标准模式。

### 第 4 步：用二维高斯拟合目标图像（Step 4: Fit 2D Gaussians to a target image）

```python
import math
import numpy as np

def make_target(size=64):
    yy, xx = np.meshgrid(np.arange(size), np.arange(size), indexing="ij")
    img = np.zeros((size, size, 3), dtype=np.float32)
    # Red circle
    mask = (xx - 20) ** 2 + (yy - 20) ** 2 < 10 ** 2
    img[mask] = [1.0, 0.2, 0.2]
    # Blue square
    mask = (np.abs(xx - 45) < 8) & (np.abs(yy - 40) < 8)
    img[mask] = [0.2, 0.3, 1.0]
    return torch.from_numpy(img)


target = make_target(64)
model = Splats2D(num_splats=64, image_size=64)
opt = torch.optim.Adam(model.parameters(), lr=0.05)

for step in range(200):
    pred = model((64, 64))
    loss = F.mse_loss(pred, target)
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 40 == 0:
        print(f"step {step:3d}  mse {loss.item():.4f}")
```

200 步后，64 个高斯会排列成两个形状。这就是完整思路：对显式几何图元进行梯度下降。

### 第 5 步：从二维到三维（Step 5: From 2D to 3D）

三维扩展保留相同循环，增加以下内容：

1. 每个高斯的旋转由四元数表示，而不是单个角度。
2. 协方差为 `R S S^T R^T`，其中 `R` 由四元数构建，`S = diag(exp(log_scale))`。
3. 投影 `(mu, Sigma) -> (mu', Sigma')` 使用相机外参与 `mu` 处透视投影的雅可比矩阵（Jacobian）。
4. 颜色变为球谐展开，在观察方向处求值。
5. 按真实相机空间 z 深度排序，而不是使用可学习标量。

各生产实现，包括 `gsplat`、`inria/gaussian-splatting`、`nerfstudio`，都用基于瓦片的 CUDA 内核在 GPU 上完成这一流程。

### 第 6 步：球谐求值（Step 6: Spherical harmonics evaluation）

截至 3 阶的 SH 基每通道有 16 项，求值如下：

```python
def eval_sh_degree_3(sh_coeffs, dirs):
    """
    sh_coeffs: (..., 16, 3)   last dim is RGB channels
    dirs:      (..., 3)       unit vectors
    returns:   (..., 3)
    """
    C0 = 0.282094791773878
    C1 = 0.488602511902920
    C2 = [1.092548430592079, 1.092548430592079,
          0.315391565252520, 1.092548430592079,
          0.546274215296039]
    x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
    x2, y2, z2 = x * x, y * y, z * z
    xy, yz, xz = x * y, y * z, x * z

    result = C0 * sh_coeffs[..., 0, :]
    result = result - C1 * y[..., None] * sh_coeffs[..., 1, :]
    result = result + C1 * z[..., None] * sh_coeffs[..., 2, :]
    result = result - C1 * x[..., None] * sh_coeffs[..., 3, :]

    result = result + C2[0] * xy[..., None] * sh_coeffs[..., 4, :]
    result = result + C2[1] * yz[..., None] * sh_coeffs[..., 5, :]
    result = result + C2[2] * (2.0 * z2 - x2 - y2)[..., None] * sh_coeffs[..., 6, :]
    result = result + C2[3] * xz[..., None] * sh_coeffs[..., 7, :]
    result = result + C2[4] * (x2 - y2)[..., None] * sh_coeffs[..., 8, :]

    # degree 3 terms omitted here for brevity; full 16-coefficient version in the code file
    return result
```

可学习的 `sh_coeffs` 存储该高斯“各方向的颜色”。渲染时针对当前观察方向求值，得到 RGB 三维向量。

## 实际使用（Use It）

实际 3DGS 工作使用 `gsplat`（Meta）或 `nerfstudio`：

```bash
pip install nerfstudio gsplat
ns-download-data example
ns-train splatfacto --data path/to/data
```

`splatfacto` 是 nerfstudio 的 3DGS 训练器。典型场景在 RTX 4090 上运行需 10-30 分钟。

2026 年值得关注的导出选项：

- `.ply`：原始高斯点云，可移植、文件最大。
- `.splat`：PlayCanvas / SuperSplat 量化格式。
- glTF `KHR_gaussian_splatting`：Khronos 标准，可跨查看器移植，2026 年 2 月发布候选版（Release Candidate，RC）。
- OpenUSD `UsdVolParticleField3DGaussianSplat`：USD 原生，用于 NVIDIA Omniverse 与 Vision Pro 流水线。

对于四维或动态场景，`4DGS` 与 `Deformable-3DGS` 通过随时间变化的均值和不透明度扩展相同机制。

## 交付成果（Ship It）

本课产出：

- `outputs/prompt-3dgs-capture-planner.md`：为给定场景类型规划采集活动，包括照片数量、相机路径与光照的提示词。
- `outputs/skill-3dgs-export-router.md`：根据下游查看器或引擎，选择合适导出格式（`.ply` / `.splat` / glTF / USD）的技能。

## 练习（Exercises）

1. **（简单）** 对另一张合成图像运行上述二维泼溅训练器。将 `num_splats` 设为 `[16, 64, 256]`，分别绘制均方误差（MSE）随步数变化的曲线，找出收益递减点。
2. **（中等）** 扩展二维光栅器，通过二阶谐波使每个高斯的 RGB 颜色依赖标量“观察角度”。在一对目标图像上训练，验证模型能重建两者。
3. **（困难）** 克隆 `nerfstudio`，用任意可采集场景的 20 张照片训练 `splatfacto`，例如书桌、植物、面部、房间。导出为 glTF `KHR_gaussian_splatting`，在 Three.js `GaussianSplats3D`、SuperSplat 或 Babylon.js V9 查看器打开。报告训练时间、高斯数量和渲染帧率。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 三维高斯泼溅（3DGS） | “高斯泼溅图元” | 用数百万三维高斯显式表示场景，每个高斯携带位置、旋转、尺度、不透明度和球谐颜色 |
| 协方差（Covariance） | “高斯形状” | `Sigma = R S S^T R^T`，表示高斯朝向与各向异性尺度 |
| Alpha 合成（Alpha compositing） | “从后到前混合” | 与 NeRF 体渲染方程相同，此处作用于显式稀疏集合 |
| 致密化（Densification） | “克隆与分裂” | 在重建欠拟合处自适应增加高斯 |
| 剪枝（Pruning） | “删除低不透明度图元” | 移除训练中不透明度趋近零的高斯 |
| 球谐函数（Spherical harmonics） | “视角相关颜色” | 球面上的傅里叶基，将颜色存为观察方向的函数 |
| Splatfacto | “nerfstudio 的 3DGS” | 2026 年最简单的 3DGS 训练路径 |
| `KHR_gaussian_splatting` | “glTF 标准” | Khronos 2026 年扩展，让 3DGS 可跨查看器与引擎移植 |

## 延伸阅读（Further Reading）

- [用于实时辐射场渲染的三维高斯泼溅（Kerbl 等，SIGGRAPH 2023）](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)：原始论文
- [gsplat（Meta/nerfstudio）](https://github.com/nerfstudio-project/gsplat)：生产级 CUDA 光栅器
- [nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html)：参考训练方案
- [Khronos KHR_gaussian_splatting 扩展](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md)：2026 年可移植格式
- [OpenUSD 26.03 发布说明](https://openusd.org/release/)：`UsdVolParticleField3DGaussianSplat` 模式
- [THE FUTURE 3D：2026 年高斯泼溅现状](https://www.thefuture3d.com/blog-0/2026/4/4/state-of-gaussian-splatting-2026)：行业概览
