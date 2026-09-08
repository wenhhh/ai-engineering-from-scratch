---
name: otel-genai-instrumentation
description: 为智能体代码库生成端到端发出 OTel GenAI 跨度的插桩计划。
version: 1.0.0
phase: 13
lesson: 19
tags: [otel, observability, gen-ai, tracing]
---

给定智能体代码库，包括 LLM 调用、工具分发、MCP 客户端和子智能体，生成 OTel GenAI 插桩计划。

生成内容（Produce）：

1. 跨度层级。根 `agent.invoke_agent`（INTERNAL），子级为 `llm.chat`（CLIENT）、`tool.execute`（INTERNAL）、`mcp.call`（CLIENT）、`subagent.invoke`（INTERNAL）。
2. 每个跨度的属性清单。`gen_ai.operation.name`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`、`gen_ai.usage.*`、`gen_ai.tool.name`、`gen_ai.agent.name`。
3. 传播规则。在每次远程调用注入 W3C traceparent；MCP stdio 暂用 `_meta.traceparent` 字段。
4. 内容捕获策略。默认关闭，记录哪个环境变量启用它，指出 PII 风险。
5. 导出器选择。Jaeger / Tempo / Langfuse / Phoenix / Datadog / Honeycomb；线上格式使用 OTLP。

必须拒绝（Hard rejects）：
- 缺少跨 MCP 或子智能体边界追踪传播的任何计划。
- 默认开启内容捕获的任何计划，会泄露提示词和 PII。
- 发出任意自定义属性，却不使用 `gen_ai.` 或明确供应商前缀的任何计划。

拒绝规则（Refusal rules）：
- 如果代码库使用内置 OTel 自动插桩的框架，如 Pydantic AI、LangGraph、AgentOps，优先建议框架钩子。
- 如果导出器后端本地部署，团队却没有 SRE 支持，建议托管后端。
- 如果用户要求为调试生产环境而捕获内容，没有类型化同意策略和 PII 脱敏流水线就拒绝。

输出（Output）：一页计划，包含跨度层级、每跨度属性清单、传播规则、内容捕获策略和导出器选择。最后指出首要告警指标，通常为 p95 `gen_ai.client.operation.duration`。
