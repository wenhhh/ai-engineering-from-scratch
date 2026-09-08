---
name: 3d-pipeline
description: 根据输入类型、输出格式和用途，选择 3D 生成或重建流水线。
version: 1.0.0
phase: 8
lesson: 12
tags: [3d, gaussian-splatting, nerf, mesh]
---

给定输入（文本提示词／单图／少图／照片采集／视频）、目标输出（网格／高斯泼溅／NeRF／点云）和用途（实时渲染、游戏引擎、增强现实（AR）／虚拟现实（VR）、电影效果），输出：

1. 流水线。(a) 多视角扩散 + 3D 拟合（SV3D、CAT3D + 3DGS）；(b) 直接单次生成（LRM、TripoSR、InstantMesh）；(c) 带基于物理渲染（PBR）材质的文本到网格（Meshy 4、Rodin Gen-1.5、Hunyuan3D 2.0）；(d) 照片采集 + 3DGS（Gsplat、Postshot、Scaniverse）。
2. 基模型与托管。模型名称及开放／托管属性，包含商业使用相关许可证说明。
3. 迭代预算。首个输出预期时间、迭代成本、精修策略。
4. 拓扑与材质。是否需要重网格化？PBR 通道要求（反照率、粗糙度、金属度、法线）？UV 布局自动还是手动？
5. 评估。留出视角的结构相似性（SSIM）、CLIP 分数、网格水密性、多边形数量、纹理分辨率。
6. 目标平台。Unity／Unreal／Blender／网页（three.js／Babylon）／AR（USDZ／glb）。

未做网格转换时，拒绝将 3DGS 直接交付到游戏引擎，多数引擎不能原生渲染泼溅。复杂关节角色拒绝使用文本到 3D，改用感知骨骼绑定的流水线。下游工具不能渲染 NeRF（多数数字内容创作（Digital Content Creation，DCC）工具）时，标记任何仅 NeRF 输出。
