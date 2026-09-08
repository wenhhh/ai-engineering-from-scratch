# LLM 可观测性技术栈选型（LLM Observability Stack Selection）

> 2026 年可观测性（Observability）市场分为两类。开发平台 LangSmith、Langfuse、Comet Opik 将监控与评估、提示词管理、会话回放打包；网关/埋点工具 Helicone、SigNoz、OpenLLMetry、Phoenix 专注遥测。Langfuse 核心采用 MIT 许可，开源平衡较好，云端每月免费 50K 事件。Phoenix 原生支持 OpenTelemetry，采用 Elastic License 2.0，适合漂移/RAG 可视化，不是持久化生产后端。Arize AX 通过零拷贝 Iceberg/Parquet 集成，声称比一体化可观测性便宜 100 倍。LangSmith 在 LangChain/LangGraph 生态领先，$39/用户/月，只有 Enterprise 可自托管。Helicone 基于代理，15-30 分钟配置，每月免费 100K 请求，但智能体追踪深度较弱。常见生产模式是网关（Helicone/Portkey）加评估平台（Phoenix/TruLens），用 OpenTelemetry 连接。

**Type:** Learn
**Languages:** Python (标准库，简化追踪采样模拟器)
**Prerequisites:** 阶段 17 · 08（推理指标，Inference Metrics）、阶段 14（智能体工程，Agent Engineering）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 区分捆绑评估、提示词、会话的开发平台，与仅提供追踪和指标的网关/遥测工具。
- 将 Langfuse、LangSmith、Phoenix、Arize AX、Helicone、Opik 六种主要工具映射到许可、价格和优势场景。
- 解释如何用 OpenTelemetry 连接网关工具与独立评估平台。
- 指出 2026 年成本差异：Arize AX 零拷贝与一体化数据摄取，差距约 100 倍。

## 问题背景（The Problem）

你交付了能工作的 LLM 功能，却看不到提示词失败、工具循环、延迟退化、成本突增或提示词缓存命中率。搜索“LLM 可观测性”得到八种工具，都声称解决同一问题，价格却分三档。

它们解决的并非同一问题。LangSmith 回答“这次 LangGraph 运行为什么失败”，Phoenix 回答“RAG 流水线是否漂移”，Helicone 回答“哪个应用在大量消耗词元”，Langfuse 回答“能否全部自托管”。工具和受众各不相同。

选型看四个维度：技术栈（LangChain、原始 SDK、多服务商）、许可接受范围（仅 MIT、接受 Elastic、商业也可以）、预算（免费、$100/月、$1000/月），以及自托管要求（必须、可选、不需要）。

## 核心概念（The Concept）

### 两类工具（Two categories）

**开发平台（Development platforms）**将可观测性与评估、提示词管理、数据集版本管理、会话回放整合。你可以做实验、查看哪种提示词有效、用数据集比较新提示词与过去优胜者的回归表现，包括 LangSmith、Langfuse、Comet Opik。

**网关/遥测工具（Gateway/telemetry tools）**为推理调用埋点，记录提示词、响应、词元、延迟、模型、成本，包括 Helicone、SigNoz、OpenLLMetry、Phoenix。功能精简，可通过 OpenTelemetry 组合独立评估工具。

### Langfuse：开源平衡（Langfuse — OSS balance）

- 核心采用 Apache / MIT 许可，可通过 Docker 自托管。
- 云端免费档每月 50K 事件，团队付费档 $29/月。
- 提供评估、提示词管理、追踪、数据集，对四项开发平台能力覆盖合理。
- 优势场景：需要 LangSmith 级功能，但必须自托管或保持开源许可。

### Phoenix（Arize）：遥测优先、OpenTelemetry 原生（Phoenix (Arize) — telemetry-first, OpenTelemetry-native）

- Elastic License 2.0，自托管简单。
- 擅长 RAG 和漂移可视化，嵌入空间散点图是一等功能。
- 并非为持久化生产后端设计，主要用于开发期可观测性。
- 优势场景：RAG 流水线开发、漂移调试，生产时搭配独立网关。

### Arize AX：规模化方案（Arize AX — the scale play）

- 商业产品，通过 Iceberg/Parquet 零拷贝集成数据湖。
- 声称大规模下比 Datadog 级一体化可观测性便宜约 100 倍。原理是追踪存入自己 S3 上的 Parquet，Arize 直接读取。
- 优势场景：每日 >10M 追踪，已有数据湖，需要 LLM 专用仪表盘但不想支付 Datadog 价格。

### LangSmith：LangChain/LangGraph 优先（LangSmith — LangChain/LangGraph first）

- 商业产品，$39/用户/月，只有 Enterprise 能自托管。
- 在 LangChain 与 LangGraph 栈中属同类最佳；不用两者时吸引力较低。
- 优势场景：团队确定使用 LangChain，且愿意付费。

### Helicone：基于代理的最小可行方案（Helicone — proxy-based minimum viable）

