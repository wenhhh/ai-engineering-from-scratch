# OpenTelemetry GenAI 语义约定（OpenTelemetry GenAI Semantic Conventions）

> OpenTelemetry 的 GenAI 特别兴趣小组（SIG，成立于 2024 年 4 月）为智能体遥测制定标准数据模式（Schema）。跨度名称、属性和内容采集规则在厂商之间趋于统一，使智能体追踪在 Datadog、Grafana、Jaeger 和 Honeycomb 中具有相同含义。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 13（LangGraph），第 14 阶段 · 24（可观测性平台）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 列出 GenAI 跨度类别：模型/客户端、智能体、工具。
- 区分 `invoke_agent` 的 CLIENT 和 INTERNAL 跨度，以及各自适用的情况。
- 列出顶层 GenAI 属性：提供商名称、请求模型、数据源 ID。
- 解释内容采集契约：显式启用、`OTEL_SEMCONV_STABILITY_OPT_IN`，以及外部引用建议。

## 问题（The Problem）

每家厂商都发明自己的跨度名称，运维团队最终不得不为每个框架分别搭建仪表盘。OpenTelemetry 的 GenAI SIG 通过定义整个生态共同遵循的标准解决这一问题。

## 概念（The Concept）

### 跨度类别（Span categories）

1. **模型 / 客户端跨度（Model / client spans）。** 覆盖原始 LLM 调用，由提供商 SDK（Anthropic、OpenAI、Bedrock）和框架模型适配器发出。
2. **智能体跨度（Agent spans）。** `create_agent` 在构造智能体时发出，`invoke_agent` 在运行时发出。
3. **工具跨度（Tool spans）。** 每次工具调用一个，通过父子关系连接到智能体跨度。

### 智能体跨度命名（Agent span naming）

- 跨度名称：如果智能体有名称，使用 `invoke_agent {gen_ai.agent.name}`，否则回退到 `invoke_agent`。
- 跨度类型：
  - **CLIENT**：用于远程智能体服务，如 OpenAI Assistants API、Bedrock Agents。
  - **INTERNAL**：用于进程内智能体框架，如 LangChain、CrewAI、本地 ReAct。

### 关键属性（Key attributes）

- `gen_ai.provider.name`：`anthropic`、`openai`、`aws.bedrock`、`google.vertex`。
- `gen_ai.request.model`：模型 ID。
- `gen_ai.response.model`：最终解析出的模型，可能因路由而不同于请求模型。
- `gen_ai.agent.name`：智能体标识。
- `gen_ai.operation.name`：`chat`、`completion`、`invoke_agent`、`tool_call`。
- `gen_ai.data_source.id`：针对 RAG，标识查询了哪个语料库或存储。

Anthropic、Azure AI Inference、AWS Bedrock、OpenAI 都有各自技术专用的约定。

### 内容采集（Content capture）

默认规则：插桩默认不应（SHOULD NOT）采集输入和输出。通过以下属性显式启用采集：

- `gen_ai.system_instructions`
- `gen_ai.input.messages`
- `gen_ai.output.messages`

推荐的生产模式：将内容存储在外部，如 S3 或你的日志存储，在跨度中记录引用，即指针 ID，而非正文。这是将第 27 课的内容投毒防御接入可观测性。

### 稳定性（Stability）

截至 2026 年 3 月，大多数约定仍处于实验阶段。通过以下方式启用稳定预览：

```
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
```

Datadog v1.37+ 将 GenAI 属性原生映射到其 LLM Observability 数据模式（Schema）。其他后端（Grafana、Honeycomb、Jaeger）支持原始属性。

### 模式的失效点（Where this pattern goes wrong）

- **在跨度中采集完整提示词（Capturing full prompts in spans）。** PII、密钥和客户数据进入运维人员可读的追踪。应存储到外部。
- **缺少 `gen_ai.provider.name`（No provider name）。** 缺少归属信息会破坏多提供商仪表盘。
- **跨度没有父链接（Spans without parent links）。** 工具跨度成为孤立记录。始终传播上下文。
- **未设置稳定性显式启用项（Not setting stability opt-in）。** 后端升级可能重命名你的属性。

```figure
ae-genai-span-tree
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现符合 GenAI 约定的跨度发射器：

- 遵循 GenAI 属性结构定义（Schema）的 `Span`。
- 带 `start_span` 和嵌套上下文的 `Tracer`。
- 脚本化智能体运行，发出 `create_agent`、`invoke_agent`（INTERNAL）、逐工具跨度，以及 LLM 调用的 `chat` 跨度。
- 内容采集模式将提示词存储到外部，并在跨度中记录 ID。

运行：

```
python3 code/main.py
```

输出：包含全部必需 GenAI 属性的跨度树，以及展示显式启用内容引用的“外部存储”。

## 实际应用（Use It）

- **Datadog LLM Observability**（v1.37+）：原生映射属性。
- **Langfuse / Phoenix / Opik**（第 24 课）：对生态自动插桩。
- **Jaeger / Honeycomb / Grafana Tempo**：原始 OTel 追踪；根据 GenAI 属性构建仪表盘。
- **自托管（Self-hosted）**：运行带 GenAI 处理器的 OTel Collector。

## 交付成果（Ship It）

`outputs/skill-otel-genai.md` 将 OTel GenAI 跨度接入现有智能体，配置内容采集默认值和外部引用存储。

## 练习（Exercises）

1. 为第 01 课 ReAct 循环加入 `invoke_agent`（INTERNAL）和逐工具跨度，将其发送到 Jaeger 实例。
2. 添加“仅引用”模式的内容采集：提示词存到 SQLite，跨度属性只携带行 ID。
3. 阅读 `gen_ai.data_source.id` 规范，将它接入第 09 课的 Mem0 搜索。
4. 设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，验证收集器不会重命名属性。
5. 仅根据 GenAI 属性构建仪表盘，回答“哪些工具错误与哪些模型相关”。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| GenAI SIG | “OpenTelemetry GenAI 小组” | 制定数据模式（Schema）的 OTel 工作组 |
| invoke_agent | “智能体跨度” | 表示智能体运行的跨度名称 |
| CLIENT 跨度 | “远程调用” | 调用远程智能体服务的跨度 |
| INTERNAL 跨度 | “进程内” | 进程内智能体运行的跨度 |
| gen_ai.provider.name | “提供商” | anthropic / openai / aws.bedrock / google.vertex |
| gen_ai.data_source.id | “RAG 来源” | 检索命中了哪个语料库或存储 |
| 内容采集（Content capture） | “提示词日志” | 显式启用消息采集；生产环境存到外部 |
| 稳定性显式启用（Stability opt-in） | “预览模式” | 用于固定实验约定的环境变量 |

## 延伸阅读（Further Reading）

- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：规范
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)：默认提供 GenAI 跨度
- [AutoGen v0.4（Microsoft Research）](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)：内置 OTel 跨度
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)：W3C 追踪上下文传播
