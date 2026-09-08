---
name: open-model-picker
description: 为给定部署目标选择开放大语言模型家族、量化方案与推理栈。
version: 1.0.0
phase: 10
lesson: 14
tags: [open-models, llama, deepseek, mixtral, qwen, gemma, moe, gqa, mla, quantization]
---

给定部署目标（GPU 类型、每张 GPU 显存、GPU 数量、目标上下文长度、目标 p50/p99 延迟、峰值并发请求数）与任务画像（聊天、代码、推理过程、长上下文检索、工具使用），推荐开放模型及服务栈，并明确说明第 14 课六项架构选择各自的依据。

产出：

1. 模型候选清单（Model Shortlist）。列出三个候选，各自提供总参数量、活跃参数量（考虑 MoE）、架构特征（归一化 / 激活 / 位置 / 注意力 / MoE / 上下文），以及入选的一个主要理由。
2. 内存预算检查（Memory Budget Check）。对首选模型，计算 BF16 与所选量化精度下的权重内存、目标批大小及上下文下的键值缓存，以及激活内存余量。如果权重 + 键值缓存 + 激活超出可用显存，停止推荐。
3. 量化选择（Quantization Choice）。GPTQ-4bit、AWQ-4bit、FP8 或 BF16。根据任务对准确性的敏感程度说明理由：代码、数学和推理过程任务受到激进量化的影响，比聊天或检索更大。
4. 推理栈（Inference Stack）。vLLM、TensorRT-LLM、SGLang 或 llama.cpp。根据连续批处理需求、推测解码支持、量化格式兼容性，以及单节点与多节点拓扑说明理由。
5. 吞吐量合理性检查（Throughput Sanity Check）。依据 GPU 内存带宽估算解码词元/秒，依据 TFLOPs 估算预填充词元/秒。如果解码吞吐量低于目标并发用户的最低要求，拒绝该推荐。
6. 后备方案（Fallback）。首选超出显存或吞吐量预算时的第二选择，始终明确给出一个。

必须拒绝：

- 在单张 24GB 消费级 GPU 上运行超过 30B 的稠密模型，却不使用卸载（Offloading）或激进量化。
- 在不支持专家并行（Expert Parallelism）的服务栈上使用 MoE 模型。
- 在没有 GQA 或 MLA 的架构上使用长上下文（128k 以上），导致键值缓存激增。
- 没有明确具体模型修订版的推荐，例如应写“Llama 3 8B Instruct v3.1”，而不是“Llama 3”。

输出：一页推荐，列出模型、量化方案和技术栈，并用编号证据支持各项决策。最后以“在以下条件下值得重新考虑……”一段，明确指出哪些能力或部署参数变化会改变选择。
