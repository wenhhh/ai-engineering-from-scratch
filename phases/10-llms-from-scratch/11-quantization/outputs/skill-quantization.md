---
name: skill-quantization
description: 根据硬件、质量和延迟约束，选择部署大语言模型（LLM）的恰当量化策略
version: 1.0.0
phase: 10
lesson: 11
tags: [quantization, inference, deployment, optimization, fp8, int4, int8, gptq, awq, gguf]
---

# 量化决策框架（Quantization Decision Framework）

部署语言模型时，使用本框架选择合适的数值格式、量化（Quantization）方法和质量验证策略。

## 输入要求（Input Requirements）

提供：
- **模型（Model）**：名称、参数量、原始精度
- **目标硬件（Target Hardware）**：GPU 型号及显存、CPU、Apple Silicon、边缘设备
- **延迟目标（Latency Target）**：每秒词元数、首词元时间
- **质量底线（Quality Floor）**：可接受的最大困惑度增量、基准分数差值
- **服务模式（Serving Pattern）**：批大小、最大上下文长度、并发用户数

## 快速选择（Quick Selection）

| 你的情况 | 格式 | 方法 | 预计质量损失 |
|---------------|--------|--------|----------------------|
| H100 GPU，追求最大吞吐量 | FP8 E4M3 | H100 原生类型转换 | < 0.1% |
| A100/A10，需要 2 倍吞吐量 | INT8 | LLM.int8() 或 SmoothQuant | < 0.5% |
| 单张 24GB GPU，70B 模型 | INT4 | AWQ 或 GPTQ | 1-3% |
| MacBook / Apple Silicon | INT4 GGUF | 通过 llama.cpp 使用 Q4_K_M | 1-2% |
| 移动 / 边缘设备 | INT4 或 INT3 | 量化感知训练（QAT）+ 设备专用方法 | 2-5% |
| 最大压缩，可接受部分损失 | INT2 | QuIP# 或 AQLM | 5-15% |
| 训练（混合精度，Mixed Precision） | BF16 + FP32 累加 | 框架原生支持 | 0% |

## 按组件选择精度（Precision Selection by Component）

并非所有张量（Tensor）都应采用相同处理方式。

| 组件 | 安全最低精度 | 推荐 | 避免 |
|-----------|-------------|-------------|-------|
| 前馈网络（Feed-forward Network，FFN）权重 | INT4 | INT4（AWQ/GPTQ） | 未经 QAT 的 INT2 |
| 注意力（Attention）权重 | INT4 | INT8 或 FP8 | INT2 |
| 嵌入层（Embedding Layer） | INT8 | FP16（保留原精度） | INT4 |
| 输出头（Output Head） | INT8 | FP16（保留原精度） | INT4 |
| 键值缓存（Key-value Cache，KV Cache） | FP8 | FP8 或 INT8 | 长上下文时用 INT4 |
| 注意力逻辑值（Attention Logits） | FP16 | FP16 或 BF16 | INT8 |
| 激活值（Activations，推理时） | INT8 | FP8 或 INT8 | INT4 |

## 方法比较（Method Comparison）

### GPTQ
- **适用时机：**GPU 推理，需要兼容 Hugging Face 的模型
- **校准数据（Calibration Data）：**128 个样本，每个 2048 个词元
- **时间：**在 A100 上处理 70B 需要 30-60 分钟
- **工具：**`auto-gptq`、`exllama`、`exllamav2`
- **优势：**经过充分测试，Hugging Face 上有大量模型
- **不足：**量化速度比 AWQ 慢，在部分模型上质量略低于 AWQ

### AWQ
- **适用时机：**GPU 推理，追求单位位宽下的最佳质量
- **校准数据：**128 个样本
- **时间：**在 A100 上处理 70B 需要 15-30 分钟
- **工具：**`autoawq`、`vLLM`（原生支持）
- **优势：**最佳 INT4 质量、量化快、集成 vLLM
- **不足：**模型资源少于 GPTQ

### GGUF
- **适用时机：**CPU 推理、Apple Silicon、llama.cpp 生态
- **变体：**Q2_K、Q3_K_S/M/L、Q4_K_S/M、Q5_K_S/M、Q6_K、Q8_0、F16
- **推荐默认值：**Q4_K_M（质量与大小的最佳平衡）
- **工具：**`llama.cpp`、`ollama`、`LM Studio`
- **优势：**自包含文件、混合精度、庞大生态
- **不足：**并非 GPU 最优选择（为 CPU/Metal 设计）

