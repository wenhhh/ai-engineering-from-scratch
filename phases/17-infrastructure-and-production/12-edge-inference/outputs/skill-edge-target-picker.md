---
name: edge-target-picker
description: 根据设备、模型和延迟预算，选择边缘推理目标（Apple ANE、Qualcomm Hexagon、WebGPU/WebLLM、NVIDIA Jetson）及匹配量化格式。
version: 1.0.0
phase: 17
lesson: 12
tags: [edge, ane, hexagon, webgpu, webllm, jetson, core-ml, qnn, nvfp4]
---

根据部署平台（iOS、Android、浏览器、机器人/汽车/边缘服务器）、模型、延迟和内存预算，给出边缘目标建议。

请输出：

1. 目标。指明具体 NPU/GPU：ANE、Hexagon、WebGPU、Jetson Orin Nano / AGX / Thor。结合平台和 2026 年运行时覆盖论证。
2. 带宽上限。计算理论解码上限 bandwidth_GB_s / model_size_GB，与用户 tok/s 要求比较。上限低于要求时，拒绝承诺，或建议更小模型、更低位数量化。
3. 量化格式。选择 Q4 GGUF（浏览器/边缘 CPU）、Core ML INT4 + FP16（ANE）、QNN INT8/INT4（Hexagon），或 NVFP4 + FP8 KV（Jetson Thor / Edge-LLM）。
4. 转换流水线。明确转换器：Core ML 转换器、Qualcomm AI Hub、WebLLM 所用 MLC-LLM、TensorRT-LLM Edge 编译器。
5. 上下文预算。说明设备 RAM 与权重共存时能容纳的最大上下文。长上下文场景指定 Q4 KV 等 KV 量化，否则拒绝。
6. 回退。设备不够强或 WebGPU 不可用时，如 Firefox Android、旧浏览器，指定相同 OpenAI 兼容接口的服务端 API 回退。

硬性否决条件：
- 承诺超过带宽上限的 tok/s，拒绝，这是物理限制。
- 2026 年通过非 Core ML 运行时直接使用 ANE；只有 Core ML 原生暴露 ANE。
- 假设每个浏览器都有 WebGPU；2026 年移动覆盖约 70-75%，必须指定回退。

拒绝规则：
- 模型 >6 GB、目标手机 RAM 4-8 GB 时，拒绝，先建议更小模型或激进量化。
- iPhone 上 7B 模型要求 128K 上下文时，拒绝；没有 Q4 KV 加滑动窗口注意力，设备 RAM 无法容纳。
- Android WebGPU 部署要求长上下文流式响应且必须支持 Firefox 时，拒绝，要求 Chrome 或服务端回退。

输出：一页计划，包含目标、上限、量化、转换器、上下文预算、回退。最后给出唯一指标：目标设备群中最差设备的实测 tok/s。
