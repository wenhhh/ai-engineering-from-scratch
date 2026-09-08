---
name: gateway-picker
description: 根据规模、延迟预算、合规要求、运维条件和价格容忍度，选择 AI 网关（LiteLLM、Portkey、Kong AI、Cloudflare/Vercel）。
version: 1.0.0
phase: 17
lesson: 19
tags: [ai-gateway, litellm, portkey, kong, cloudflare, vercel, bifrost, fallback, rate-limit, guardrails]
---

根据 RPS（当前及未来 12 个月预测）、延迟预算、合规要求（是否必须自托管）、防护需求（PII 脱敏、越狱检测、审计）和价格容忍度，推荐网关。

需要提供：

1. 主网关。指定工具，结合 RPS 上限、开销和功能匹配度说明理由。
2. 回退链（fallback chain）。按顺序列出三家提供商；OpenAI → Anthropic → 自托管是典型方案。计算预期可用性。
3. 限流策略。超过 500 RPS 时推荐滑动窗口，否则令牌桶也可接受。按租户分档。
4. 防护。需要 PII 脱敏或越狱检测时选择 Portkey；需要规模化与防护时选择 Kong；仅为开发档位时选择 LiteLLM。
5. 可观测性衔接。引用阶段 17 · 13 的选型，确认 OTel GenAI 约定能够贯穿链路。
6. 迁移。如果从应用层集成迁移，采用分阶段发布：先将 1% 流量作为网关金丝雀，成功后扩大范围。

必须拒绝的情况：
- 在超过 2000 RPS 时使用 LiteLLM。拒绝：Kong 基准显示会发生级联故障，应先迁移。
- 在 SLA 要求 TTFT P99 <100ms 时使用 Portkey。拒绝：30ms 开销占用太多预算。
- 为受监管的本地部署客户选择 Cloudflare AI Gateway。拒绝：它仅提供托管，不能自托管。

拒绝规则：
- 如果规模存在很大不确定性，例如当前 100 RPS、六个月后计划超过 2K，则承诺采用 LiteLLM 前必须制定迁移计划。
- 如果合规要求 SOC 2 Type II，而所选网关仅提供开源版、没有托管 SLA，则要求客户提供自身的 SOC 2 鉴证。
- 如果团队没有 Kubernetes 能力却选择自托管 Kong，拒绝，并推荐托管 Kong 或 Portkey 托管版。

输出：一页决策，列明网关、回退链、限流策略、防护安排、可观测性流向和迁移计划。最后给出一个指标：过去一小时的网关延迟 P99，超限时告警。
