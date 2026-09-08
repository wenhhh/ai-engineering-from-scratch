# 有状态图编排：持久执行与检查点（Stateful Graph Orchestration — Durable Execution and Checkpoints）

> 智能体是状态机（State machine），节点是函数，边是转移，每个节点之后都保存状态检查点。任何失败都从最近成功的检查点恢复。LangGraph 是 2026 年这种底层有状态编排模型的参考实现。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 12（工作流模式，Workflow Patterns）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 描述 LangGraph 核心模型：带类型状态、函数节点、条件边和节点后检查点的状态机。
- 说出文档强调的四项能力：持久执行（Durable execution）、流式输出（Streaming）、人在回路（Human-in-the-loop）、全面记忆（Comprehensive memory）。
- 解释 LangGraph 支持的三种编排拓扑：监督者（Supervisor）、点对点群体（Peer-to-peer / Swarm）、分层（Hierarchical，嵌套子图）。
- 用标准库实现带类型状态、条件边和检查点保存、恢复循环的状态图。

## 问题（The Problem）

智能体和工作流有一个共同问题：40 步运行在第 38 步失败时，你希望从第 38 步恢复，而不是重头开始。不把状态放在核心位置的模型，迫使运维人员围绕假设每次都是全新运行的库，拼凑重试逻辑。

LangGraph 的设计回答是：状态是一等的带类型对象，变更显式发生，每个节点之后都持久化检查点。恢复就是一次 `load_state(session_id)` 调用。

## 概念（The Concept）

### 图（The graph）

图由以下内容定义：

- **状态类型（State type）。** 带类型字典或 Pydantic 模型，每个节点都读取并修改它。
- **节点（Nodes）。** 纯函数 `(state) -> state_update`。返回后，将更新合并到状态。
- **边（Edges）。** 节点之间的条件转移或直接转移。
- **入口与出口（Entry and exit）。** `START` 和 `END` 哨兵节点标记边界。

例如，一个智能体包含 `classify`、`refund`、`bug`、`sales`、`done` 节点，即以图表示的路由工作流。

### 持久执行（Durable execution）

每个节点返回后，运行时序列化状态，并写入检查点存储器（Checkpointer），可用 SQLite、Postgres、Redis 或自定义实现。第 N 步失败时，运行时可以调用 `resume(session_id)`，以精确状态从第 N+1 步继续。

LangGraph 文档特别指出这项能力对 Klarna、Uber、J.P. Morgan 等生产用户的重要性。主张不在于图的形态本身，而在于图加检查点使恢复成本降低。

### 流式输出（Streaming）

每个节点都可以产出部分输出。图将每节点增量事件流式传给调用者，使界面随图运行而更新。

### 人在回路（Human-in-the-loop）

在节点之间检查、修改状态。实现方式是：在关键节点前暂停，向人工展示状态，接受修改，再恢复。检查点存储器让这件事容易实现，因为状态已经序列化。

### 记忆（Memory）

短期记忆位于单次运行内，即状态中的对话历史；长期记忆跨运行，通过检查点存储器和独立长期存储持久化。LangGraph 通过工具集成外部记忆系统，如 Mem0 或自定义系统。

### 三种拓扑（Three topologies）

1. **监督者（Supervisor）。** 中央路由 LLM 分派给专门子智能体。使用 `langgraph-supervisor` 的 `create_supervisor()`，不过 LangChain 团队在 2026 年建议直接通过工具调用实现，以更好地掌控上下文。
2. **群体 / 点对点（Swarm / peer-to-peer）。** 智能体通过共享工具接口直接交接，没有中央路由器。
3. **分层（Hierarchical）。** 监督者管理子监督者，通过嵌套子图实现。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **检查点太小（Checkpoints too small）。** 只保存对话轮次，会使工具状态和记忆写入无法恢复。必须序列化完整状态。
- **非确定性节点（Non-deterministic nodes）。** 恢复假设节点输入产生相同状态更新。随机种子、墙上时钟和外部 API 必须被记录。
- **过度使用条件边（Over-use of conditional edges）。** 每条边都是条件边的图，是难以推断的状态机。优先采用线性链，只在必要时分支。

```figure
langgraph-state
```

## 动手实现（Build It）

`code/main.py` 实现标准库有状态图：

- `State`：带类型字典，包含 `messages`、`step`、`route`、`output`、`human_approval`。
- `Node`：接受状态、返回更新字典的可调用对象。
- `StateGraph`：节点 + 边 + 条件边 + 运行 + 恢复。
- `SQLiteCheckpointer`（内存模拟实现）：每个节点后序列化状态，`load(session_id)` 用于恢复。
- 演示图：分类 -> 分支（退款 / 缺陷 / 销售）-> 人工门禁 -> 发送。

运行：

```
python3 code/main.py
```

轨迹展示首次运行在人工门禁处失败、持久化，然后恢复并生成最终输出。

## 实际应用（Use It）

- **LangGraph**：可用于生产的参考实现。使用 `create_react_agent`、`create_supervisor` 或构建自己的图。
- **AutoGen v0.4**（第 14 课）：面向高并发场景的参与者模型（Actor model）替代方案。
- **Claude Agent SDK**（第 17 课）：带内置会话存储的托管执行框架（Harness）。
- **自定义（Custom）**：需要精确控制状态结构或检查点后端时。

## 交付成果（Ship It）

`outputs/skill-state-graph.md` 为任意目标运行时生成 LangGraph 式状态图，接好检查点保存和恢复。

## 练习（Exercises）

1. 添加从 `classify` 到 `end` 的条件边，在分类置信度低于阈值时选择它。人工手动设置 `route` 后恢复运行。
2. 将类 SQLite 模拟实现换成真实 SQLite 检查点存储器，测量每步序列化开销。
3. 实现并行边：两个节点并发运行，由自定义归约器（Reducer）合并。在这里，不可变状态有什么价值？
4. 阅读 `langgraph-supervisor` 参考文档。将玩具实现迁移到 `create_supervisor`，比较轨迹形态。
5. 添加流式输出：每个节点运行时产出部分状态，在增量到达时打印。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 状态图（State graph） | “智能体即状态机” | 带类型状态 + 节点 + 边 + 归约器 |
| 检查点存储器（Checkpointer） | “持久化后端” | 每个节点后序列化状态，支持恢复 |
| 归约器（Reducer） | “状态合并器” | 将当前状态与节点更新组合起来的函数 |
| 条件边（Conditional edge） | “分支” | 由状态函数选择的边 |
| 子图（Subgraph） | “嵌套图” | 在另一个图中充当节点的图 |
| 持久执行（Durable execution） | “从失败中恢复” | 以精确状态从最近成功节点重新开始 |
| 监督者（Supervisor） | “路由 LLM” | 专门子智能体的中央分派器 |
| 群体（Swarm） | “点对点智能体” | 通过共享工具交接，没有中央路由器 |

## 延伸阅读（Further Reading）

- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：参考文档。
- [langgraph-supervisor 参考文档（Reference）](https://reference.langchain.com/python/langgraph/supervisor/)：监督者模式 API。
- [AutoGen v0.4，Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)：参与者模型替代方案。
- [Claude Agent SDK 概览（Overview）](https://platform.claude.com/docs/en/agent-sdk/overview)：会话存储与子智能体。
