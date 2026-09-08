---
name: skill-3dgs-export-router
description: 根据下游查看器或引擎，选择合适的 3DGS 导出格式，包含 .ply / .splat / glTF KHR_gaussian_splatting / USD
version: 1.0.0
phase: 4
lesson: 22
tags: [3d-gaussian-splatting, export, glTF, OpenUSD, pipeline]
---

# 3DGS 导出选择器（3DGS Export Router）

为下游目标匹配正确的三维高斯泼溅（3D Gaussian Splatting，3DGS）文件格式，节省数小时“无法加载”的排错时间。

## 使用时机（When to use）

- 训练 3DGS 场景后，交给内容流水线之前。
- 在研究格式 .ply 与生产格式 glTF / USD 之间选择。
- 流水线交接：采集团队 -> 3DGS 工程师 -> 游戏设计师 / 视觉特效艺术家 / 网页开发者。

## 输入（Inputs）

- `target_engine`：unreal | unity | omniverse | blender | vision_pro | three_js | babylon_js | cesium | playcanvas | supersplat
- `priority`：portability | file_size | quality_preservation
- `include_sh_degree`：0 | 1 | 2 | 3

## 格式决策（Format decision）

| 目标 | 推荐格式 | 原因 |
|--------|--------------------|-----|
| Unreal Engine，虚拟制作 | Volinga 插件或 glTF KHR_gaussian_splatting | 原生 Unreal SDK 路径 |
| Unity，扩展现实（Extended Reality，XR）/ 游戏 | 通过 Aras-P Unity-GaussianSplatting 插件使用 .ply | 社区标准 Unity 流水线 |
| NVIDIA Omniverse、Pixar 工具 | OpenUSD 26.03（UsdVolParticleField3DGaussianSplat） | 原生 USD 图元类型 |
| Apple Vision Pro | OpenUSD 26.03 | visionOS 2.x 原生支持 |
| Blender | .ply 加 KIRI Engine 扩展 | 社区扩展读取原始泼溅图元 |
| Three.js 网页查看器 | glTF KHR_gaussian_splatting 或 .splat | 浏览器标准，适用于 `GaussianSplats3D` |
| Babylon.js V9+ | glTF KHR_gaussian_splatting | V9 增加原生支持 |
| Cesium，CesiumJS 1.139+、Cesium for Unreal 2.23+ | glTF KHR_gaussian_splatting | 已明确提供支持 |
| PlayCanvas | .splat | PlayCanvas 原生量化格式 |
| SuperSplat 编辑器 | .ply 或 .splat | 支持导入与导出 |

## 量化权衡（Quantisation trade-offs）

- `.ply` 全精度：文件最大、无损、任意查看器可用。
- `.splat`：缩小 4-8 倍，3 阶球谐（SH3）系数有轻微质量损失，是 PlayCanvas 生态标准。
- glTF KHR：可通过 EXT_meshopt_compression 配置，在最高兼容性下做到最小。
- USD：通过 USDZ 打包压缩，在 Apple 流水线中最小。

## 输出报告（Output report）

```
[export plan]
  target:         <引擎>
  format:         <名称>
  sh degree:      <0|1|2|3>
  compression:    <none|meshopt|quantisation|usdz>
  expected size:  <MB>
  compatible with: <查看器列表>

[pipeline]
  1. source: <训练生成的 .ply>
  2. optional: SuperSplat 清理
  3. convert: <工具与 CLI 或 API 调用>
  4. package: <.gltf / .glb / .usd / .usdz / .splat / .ply>
  5. validate: <查看器基本检查>
```

## 规则（Rules）

- 不得静默移除 SH3 系数，这会明显改变镜面反射。
- 当 `priority == file_size` 时，推荐 `.splat` 或带 meshopt 的 glTF，并提醒质量损失。
- 2026 年 Apple 平台优先 USD / USDZ，而非 glTF；USDZ 获得 visionOS 的一等支持。
- 目标查看器的 3DGS 支持若早于标准发布，即 2026 年 2 月之前，推荐 `.ply` 与查看器自定义加载器；它尚不能识别 Khronos 标准 glTF。
- 交接前，始终至少在一个查看器中验证导出文件；量化过程中可能静默损坏。
