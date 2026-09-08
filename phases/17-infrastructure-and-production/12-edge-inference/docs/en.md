# 边缘推理（Edge Inference）：Apple Neural Engine、Qualcomm Hexagon、WebGPU/WebLLM、Jetson

> 边缘的核心约束是内存带宽，而非计算。移动 DRAM 为 50-90 GB/s，数据中心 HBM3 超过 2-3 TB/s，相差 30-50 倍。解码受内存带宽限制，因此差距具有决定性。2026 年格局分为四类：Apple M4/A18 Neural Engine 峰值 38 TOPS，统一内存免去 CPU↔NPU 拷贝；Qualcomm Snapdragon X Elite / 8 Gen 4 Hexagon 达到 45 TOPS；WebGPU + WebLLM 在 M3 Max 上运行 Llama 3.1 8B Q4 约 41 tok/s，为原生的 70-80%，有 17.6k GitHub 星标、OpenAI 兼容 API、约 70-75% 移动覆盖；NVIDIA Jetson Orin Nano Super 8GB 可容纳 Llama 3.2 3B / Phi-3，AGX Orin 通过 vLLM 运行 gpt-oss-20b 约 40 tok/s，Jetson T4000（JetPack 7.1）性能为 AGX Orin 的两倍。TensorRT Edge-LLM 支持 EAGLE-3、NVFP4、分块预填充，Bosch、ThunderSoft、MediaTek 在 CES 2026 展示了这些能力。

