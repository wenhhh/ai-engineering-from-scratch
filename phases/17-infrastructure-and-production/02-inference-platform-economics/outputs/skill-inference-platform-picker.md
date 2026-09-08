---
name: inference-platform-picker
description: 根据工作负载、SLA、预算和运维约束，选择推理平台（Fireworks、Together、Baseten、Modal、Replicate、Anyscale 或定制芯片）。统一按词元、按分钟和按预测计费的比较口径。
version: 1.0.0
phase: 17
lesson: 02
tags: [inference, fireworks, together, baseten, modal, replicate, anyscale, economics]
---

根据工作负载画像（模型、每日词元量、持续利用率、TTFT SLA、突发系数、合规要求、Python 或混合技术栈），给出平台建议。

请输出：

1. 主平台。指明平台和具体定价档位（无服务器、专用或批处理），用匹配的工作负载特征论证，例如“选择 Fireworks 无服务器，因为 SLA 要求 TTFT < 500 ms，且流量具有突发性”。
2. 实际成本。将所选计费模式统一换算为每百万输出词元的美元成本，至少与两个替代平台比较。指出何时按分钟胜过按词元（持续利用率超过约 30%），以及何时相反。
3. 冷启动（Cold start）方案。选择无服务器平台（Fireworks、Modal、Replicate）时，说明预期冷启动延迟和缓解措施（预热、min_workers=1、在线迁移）。选择专用平台（Baseten、Anyscale）时跳过本节，但指出代价。
4. 次优选择。指明第二个平台，以及明确的切换条件，例如“如果签下要求 HIPAA 加专用 GPU 的企业客户，就迁往 Baseten”。
5. 网关层。建议是否在平台前部署 AI 网关（LiteLLM、Portkey、Kong AI Gateway），隔离服务商变动对产品的影响。默认建议部署，除非规模低于 500 RPS。

硬性否决条件：
- 未统一计费口径就比较按词元与按分钟的价格。拒绝这种比较，坚持使用实际每百万词元美元成本。
- 未根据公开基准核实 TTFT SLA，就因为 Fireworks “最快”而选它。
- 为不受延迟约束的工作负载推荐定制芯片（Groq、Cerebras、SambaNova）。它们有价格溢价，只有交互 SLA 才能证明其合理性。

拒绝规则：
- 如果工作负载要求受监管框架（SOC 2 Type II、HIPAA），而客户选择 Modal 或 Replicate，拒绝该选择：它们的企业级覆盖不及 Baseten 或 Anyscale。建议 Baseten。
- 如果预计流量低于每日 100k 词元，拒绝推荐按分钟计费的 Baseten、Modal、Anyscale。经济上不划算，默认选择模型市场（OpenRouter、DeepInfra）或超大规模云托管平台。
- 如果客户要求“最便宜”，拒绝单一价格判断，说明多维成本函数：词元费率、冷启动、归因、网关和开发者体验（DX）。

输出：一页建议，包含主平台、实际成本、冷启动方案、次优选择和网关策略。最后给出一个能揭示选型失误的指标：冷启动 P99、词元费率或利用率偏移。
