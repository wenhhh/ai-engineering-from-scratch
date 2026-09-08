---
name: managed-platform-picker
description: 根据工作负载、SLA 和合规要求选择托管 LLM 平台（Bedrock、Azure OpenAI、Vertex AI），再选择一个用于冗余的平台，并制定 FinOps 埋点方案。
version: 1.0.0
phase: 17
lesson: 01
tags: [bedrock, azure-openai, vertex-ai, ptu, finops, managed-platforms]
---

根据工作负载画像（所需模型、每月词元量、P50/P99 的 TTFT SLA、合规约束、现有云部署），给出平台建议。

请输出：

1. 主平台。说明平台名称、覆盖的具体模型，以及根据利用率应采用按需模式还是预配吞吐量单位（Provisioned Throughput Units，PTU）/ Provisioned Throughput。引用盈亏平衡计算：PTU 通常在持续利用率约 40-60% 时达到盈亏平衡。
2. 备用平台。指明满足“至少两家服务商”要求的备用平台。论证组合选择：冗余必须考虑模型覆盖交集（常见组合为 Bedrock 上的 Claude 加 Azure OpenAI 上的 GPT）及区域覆盖交集。
3. 云财务管理（FinOps）埋点。明确第一天就应启用的功能：Bedrock Application Inference Profiles、Azure 作用域及作为成本对象的 PTU 预留、Vertex 每团队一个项目加 BigQuery Billing Export。明确归因维度：按用户、按任务、按租户。
4. SLA 检查。将目标 TTFT P99 与公开基准比较（Azure OpenAI PTU 的 P50 ≈ 50 ms；Bedrock 按需模式的 P50 ≈ 75 ms）。如果 SLA 比按需模式能提供的水平更严格，则要求使用 PTU。
5. 合规检查。按需核实 BAA、SOC 2 Type II、HIPAA 和欧盟数据驻留。指出三家都满足基本要求，但保留策略和滥用监控退出机制不同。
6. 迁移路径。列出团队本周可采取的一项可逆步骤（例如，通过屏蔽服务商差异的 AI 网关部署，或为归因请求头添加埋点），以及一项长期步骤（承诺 PTU 用量或跨区域故障转移）。

硬性否决条件：
- 只推荐一个平台而未明确备用平台。拒绝此方案，坚持至少两家服务商。
- 没有利用率估计就选择 PTU。拒绝此方案，要求提供持续利用率数据。
- 在要求成本归因时忽略 Bedrock Application Inference Profiles；这是最直接的原生归因能力。

拒绝规则：
- 如果 Claude、Gemini 和 GPT 都是工作负载的 P0 需求，明确说明现实中需要三个平台：网关后的 Bedrock + Vertex + Azure OpenAI，不要假装一个平台可以提供全部三者。
- 如果 SLA 要求 TTFT P99 < 100 ms，而预期预算不足以支持 PTU，拒绝承诺达成该 SLA，并解释按需模式的波动限制。
- 如果客户要求“使用最便宜的服务商”，拒绝按单一价格判断，说明价格包含多个维度：词元费率、专用容量、归因开销和锁定成本。

输出：一页决策文档，包含主平台、备用平台、PTU 与按需模式的选择、埋点清单、SLA 与合规核实，以及两项迁移步骤。最后给出一个用于发现计划偏离的指标：持续利用率、PTU 浪费或归因覆盖率。
