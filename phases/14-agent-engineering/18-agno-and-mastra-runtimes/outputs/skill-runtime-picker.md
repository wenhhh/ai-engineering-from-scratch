---
name: runtime-picker
description: 根据技术栈、延迟预算和运维形态选择生产智能体运行时（Agno、Mastra、LangGraph、提供商 SDK）。
version: 1.0.0
phase: 14
lesson: 18
tags: [agno, mastra, langgraph, runtime, selection]
---

给定技术栈、延迟预算、所需基本构件和运维形态，选择一个运行时。

决策：

1. Python + FastAPI + 每秒数千个短生命周期智能体 -> **Agno**。
2. TypeScript + Next.js/Vercel + 统一多提供商接入 -> **Mastra**。
3. 持久状态、显式图、故障后恢复 -> **LangGraph**（第 13 课）。
4. 以 Claude 为主的产品，希望采用 Claude Code 执行框架（Harness）的形式 -> **Claude Agent SDK**（第 17 课）。
5. 以 OpenAI 为主的产品，需要交接、护栏和追踪 -> **OpenAI Agents SDK**（第 16 课）。
6. 多智能体团队、参与者模型（Actor model）并发、故障隔离 -> **AutoGen v0.4** / **Microsoft Agent Framework**（第 14 课）。
7. 基于角色的协作或事件驱动的确定性工作流 -> **CrewAI** Crew 或 Flow（第 15 课）。
8. 以上都不适用 -> 直接 API 调用 + 第 01 课的标准库循环。

产出：

- 简短决策文档：技术栈、延迟目标、所需基本构件、观察到的取舍。
- 所选运行时的最小骨架。
- 如果当前已使用其他运行时，给出迁移计划。

必须拒绝的设计：

- 工作负载每个请求只有一次缓慢调用，却纯粹根据“性能”选择 Agno 或 Mastra。性能很少是此时的瓶颈。
- 在 Python 单体仓库中无理由引入 TypeScript 运行时。混合语言的智能体代码会增加运维负担。
- 为无状态短任务选择 LangGraph。检查点存储器增加的开销，可以通过简单工作流（第 12 课）避免。

拒绝规则：

- 如果用户要求“五个运行时全上，比较一下”，应拒绝。应在自身工作负载上做基准测试；框架厂商的基准仅能提供方向。
- 如果用户想自托管 Mastra 的 `ee/` 功能，应拒绝，并指向许可证条款。
- 如果产品需要持续数小时到数天的长时间异步工作，拒绝自托管，转向 Claude Managed Agents 或基于队列的架构（第 29 课）。

输出：决策文档 + 骨架 + README。结尾给出“接下来读什么”，指向第 24 课（可观测性）和第 29 课（生产运行时），了解框架之上的运维层。
