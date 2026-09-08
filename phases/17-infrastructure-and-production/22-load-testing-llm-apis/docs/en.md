# LLM API 负载测试：为什么 k6 和 Locust 会误导你（Load Testing LLM APIs — Why k6 and Locust Lie）

> 传统负载测试工具并不是为流式响应、可变输出长度、词元级指标或 GPU 饱和设计的。多数团队会遇到两个陷阱。GIL 陷阱：Locust 的词元级测量在 Python GIL 下执行分词，高并发时与请求生成争用；分词积压抬高了报告的词元间延迟，瓶颈其实是客户端，不是服务端。提示词单一化陷阱：循环使用相同提示词，只测试了词元分布中的一个点；真实流量的长度和前缀匹配情况各不相同。LLMPerf 用 `--mean-input-tokens` + `--stddev-input-tokens` 解决这一问题。2026 年的工具选择如下：LLM 专用工具 GenAI-Perf、LLMPerf、LLM-Locust、guidellm 适合准确测量词元级指标；**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）** 支持流式响应，通过 TestRun/PrivateLoadZone CRD 实现 Kubernetes 原生分布式测试，最适合 CI/CD 门禁；Vegeta 是 Go 实现的恒定速率饱和测试工具；Locust 2.43.3 只有搭配 LLM-Locust 扩展才适合流式测试。负载模式包括稳态、爬升、尖峰（测试自动扩缩）和浸泡（检测内存泄漏）。

**Type:** Build
**Languages:** Python（标准库，简化的真实提示词生成器与延迟采集器）
**Prerequisites:** 阶段 17 · 08（推理指标），阶段 17 · 03（GPU 自动扩缩）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释两种让通用负载工具误报 LLM API 性能的反模式：GIL 陷阱和提示词单一化陷阱。
- 按目标选择工具：LLMPerf 用于基准运行，k6 加流式扩展用于 CI 门禁，guidellm 用于大规模合成测试，GenAI-Perf 用于 NVIDIA 参考测试。
- 设计四种负载模式：稳态、爬升、尖峰、浸泡，并指出各自能发现的失效模式。
- 使用输入词元数量的均值与标准差，而非固定长度，构建真实提示词分布。

## 问题（The Problem）

你用 k6 在 500 个并发用户下测试 LLM 端点，服务扛住了，于是发布。但生产环境只有 200 个真实用户时，服务就崩溃了：P99 TTFT 激增，GPU 满载。

发生了两件事。首先，k6 发送了 500 个相同提示词，请求合并和前缀缓存让你看起来处理了 500 个并发解码，实际只处理了一个。其次，k6 不会按用户感知流式输出的方式跟踪词元间延迟；它看到的是一条 HTTP 连接，而不是以不同间隔到达的 500 个词元。

LLM 负载测试是一门独立的工程实践。

## 概念（The Concept）

### GIL 陷阱（The GIL trap，Locust）

Locust 使用 Python，在客户端 GIL 下分词。高并发时，分词器排在请求生成之后。报告的词元间延迟包含客户端分词积压。你以为服务端慢，实际上慢的是测试框架。

修复方式：使用 LLM-Locust 扩展将分词移至独立进程，或使用编译型语言测试框架，例如 k6，或使用 tokenizers.rs 的 LLMPerf。

### 提示词单一化陷阱（The prompt-uniformity trap）

所有已知负载测试工具都允许配置一个提示词。在循环 10,000 次的测试中，每次发送完全相同的提示词。服务端每次看到相同前缀，前缀缓存命中率接近 100%，吞吐量看起来很好。

修复方式：从提示词分布抽样。LLMPerf 使用 `--mean-input-tokens 500 --stddev-input-tokens 150`，让长度和内容都具有多样性。

### 四种负载模式（Four load patterns）

1. **稳态（steady-state）**：以恒定 RPS 运行 30–60 分钟，发现基准性能退化。
2. **爬升（ramp）**：15 分钟内将 RPS 从 0 线性增加到目标，发现容量拐点和预热异常。
3. **尖峰（spike）**：突然将 RPS 提高至 3–10 倍，持续 2 分钟后恢复，发现自动扩缩延迟、队列饱和和冷启动影响。
4. **浸泡（soak）**：稳态运行 4–8 小时，发现内存泄漏、连接池漂移和可观测性系统溢出。

### 2026 年工具选型（2026 tool mapping）

**LLMPerf**（Anyscale）：使用 Python，但分词由 Rust 支撑。支持提示词均值与标准差、流式响应，是性能测试的最佳默认选择。

**NVIDIA GenAI-Perf**：NVIDIA 参考工具，使用 Triton 客户端，指标覆盖全面。注意其 ITL 不包含 TTFT，而 LLMPerf 的包含。两个工具会为相同服务器报告不同 TPOT。

