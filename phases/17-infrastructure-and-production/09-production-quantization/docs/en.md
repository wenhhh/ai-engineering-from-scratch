# 生产量化（Production Quantization）：AWQ、GPTQ、GGUF K-quants、FP8、MXFP4/NVFP4

> 量化格式没有通用答案，取决于硬件、服务引擎和工作负载。GGUF Q4_K_M 或 Q5_K_M 通过 llama.cpp 和 Ollama 主导 CPU 与边缘部署。在 vLLM 上需要同一基础模型承载多个 LoRA 时，GPTQ 占优。AWQ 搭配 Marlin-AWQ 内核，在 7B 级模型上达到约 741 tok/s，且 INT4 下 Pass@1 最好，是 2026 年数据中心生产默认选择。FP8 在 Hopper、Ada、Blackwell 上仍是折中方案，接近无损、支持广泛。NVFP4 和 MXFP4 是 Blackwell 微缩放（Microscaling）格式，比较激进，需逐块验证。团队常踩两个坑：校准数据集必须匹配部署领域；KV 缓存量化与权重量化独立。“我的模型现在只有 4 GB”这种 AWQ 认识忽略了生产批次下 10-30 GB 的 KV 缓存。

**Type:** Learn
**Languages:** Python (标准库，不同格式的显存与吞吐量简化比较)
**Prerequisites:** 阶段 10 · 13（量化基础，Quantization foundations）、阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说出六种生产量化格式及其 2026 年优势场景。
- 根据硬件（CPU/GPU、Hopper/Blackwell）、引擎（vLLM、TRT-LLM、llama.cpp）和负载（常规聊天、推理过程、多 LoRA）选择格式。
- 计算所选格式节省的权重显存，以及未受影响的 KV 缓存。
- 说出导致领域流量上量化模型退化的校准数据集陷阱。

## 问题背景（The Problem）

量化（Quantization）减少显存与 HBM 带宽消耗，正好满足解码需求。FP16 的 70B 模型权重为 140 GB，量化到 INT4（AWQ 或 GPTQ）后为 35 GB，能装入单块 H100 并留出 KV 缓存空间。这很重要，因为 128 并发序列、2k 上下文时，仅 KV 缓存就有 20-30 GB。

但量化并非免费。激进量化会损害质量，尤其是推理过程密集任务。格式与引擎兼容性不同，硬件原生支持的精度也不同。2026 年格式众多，不能照搬他人选择，必须依据自己的技术栈选型。

## 核心概念（The Concept）

### 六种格式（The six formats）

| 格式 | 位数 | 优势场景 | 引擎 |
|--------|------|-----------|---------|
| GGUF Q4_K_M / Q5_K_M | 4-5 | CPU、边缘设备、笔记本 | llama.cpp, Ollama |
| GPTQ | 4-8 | vLLM 上的多 LoRA | vLLM, TGI |
| AWQ | 4 | 数据中心 GPU 生产服务 | vLLM (Marlin-AWQ), TGI |
| FP8 | 8 | Hopper/Ada/Blackwell 数据中心 | vLLM, TRT-LLM, SGLang |
| MXFP4 | 4 | Blackwell 多用户服务 | TRT-LLM |
| NVFP4 | 4 | Blackwell 多用户服务 | TRT-LLM |

### GGUF：CPU 与边缘默认选择（GGUF — the CPU/edge default）

GGUF 本身是文件格式，而非量化方案，将 K-quant 变体 Q2_K、Q3_K_M、Q4_K_M、Q5_K_M、Q6_K、Q8_0 封装在同一容器中。生产默认 Q4_K_M 和 Q5_K_M，以 4-5 位获得接近 BF16 的质量。它最适合 CPU 和边缘服务，因为 llama.cpp 是目前领先幅度最大的 CPU 推理引擎。

在 vLLM 中有吞吐量代价：7B 约 93 tok/s，因为格式未针对 GPU 内核优化。只有部署目标为 CPU/边缘时才用 GGUF，其他情况不用。

### GPTQ：vLLM 上的多 LoRA（GPTQ — multi-LoRA in vLLM）

GPTQ 是带校准过程的训练后量化算法。Marlin 内核使其在 GPU 上很快，比非 Marlin GPTQ 加速 2.6 倍；7B 约 712 tok/s。

独特优势是 GPTQ-Int4 在 vLLM 支持 LoRA 适配器。如果基础模型上服务 10-50 个微调变体，每个作为 LoRA，GPTQ 就是合适路径。截至 2026 年初，NVFP4 尚不支持 LoRA。

### AWQ：数据中心 GPU 默认选择（AWQ — the datacenter GPU default）

激活感知权重量化（Activation-aware Weight Quantization）在量化期间保护约 1% 最显著的权重。Marlin-AWQ 内核比朴素方案快 10.9 倍；7B 约 741 tok/s，在 INT4 格式中 Pass@1 最佳。

新 GPU 服务应选 AWQ，除非需要多 LoRA（GPTQ），或激进 Blackwell FP4（NVFP4）。

### FP8：可靠的折中方案（FP8 — the reliable middle）

8 位浮点，接近无损且支持广泛。Hopper Tensor Core 原生加速 FP8，Blackwell 继承此能力。质量不能妥协的推理过程、医疗、代码生成任务中，FP8 是 2026 年安全默认选择。显存节省是 INT4 的一半，但质量风险低得多。

### MXFP4 / NVFP4：激进的 Blackwell 格式（MXFP4 / NVFP4 — Blackwell aggressive）

