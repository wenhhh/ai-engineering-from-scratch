# 智能体的参与者模型：异步消息与带类型运行时（The Actor Model for Agents — Async Messages and Typed Runtimes）

> 将智能体视为参与者（Actor）：异步消息交换、事件驱动处理器、故障隔离和自然并发。AutoGen v0.4（Microsoft Research，2025 年 1 月）围绕这一模型重新设计智能体编排；该框架现处于维护模式，Microsoft Agent Framework（2025 年 10 月公开预览）是其生产继任者。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 12（工作流模式，Workflow Patterns）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 描述参与者模型（Actor model）：智能体即参与者，消息是唯一进程间通信（IPC）方式，每个参与者单独隔离故障。
- 说出 AutoGen v0.4 的三个 API 层：Core、AgentChat、Extensions，以及各自用途。
- 解释为什么将消息投递与处理解耦，可以提供故障隔离和自然并发。
- 用 Python 标准库实现参与者运行时，并将双智能体代码评审流程迁移到它之上。

## 问题（The Problem）

大多数智能体框架是同步的：一个智能体生产，另一个消费，都在调用栈中。失败会使调用栈崩溃，并发是事后附加的，分布式部署需要重写。

AutoGen v0.4 的回答是参与者模型。每个智能体都是拥有私有收件箱的参与者。消息是唯一交互方式，运行时将投递与处理解耦。故障隔离到单个参与者，并发是原生能力，分布式部署只是换一种传输方式。

## 概念（The Concept）

### 参与者（Actors）

参与者拥有：

- 私有状态，外部绝不能直接访问。
- 收件箱（Inbox），即消息队列。
- 处理器：`receive(message) -> effects`，效果可以是“回复”“发送给其他参与者”“创建新参与者”“更新状态”“停止自身”。

两个参与者不能共享内存，只能发送消息。

### 三个 API 层（Three API layers）

AutoGen v0.4 将接口分为三层：

1. **Core。** 底层参与者框架，包含 `AgentRuntime`、`Agent`、`Message`、`Topic`。异步消息交换，事件驱动。
2. **AgentChat。** 任务驱动的高层 API，替代 v0.2 的 ConversableAgent。包含 `AssistantAgent`、`UserProxyAgent`、`RoundRobinGroupChat`、`SelectorGroupChat`。
3. **Extensions。** 集成层，包括 OpenAI、Anthropic、Azure、工具和记忆。

### 为什么解耦重要（Why decoupling matters）

在 v0.2 模型中，调用 `agent_a.chat(agent_b)` 会同步阻塞 agent_a，直到 agent_b 返回。在 v0.4 中，`send(agent_b, msg)` 将消息放入 agent_b 的收件箱后立即返回，运行时稍后投递。这带来三个结果：

- **故障隔离（Fault isolation）。** 智能体 B 崩溃不会使智能体 A 崩溃；运行时捕获 B 处理器的失败，再决定如何处理，如记录、重试、送入死信队列。
- **自然并发（Natural concurrency）。** 同时有多条消息在途，不同参与者并发处理各自收件箱。
- **适合分布式（Distribution-ready）。** 不管参与者在同一进程内还是另一台主机上，收件箱 + 传输都是相同抽象。

### 拓扑（Topologies）

- **RoundRobinGroupChat。** 智能体按固定顺序轮流执行。
- **SelectorGroupChat。** 选择器智能体根据对话上下文决定下一位执行者。
- **Magentic-One。** 面向网页浏览、代码执行、文件处理的参考多智能体团队，建立在 AgentChat 之上。

### 可观测性（Observability）

内置 OpenTelemetry 支持。每条消息输出一个跨度（Span），工具调用按照 2026 年 OTel GenAI 语义约定（第 23 课）携带 `gen_ai.*` 属性。

### 状态：维护模式（Status: maintenance mode）

2026 年初，AutoGen v0.7.x 已稳定，可用于研究和原型。Microsoft 已将开发重心转向面向生产的后续产品 Microsoft Agent Framework。后者于 2025 年 10 月 1 日公开预览，1.0 正式发布（GA）原计划在 2026 年第一季度末。AutoGen 模式可直接迁移到后续产品，参与者模型是能够长期沿用的核心思想。

```figure
actor-mailbox
```

## 动手实现（Build It）

`code/main.py` 实现标准库参与者运行时：

- `Message`：带类型载荷，包含 `sender`、`recipient`、`topic`、`body`。
- `Actor`：带 `receive(message, runtime)` 的抽象类。
- `Runtime`：包含共享队列、投递、故障隔离的事件循环。
- 双参与者演示：`ReviewerAgent` 评审代码，`ChecklistAgent` 运行检查清单；两者交换消息直到达成共识。

运行：

```
python3 code/main.py
```

轨迹展示消息投递、一个参与者发生模拟故障而另一个不崩溃，以及双方收敛到共同结论。

## 实际应用（Use It）

- **AutoGen v0.4/v0.7**（维护中）：稳定支持研究、原型和多智能体模式。
- **Microsoft Agent Framework**：生产继任者，2025 年 10 月公开预览；在更新的 API 中使用相同参与者模型思想。
- **LangGraph 群体拓扑（Swarm topology）**（第 13 课）：通过共享工具交接实现类似模式。
- **自定义参与者运行时（Custom actor runtime）**：需要特定传输时，如 NATS、RabbitMQ、gRPC。

## 交付成果（Ship It）

`outputs/skill-actor-runtime.md` 为给定多智能体任务生成最小参与者运行时和团队模板，可选 RoundRobin 或 Selector。

## 练习（Exercises）

1. 添加死信队列（Dead-letter queue，DLQ）：处理器抛出异常时，将失败消息暂存，供人工检查。玩具示例中命中 DLQ 的频率是多少？
2. 实现 `SelectorGroupChat`：选择器参与者根据对话状态选择谁处理下一条消息。
3. 添加分布式传输：用 JSON-over-HTTP 服务器替换进程内队列，使参与者可在不同进程运行。
4. 为每条消息接入 OTel 跨度，或无操作替代实现。按照第 23 课输出 `gen_ai.agent.name`、`gen_ai.operation.name`。
5. 阅读 AutoGen v0.4 架构文章。将玩具实现迁移到真实 `autogen_core` API。你省略了哪些对生产重要的内容？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 参与者（Actor） | “智能体” | 私有状态 + 收件箱 + 处理器，没有共享内存 |
| 消息（Message） | “事件” | 带类型载荷，是参与者唯一交互方式 |
| 收件箱（Inbox） | “邮箱” | 每参与者的待处理消息队列 |
| 运行时（Runtime） | “智能体宿主” | 路由消息并隔离故障的事件循环 |
| 主题（Topic） | “通道” | 参与者间命名的发布订阅路由 |
| 故障隔离（Fault isolation） | “让它崩溃” | 单个参与者失败不会使其他参与者崩溃 |
| RoundRobinGroupChat | “固定轮转团队” | 智能体按顺序轮流执行 |
| SelectorGroupChat | “上下文路由团队” | 选择器决定下一位执行者 |
| Magentic-One | “参考团队” | 面向网页、代码、文件的多智能体团队 |

## 延伸阅读（Further Reading）

- [AutoGen v0.4，Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)：重新设计文章。
- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：图形态的替代方案。
- [OpenTelemetry GenAI 语义约定（Semantic conventions）](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：AutoGen 默认输出的跨度。
