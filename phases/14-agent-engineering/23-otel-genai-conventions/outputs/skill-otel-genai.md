---
name: otel-genai
description: 按 OpenTelemetry GenAI 语义约定为智能体插桩，提供带正确属性的 invoke_agent、chat、tool_call 跨度，内容采集仅在显式启用后进行。
version: 1.0.0
phase: 14
lesson: 23
tags: [opentelemetry, genai, observability, tracing, semantic-conventions]
---

给定智能体运行时，接入 OTel GenAI 语义约定。

产出：

1. 每次智能体运行一个 `invoke_agent` 跨度。远程智能体服务用 CLIENT 类型，进程内用 INTERNAL。名称为 `invoke_agent {gen_ai.agent.name}`。
2. 每次 LLM 调用一个 `chat` 跨度，带 `gen_ai.operation.name=chat`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`。
3. 每次工具调用一个 `tool_call` 跨度，带 `gen_ai.tool.name`，适用时还带 `gen_ai.data_source.id`，标识 RAG 语料库或记忆存储。
4. 显式启用内容采集：默认关闭；开启后将输入与输出存储到外部，并在跨度中记录 `*.reference_id`。
5. 上下文传播：使用 W3C 追踪上下文头，将多进程运行（Claude Agent SDK CLI 子进程）拼接为同一条追踪。

必须拒绝的设计：

- 默认在跨度内嵌入完整提示词与输出。这会泄露 PII 和密钥，也违反规范。
- 缺少 `gen_ai.provider.name`。多提供商仪表盘会失效。
- 孤立工具跨度。始终通过活跃上下文建立父子关系。

拒绝规则：

- 如果运行时不能跨进程边界传播上下文，应拒绝。Claude Agent SDK + CLI 用户必须能拼接多进程追踪。
- 如果产品受到 HIPAA、GDPR 等监管约束，应拒绝内嵌内容采集，只能使用带访问控制的外部存储。
- 如果后端未设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`，应警告：收集器升级时属性名可能改变。

输出：`tracer.py`、`attributes.py`、`content_store.py`、`README.md`，说明跨度结构、稳定性显式启用和内容采集策略。结尾给出“接下来读什么”，指向第 24 课（Langfuse、Phoenix、Opik 后端）或第 17 课的 Claude Agent SDK 追踪上下文传播。
