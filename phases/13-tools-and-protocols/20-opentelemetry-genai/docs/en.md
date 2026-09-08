# OpenTelemetry GenAI：端到端追踪工具调用（Tracing Tool Calls End-to-End）

> 一个智能体调用五个工具、三个 MCP 服务器和两个子智能体。你需要贯穿所有调用的一条追踪。OpenTelemetry GenAI 语义约定在 v1.37 及以上提供稳定属性，是 2026 年的标准，Datadog、Langfuse、Arize Phoenix、OpenLLMetry 和 AgentOps 原生支持。本课列出必需属性，介绍跨度层级（智能体 → LLM → 工具），并交付可接入任意 OTel 导出器的标准库跨度发射器。

**Type:** Build
**Languages:** Python (stdlib, OTel span emitter)
**Prerequisites:** Phase 13 · 07（MCP 服务器），Phase 13 · 08（MCP 客户端）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说出 LLM 跨度和工具执行跨度必需的 OTel GenAI 属性。
- 构建覆盖智能体循环、LLM 调用、工具调用和 MCP 客户端分发的追踪层级。
- 决定哪些内容主动启用捕获，哪些默认脱敏。
- 无需重写工具代码，将跨度发送到本地收集器，例如 Jaeger、Langfuse。

## 问题（The Problem）

2026 年 2 月的一次调试：用户报告“我的智能体有时需要 30 秒响应，有时只需 3 秒”。没有追踪。日志显示 LLM 调用，却没有工具分发、MCP 服务器往返或子智能体。你只能猜。最终发现：一个 MCP 服务器偶尔卡在冷启动。

没有端到端追踪，就找不到这个问题。OTel GenAI 解决它。

这些约定在 2025 至 2026 年由 OpenTelemetry semantic-conventions 小组确立。它们定义稳定属性名，让 Datadog、Langfuse、Phoenix、OpenLLMetry 和 AgentOps 都解析同样的跨度。插桩一次，可发往任意后端。

## 概念（The Concept）

### 跨度层级（Span hierarchy）

```
agent.invoke_agent  （顶层，INTERNAL 跨度）
 ├── llm.chat       （CLIENT 跨度）
 ├── tool.execute   （INTERNAL）
 │    └── mcp.call  （CLIENT 跨度）
 ├── llm.chat       （CLIENT 跨度）
 └── subagent.invoke （INTERNAL）
```

整个结构嵌套在同一个追踪 id 下。跨度 id 连接父子关系。

### 必需属性（Required attributes）

根据 2025 至 2026 年的语义约定（semconv）：

- `gen_ai.operation.name`：`"chat"`、`"text_completion"`、`"embeddings"`、`"execute_tool"`、`"invoke_agent"`。
- `gen_ai.provider.name`：`"openai"`、`"anthropic"`、`"google"`、`"azure_openai"`。
- `gen_ai.request.model`：请求的模型字符串，例如 `"gpt-4o-2024-08-06"`。
- `gen_ai.response.model`：实际提供服务的模型。
- `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`。
- `gen_ai.response.id`：用于关联的提供方响应 id。

工具跨度：

- `gen_ai.tool.name`：工具标识符。
- `gen_ai.tool.call.id`：具体调用 id。
- `gen_ai.tool.description`：工具描述，可选。

智能体跨度：

- `gen_ai.agent.name` / `gen_ai.agent.id` / `gen_ai.agent.description`。

### 跨度种类（Span kinds）

- `SpanKind.CLIENT` 用于跨进程边界调用，例如 LLM 提供方、MCP 服务器。
- `SpanKind.INTERNAL` 用于智能体自身循环步骤和工具执行。

### 主动启用内容捕获（Opt-in content capture）

默认情况下，跨度携带指标和计时，不携带提示词或补全。大载荷和个人身份信息（PII）默认关闭。设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 及特定内容捕获环境变量，可包含内容。在生产中启用前仔细审查。

### 跨度上的事件（Events on spans）

词元级事件可以作为跨度事件添加：

- `gen_ai.content.prompt`：输入消息。
- `gen_ai.content.completion`：输出消息。
- `gen_ai.content.tool_call`：记录的工具调用。

事件在跨度内按时间排序，用于详细重放。

### 导出器（Exporters）

OTel 跨度可导出到：

- **Jaeger / Tempo。** 开源，本地部署。
- **Langfuse。** 专注 LLM 可观测性，可视化词元用量。
- **Arize Phoenix。** 结合评估和追踪。
- **Datadog。** 商业产品，原生解析 `gen_ai.*` 属性。
- **Honeycomb。** 面向列，便于查询。