**LLM-Locust**（TrueFoundry）：修复 GIL 陷阱的 Locust 扩展，提供熟悉的 Locust DSL 和流式指标。

**guidellm**：用于大规模合成基准测试。

**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）**：
- k6 本身使用 Go，编译执行，没有 GIL，并增加了流式感知指标。
- k6 Operator 使用 TestRun / PrivateLoadZone CRD，提供 Kubernetes 原生分布式测试。
- 最适合 CI/CD 门禁和 SLA 测试。

**Vegeta**：使用 Go，比 k6 更简单，执行恒定速率 HTTP 饱和测试。不感知 LLM 语义，但适合网关和限流测试。

**原版 Locust 2.43.3**：用于 LLM 时存在 GIL 陷阱，只能搭配 LLM-Locust 扩展使用。

### CI 中的 SLA 门禁（SLA gate in CI）

在 PR 上运行 k6：

- 每组按基准 RPS 运行 30–50 次迭代。
- 门禁：P50/P95 TTFT、5xx <5%、TPOT 低于阈值。
- 违规时让构建失败。

### 真实提示词分布（Realistic prompt distribution）

若有真实流量样本，就以其构建分布；否则使用公开分布，例如聊天用 ShareGPT 提示词、代码用 HumanEval。将均值与标准差传给 LLMPerf。务必避免循环发送单个提示词。

### 应记住的数字（Numbers you should remember）

- k6 Operator 1.0 GA：2025 年 9 月。
- k6 v2026.1.0：支持流式感知指标。
- 典型 LLMPerf 运行：并发 X 下执行 100–1000 个请求。
- 典型 CI 门禁：每个 PR 运行 30–50 次迭代。
- 四种模式：稳态、爬升、尖峰、浸泡。

```figure
load-pattern-waves
```

## 动手使用（Use It）

`code/main.py` 模拟使用真实提示词分布的负载测试，测量有效 TPOT，并展示单一提示词陷阱。

## 交付成果（Ship It）

本课产出 `outputs/skill-load-test-plan.md`。它根据工作负载和 SLA 选择工具，设计四种负载模式。

## 练习（Exercises）

1. 运行 `code/main.py`。比较单一分布与真实分布，差距在哪里？
2. 编写用于 CI 门禁的 k6 脚本：100 并发下 TTFT P95 <800ms，运行 5 分钟。
3. 浸泡测试显示内存每小时增长 50 MB。列出三种原因，以及区分它们所需的观测手段。
4. 从 10 RPS 尖峰升至 100 RPS。如果已经配置 Karpenter + vLLM production-stack（阶段 17 · 03 + 18），预期恢复时间是多少？
5. 同一服务器上，GenAI-Perf 报告 TPOT=6ms，LLMPerf 报告 TPOT=11ms。解释原因。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| LLMPerf | “LLM 测试框架” | Anyscale 基准工具，支持流式响应 |
| GenAI-Perf | “NVIDIA 工具” | NVIDIA 参考测试框架 |
| LLM-Locust | “LLM 版 Locust” | 修复 GIL 陷阱的 Locust 扩展 |
| guidellm | “合成基准” | 大规模合成测试工具 |
| k6 Operator | “K8s k6” | 基于 CRD 的分布式 k6 |
| GIL 陷阱（GIL trap） | “Python 客户端开销” | 分词积压抬高报告延迟 |
| 提示词单一化陷阱（Prompt-uniformity trap） | “单提示词假象” | 相同提示词循环命中缓存，抬高吞吐量 |
| 稳态（Steady-state） | “恒定负载” | 保持固定 RPS，运行 N 分钟 |
| 爬升（Ramp） | “线性增加” | 在指定时间内从 0 增加到目标 |
| 尖峰（Spike） | “突发测试” | 突然增加数倍，然后恢复 |
| 浸泡（Soak） | “长时间测试” | 运行数小时以检测泄漏 |

## 延伸阅读（Further Reading）

- [TianPan：LLM 应用负载测试](https://tianpan.co/blog/2026-03-19-load-testing-llm-applications)
- [PremAI：2026 年 LLM 负载测试](https://blog.premai.io/load-testing-llms-tools-metrics-realistic-traffic-simulation-2026/)
- [NVIDIA NIM：LLM 推理基准测试简介](https://docs.nvidia.com/nim/large-language-models/1.0.0/benchmarking.html)
- [TrueFoundry：LLM-Locust](https://www.truefoundry.com/blog/llm-locust-a-tool-for-benchmarking-llm-performance)
- [LLMPerf 仓库](https://github.com/ray-project/llmperf)
- [k6 Operator 仓库](https://github.com/grafana/k6-operator)
