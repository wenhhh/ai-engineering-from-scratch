---
name: quantization-picker
description: 根据硬件、引擎、负载和质量容忍度选择 2026 年量化格式，并制定校准与验证计划。
version: 1.0.0
phase: 17
lesson: 09
tags: [quantization, awq, gptq, gguf, fp8, nvfp4, calibration]
---

根据硬件（CPU / H100 / H200 / B200 / GB200 及数量）、引擎（llama.cpp / vLLM / TRT-LLM / SGLang）、模型（规模和任务：常规聊天、推理过程、代码、多 LoRA）、质量容忍度（HumanEval / MATH / MMLU 可接受下降 N 个百分点），选择量化格式并制定验证计划。

请输出：

1. 格式建议。选择 GGUF Q4_K_M、GGUF Q5_K_M、GPTQ-Int4 + Marlin、AWQ-Int4 + Marlin、FP8、NVFP4 + FP8 KV，或叠加组合。依据决策树论证：CPU → GGUF；推理过程 → FP8；vLLM 多 LoRA → GPTQ；常规 GPU 聊天 → AWQ；Blackwell 已验证 → NVFP4。
2. 显存预算。分别报告权重、KV 缓存（按报告并发 × 上下文）、激活。确认目标 GPU 能容纳，否则指出多 GPU 要求。
3. 校准计划。数据来源：AWQ/GPTQ 必须匹配领域，通用 C4/WikiText 仅为最后备选。领域样本数 500-2000，校准池留出 10% 作验证集。
4. 验证计划。评估集匹配任务：代码用 HumanEval，推理过程用 MATH/MMLU，聊天用 MT-Bench。比较 BF16 基线与量化版本，下降 ≤ 质量容忍度才上线。
5. KV 缓存决策。与权重量化分开。推理过程推荐 FP8 KV；注意力准确性勉强达标则用 BF16 KV；INT8 KV 只在验证后采用。
6. 回滚路径。磁盘保留 BF16/FP8 权重，提供生产质量下降时切回的开关。

硬性否决条件：
- 未在评估集验证，就给推理过程密集负载推荐 NVFP4 权重。
- 领域模型用通用网页数据校准；必须用领域内数据。
- HBM 预算忘记 KV 缓存；必须逐项列出。
- 声称吞吐量却不指明内核；Marlin-AWQ 与普通 AWQ 相差 10 倍。

拒绝规则：
- 负载本身质量勉强达标，如开放创作、边界推理时，拒绝激进 INT4，保留 FP8 或 BF16。
- 引擎为 llama.cpp 时，拒绝 GGUF 以外的格式；格式匹配引擎是基本要求。
- 用户无法执行 1,000 样本评估时，拒绝。生产不做盲目量化。

输出：一页量化选型，包含格式、HBM 预算、校准计划、验证计划、KV 缓存决策和回滚路径。最后用一段“下一步测量什么”，根据关键风险选择评估集差值、峰值并发下 KV 缓存压力，或真实批次大小下的吞吐量。
