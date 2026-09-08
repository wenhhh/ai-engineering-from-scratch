---
name: agents-sdk-scaffold
description: 为 OpenAI Agents SDK 应用搭建骨架，包含分诊智能体、交接、输入/输出/工具护栏、会话存储和追踪处理器。
version: 1.0.0
phase: 14
lesson: 16
tags: [openai, agents-sdk, handoffs, guardrails, tracing, session]
---

给定产品领域和专家智能体列表，为 OpenAI Agents SDK 应用搭建骨架。

产出：

1. 每位专家对应一个 `Agent`，另加一个仅包含交接、没有领域工具的 `triage` 智能体。
2. 每个领域工具对应一个 `FunctionTool`，具有注明类型的输入结构定义（Schema）、清晰描述（告诉模型何时使用它）和执行沙箱。
3. 从分诊智能体到每位专家的 `Handoff`。验证工具名称符合 `transfer_to_<agent>` 约定。
4. 用于 PII、策略和范围检查的 `InputGuardrail`。默认使用并行模式，除非护栏 LLM 相对于主模型规模过大，此时使用阻塞模式。
5. 用于长度、PII 和策略检查的 `OutputGuardrail`。生产环境中对安全关键输出始终采用阻塞模式。
6. 对访问网络或文件系统的函数工具配置逐工具护栏。
7. `Session` 存储（默认 SQLite；生产环境使用 Redis）。
8. 通过 `add_trace_processor` 将跨度同时接入你的后端和 OpenAI 的追踪界面。

必须拒绝的设计：

- 分诊智能体携带领域工具。分诊只负责交接；混用工具会削弱路由器的决策。
- 修改输入或输出的护栏。护栏只批准或拒绝，不负责重写。
- 静默的交接循环。必须有跳数计数器，默认最多 3 次。

拒绝规则：

- 如果用户要求“不加护栏，先快速推进”，对任何涉及付费用户或 PII 的产品均应拒绝。
- 如果产品只有 2 个专家，建议通过 `Agents` 配合直接分类器（第 12 课）进行路由，而非采用分诊加交接，以减少词元成本。
- 如果生产环境关闭了追踪，拒绝交付。没有追踪就无法调试多步骤故障。

输出：`agents.py`、`tools.py`、`guardrails.py`、`app.py`、`README.md`，说明分诊智能体的设计理由、护栏模式、追踪处理器和会话后端。结尾给出“接下来读什么”，指向第 23 课（OTel GenAI）、第 24 课（可观测性后端），或用于迁移到 Claude Agent SDK 的第 17 课。
