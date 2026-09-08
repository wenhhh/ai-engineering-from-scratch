---
name: skill-inference-optimization
description: 诊断并优化大语言模型（LLM）推理服务的吞吐量、延迟与成本
version: 1.0.0
phase: 10
lesson: 12
tags: [inference, kv-cache, batching, speculative-decoding, vllm, optimization]
---

# 大语言模型推理优化模式（LLM Inference Optimization Pattern）

两个阶段：预填充（Prefill，计算受限、并行）和解码（Decode，内存受限、串行）。
每项优化都针对其中一个或两个阶段。

```
请求 -> 预填充（处理提示词） -> 解码（生成词元） -> 回答
              |                       |
           计算受限                 内存受限
           优化：融合、             优化：批处理、
           前缀缓存                 量化、推测
```

## 决策框架（Decision framework）

### 第 1 步：识别瓶颈（Step 1: Identify your bottleneck）

测量工作负载的运算字节比（Ops:byte Ratio）：

| ops:byte | 瓶颈 | 优化内容 |
|----------|-------|-----------------|
| < 50 | 内存 | 量化键值缓存、增加批大小 |
| 50-200 | 过渡区 | 两者都重要，从批处理开始 |
| > 200 | 计算 | 内核融合、张量并行、FP8 |

### 第 2 步：选择引擎（Step 2: Pick your engine）

- **默认：**vLLM（最广泛的模型支持、分页注意力 PagedAttention、兼容 OpenAI 的 API）
- **多轮对话 / 结构化输出：**SGLang（RadixAttention 前缀缓存、约束解码）
- **最大 NVIDIA 吞吐量：**TensorRT-LLM（内核融合、H100 上的 FP8）

### 第 3 步：按顺序应用优化（Step 3: Apply optimizations in order）

1. **键值缓存（KV Cache）**：始终启用，没有负面影响
2. **连续批处理（Continuous Batching）**：始终启用，没有负面影响（vLLM/SGLang 默认如此）
3. **前缀缓存（Prefix Caching）**：有共享系统提示词时启用（多数聊天机器人都有）
4. **量化（Quantization）**：键值缓存采用 INT8/FP8，以极小质量损失将内存缩小 2-4 倍
5. **推测解码（Speculative Decoding）**：延迟比吞吐量更重要时加入
6. **张量并行（Tensor Parallelism）**：单张 GPU 装不下模型时，将其拆分到多张 GPU

## 键值缓存内存公式（KV cache memory formula）

```
per_token = 2 * num_layers * num_kv_heads * head_dim * bytes_per_param
total = per_token * sequence_length * num_concurrent_users
```

常见模型速查（BF16）：

| 模型 | 每词元 | 100 个用户，每人 4K |
|-------|-----------|----------------|
| Llama 3 8B | 32 KB | 12.5 GB |
| Llama 3 70B | 320 KB | 125 GB |
| Llama 3 405B | 504 KB | 197 GB |

## 推测解码检查清单（Speculative decoding checklist）

- 草稿模型应比目标模型小 5-10 倍（例如 8B 为 70B 起草）
- 接受率（Acceptance Rate）> 70% 才有显著加速
- 最适合可预测文本（代码、结构化输出、自然语言）
- 最不适合创作类或大量采样任务（低温度有帮助）
- 对多数工作负载：EAGLE > 草稿与目标模型 > n 元语法（n-gram）

## 常见错误（Common mistakes）

- 以 batch=1 运行解码（内存受限，GPU 计算资源 95% 闲置）
- 分配连续键值缓存块（应使用 PagedAttention，让浪费接近零）
- 80% 请求共享相同系统提示词，却忽略前缀缓存
- 为模型权重过度预留 GPU 内存，没有给键值缓存留下空间
- 只测量吞吐量、不测延迟（首词元时间为 10 秒的高吞吐量没有用）
- 在高温度下使用推测解码（接受率降至 50% 以下）

## 监控检查清单（Monitoring checklist）

- 首词元时间（Time to First Token，TTFT）：预填充延迟，交互场景目标 < 500ms
- 词元间延迟（Inter-token Latency，ITL）：解码速度，流式输出目标 < 50ms
- 吞吐量（Throughput，词元/秒）：所有并发用户的总量
- 键值缓存利用率：已分配缓存中正在使用的比例
- 批利用率：每次迭代已填充批槽位的比例
- 队列深度（Queue Depth）：等待批槽位的请求数
