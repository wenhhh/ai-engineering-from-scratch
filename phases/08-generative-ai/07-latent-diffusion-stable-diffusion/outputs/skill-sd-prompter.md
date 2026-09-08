---
name: sd-prompter
description: 根据提示词、风格与质量门槛配置 Stable Diffusion／Flux 推理。
version: 1.0.0
phase: 8
lesson: 07
tags: [stable-diffusion, flux, latent-diffusion]
---

给定提示词、目标风格与质量门槛（快速预览／作品集质量／可印刷），输出：

1. 模型与检查点。SD 1.5（旧工具）、SDXL-base + refiner、SDXL-Turbo（快）、SD3.5-Large、Flux.1-dev（最佳开放方案）、Flux.1-schnell（快速开放方案），或托管 API（DALL-E 3、Imagen 4、Midjourney v7）。用一句话说明理由。
2. 采样器。Euler A（创意）、DPM-Solver++ 2M Karras（稳定）、潜空间一致性模型（Latent Consistency Model，LCM；快速），或流匹配采样器（SD3／Flux）。包含步数。
3. 无分类器引导（CFG）尺度。Turbo／LCM 用 0，Flux 用 3 至 4，SDXL 用 5 至 7，SD1.5 用 7 至 10。记录权衡。
4. 附加组件。ControlNet（姿态、深度、canny、分割）、IP-Adapter（参考图像）、LoRA（风格或主体）、SD3+ 的 T5 开关。
5. 负向提示词。显式空字符串与填写内容（伪影、低质量、错误解剖结构）有区别，分别明确说明。

SDXL+ 拒绝 CFG &gt; 10（输出过饱和）。非旧版检查点拒绝 &gt; 50 个采样步（30 步已达质量平台）。拒绝混用不同基模型训练的 LoRA（SD 1.5 LoRA 用于 SDXL 会静默失效）。对照片级真实人物请求，若缺少工作场所不宜内容（Not Safe for Work，NSFW）、深度伪造和版权政策提醒，应提出警示。
