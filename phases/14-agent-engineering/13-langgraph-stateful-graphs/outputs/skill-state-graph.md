---
name: state-graph
description: 构建 LangGraph 式状态机（State machine），包含带类型状态、条件边、逐节点检查点和持久恢复。
version: 1.0.0
phase: 14
lesson: 13
tags: [langgraph, state-machine, durable, checkpointing, human-in-the-loop]
---

给定目标运行时、状态结构、一组节点函数和检查点后端，生成有状态智能体图。

请生成：

1. 带类型的 `State`，可以是字典或 Pydantic。记录每个字段。节点读取状态，返回更新。
2. `StateGraph`，包含 `add_node`、`add_edge`、`add_conditional_edges`、`set_entry`，以及 `START`/`END` 哨兵。
3. `Checkpointer` 接口，包含 `save(session_id, node, state)` 和 `load_latest(session_id)`。默认 SQLite，允许 Postgres、Redis 或自定义实现。
4. `Runner` 逐步遍历图，每个节点后序列化状态，捕获 `PausedAtNode` 来支持人在回路，并支持带可选 `state_override` 的 `resume_from`。
5. 三种拓扑辅助方法：监督者（Supervisor，中央路由器）、群体（Swarm，共享工具交接）、分层（Hierarchical，子图）。

严格禁止：

- 非确定性节点没有显式记录随机种子或墙上时钟。恢复假设给定输入状态可复现节点输出。
- 检查点只保存“摘要”状态。必须序列化完整状态，否则恢复会出错。
- 每条边都是条件边的图。优先采用线性链，偶尔添加分支。

拒绝规则：

- 用户要求无持久化的状态图时，应拒绝。核心目的就是持久恢复；不需要恢复时，使用第 12 课的工作流模式。
- 用户要求“仅在成功时保存检查点”时，应拒绝。失败也需要状态，调试正是从那里开始。
- 图超过约 30 个节点时，应拒绝平面布局，要求嵌套子图。平铺的 30 节点图无法有效评审。

输出：`state.py`、`graph.py`、`checkpointer.py`、`runner.py`、`README.md`，解释状态的结构定义（Schema）、检查点存储器选择和恢复语义。末尾添加“接下来读什么”：参与者模型替代方案指向第 14 课，交接与防护层指向第 16 课，图步骤上的 OTel 跨度指向第 23 课。
