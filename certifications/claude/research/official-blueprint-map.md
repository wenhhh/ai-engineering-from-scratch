# Claude 官方认证考试大纲映射（Official Claude Certification Blueprint Map）

> 供课程维护者使用的权威来源笔记。每次发布前都要重新核实。

**核实日期（Verified）：** 2026-08-09
**考试指南版本（Exam guide version）：** 1.0
**生效时间（Effective）：** 2026 年 7 月

## 官方指南（Official Guides）

- [CCAO-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542847%2FClaude+Certified+Associate+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCDV-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCAR-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)
- [CCAR-P 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf)

## 覆盖策略（Coverage Strategy）

仓库在提示词设计、结构化输出、上下文工程、评估、智能体、工具设计、MCP、安全、检索增强生成（RAG）、可观测性和生产运维方面已经具备扎实的基础。认证部分承担阶段课程不应承担的三项工作：

1. 将每个主题表述为考试风格约束下的大纲决策。
2. 补齐 Claude 专属产品、API、配置和生命周期方面的缺口。
3. 组织角色专属综合实践（Capstone）和加权评估。

现有课程中发现的最重要缺口包括：

- Claude 聊天、研究、Projects、Artifacts 及项目知识维护。
- 连贯的 Messages API 状态机，包括内容块、停止原因、工具续接、流式传输、思考、缓存和批处理权衡。
- Claude Code 配置优先级、规则（Rules）、技能（Skills）、命令（Commands）、智能体（Agents）、记忆、无界面执行和持续集成（CI）工作流。
- 业务探索、利益相关者沟通、架构论证、实施交接和运维责任归属。

第二轮对照当前 Anthropic Academy 目录的复核，在不改变公开大纲的前提下，加深了产品形态方面的内容：

- 直接使用 Claude、Amazon Bedrock、Google Vertex AI 和 Microsoft Foundry 的部署决策。
- SDK、REST、流式、异步、多模态、Files API、Tool Runner 和托管智能体的访问模式。
- MCP 高级采样（Sampling）、根目录（Roots）、通知、Inspector、Streamable HTTP，以及有状态与无状态部署决策。
- 当前 Claude Code 的操作控制、真实技能编写、子智能体契约和团队分发。
- 针对下一词元预测、知识、工作记忆和可引导性（Steerability）的四属性诊断。

## 现有深入课程（Existing Deep Dives）

使用以下课程，不重复其从零实现的教学内容：

| 能力（Capability） | 现有课程路径（Existing lesson paths） |
|------------|-----------------------|
| 提示词设计与少样本推理（Prompting and few-shot reasoning） | `phases/11-llm-engineering/01-prompt-engineering`, `phases/11-llm-engineering/02-few-shot-cot` |
| 结构化输出（Structured outputs） | `phases/11-llm-engineering/03-structured-outputs`, `phases/13-tools-and-protocols/04-structured-output` |
| 上下文与缓存（Context and caching） | `phases/11-llm-engineering/05-context-engineering`, `phases/11-llm-engineering/11-caching-cost`, `phases/11-llm-engineering/15-prompt-caching` |
| 评估（Evaluation） | `phases/11-llm-engineering/10-evaluation`, `phases/14-agent-engineering/30-eval-driven-agent-development` |
| 智能体循环与编排（Agent loops and orchestration） | `phases/14-agent-engineering/01-the-agent-loop`, `phases/14-agent-engineering/12-anthropic-workflow-patterns`, `phases/14-agent-engineering/28-orchestration-patterns` |
| Claude Agent SDK | `phases/14-agent-engineering/17-claude-agent-sdk` |
| 工具与 MCP 设计（Tool and MCP design） | `phases/13-tools-and-protocols/01-the-tool-interface`, `phases/13-tools-and-protocols/05-tool-schema-design`, `phases/13-tools-and-protocols/06-mcp-fundamentals`, `phases/13-tools-and-protocols/07-building-an-mcp-server`, `phases/13-tools-and-protocols/11-mcp-sampling`, `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation` |
| 安全与审批（Security and approvals） | `phases/14-agent-engineering/27-prompt-injection-defense`, `phases/15-autonomous-systems/10-claude-code-permission-modes`, `phases/17-infrastructure-and-production/25-security-secrets-audit` |
| 检索增强生成与检索（RAG and retrieval） | `phases/11-llm-engineering/06-rag`, `phases/11-llm-engineering/07-advanced-rag`, `phases/19-capstone-projects/65-hybrid-retrieval-bm25-dense` |
| 可观测性与运维（Observability and operations） | `phases/17-infrastructure-and-production/13-llm-observability`, `phases/17-infrastructure-and-production/23-sre-for-ai`, `phases/17-infrastructure-and-production/27-finops-llms` |

## 各路径重点（Track Emphasis）

### CCAO-F

权重最高的领域是输出评估与验证，占 21%。因此，这条路线在事实核查、偏差检查、受众适配、格式选择和人工审核上花费的时间多于提示词语法。

### CCDV-F

应用与集成（Applications and Integration）占 33.1%。该路线以协议为先，关注 Messages API 状态、应用边界、SDK 与 REST 行为、会话卫生、配置、工具以及生产故障隔离。

### CCAR-F

考试围绕真实场景组织。路线教授一种可在六种公开场景背景中重复使用的决策方法，其中最多时间用于智能体式架构与编排（Agentic Architecture and Orchestration），该领域占 27%。

### CCAR-P

集成（Integration）是占比最大的单一领域，为 19%，但专业级考试覆盖整个生命周期。课程将需求探索、架构、提示词设计、RAG、评估、安全、利益相关者沟通、Claude Code 应用支持及运维责任联系起来，而不是将其视为孤立事实。
