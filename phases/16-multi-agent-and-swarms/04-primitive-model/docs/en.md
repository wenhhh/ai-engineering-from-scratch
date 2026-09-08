# 多智能体原语模型（The Multi-Agent Primitive Model）

> 只有四种原语（Primitive）：智能体（Agent）、交接（Handoff）、共享状态（Shared state）和编排者（Orchestrator）。它们张成四维设计空间，2026 年推出的主要多智能体框架（AutoGen、LangGraph、CrewAI、OpenAI Agents SDK、Microsoft Agent Framework）都是其中的点。本课从零构建四者，用它们运行一个简化系统，再把所有主要框架映射到相同坐标轴，让你用一段话读懂任何新版本。

**Type:** Learn
**Languages:** Python (stdlib)
**Prerequisites:** Phase 14 智能体工程（Agent Engineering）, Phase 16 · 01 为什么使用多智能体（Why Multi-Agent）
**Time:** ~60 分钟

## 问题（Problem）

每隔六个月就有新的多智能体框架发布：2023 年的 AutoGen，2024 年的 CrewAI，2024 年的 LangGraph 和 OpenAI Swarm，2025 年 4 月的 Google ADK，2026 年 2 月的 Microsoft Agent Framework RC。每份新闻稿都宣称自己是“正确的抽象”。

逐个学习会让你疲于奔命。API 看起来不同，文档对“智能体”的定义也不一致。一个框架把共享内存叫作“黑板（Blackboard）”，另一个叫“消息池（Message pool）”，第三个叫“StateGraph”。你开始怀疑这个领域只是在反复折腾。

并非如此。营销表象之下，四种原语是稳定的。学会一次，就能用一段话读懂每个新框架。

## 概念（Concept）

### 四种原语（The four primitives）

1. **智能体（Agent）**：系统提示词加工具列表。无状态；每次运行从系统提示词和当前消息历史开始。
2. **交接（Handoff）**：控制权从一个智能体向另一个的结构化转移。机制上，它是返回新智能体的工具调用，或按条件跳转的图边。
3. **共享状态（Shared state）**：可供多个智能体读取（有时写入）的任意数据结构，如消息池、黑板、键值存储、向量记忆。
4. **编排者（Orchestrator）**：决定下一位发言者的一方。可选显式图（确定性）、LLM 发言者选择器（柔性）、上一位发言者的交接调用（OpenAI Swarm），或队列调度器（群体架构）。

这就是整个设计空间。每个框架为各坐标轴选择默认值，其余只是表面语法。

### 2026 年框架如何映射到原语（How every 2026 framework maps to it）

| 框架 | 智能体 | 交接 | 共享状态 | 编排者 |
|-----------|-------|---------|--------------|--------------|
| OpenAI Swarm / Agents SDK | `Agent(instructions, tools)` | 工具返回 Agent | 调用者负责 | LLM 的下一次交接调用 |
| AutoGen v0.4 / AG2 | `ConversableAgent` | GroupChat 中的发言者选择器 | 消息池 | 选择函数（LLM 或轮询） |
| CrewAI | `Agent(role, goal, backstory)` | `Process.Sequential / Hierarchical` | 串联 Task 输出 | 管理者 LLM 或静态顺序 |
| LangGraph | 节点函数 | 图边 + 条件 | `StateGraph` 归约器（Reducer） | 图本身，确定性 |
| Microsoft Agent Framework | 智能体 + 编排模式 | 依模式而定 | 线程 / 上下文 | 依模式而定 |
| Google ADK | 智能体 + A2A 卡片 | A2A 任务 | A2A 交付物 | 宿主决定 |

表面差异看起来很大，底层却是同样四个调节维度。

### 为什么重要（Why this matters）

看清原语后，框架比较就变成简短清单：

- 编排者信任 LLM 路由（Swarm），还是在代码中固定路由（LangGraph）？
- 共享状态包含完整历史（GroupChat），还是投影视图（StateGraph 归约器）？
- 智能体能修改彼此提示词（CrewAI 管理者），还是只能交接（Swarm）？

