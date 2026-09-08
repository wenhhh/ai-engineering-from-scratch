---
name: framework-picker
description: 将抽象与问题结构匹配，为智能体任务选择 LangGraph、CrewAI、AutoGen、Agno 或纯 Python。
version: 1.0.0
phase: 11
lesson: 17
tags: [langgraph, crewai, autogen, agno, agent-framework, orchestration, decision-matrix]
---

给定任务描述，包括问题结构、每次运行的 LLM 调用总数、分支模式、持久性与恢复需求、人类在环（Human-in-the-loop）检查点、并行扇出（Fanout）、会话记忆和预期每日运行量，输出：

1. 结构匹配（Shape match）。用一句话指出适合的抽象：图（类型化状态、命名转移）、组织架构图（专家角色、经理路由交接）、聊天（智能体聊到完成），或带工具的单智能体。如果无法选出一种，说明任务尚未整理成适合智能体的形式，应停止并拆解。
2. 分支决策权（Branching authority）。谁选择下一步：开发者（显式边）、经理 LLM（CrewAI 层级模式）、对话中涌现（AutoGen GroupChat），或工具调用自主路由（Agno）。如果适用，列明 LLM 选择路由的逐轮词元（Token）成本。
3. 状态需求（State budget）。确认是否需要重启后恢复、时间旅行（Time-travel）或人工中断。如果需要，LangGraph 凭借状态优先抽象胜出；Agno 仅覆盖会话范围的记忆。
4. 框架选择（Framework choice）。输出 langgraph、crewai、autogen、agno、plain_python 之一。附上一句话理由，将结构与状态方面的答案映射到框架的核心抽象。
5. 退出方案（Escape hatch）。如果每日运行量超过 10_000，或者任务没有状态且最多只有两次 LLM 调用，则改为推荐纯 Python 配合供应商 SDK。任务很小时，不使用框架就是最快的框架。

拒绝为具有已知有向无环图（DAG）的确定性工作流推荐 AutoGen；开发者本可静态连接发言顺序，GroupChatManager 却会消耗词元来选择发言者。CrewAI 确实通过 `output_pydantic` / `output_json` 支持结构化任务输出，参见 [CrewAI 任务文档](https://docs.crewai.com/en/concepts/tasks)，但其 `context` 通道仍通过下一个任务的提示词字符串传递。如果工作流没有接入上述任一输出模式，却依赖原始 `context` 跨任务携带结构化状态，就应反对使用 CrewAI。对于只调用两次的摘要器，应反对使用 LangGraph，因为 StateGraph 开销纯属额外负担。如果任务按归约器（Reducer）语义扇出到超过 4 个并行子工作者，应反对使用 Agno；Agno 提供 `Parallel` 块，其输出会合并为以步骤名为键的字典，参见 [Agno 工作流概览](https://docs-v1.agno.com/workflows_2/overview) 和 [Agno 访问先前步骤](https://docs.agno.com/workflows/access-previous-steps)，但它没有暴露可与 LangGraph 相比的 Send 式扇出与归约 API。

示例输入：“长时间运行的研究工作流：规划、扇出到三个检索器、综合信息、人工批准简报、撰写报告、引用来源。必须能在崩溃后恢复。计划用于生产，每天运行 50 次。”

示例输出：
- 结构：图。类型化计划、三个并行检索器、综合与写作之间的命名转移。
- 分支：开发者通过条件边决定。不在每轮使用经理 LLM。
- 状态：需要恢复和人工中断。必须使用 LangGraph。
- 框架：langgraph。State、Send 扇出、interrupt_before 和 PostgresSaver 都是一等能力。
- 退出方案：不适用。每日 50 次远低于纯 Python 阈值，而且工作流状态需求较多，不适合脱离框架。
