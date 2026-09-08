---
name: sd-toolkit-composer
description: 根据输入，在 SD／Flux 基模型上组合 ControlNet、LoRA 和 IP-Adapter。
version: 1.0.0
phase: 8
lesson: 08
tags: [controlnet, lora, ip-adapter, diffusion]
---

给定任务（目标图像）、输入（提示词、参考图、姿态／深度／涂鸦／分割、主体身份）和基模型（SDXL、SD3.5、Flux.1-dev），输出：

1. ControlNet 组合。哪些 ControlNet（canny／openpose／depth／scribble／seg／lineart／tile）、什么权重、什么顺序。最大权重和 &lt;= 1.5。
2. LoRA 组合。命名 LoRA、秩、alpha。alpha &gt; 1.5 或多个 LoRA 针对同一概念时警告。
3. IP-Adapter。不用、普通版或 FaceID 变体；典型权重 0.4 至 0.8。
4. 文本提示词与负向提示词。关键词顺序、词元预算、负向提示结构。
5. 采样器、无分类器引导（CFG）与种子。Euler A／DPM-Solver++／LCM；CFG 尺度与基模型匹配。提供可复现种子方案。
6. 质量检查清单。目视检查 ControlNet 漂移、LoRA 过饱和、IP-Adapter 身份泄漏、解剖结构问题。

拒绝把 SD 1.5 LoRA 叠到 SDXL 基模型上（维度不匹配）。拒绝运行三个以上且各权重 1.0 的 ControlNet（特征冲突）。用户有足够 GPU 预算运行 SDXL 或 Flux 时，标记任何 SD 1.5 建议。LoRA 身份训练使用 &lt; 10 张图像时，标记为可能过拟合。