这三个问题能解决给定问题选框架时 80% 的判断。你不再寻找“最好的多智能体框架”，而开始围绕真正关心的坐标轴设计。

### 无状态的洞见（The stateless insight）

除共享状态外，每种原语都无状态。智能体是（提示词、工具）的函数，交接是函数调用，编排者是调度器。**系统中唯一有状态的事物就是共享状态。** 所有值得关注的缺陷都在这里：记忆投毒（Memory poisoning，第 15 课）、消息排序、版本管理、写入争用。

隐藏共享状态的框架（Swarm）把问题推给调用者。将其集中的框架（LangGraph 检查点、AutoGen 消息池）使状态可检查，但把协调成本转移给共享状态实现。

### 单个原语的剖析（Anatomy of a single primitive）

#### 智能体（Agent）

```
Agent = (system_prompt, tools, model, optional_name)
```

没有记忆，没有状态。系统提示词和工具相同的两个智能体可以互换。看似属于每个智能体的状态，实际都在共享状态或交接协议中。

#### 交接（Handoff）

```
Handoff = (from_agent, to_agent, reason, payload)
```

三种实现占主导：

- **函数返回（Function return）**：工具返回下一个智能体。这是 OpenAI Swarm 模式，智能体在工具模式中携带路由。
- **图边（Graph edge）**：LangGraph。边是声明式的，LLM 产出一个值，条件据此选择下一节点。
- **发言者选择（Speaker selection）**：AutoGen GroupChat。选择函数（有时本身就是 LLM 调用）读取消息池，选择下一位发言者。

#### 共享状态（Shared state）

```
SharedState = { messages: [], artifacts: {}, context: {} }
```

至少包含消息列表，通常还包括结构化交付物（CrewAI Task 输出）、类型化上下文（LangGraph 归约器）和外部记忆（MCP、向量数据库）。

有两种拓扑：**完整消息池（Full pool）**，每个智能体看到所有消息；**投影（Projected）**，智能体看到限定角色范围的视图。完整消息池简单但扩展性差。投影消息池能扩展，却需要事先设计模式。

#### 编排者（Orchestrator）

```
Orchestrator = ({state, last_speaker}) -> next_agent
```

四种形式：

- **静态（Static）**：图在构建时固定（LangGraph 确定性模式、CrewAI Sequential）。
- **LLM 选择（LLM-selected）**：LLM 读取消息池并选择下一位发言者（AutoGen、CrewAI Hierarchical）。
- **交接驱动（Handoff-driven）**：当前智能体调用交接工具作出决定（Swarm）。
- **队列驱动（Queue-driven）**：工作者从共享队列拉取任务，没有显式的下一位发言者（群体架构、Matrix）。

### 框架间的变化（What changes between frameworks）

原语确定后，其余设计决策是：

- **记忆策略（Memory strategy）**：临时状态还是持久检查点（LangGraph 检查点保存器）。
- **安全边界（Safety boundary）**：谁能批准交接（人在回路，Human-in-the-loop）。
- **成本核算（Cost accounting）**：每个智能体的词元预算。
- **可观测性（Observability）**：追踪交接，持久化状态以便重放。

这些都可以在原语之上实现，没有一种是新原语。

```figure
a5-primitive-radar
```

## 动手实现（Build It）

`code/main.py` 用约 150 行标准库 Python 实现四种原语。没有真实 LLM；每个智能体都是脚本化策略，让重点保持在协调结构上。

文件导出：

- `Agent`：包含名称、系统提示词、工具、策略函数的数据类。
- `Handoff`：返回新智能体的函数。
- `SharedState`：线程安全消息池。
- `Orchestrator`：三种变体，即 `StaticOrchestrator`、`HandoffOrchestrator`、`LLMSelectorOrchestrator`（模拟）。