### SmoothQuant
- **适用时机：**GPU 上的 INT8，需要同时量化权重与激活值
- **核心思想：**通过逐通道缩放，将量化难度从激活值转移到权重
- **工具：**`smoothquant`、`TensorRT-LLM`
- **优势：**实现 W8A8（权重和激活均为 INT8），获得 2 倍提速
- **不足：**仅适用于 INT8，不能扩展到 INT4

## 质量验证规程（Quality Validation Protocol）

量化完成后，部署之前必须验证：

1. **困惑度测试（Perplexity Test）。**在 WikiText-2 或你的领域语料上计算。差值 < 0.5 为优秀，0.5-1.0 为良好，> 2.0 表示有问题。

2. **基准测试扫描（Benchmark Sweep）。**运行 MMLU（通用）、GSM8K（数学）、HumanEval（代码）。数学与代码对精度损失最敏感。

3. **输出比较（Output Comparison）。**让原模型与量化模型分别生成 100 个回答，用大语言模型裁判（LLM-as-judge）计算胜率。目标：量化模型在超过 90% 的提示词上胜出或持平。

4. **延迟测量（Latency Measurement）。**测量批大小为 1 和目标批大小下的每秒词元数，确认速度收益值得付出质量代价。

5. **长上下文测试（Long-context Test）。**如果服务长上下文（> 4K 词元），应在最大上下文长度下测试。键值缓存的量化误差随序列长度累积。

## 内存预算计算器（Memory Budget Calculator）

```
权重内存（GB） = 参数量（B） * bits / 8 / 1.073741824
每个词元的键值缓存（MB） = 2 * num_layers * d_model * bits / 8 / 1048576
上下文键值缓存（GB） = kv_per_token * max_context_length / 1024
激活内存（GB） ~ 1-4 GB （相对固定，取决于批大小）
总量 = weight_memory + kv_cache + activation_memory + 额外开销（10-20%）
```

Llama 3 70B 采用 INT4、32K 上下文的示例：
- 权重（Weights）：70B * 4 / 8 / 1.07 = 32.6 GB
- 键值缓存（FP16）：2 * 80 * 8192 * 16 / 8 / 1e9 * 32768 = ~40 GB
- 键值缓存（FP8）：~20 GB
- 使用 FP8 键值缓存时的总量：~55 GB（可装入一张 80GB A100）

## 常见错误（Common Mistakes）

| 错误 | 失败原因 | 修正方法 |
|---------|-------------|-----|
| 将嵌入层量化为 INT4 | 第一层会让误差经整个模型放大 | 嵌入保持 FP16 或 INT8 |
| INT4 使用逐张量缩放 | 一行离群值会破坏所有行的精度 | 使用逐通道或逐组缩放 |
| GPTQ/AWQ 不做校准 | 没有代表性数据，缩放因子就不正确 | 使用你的领域中的 128 个样本 |
| 所有层使用相同位宽 | 第一层和最后一层更敏感 | 使用混合精度，提高首尾层位宽 |
| 在超长上下文中量化键值缓存 | 误差随序列长度呈二次累积 | 键值缓存采用 FP8，不用 INT4 |
| 跳过质量验证 | 某些模型量化效果差，尤其在边界情况上 | 始终运行困惑度及任务评估 |

## 部署配方（Deployment Recipes）

### 配方 1：vLLM 与 AWQ，GPU 服务器（Recipe 1: vLLM with AWQ (GPU server)）
```
pip install vllm autoawq
vllm serve model-awq --quantization awq --dtype half --max-model-len 8192
```

### 配方 2：llama.cpp 与 GGUF，MacBook（Recipe 2: llama.cpp with GGUF (MacBook)）
```
./llama-server -m model.Q4_K_M.gguf -c 4096 -ngl 99
```

### 配方 3：TensorRT-LLM 与 FP8，H100（Recipe 3: TensorRT-LLM with FP8 (H100)）
```
trtllm-build --model_dir model --output_dir engine --dtype float16 --use_fp8
```
