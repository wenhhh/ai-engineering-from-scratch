# 推理指标（Inference Metrics）：TTFT、TPOT、ITL、有效吞吐量与 P99

> 四项指标决定推理部署是否有效。TTFT 是预填充、排队与网络耗时之和。TPOT（也就是 ITL）是内存带宽受限的逐词元解码成本。端到端延迟为 TTFT 加上 TPOT 乘输出长度。吞吐量是整个集群每秒汇总的词元数。但产品真正关心的是有效吞吐量（Goodput）：同时满足全部服务等级目标（SLO）的请求比例。吞吐量高、有效吞吐量低，意味着你处理的词元不能及时交付用户。2026 年 TRT-LLM 上 Llama-3.1-8B-Instruct 的参考数值是：平均 TTFT 162 ms，平均 TPOT 7.33 ms，平均端到端延迟 1,093 ms。必须报告 P50、P90、P99，不能只报均值。还要注意测量陷阱：GenAI-Perf 计算 ITL 时排除 TTFT，LLMPerf 则计入；同一次运行，两工具的 TPOT 不同。

**Type:** Learn
**Languages:** Python (标准库，简化百分位计算器与有效吞吐量报告器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 精确定义 TTFT、TPOT、ITL、E2E、吞吐量和有效吞吐量，指明各自测量的组成部分。
- 解释为何均值不适合 LLM 服务，以及如何解读 P50/P90/P99。
- 构建多约束 SLO，例如 TTFT<500 ms 且 TPOT<15 ms 且 E2E<2 s，并计算有效吞吐量。
- 说出同一次运行中 TPOT 不一致的两种基准工具，并解释原因。

## 问题背景（The Problem）

“我们的吞吐量是每秒 15,000 词元。”那又怎样？如果 40% 请求的端到端延迟超过 2 秒，用户已经放弃会话。吞吐量本身不能说明产品是否有效。

推理有多个延迟维度，各自故障模式不同。预填充受计算限制，随提示词长度变化；解码受内存带宽限制，随批次大小变化；排队延迟是运维问题；网络是物理距离问题。你需要分别测量这些指标、计算百分位，还需要一个回答“用户是否得到预期结果”的综合指标，即有效吞吐量。

## 核心概念（The Concept）

### 首词元延迟（TTFT — time to first token）

`TTFT = queue_time + network_request + prefill_time`

长提示词时预填充占主导。H100 上 Llama-3.3-70B FP8 的 32k 提示词，仅预填充约需 800 ms。排队时间反映负载下的调度行为，网络请求时间是包含 TLS 的传输时间。TTFT 是用户看到任何流式内容前的等待时间。

### 逐输出词元耗时与词元间延迟（TPOT / ITL — inter-token latency）

一个量有多个名称：`TPOT`（每个输出词元耗时）、`ITL`（词元间延迟）、`decode latency per token` 都指同一量，即首词元之后相邻流式词元的时间间隔。

`TPOT = (decode_forward_time + scheduler_overhead) / tokens_produced`

同一 Llama-3.3-70B H100 栈启用分块预填充后，平均 TPOT 约 7 ms。不分块时，如果相邻序列正在长预填充，TPOT 可能冲到 50 ms。应观察 P99，而不是均值。

### 端到端延迟（E2E latency）

`E2E = TTFT + TPOT * output_tokens + network_response`

长输出（>500 词元）的 E2E 由 TPOT 主导；长提示词配短输出则由 TTFT 主导。应按输出长度分组报告 E2E。

### 吞吐量（Throughput）

`throughput = total_output_tokens / elapsed_time`

这是汇总指标，说明集群效率，不说明单请求健康状况。

### 有效吞吐量：真正关心的指标（Goodput — the metric you actually care about）

`goodput = fraction of requests meeting (TTFT <= a) AND (TPOT <= b) AND (E2E <= c)`

SLO 包含多项约束。只有全部满足，请求才算“合格”；有效吞吐量是合格比例。高吞吐量配 60% 有效吞吐量是失败，较低吞吐量配 99% 有效吞吐量才是目标。

2026 年，MLPerf Inference v6.0 提交结果和 AI 平台服务商内部 SLA 跟踪都采用有效吞吐量。

### 为什么均值不合适（Why mean is the wrong statistic）

LLM 延迟分布右偏。一个解码批次中若有长预填充的相邻序列，可能 500 个词元 TPOT 约 7 ms，20 个约 60 ms。平均 TPOT 是 9 ms，P99 TPOT 是 65 ms。用户经常遇到 P99，这就是他们离开的原因。

始终报告 P50、P90、P99 三元组。优化用户体验时，应关注 P99。

### 参考数值：2026 年 TRT-LLM 上的 Llama-3.1-8B-Instruct（Reference numbers — Llama-3.1-8B-Instruct on TRT-LLM, 2026）

- 平均 TTFT：162 ms。
- 平均 TPOT：7.33 ms。
- 平均 E2E：1,093 ms。
- P99 TPOT：随分块预填充配置变化，为 10-25 ms。

这些是 NVIDIA 公开的参考点，会随模型规模（70B 会呈现 3-5 倍）、硬件（H100 与 B200 约 3 倍）和负载变化。

### 测量陷阱（The measurement trap）

2026 年最常用的两种基准工具，对同一次运行的 TPOT 计算不同：

- **NVIDIA GenAI-Perf**：ITL 计算排除 TTFT，从第 2 个词元开始。
- **LLMPerf**：包含 TTFT，从第 1 个词元开始。

假设一个请求 TTFT 为 500 ms，100 个输出词元的解码总耗时为 700 ms，GenAI-Perf 报告 `ITL = 700/99 = 7.07 ms`，LLMPerf 报告 `ITL = 1200/100 = 12.00 ms`。工具选择会改变数值。

必须说明工具，必须公开定义。

### 构建 SLO（Constructing an SLO）

2026 年面向消费者的 70B 聊天模型，可以采用以下合理 SLO：

- TTFT P99 <= 800 ms。
- TPOT P99 <= 25 ms。
- 对 <300 词元的输出，E2E P99 <= 3 s。
- 有效吞吐量目标 >= 99%。

企业 SLO 通常收紧 TTFT 到 200-400 ms，放宽 E2E。重点是写清要求，测量三项指标，再用有效吞吐量作为综合值跟踪。

### 如何测量（How to measure）

- 使用真实流量或逼真的合成流量，例如 LLMPerf 配置 `--mean-input-tokens 800 --stddev-input-tokens 300 --mean-output-tokens 150`。
- 基准运行以峰值并发的 2 倍为目标。
- 运行 30-50 轮，对合并样本计算百分位。
- 发布时附工具名、版本、模型、硬件、并发和提示词分布。

```figure
throughput-latency
```

## 实际应用（Use It）

`code/main.py` 是简化有效吞吐量计算器：生成合成延迟分布，应用 SLO，计算有效吞吐量；还展示相同轨迹上 GenAI-Perf 与 LLMPerf 的 TPOT 差异。

## 交付成果（Ship It）

本课产出 `outputs/skill-slo-goodput-gate.md`。根据工作负载与 SLO，制定可用于 CI/CD 的基准方案，以有效吞吐量而非吞吐量作为部署门禁。

## 练习（Exercises）

1. 运行 `code/main.py`，生成带 1% 尾延迟尖峰的分布。将 P99 TPOT 从 30 ms 收紧到 15 ms，有效吞吐量如何变化？
2. 服务商声称“Llama 3.3 70B H100 上 15,000 tok/s”。相信之前应问哪三个问题？
3. 为什么分块预填充保护 P99 TPOT，而非平均 TPOT？
4. 为语音助手构建消费者 SLO；首词元是被听到，而非看到。哪个指标最能被用户感知？
5. 阅读 LLMPerf README 和 GenAI-Perf 文档，找出两工具另外三项定义不同的指标。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 首词元延迟（TTFT） | “第一个词元多久到” | 排队 + 网络 + 预填充，长提示词下由预填充主导 |
| 逐输出词元耗时（TPOT） | “每个输出词元耗时” | 首词元后，受内存带宽限制的逐词元解码成本 |
| 词元间延迟（ITL） | “词元间隔” | 多数工具中等同 TPOT，但并非全部，见 GenAI-Perf |
| 端到端延迟（E2E） | “从开始到结束” | TTFT + TPOT * output_len，再加响应侧网络耗时 |
| 吞吐量（Throughput） | “tok/s” | 集群效率，没有延迟百分位就没有意义 |
| 有效吞吐量（Goodput） | “SLO 达标率” | 同时满足每项 SLO 约束的请求比例 |
| 第 99 百分位（P99） | “尾部” | 每 100 次中 1 次的最差延迟水平，反映用户体验 |
| 多约束 SLO（SLO multi-constraint） | “联合约束” | 三个延迟界限取 AND，任一违反即失败 |
| GenAI-Perf 与 LLMPerf | “工具陷阱” | 两工具对 ITL 是否包含 TTFT 意见不同 |

## 延伸阅读（Further Reading）

- [NVIDIA NIM：LLM 基准指标](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html)：TTFT、ITL、TPOT 的标准定义。
- [Anyscale：LLM 服务基准指标](https://docs.anyscale.com/llm/serving/benchmarking/metrics)：替代定义与测量方案。
- [BentoML：LLM 推理指标](https://bentoml.com/llm/inference-optimization/llm-inference-metrics)：真实部署中的测量应用。
- [LLMPerf 基准工具](https://github.com/ray-project/llmperf)：基于 Ray 的开源基准。
- [GenAI-Perf 基准工具](https://github.com/triton-inference-server/perf_analyzer/blob/main/genai-perf/README.md)：NVIDIA 的基准工具。
- [MLPerf 推理基准](https://mlcommons.org/benchmarks/inference-datacenter/)：行业认可的基于有效吞吐量的基准。