- 将 `OPENAI_API_BASE` 改为 Helicone 代理，15-30 分钟完成配置。
- MIT 许可，每月免费 100K 请求，付费 $20/月起。
- 包含故障转移、缓存、速率限制，也充当网关。
- 智能体和多步骤追踪深度较弱。
- 优势场景：快速起步、单一技术栈应用，需要网关与可观测性一体化。

### Opik（Comet）：开源开发平台（Opik (Comet) — OSS dev platform）

- Apache 2.0，完全开源。
- 功能类似 Langfuse，延续 Comet 体系。
- 优势场景：已使用 Comet 的 ML 团队，希望在同一界面获得 LLM 可观测性。

### SigNoz：OpenTelemetry 优先的完整 APM（SigNoz — OpenTelemetry-first full APM）

- Apache 2.0，通过 OpenTelemetry 同时处理一般应用性能监控（APM）与 LLM。
- 优势场景：统一服务与 LLM 调用的可观测性。

### 连接层：OpenTelemetry 与 GenAI 语义约定（The glue: OpenTelemetry + GenAI semantic conventions）

OpenTelemetry 于 2025 年底发布 GenAI 语义约定，包括 `gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`。消费 OTel 的工具可以互操作，正在形成的生产模式是：

1. 每次 LLM 调用发出符合 GenAI 约定的 OTel。
2. 路由到 Helicone / Portkey 网关，支持日常工作。
3. 同时发送到 Phoenix / Langfuse 评估平台，检查回归。
4. 归档到 Iceberg 数据湖，用 Arize AX 或 DuckDB 长期分析。

### 陷阱：在错误层埋点（The trap: instrumenting at the wrong layer）

在智能体框架内部埋点，例如添加 LangSmith 追踪，会耦合该框架。在 HTTP/OpenAI SDK 层通过 OpenLLMetry 或网关埋点，则具有可移植性。

### 采样：不能保留全部内容（Sampling — you can't keep everything）

每日 >1M 请求时，全量追踪保留成本超过 LLM 调用本身。按规则采样：错误 100%、高成本 100%、成功 5%。始终保留聚合值，为长尾问题保留原始数据。

### 应记住的数值（Numbers you should remember）

- Langfuse 免费云档：50K 事件/月。
- LangSmith：$39/用户/月。
- Helicone 免费档：100K 请求/月。
- Arize AX 宣称：规模化时比一体化方案便宜约 100 倍。
- OpenTelemetry GenAI 约定于 2025 年发布，2026 年广泛采用。

```figure
i4-otel-glue
```

## 实际应用（Use It）

`code/main.py` 模拟每日 1M 追踪在全量摄取、采样、采样加错误保留策略下的表现，报告存储成本和各自丢失的信息。

## 交付成果（Ship It）

本课产出 `outputs/skill-observability-stack.md`。根据技术栈、规模、预算和许可策略选择工具组合。

## 练习（Exercises）

1. 使用 LangChain 的团队需要开源自托管可观测性，在 Langfuse 与 Opik 中选择并论证。
2. 每日 5M 追踪，Datadog 报价 $150K/月，计算 Arize AX 盈亏平衡点。
3. 设计组织规范中每次 LLM 调用必须包含的 OpenTelemetry GenAI 属性集。
4. 论证 Phoenix 单独用于生产是否足够，何时不足？
5. Helicone 代理开销 20ms，P99 TTFT 300 ms 时可接受吗？SLA 为 100 ms 呢？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| OpenLLMetry | “LLM 的 OTel” | LLM 的开源 OpenTelemetry 埋点 |
| GenAI 语义约定（GenAI conventions） | “OTel 属性” | LLM 调用的标准 OTel 属性名 |
| LangSmith | “LangChain 可观测性” | 与 LangChain 生态整合的商业平台 |
| Langfuse | “开源 LangSmith” | MIT 开源，功能相似 |
| Phoenix | “Arize 开发工具” | OpenTelemetry 原生开发/评估平台 |
| Arize AX | “规模化可观测性” | 商业零拷贝 Iceberg/Parquet 可观测性 |
| Helicone | “代理可观测性” | 收集 LLM 遥测的 HTTP 代理，附带网关能力 |
| Opik | “Comet 的 LLM 工具” | Comet 的 Apache 2.0 开源开发平台 |
| 会话回放（Session replay） | “重新运行追踪” | 回放包含工具调用的完整智能体会话 |
| 评估（Eval） | “离线测试” | 在标注数据集运行候选模型或提示词 |

## 延伸阅读（Further Reading）

- [SigNoz：2026 年主要 LLM 可观测性工具](https://signoz.io/comparisons/llm-observability-tools/)
- [Langfuse：Arize AX 替代方案分析](https://langfuse.com/faq/all/best-phoenix-arize-alternatives)
- [PremAI：配置 Langfuse、LangSmith、Helicone、Phoenix](https://blog.premai.io/llm-observability-setting-up-langfuse-langsmith-helicone-phoenix/)
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [Arize Phoenix 文档](https://docs.arize.com/phoenix)
- [Helicone 文档](https://docs.helicone.ai/)
