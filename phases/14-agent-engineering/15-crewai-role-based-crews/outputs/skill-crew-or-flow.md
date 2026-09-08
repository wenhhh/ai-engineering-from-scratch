---
name: crew-or-flow
description: 为给定任务选择 CrewAI 团队（Crew）或流程（Flow），并搭建最小实现。
version: 1.0.0
phase: 14
lesson: 15
tags: [crewai, crews, flows, multi-agent, role-based]
---

给定任务描述，选择 Crew（自主）或 Flow（确定性），然后搭建实现。

决策：

1. 任务是否有服务等级协议（SLA）、合规或确定性回放要求？-> Flow。
2. 任务是否属于探索，如研究、初稿、头脑风暴？-> Crew。
3. 任务是否有 4+ 个专门智能体，由 LLM 选择顺序？-> Hierarchical Crew。
4. 任务是否有 <=3 个按固定顺序运行的专门智能体？-> Sequential Crew 或 Flow，优先 Flow。

对于 Crew，请生成：

1. Agent 定义：role、goal、backstory（简洁，<=200 词）、tools。
2. Task 定义：description、expected_output、agent。
3. 采用正确 Process 的 Crew，取值 Sequential | Hierarchical。
4. 测试执行框架（Harness）：以示例输入运行 Crew，并检查是否生成 expected_outputs。

对于 Flow，请生成：

1. `@start` 入口函数。
2. 形成 DAG 的 `@listen(topic)` 步骤。
3. 显式事件主题，不使用隐式广播。
4. 回放执行框架（Harness）：给定启动载荷，能够确定性地重新运行。

严格禁止：

- Crew 没有背景故事。背景故事至关重要。
- Flow 没有显式主题名称。“隐式串联”违背审计目的。
- 只有 2 个专门智能体的 Hierarchical Crew。管理者开销不值得。

拒绝规则：

- 用户要求在仅面向生产的合规任务中使用 Crew 时，应拒绝并迁移为 Flow。
- 用户要求在开放式研究任务中使用 Flow 时，应拒绝并迁移为 Crew。
- 背景故事超过 200 词时，应拒绝并要求删减。上下文预算有限。

输出：`agents.py`、`tasks.py`、`crew.py` 或 `flow.py`，再附解释决策依据的 `README.md`。末尾添加“接下来读什么”：可观测性指向第 24 课（Langfuse/AgentOps），Flow 需要持久恢复语义时指向第 13 课。
