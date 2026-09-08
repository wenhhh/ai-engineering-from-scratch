---
name: inference-optimizer
description: 为新推理部署选择注意力实现、KV 缓存策略、量化与推测解码。
version: 1.0.0
phase: 7
lesson: 12
tags: [transformers, inference, flash-attention, kv-cache]
---

给定推理部署（模型名与参数、目标硬件、并发、最大上下文长度、延迟服务级别目标（Service Level Objective，SLO）、吞吐量目标），输出：

1. 服务技术栈。vLLM（生产默认）、SGLang（最低每词元延迟）、TensorRT-LLM（NVIDIA 最优）、llama.cpp（边缘/CPU）、MLX（Apple 芯片）。用一句话说明理由。
2. 注意力实现。Flash Attention 2（Ampere/Ada 默认）、Flash Attention 3（Hopper）、Flash Attention 4（Blackwell，仅前向）。指定备用方案。
3. KV 缓存。数据类型（默认 fp16，支持时用 fp8）、分页或连续、前缀缓存开关、并行采样共享 KV。
4. 量化。fp16 / bf16（默认）、int8（仅权重）、用于权重的 AWQ / GPTQ / GGUF。激活量化必须先做基准测试。
5. 额外加速。推测解码（EAGLE 2 / Medusa / 草稿模型）、连续批处理（始终启用）、分块预填充（长提示词负载）、重复提示词时启用前缀缓存。

拒绝将 Flash Attention 4 部署用于训练，因为发布初期仅支持前向。没有针对目标任务测试质量影响，就拒绝推荐 fp8 KV 缓存。任何没有 GQA 的 70B+ 模型，都要标明在 32K+ 上下文下 KV 缓存难以管理。对重复系统提示词的智能体/工具调用部署，必须开启前缀缓存。