**Type:** Learn
**Languages:** Python (标准库，简化带宽受限解码模拟器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）、阶段 17 · 09（生产量化，Production Quantization）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 解释移动 LLM 推理为何受内存带宽限制，计算能力为何其次。
- 列出四类边缘目标：Apple ANE、Qualcomm Hexagon、WebGPU/WebLLM、NVIDIA Jetson，匹配各自用例。
- 指出 2026 年 WebGPU 覆盖缺口：Firefox Android 仍在追赶，以及 Safari iOS 26 已落地。
- 为各目标选量化格式：ANE 的 Core ML INT4 + FP16、Hexagon 的 QNN INT8/INT4、浏览器 WebGPU Q4、Jetson Thor 的 NVFP4。

## 问题背景（The Problem）

客户要一个端侧聊天机器人：语音优先、默认保护隐私、支持离线。在 MacBook Pro M3 Max 上，Llama 3.1 8B Q4 约 55 tok/s，可以接受；iPhone 16 Pro 上同模型仅 3 tok/s，无法接受；Snapdragon 8 Gen 3 中端 Android 上为 7 tok/s；Chrome Android v121+ 的 WebGPU 浏览器中，依设备为 4-8 tok/s。

吞吐量差异不是移植问题，而是带宽差距、量化格式和用户空间能否访问 NPU 共同作用。2026 年边缘推理是四个不同问题，需要四种不同解决方案。

## 核心概念（The Concept）

### 带宽才是真正上限（Bandwidth is the real ceiling）

解码每生成一个词元，都读取完整权重。7B Q4 模型为 3.5 GB，以 50 GB/s 读取需 70 ms，理论上限约 14 tok/s；高端移动 DRAM 90 GB/s 时，上限约 25 tok/s。在这个限制下，增加计算能力也无济于事。

数据中心 HBM3 以 3 TB/s 读取同样 3.5 GB 只需 1.2 ms，上限 830 tok/s。模型与权重相同，内存子系统不同。

### Apple Neural Engine（M4 / A18）

- 最高 38 TOPS，统一内存（Unified memory）让 CPU 与 ANE 共用池，没有拷贝开销。
- 通过 Core ML 与编译后的 `.mlmodel` 模型访问，或通过 PyTorch 使用 Metal Performance Shaders（MPS）。
- llama.cpp Metal 后端使用 MPS，而非直接使用 ANE；原生 ANE 需要 Core ML 转换。
- 2026 年 iOS 应用最佳实践路径：Core ML，INT4 权重 + FP16 激活。

### Qualcomm Hexagon（Snapdragon X Elite / 8 Gen 4）

- 最高 45 TOPS，在 SoC 中与 CPU、GPU 集成，但内存域独立。
- QNN（Qualcomm Neural Network）SDK 与 AI Hub 提供 PyTorch/ONNX 转换。
- AI Hub 将聊天模板、Llama 3.2、Phi-3 作为一等交付物提供。

### Intel / AMD NPU（Lunar Lake、Ryzen AI 300）

- 40-50 TOPS。软件落后于 Apple/Qualcomm，OpenVINO 在改进，但仍小众。
- 最适合 Windows ARM 辅助助手应用，也可在 AMD/Intel 桌面原生提供本地优先体验。

### WebGPU + WebLLM

- 通过 WebGPU 计算着色器在浏览器运行模型，无需安装。
- M3 Max 上 Llama 3.1 8B Q4 约 41 tok/s，约为相同后端原生性能的 70-80%。
- WebLLM 有 17.6k GitHub 星标，提供 OpenAI 兼容 JS API，采用 Apache 2.0。
- 2026 年覆盖：Chrome Android v121+、正式可用的 Safari iOS 26，Firefox Android 仍在追赶；总体移动覆盖约 70-75%。

### NVIDIA Jetson 家族（NVIDIA Jetson family）

- Orin Nano Super 8GB 可容纳 Llama 3.2 3B、Phi-3，词元速度良好。
- AGX Orin 通过 vLLM 运行 gpt-oss-20b，约 40 tok/s。
- Thor / T4000（JetPack 7.1）性能为 AGX Orin 的两倍，支持 EAGLE-3 和 NVFP4。
- TensorRT Edge-LLM（2026）支持 EAGLE-3 推测解码、NVFP4 权重、分块预填充，将数据中心优化移到边缘。

### 各目标的量化选择（Quantization choice per target）

| 目标 | 格式 | 说明 |
|--------|--------|-------|
| Apple ANE | INT4 权重 + FP16 激活 | Core ML 转换路径 |
| Qualcomm Hexagon | QNN INT8 / INT4 | AI Hub 转换器 |
| WebGPU / WebLLM | Q4 MLC (q4f16_1) | 使用 `mlc_llm convert_weight` 加编译后的 `.wasm`，不支持 GGUF |
| Jetson Orin Nano | Q4 GGUF 或 TRT-LLM INT4 | 受内存带宽限制 |
| Jetson AGX / Thor | NVFP4 + FP8 KV | Edge-LLM 路径 |

### 边缘长上下文陷阱（The long-context trap on edge）

Llama 3.1 的 128K 上下文是数据中心功能。8 GB RAM 手机上，4 GB 模型、32K 词元的 2 GB KV 缓存、操作系统开销相加就会内存不足（OOM）。边缘部署将上下文保持在 4K-8K，除非接受激进 KV 量化，例如 Q4 KV。

### 语音是最具吸引力的应用（Voice is the killer app）

语音智能体对延迟敏感，首词元要求 < 500 ms。本地推理完全消除网络延迟，结合语音转文字，例如能在边缘运行的 Whisper Turbo 变体，就形成生产质量的语音循环。

### 应记住的数值（Numbers you should remember）

- Apple M4 / A18 ANE：38 TOPS。
- Qualcomm Hexagon SD X Elite：45 TOPS。
- WebLLM M3 Max：Llama 3.1 8B Q4 约 41 tok/s。
- AGX Orin：通过 vLLM 运行 gpt-oss-20b 约 40 tok/s。
- 数据中心与边缘带宽差距：30-50 倍。
- WebGPU 移动覆盖约 70-75%，Firefox Android 落后。

```figure
edge-bandwidth-pipe
```

## 实际应用（Use It）

`code/main.py` 根据带宽受限公式计算各边缘目标的理论解码吞吐量上限，与实测基准比较，指出哪里是带宽而非计算构成瓶颈。

## 交付成果（Ship It）

本课产出 `outputs/skill-edge-target-picker.md`。根据平台（iOS/Android/浏览器/Jetson）、模型及延迟和内存预算，选择量化格式与转换流水线。

## 练习（Exercises）

1. 运行 `code/main.py`。Snapdragon 8 Gen 3 带宽约 77 GB/s，计算 7B Q4 解码上限，与实测 6-8 tok/s 比较，运行时效率如何？
2. Android WebGPU 要求 Chrome v121+。为旧浏览器设计回退方案，使用相同 OpenAI 兼容 API 的服务端。
3. iOS 应用需要 4K 上下文流式响应。哪种模型/格式组合能让 iPhone 16 活跃内存低于 4 GB？
4. Jetson AGX Orin 运行 gpt-oss-20b 为 40 tok/s，Jetson Nano 只能放 3B。产品同时支持两者，如何统一推理栈？
5. 论证“WebLLM 在 2026 年是否生产就绪”，引用覆盖率、性能与 Firefox Android 缺口。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| ANE | “Apple 神经网络引擎” | M 系列、A 系列端侧 NPU，统一内存 |
| Hexagon | “Qualcomm NPU” | Snapdragon NPU，通过 QNN SDK 访问 |
| WebGPU | “浏览器 GPU” | W3C 标准化浏览器 GPU API，2026 年 Chrome/Safari 支持 |
| WebLLM | “浏览器 LLM 运行时” | MLC-LLM 项目，Apache 2.0，OpenAI 兼容 JS |
| Jetson | “NVIDIA 边缘平台” | Orin Nano / AGX / Thor / T4000 家族 |
| TRT Edge-LLM | “边缘 TensorRT” | 2026 年 TensorRT-LLM 边缘移植，EAGLE-3 + NVFP4 |
| 统一内存（Unified memory） | “共享池” | CPU 与 NPU 看到同一 RAM，没有拷贝开销 |
| 带宽受限（Bandwidth-bound） | “内存限制” | 解码受权重读取字节/秒限制 |
| Core ML | “Apple 转换框架” | Apple 的 ANE 原生模型框架 |
| QNN | “Qualcomm 技术栈” | Qualcomm Neural Network SDK |

## 延伸阅读（Further Reading）

- [2026 年端侧 LLM 现状](https://v-chandra.github.io/on-device-llms/)：格局与基准。
- [NVIDIA Jetson 边缘 AI](https://developer.nvidia.com/blog/getting-started-with-edge-ai-on-nvidia-jetson-llms-vlms-and-foundation-models-for-robotics/)：Orin / AGX / Thor。
- [NVIDIA TensorRT Edge-LLM 介绍](https://developer.nvidia.com/blog/accelerating-llm-and-vlm-inference-for-automotive-and-robotics-with-nvidia-tensorrt-edge-llm/)：2026 年边缘移植公告。
- [WebLLM 论文（arXiv:2412.15803）](https://arxiv.org/html/2412.15803v2)：设计与基准。
- [Apple Core ML 文档](https://developer.apple.com/documentation/coreml)：ANE 原生转换。
- [Qualcomm AI Hub 模型平台](https://aihub.qualcomm.com/)：为 Hexagon 预转换的模型。
