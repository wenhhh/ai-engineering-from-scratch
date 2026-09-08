# 硬件专用推理编译（Hardware-Specialized Inference Compilation）：Blackwell 上的 FP8 与 NVFP4

> 硬件专用推理编译以可移植性换吞吐量。仅支持 NVIDIA、针对 Blackwell 调优的 TensorRT-LLM，是这项权衡取得回报的鲜明案例。2026 年 Q1-Q2，SemiAnalysis InferenceX 在 Dynamo 编排的 GB200 NVL72 上测得：120B 模型每百万词元成本为 $0.012，而 H100 + vLLM 为 $0.09/M，经济性相差 7 倍。技术栈叠加三种浮点精度体系：FP8 仍是 KV 缓存和注意力内核的关键，因为它们需要其动态范围；NVFP4（4 位微缩放，Microscaling）处理权重与激活；多词元预测（Multi-token prediction，MTP）和预填充/解码分离再带来 2-3 倍收益。首日模型支持直接加载 FP4 权重，无需训练后转换。2026 年工程团队应注意：TRT-LLM 虽然开源，却专用于 NVIDIA，并针对 CUDA 和 Blackwell 优化，采用它就是以可移植性换吞吐量。承诺采用前，应针对自己的模型与硬件组合算清账。

**Type:** Learn
**Languages:** Python (标准库，简化 FP8/NVFP4 显存与成本计算器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）、阶段 10 · 13（量化，Quantization）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释为什么权重使用 NVFP4 时，FP8 对 KV 缓存和注意力仍然关键。
- 计算前沿模型在 BF16、FP8、NVFP4 下的 HBM 占用，分析节省来自哪里。
- 说出 TRT-LLM 利用的 Blackwell 专属功能：首日 FP4、MTP、分离式服务、全互连通信原语。
- 判断何时值得接受 TRT-LLM 的 NVIDIA 锁定，以获得相对 Hopper 上 vLLM 的 7 倍成本差距。

## 问题背景（The Problem）

2026 年推理经济性的前沿问题是“每美元能生成多少词元”。答案取决于四层选择：硬件代际（Hopper H100/H200 或 Blackwell B200/GB200）、精度（BF16 → FP8 → NVFP4）、服务引擎（vLLM、SGLang、TRT-LLM），以及编排方式（普通、分离式、Dynamo）。

Hopper 加 vLLM 上，120B 混合专家（Mixture of Experts，MoE）模型每百万词元约 $0.09；Blackwell 加 TRT-LLM + Dynamo 上，同一模型约 $0.012，便宜 7 倍。差距部分来自硬件：Blackwell 单 GPU LLM 吞吐量为 Hopper 的 11-15 倍；部分来自技术栈：FP4 权重、MTP 草稿、预填充/解码分离，以及用于 MoE 专家通信的 NVLink 5 全互连通信（All-to-all）。

在 NVIDIA 技术栈之外无法复制这些收益，这就是以可移植性换经济性的权衡。本课重点是理解各项技术栈选择分别贡献了多少差距。

## 核心概念（The Concept）

### 为什么 FP8 仍是 KV 缓存的最低精度（Why FP8 is still the floor for KV cache）

2026 年常见错误是以为 NVFP4 适用于所有地方，实际并非如此。KV 缓存需要 FP8，即 8 位浮点数，因为注意力键和值的动态范围很宽。将 KV 量化为 FP4 会造成灾难性精度损失：分布尾部丢失，注意力分数崩塌。FP8 的指数位提供了 KV 缓存所需范围。

NVFP4（2025-2026）适用于权重和激活。微缩放为每个权重块提供独立缩放因子，让小块覆盖不同动态范围，避免按张量统一缩放的损失。激活在单层内部的范围较小，因此 FP4 能维持效果。

典型 Blackwell 配置：

- 权重：NVFP4，4 位微缩放。
- 激活：NVFP4。
- KV 缓存：FP8。
- 注意力累加器：FP32，保障 softmax 稳定性。

### TRT-LLM 使用的 Blackwell 专属原语（The Blackwell-specific primitives TRT-LLM uses）

- **首日 FP4 权重（Day-0 FP4 weights）**：模型服务商直接发布 FP4 权重，TRT-LLM 无需训练后转换即可加载；FP4 不需要 AWQ / GPTQ 步骤。
- **多词元预测（MTP）**：与 EAGLE（阶段 17 · 05）理念相同，但集成进 TRT-LLM 构建。
- **分离式服务（Disaggregated serving）**：预填充和解码位于独立 GPU 池，通过 NVLink 或 InfiniBand 传输 KV 缓存，与 Dynamo（阶段 17 · 20）理念相同。
- **全互连通信原语（All-to-all communication primitives）**：NVLink 5 将 MoE 专家通信延迟降至 Hopper 的三分之一，TRT-LLM 的 MoE 内核为此调优。
- **NVFP4 + MXFP8 微缩放（Microscaling）**：Blackwell Tensor Core 用硬件加速缩放因子处理。

### 应记住的数值（The numbers you should memorize）

- HGX B200 通过 TRT-LLM 运行 GPT-OSS-120B：$0.02/M 词元。
- GB200 NVL72 通过 Dynamo 编排 TRT-LLM：$0.012/M 词元。
- 可比负载下 H100 + vLLM：约 $0.09/M 词元。
- 2026 年三个月的 TRT-LLM 更新带来 2.8 倍吞吐量。
- Blackwell 单 GPU LLM 吞吐量为 Hopper 的 11-15 倍。
- MLPerf Inference v6.0（2026 年 4 月）：Blackwell 在每项提交任务中占优。

### FP4 实际付出的质量代价（What FP4 actually costs in quality）

NVFP4 很激进。在推理过程密集的工作负载上，如思维链、数学、长上下文代码生成，FP4 权重会导致可见退化。逐块校准能缓解但不能消除。交付推理模型的团队常以 FP8 权重加 FP4 激活折中，或继续在 H200 上全程使用 FP8。

规则是：承诺采用 NVFP4 权重前，必须在自己的评估集上验证任务质量。

### 为什么这是 NVIDIA 锁定决策（Why this is an NVIDIA-lock decision）

TRT-LLM 是 C++ + CUDA + 闭源内核，模型需要针对具体 GPU SKU 编译。不支持 AMD、Intel 或 ARM。如果基础设施策略要求多供应商，TRT-LLM 服务层就不可行；你仍可在混合硬件上用 vLLM 服务。如果只用 NVIDIA，7 倍差距足以补偿锁定代价。

### 2026 年实践方案（2026 practical recipe）

年度推理账单达到 $100M+ 时，继续使用 Hopper + vLLM 会错失 7-10 倍收益。将主要成本负载迁往 Blackwell + TRT-LLM + Dynamo，实验层保留 H100 + vLLM，以保障模型迭代速度。每个转为 NVFP4 的模型进入生产前都应验证质量。

### 分离部署的额外收益（The disaggregation bonus）

阶段 17 · 20 深入介绍 TRT-LLM 的分离式服务，即独立预填充池与解码池。Blackwell 上收益叠加：FP4 权重 × MTP 加速 × 分离式放置 × 缓存感知路由。7 倍数值假设使用这套完整技术栈。

```figure
pipeline-parallel
```

## 实际应用（Use It）

`code/main.py` 计算模型在三套技术栈上的 HBM 占用、内存带宽受限时的解码吞吐量和每百万词元美元成本：H100 + BF16 + vLLM、H100 + FP8 + vLLM、B200 + NVFP4/FP8 + TRT-LLM。运行它，查看叠加效应及每项变化对差距的贡献。

## 交付成果（Ship It）

本课产出 `outputs/skill-trtllm-blackwell-advisor.md`。根据负载、模型规模和年度词元量，判断 Blackwell + TRT-LLM 是否值得接受 NVIDIA 锁定。

## 练习（Exercises）

1. 运行 `code/main.py`。对活跃参数占 30% 的 120B MoE，计算 H100 BF16、H100 FP8、B200 NVFP4/FP8 的内存带宽受限解码吞吐量。最大跃升来自哪里？
2. 客户每年在 H100 + vLLM 上花 $2M。假设经济性相差 7 倍，为在 12 个月内摊销 TRT-LLM 迁移成本，需要购买多少块 Blackwell GPU 才达到盈亏平衡？
3. NVFP4 权重转换后，MATH 准确率下降 3 个百分点。给出两条恢复路径：质量优先保留 FP8 权重，成本优先用领域内数据校准。
4. 阅读 MLPerf v6.0 推理结果。哪项任务的 Blackwell 相对 Hopper 差距最小，为什么？
5. 计算 405B 模型在 NVFP4 权重、FP8 KV 缓存、128k 上下文下需要的 HBM。单个 GB200 NVL72 节点能否容纳？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| FP8 | “八位浮点” | 8 位浮点，因动态范围用于 KV 缓存和注意力 |
| NVFP4 | “四位微缩放” | NVIDIA 的 4 位微缩放浮点格式，用于 Blackwell 权重和激活 |
| MXFP8 | “MX 八位” | 微缩放 FP8 变体，由 Blackwell Tensor Core 硬件加速 |
| 首日 FP4（Day-0 FP4） | “直接交付 FP4 权重” | 模型服务商发布的权重已是 FP4，无训练后转换 |
| 多词元预测（MTP） | “一次预测多个词元” | TRT-LLM 集成的推测解码草稿（阶段 17 · 05） |
| 分离式服务（Disaggregated serving） | “拆开预填充与解码” | 两者使用独立 GPU 池，通过 NVLink/IB 传输 KV |
| 全互连通信（All-to-all） | “MoE 专家通信” | 将词元路由到专家 GPU 的通信模式，NVLink 5 延迟降至三分之一 |
| InferenceX | “SemiAnalysis 推理基准” | 2026 年行业认可的单词元成本基准 |

## 延伸阅读（Further Reading）

- [NVIDIA：Blackwell Ultra MLPerf Inference v6.0](https://developer.nvidia.com/blog/nvidia-blackwell-ultra-sets-new-inference-records-in-mlperf-debut/)：2026 年 4 月 MLPerf 结果。
- [NVIDIA：Blackwell 上的 MoE 推理](https://developer.nvidia.com/blog/delivering-massive-performance-leaps-for-mixture-of-experts-inference-on-nvidia-blackwell/)：NVLink 5 全互连通信与 MoE 内核。
- [TensorRT-LLM 概览](https://nvidia.github.io/TensorRT-LLM/overview.html)：官方引擎文档。
- [NVIDIA：Dynamo 简介](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models/)：TRT-LLM 上层的分离式编排。
- [MLPerf 推理基准](https://mlcommons.org/benchmarks/inference-datacenter/)：发布 Blackwell 数值的基准套件。