所有后端都使用 OTLP 线上格式，代码不必关心差异。

### 跨 MCP 传播（Propagation across MCP）

MCP 客户端调用服务器时，将 W3C traceparent 请求头注入请求。Streamable HTTP 支持标准请求头。Stdio 不原生承载 HTTP 请求头；规范 2026 年路线图讨论在 JSON-RPC 调用中添加 `_meta.traceparent` 字段。

在该功能发布前，手动在每个请求的 `_meta` 中包含 traceparent。服务器记录追踪 id。

### 指标（Metrics）

除跨度外，GenAI 语义约定还定义指标：

- `gen_ai.client.token.usage`：直方图。
- `gen_ai.client.operation.duration`：直方图。
- `gen_ai.tool.execution.duration`：直方图。

将它们用于不需要逐调用详情的仪表盘。

### AgentOps 层（AgentOps layer）

AgentOps 成立于 2024 年，专注 GenAI 可观测性。它包装常见框架，如 LangGraph、Pydantic AI、CrewAI，自动发出 OTel 跨度。如果技术栈使用受支持框架，它会很有用；否则手动插桩。

```figure
t3-span-waterfall
```

## 实际应用（Use It）

`code/main.py` 为一个调用 LLM、分发两个工具并执行一次 MCP 往返的智能体，向 stdout 发出 OTel 结构的跨度，采用类似 OTLP-JSON 的格式。没有真实导出器，本课聚焦跨度结构和属性集。可将输出贴入兼容 OTLP 的查看器，或直接阅读。

观察：

- 所有跨度共享追踪 id。
- 父子链接通过 `parentSpanId` 编码。
- 必需 `gen_ai.*` 属性已填充。
- 内容捕获默认关闭，一个场景通过环境变量启用它。

## 交付（Ship It）

本课生成 `outputs/skill-otel-genai-instrumentation.md`。给定智能体代码库，该技能生成插桩计划：在哪里添加跨度、填充哪些属性、面向哪些导出器。

## 练习（Exercises）

1. 运行 `code/main.py`。统计跨度数，识别哪些是 CLIENT、哪些是 INTERNAL。

2. 通过环境变量启用内容捕获，确认出现 `gen_ai.content.prompt` 和 `gen_ai.content.completion` 事件。注意对 PII 的影响。

3. 添加工具执行指标 `gen_ai.tool.execution.duration`，每次调用发出一个直方图样本。

4. 将父智能体跨度的 traceparent 传播到 MCP 请求的 `_meta.traceparent` 字段。验证 MCP 服务器能看到同一追踪 id。

5. 阅读 OTel GenAI 语义约定规范。找出其中一项本课代码未发出的属性，并添加它。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| OTel | “OpenTelemetry” | 追踪、指标和日志的开放标准 |
| GenAI 语义约定（GenAI semconv） | “GenAI semantic conventions” | LLM、工具和智能体跨度的稳定属性名 |
| `gen_ai.*` | “属性命名空间” | 所有 GenAI 属性共享此前缀 |
| 跨度（Span） | “计时操作” | 带开始、结束和属性的工作单元 |
| 追踪（Trace） | “跨跨度血缘” | 共享追踪 id 的跨度树 |
| SpanKind | “CLIENT / SERVER / INTERNAL” | 关于跨度方向的提示 |
| OTLP | “OpenTelemetry Line Protocol” | 导出器使用的线上格式 |
| 主动启用内容（Opt-in content） | “提示词与补全捕获” | 默认关闭，通过环境变量启用 |
| traceparent | “W3C 请求头” | 跨服务传播追踪上下文 |
| 导出器（Exporter） | “面向特定后端的发送器” | 将跨度发送到 Jaeger、Datadog 等的组件 |

## 延伸阅读（Further Reading）

- [OpenTelemetry：GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) - GenAI 跨度、指标和事件的权威约定
- [OpenTelemetry：GenAI 跨度](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/) - LLM 和工具执行跨度属性列表
- [OpenTelemetry：GenAI 智能体跨度](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) - 智能体级 `invoke_agent` 跨度
- [open-telemetry/semantic-conventions：GenAI 跨度](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md) - GitHub 托管的权威来源
- [Datadog：LLM OTel 语义约定](https://www.datadoghq.com/blog/llm-otel-semantic-convention/) - 生产集成演练