微缩放 FP4 为每个权重块设置独立缩放因子。虽然激进，但有 Blackwell Tensor Core 硬件加速。相比 FP8，每词元字节数减半，即阶段 17 · 07 的经济性收益。

注意事项：
- 2026 年初尚无 LoRA 支持。
- 推理过程密集负载会出现可见质量下降。
- 必须逐模型在自己的评估集验证。

### 校准陷阱（The calibration trap）

AWQ 和 GPTQ 需要校准数据集（Calibration dataset），通常是 C4 或 WikiText。代码、医疗、法律等领域模型若用通用网络文本校准，算法会错误决定保护哪些权重，HumanEval 的 Pass@1 可能下降数个百分点。

修复方式是使用领域内数据校准，通常数百个领域样本就够。交付前先在评估集测试。

### KV 缓存陷阱（The KV cache trap）

AWQ 将权重缩为 4 位，但 KV 缓存独立，仍为 FP16/FP8。70B AWQ 模型的预算：

- 权重：约 35 GB，从 140 GB 量化为 INT4。
- 128 并发 × 2k 上下文的 KV 缓存：约 20 GB。
- 激活：约 5 GB。
- 总计：约 60 GB，能装入 H100 80GB。

“模型量化后只有 4 GB”这种朴素说法忽略了另外 30-50 GB。HBM 预算必须整体考虑。

另外，KV 缓存量化（FP8 KV 或 INT8 KV）是独立选择，有自己的权衡，直接影响注意力准确性，并非无代价收益。

### AWQ INT4 对推理过程有风险（AWQ INT4 is hazardous for reasoning）

思维链、数学、长上下文代码生成都会明显受到激进量化影响。AWQ INT4 在 MATH 上损失约 3-5 个百分点。推理过程密集负载应交付 FP8 或 BF16，并接受显存成本。

### 2026 年选型指南（2026 picking guide）

- CPU/边缘服务：GGUF Q4_K_M，直接选它。
- GPU 服务、常规聊天、无 LoRA：AWQ。
- GPU 服务、多 LoRA：GPTQ 搭配 Marlin。
- 推理过程负载：FP8。
- Blackwell 数据中心且质量已验证：NVFP4 + FP8 KV。
- 无法确定：每种候选格式运行 1,000 样本评估。

```figure
gpu-memory-breakdown
```

## 实际应用（Use It）

`code/main.py` 对不同模型规模，计算六种格式的显存占用（权重 + KV + 激活）和相对吞吐量，展示何时 KV 缓存主导、何时权重压缩划算，以及何时 FP8 是安全选择。

## 交付成果（Ship It）

本课产出 `outputs/skill-quantization-picker.md`。根据硬件、模型规模、负载类型和质量容忍度，选出格式并制定校准/验证计划。

## 练习（Exercises）

1. 运行 `code/main.py`。70B 模型在 128 并发、2k 上下文下，各格式总 HBM 是多少？哪种能装入单块 H100 80GB？
2. 你有一个 7B 代码模型，选择格式并论证。如果误判质量容忍度，恢复路径是什么？
3. 计算医疗领域模型 AWQ 校准所需数据集大小。为什么数据不是越多越好？
4. 阅读 Marlin-AWQ 内核论文或发行说明，用三句话解释为何 7B 上 AWQ 达到 741 tok/s，而原始 GPTQ 约 712。
5. 何时应组合 AWQ 权重与 FP8 KV 缓存，何时保留 BF16 KV？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| GGUF | “llama.cpp 格式” | 封装 K-quant 变体的文件格式，CPU/边缘默认 |
| Q4_K_M | “Q4 K M” | 4 位 K-quant 中等方案，生产 GGUF 默认 |
| GPTQ | “按字母读 GPTQ” | 带校准的训练后 INT4，vLLM 中支持 LoRA |
| AWQ | “按字母读 AWQ” | 激活感知 INT4，Marlin 内核，INT4 下最佳 Pass@1 |
| Marlin 内核（Marlin kernels） | “快速 INT4 内核” | Hopper 上的定制 INT4 CUDA 内核，加速 10 倍 |
| FP8 | “八位浮点” | Hopper/Ada/Blackwell 上的安全精度默认值 |
| MXFP4 / NVFP4 | “四位微缩放” | Blackwell 的 4 位浮点，逐块缩放因子 |
| 校准数据集（Calibration dataset） | “校准数据” | 用于选择量化参数的输入文本，必须匹配领域 |
| KV 缓存量化（KV cache quantization） | “KV INT8” | 与权重量化独立，影响注意力准确性 |

## 延伸阅读（Further Reading）

- [VRLA Tech：2026 年 LLM 量化](https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026/)：比较基准。
- [Jarvis Labs：vLLM 量化完整指南](https://jarvislabs.ai/blog/vllm-quantization-complete-guide-benchmarks)：按格式划分的吞吐量数值。
- [PremAI：2026 年 GGUF、AWQ、GPTQ 与 bitsandbytes 对比](https://blog.premai.io/llm-quantization-guide-gguf-vs-awq-vs-gptq-vs-bitsandbytes-compared-2026/)：逐格式选型。
- [vLLM 文档：量化](https://docs.vllm.ai/en/latest/features/quantization/index.html)：支持格式和参数。
- [AWQ 论文（arXiv:2306.00978）](https://arxiv.org/abs/2306.00978)：原始 AWQ 形式化描述。
- [GPTQ 论文（arXiv:2210.17323）](https://arxiv.org/abs/2210.17323)：原始 GPTQ 形式化描述。
