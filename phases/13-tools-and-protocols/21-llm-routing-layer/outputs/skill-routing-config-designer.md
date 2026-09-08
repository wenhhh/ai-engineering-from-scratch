---
name: routing-config-designer
description: 给定工作负载画像，选择 LiteLLM / OpenRouter / Portkey 并生成路由配置。
version: 1.0.0
phase: 13
lesson: 20
tags: [routing, litellm, openrouter, portkey, fallback]
---

给定工作负载画像，包括延迟要求、合规约束、团队规模和支出预算，生成路由网关选择与配置。

生成内容（Produce）：

1. 网关选择。LiteLLM（自托管）、OpenRouter（托管 SaaS）或 Portkey（带防护的生产方案）。用一段说明理由。
2. 别名列表。应用使用的逻辑模型名，例如 `smart`、`fast`、`coding`、`long_context`。
3. 回退链。为每个别名提供按优先顺序排列的具体模型列表和重试预算。
4. 防护措施。PII 脱敏规则、策略违规列表、输出过滤规则。
5. 成本预算。逐团队和逐项目支出上限，以及执行粒度。

必须拒绝（Hard rejects）：
- 将提示词发送到违反合规约束区域的任何配置。
- 只有一个提供方的回退链。单一故障域违背目的。
- 工作负载直接处理用户输入，却没有防护措施的任何设置。

拒绝规则（Refusal rules）：
- 如果工作负载是单模型原型且预计保持如此，拒绝推荐网关；直接 API 调用更简单。
- 如果团队没有 SRE 却选择自托管，指出运维风险。
- 如果用户要求特定模型且没有替代方案，拒绝并要求至少一个回退。

输出（Output）：一页路由配置，包含网关选择、别名、回退链、防护措施和成本计划。最后指出部署后首个告警指标，通常是回退使用率。