演示用三种编排者运行同一条三智能体流水线（研究 → 写作 → 评审），最后打印消息池。可以看到，输出差异仅在于*谁选择下一位*；各次运行的智能体与共享状态完全相同。

运行：

```
python3 code/main.py
```

预期输出：三次编排者运行，每种模式一次，各自打印最终消息池。交接驱动模式下，若研究员决定提前结束，就会触及更少智能体；这是 LLM 路由权衡的缩影。

## 实际应用（Use It）

`outputs/skill-primitive-mapper.md` 是读取任意多智能体代码库或框架文档并返回四原语映射的技能。在新框架发布时运行它，先用一段话建立理解，再深入阅读文档。

## 交付成果（Ship It）

采用新框架之前，写出它的原语映射。若写不出来，要么文档不完整，要么框架正在发明第五种原语（很少见，先检查是否只是未见过的共享状态变体）。

把映射固定在架构文档中。新成员加入时，先发映射，再发 API 文档。框架升级时，对比映射，而非变更日志。

## 练习（Exercises）

1. 使用不同智能体策略运行 `code/main.py` 三次，观察编排者选择如何改变哪些智能体会运行。
2. 实现第四种编排者：智能体轮询共享状态领取工作的队列驱动模式。可能发生什么死锁，如何检测？
3. 将 LangGraph 快速入门（https://docs.langchain.com/oss/python/langgraph/workflows-agents）重写为四原语形式。哪些 LangGraph 抽象一一对应，哪些是便捷包装？
4. 阅读 OpenAI Swarm 示例指南（https://developers.openai.com/cookbook/examples/orchestrating_agents）。指出 Swarm 让哪种原语最易使用，哪种又推给调用者。
5. 在表格中找到一个完全隐藏共享状态的框架。说明智能体需要跨交接协调、却不能重新读取历史时会出现什么问题。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 智能体（Agent） | “带工具的 LLM” | `(system_prompt, tools, model)` 三元组，无状态。 |
| 交接（Handoff） | “控制权转移” | 指明下一智能体和可选有效载荷的结构化调用。三种实现：函数返回、图边、发言者选择。 |
| 共享状态（Shared state） | “记忆”/“上下文” | 多智能体系统唯一有状态的部分，即消息池或黑板。 |
| 编排者（Orchestrator） | “协调者” | 决定谁接着运行的一方：静态图、LLM 选择器、交接驱动或队列驱动。 |
| 原语（Primitive） | “抽象” | 每个框架参数化的四个维度之一，不是框架特性。 |
| 消息池（Message pool） | “共享聊天历史” | 保存完整历史的共享状态，易理解但扩展性差。 |
| 投影状态（Projected state） | “限定范围的视图” | 共享状态中面向特定角色的视图。可扩展，需要模式设计。 |
| 发言者选择（Speaker selection） | “谁接着说” | 由函数（通常为 LLM）从群组中选出下一智能体的编排模式。 |

## 延伸阅读（Further Reading）

- [OpenAI 示例指南：编排智能体，例程与交接（Orchestrating Agents — Routines and Handoffs）](https://developers.openai.com/cookbook/examples/orchestrating_agents)：对交接驱动编排最清晰的阐述
- [AutoGen 稳定版文档（AutoGen stable docs）](https://microsoft.github.io/autogen/stable/)：GroupChat + 发言者选择是 LLM 选择式编排的参考
- [LangGraph 工作流与智能体（LangGraph workflows and agents）](https://docs.langchain.com/oss/python/langgraph/workflows-agents)：图边编排与基于归约器的共享状态
- [CrewAI 简介（CrewAI introduction）](https://docs.crewai.com/en/introduction)：角色、目标、背景故事智能体，Sequential / Hierarchical 流程
- [AG2，社区延续的 AutoGen（community AutoGen continuation）](https://github.com/ag2ai/ag2)：Microsoft 将 v0.4 转入维护后仍活跃的 AutoGen v0.2 谱系
