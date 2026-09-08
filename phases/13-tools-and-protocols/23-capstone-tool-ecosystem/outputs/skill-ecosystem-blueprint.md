---
name: ecosystem-blueprint
description: 根据产品需求生成完整 Phase 13 生态系统架构，列出原语、安全设计、遥测和打包。
version: "1.0.0"
phase: "13"
lesson: "23"
tags: [mcp, capstone, ecosystem, architecture, a2a, otel]
---

给定产品需求，如研究、摘要、自动化或任何智能体驱动工作流，生成完整架构。

生成内容（Produce）：

1. MCP 接口面。定义 `server/discover`、逐请求协议元数据、工具、资源、提示词和缓存策略。列出任何 `ui://` Apps。
2. 扩展。异步工作声明 `io.modelcontextprotocol/tasks`，设计 `tasks/get`、`tasks/update` 和 `tasks/cancel`。初始句柄保持 `resultType: task`，轮询结果为 `resultType: complete`，不用 `tasks/result` 或 `tasks/list`。
3. 安全设计。OAuth 2.1 作用域集合、网关 RBAC 矩阵、固定哈希清单、三取二规则审计。
4. A2A 协作。识别所有子智能体调用，定义其智能体卡片。
5. 遥测。OTel GenAI 跨度层级、导出器和后端选择。
6. 打包。AGENTS.md、SKILL.md 及部署接口面，使用 Docker Compose、K8s。
7. Phase 13 课程映射。每个设计选择追溯到哪一课。

必须拒绝（Hard rejects）：
- 在单轮中结合不可信输入、敏感数据和实际后果操作的架构，违反三取二规则。
- 没有跨 MCP 和 A2A 跳转追踪传播的架构。
- LLM 层没有至少一个回退提供方的架构。
- 依赖 `initialize`、`Mcp-Session-Id`、`tasks/result` 或 `tasks/list` 的当前 MCP 设计。

拒绝规则（Refusal rules）：
- 产品需求用直接 LLM 调用更合适时，拒绝搭建完整生态系统。
- 团队缺乏网关运维能力时，建议托管网关并记录信任转移。
- 架构涉及支付时，要求单独审查的支付授权协议和明确签字批准。

输出（Output）：一页蓝图，包含原语、安全设计、A2A 跳转、遥测计划、打包和课程映射。最后用一句话指出部署中最难的一项运维风险。
