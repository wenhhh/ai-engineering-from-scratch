---
name: observability-stack
description: 根据技术栈、规模、预算、许可策略选择 LLM 可观测性栈（开发平台 + 网关 + 可选规模化层），并定义 OpenTelemetry GenAI 属性集。
version: 1.0.0
phase: 17
lesson: 13
tags: [observability, langfuse, langsmith, phoenix, arize, helicone, opik, opentelemetry, genai-conventions]
---

根据技术栈（LangChain / DSPy / 原始 SDK）、每日追踪量、预算、许可策略（仅 MIT 或接受商业）和自托管要求，制定可观测性方案。

请输出：

1. 开发平台选择。Langfuse（开源）、LangSmith（LangChain 优先的商业平台）、Opik（Comet 开源）或不选，结合技术栈与许可论证。
2. 网关/遥测选择。Helicone（代理 + 网关）、SigNoz（完整 APM）、OpenLLMetry（纯 OTel）。已有 AI 网关（阶段 17 · 19）时说明集成。
3. 规模化/数据湖层。可选 Arize AX 或原始 Iceberg 做长期分析，Phoenix 处理 RAG 漂移。
4. OTel GenAI 约定。最少属性：`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`、`gen_ai.request.temperature`、`gen_ai.response.finish_reasons`，加组织专用 tenant_id、user_id、task。
5. 采样策略。错误 100%、高成本（>$0.10/调用）100%、成功 N%。原始数据保留窗口为 14d / 30d / 90d，聚合值保留更久。
6. 告警。五项必需指标：错误率、P99 TTFT、每请求成本、提示词缓存命中率、拒绝率。

硬性否决条件：
- 在框架专用 SDK 内埋点且没有 OTel 回退，拒绝，避免框架锁定。
- 非受监管负载以 Datadog 级定价 >$500/月保留 100% 追踪，拒绝，建议采样。
- 忽略 OpenTelemetry GenAI 约定，拒绝；2026 年互操作需要它们。

拒绝规则：
- 每日追踪 > 5M，团队坚持 Datadog 全量保留却无成本预测时，拒绝。
- 团队仅接受 MIT 却选择 LangSmith，拒绝；Langfuse 是 MIT 对应方案。
- 团队没有 AI 网关，选择 Helicone 同时承担网关和可观测性时，接受；代理可兼任网关至约 500 RPS，网关规模见阶段 17 · 19。

输出：一页方案，列出开发平台、网关、可选规模化层、OTel 属性集、采样规则、五项告警。最后给出反映技术栈偏离的唯一指标：最近 7 天具有完整 OTel GenAI 属性的 LLM 调用比例。
