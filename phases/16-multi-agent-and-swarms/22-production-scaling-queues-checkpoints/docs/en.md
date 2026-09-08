# 生产扩展：队列、检查点与持久性（Production Scaling — Queues, Checkpoints, Durability）

> 将多智能体系统扩展到数千个并发运行，需要**持久化执行（durable execution）**：工作队列加检查点，使任何工作进程都能在任何崩溃后恢复任何运行，前提是具备租约处理、幂等副作用和确定性重放。LangGraph 运行时是参考案例：每个超步之后，按 `thread_id` 写入检查点（默认使用 Postgres）；工作进程崩溃会释放租约，由另一个工作进程恢复。智能体可以无限期休眠，等待人工输入。**MegaAgent**（arXiv:2408.09955）为每个智能体运行生产者消费者队列，具有三种状态（Idle / Processing / Response）和两层协调（组内聊天 + 组间管理员聊天）。对于 LLM 流式输出，**纤程 / 异步（Fiber/async）**优于每任务一线程：线程 99% 的时间空闲等待 token，纤程在 I/O 时协作式让出执行权。相反观点：Ashpreet Bedi 的“Scaling Agentic Software”主张，在负载证明需要更多组件前，只用 **FastAPI + Postgres，不加其他东西**；简单架构能走得比预想更远。本课构建持久化检查点日志、具有状态转换的逐智能体工作队列、异步与线程对比演示，并落实“从简单开始”的实用原则。

**Type:** Learn + Build
**Languages:** Python (stdlib, `asyncio`, `sqlite3`)
**Prerequisites:** Phase 16 · 09 并行群体网络（Parallel Swarm Networks）, Phase 16 · 13 共享记忆（Shared Memory）
**Time:** ~75 分钟

## 问题（Problem）

多智能体原型在一台笔记本上运行，三个智能体共用内存事件循环。转到生产环境后：

- 智能体有时运行数小时（长期研究、人在回路中的等待）。
- 工作进程会崩溃，重启丢失状态。
- 峰值负载是平均值的 10 倍，需要水平扩展。
- 用户按智能体运行付费，收费需要恰好一次语义。

内存事件循环无法处理以上任何问题。你需要底层持久化执行层。2026 年的典型选择是：

1. 带检查点的工作流引擎（Temporal、LangGraph 运行时）。
2. 带状态存储的消息队列（Postgres + SQS/RabbitMQ）。
3. 行动者模型框架（MegaAgent 为每个智能体设置生产者消费者）。
4. 自行搭建 FastAPI + Postgres（Bedi 的主张）。

本课构建每种方案的微型版本。

## 概念（Concept）

### 持久化执行模式（Durable execution, the pattern）

持久化执行引擎在每个“步骤”（LangGraph 称为超步）后持久化完整程序状态。崩溃时：

```
工作进程在步骤中途崩溃
  -> 租约超时
  -> 另一个工作进程接手 thread_id
  -> 从最后的检查点恢复
  -> 不产生重复副作用
```

成立条件：

- **可序列化状态（Serializable state）。**所有智能体状态都必须可持久化。带有活动数据库连接的函数闭包无法保存后恢复。
- **确定性恢复（Deterministic resume）。**给定相同状态和输入，智能体产生相同行动（或将 LLM 调用交给外部确定性预言机）。
- **幂等副作用（Idempotent side effects）。**外部调用（工具调用、支付）必须幂等，或使用去重键。

LangGraph 在每个超步后写检查点；Temporal 在每个活动后写入；Restate 使用事件溯源日志。三者实现同一模式。

### 每步检查点运行时（A checkpoint-per-step runtime）

以 LangGraph 运行时为例：每个智能体有一个 `thread_id`；状态是带类型的字典；每个超步向检查点表写一行。恢复时，从最后的检查点重放，而非从头开始。智能体可用 `interrupt()` 等待人工输入；运行时持久化状态并释放工作进程。输入到达后，任何工作进程都能恢复。

这是 2026 年 4 月的参考生产设计。

### MegaAgent 的逐智能体队列（MegaAgent's per-agent queue）

arXiv:2408.09955 描述了一个规模实验：单个集群内数千个并发智能体。架构如下：

```
智能体 i：
  state ∈ {Idle, Processing, Response}
  in_queue   <- 发给智能体 i 的消息
  out_queue  -> 回复 + 副作用

协调者：
  组内聊天（同组智能体）
  组间管理员聊天（高层路由）
```

两层协调使组内对话保持密集，组间对话保持稀疏，这是在数千智能体规模下维持线性成本的模式。

### 异步与每任务一线程（Async vs thread-per-job）

LLM 调用受 I/O 限制。等待下一个 token 的线程 99% 的时间处于空闲。每个线程约占 1MB 内存；10,000 个并发调用，仅栈就需要 10GB。

纤程（Python `asyncio`、Go goroutines、Rust `tokio`）在 I/O 时协作式让出执行权。同样的 10,000 个调用可以轻松容纳在单个进程内。在 LLM 智能体规模下，异步不是一项优化，而是架构本身。

例外：受 CPU 限制的后处理（嵌入、分词器技巧）仍然需要线程或进程。将 I/O 层与 CPU 层分离。

### Bedi 的相反观点（Bedi's counterpoint）

“Scaling Agentic Software”（Ashpreet Bedi，2026）认为，多数团队在测量负载前就过度设计。实用的默认方案：

- FastAPI + Postgres.
- 每次智能体运行对应一行；使用乐观并发原地更新状态。
- 通过 `pg_notify` 或简单的 Celery 工作进程执行后台任务。
- 在应用代码中实现重试策略。

当并发智能体运行少于约 100 个、任务规模可控时，这通常就是所需的全部。测量证实它失效时再升级。

原则：遇到简单架构无法解决的具体问题时，才采用持久化执行框架。过早采用，会将时间浪费在不产生回报的流程负担上。

### 恰好一次语义（Exactly-once semantics）

对付费智能体运行，需要“有效恰好一次”（至少一次投递 + 幂等消费者）。工程做法：

- **每次运行一个去重键（Dedup key per run）。**在每次副作用调用中携带它。
- **发件箱模式（Outbox pattern）。**副作用先写入表，再由独立进程执行。两步均幂等。
- **补偿事务（Compensating transactions）。**副作用成功、但追踪记录写入失败时，安排补偿。

这些是数据库工程模式，并非 LLM 特有。LLM 额外带来的负担只是调用慢；其余都是标准分布式系统问题。

### 彩虹部署（Rainbow deployment）

Anthropic 的多智能体研究系统使用“彩虹部署”：多个智能体运行时版本并发运行，避免每次代码部署都终止长时智能体。让一部分流量金丝雀试用新版本；旧版本中的智能体完成后，再退役旧版本。

这是长时有状态系统的标准做法；2026 年的适配点在于，智能体可持续数小时，因此部署周期必须兼容这一点。

### 典型生产检查清单（The canonical production checklist）

- 持久化状态（检查点、快照，或发件箱 + 可重放日志）。
- 幂等副作用。
- 为 LLM 调用提供异步 I/O 层。
- 至少一次投递并去重。
- 为有状态工作负载采用彩虹 / 金丝雀部署。
- 可观测性：逐智能体轨迹、超步审计、重试计数器。

```figure
sw-checkpoint-replay
```

## 动手构建（Build It）

`code/main.py` 实现了：

- `CheckpointStore`：以 SQLite 为后端、以线程 ID 为键的检查点日志。每个超步追加一行。
- `run_with_checkpoint(agent, thread_id)`：模拟运行中崩溃，由第二个工作进程从最后的检查点恢复。
- `AgentQueue`：逐智能体的 Idle / Processing / Response 状态机，带小型工作队列。
- `demo_async_vs_threads()`：分别通过 asyncio 和线程运行 500 个并发模拟“LLM 调用”，报告实际耗时和估算的峰值内存。

运行：

```
python3 code/main.py
```

预期输出：模拟崩溃后从检查点恢复成功；异步版本在 < 1 秒内处理 500 个并发调用；线程版本需要数秒，且每个并发单元使用的内存高出若干数量级。

## 实际使用（Use It）

`outputs/skill-scaling-advisor.md` 为持久化执行方案提供建议：FastAPI + Postgres、LangGraph 运行时、Temporal 或自定义。根据负载、状态保留需求和部署频率校准。

## 交付上线（Ship It）

典型生产加固：

- **从简单开始（Start simple，Bedi 原则）。**使用 FastAPI + Postgres，直到测量证明它失效。
- **优化前先全面埋点（Instrument everything before optimizing）。**逐次运行延迟直方图、每步耗时、重试次数、失败分类。
- **副作用采用发件箱模式（Outbox pattern for side effects）。**尤其是支付和外部 API 调用。
- **彩虹部署（Rainbow deploys）。**部署期间绝不终止正在进行的智能体运行。
- **遇到以下具体问题时，采用持久化执行引擎（Adopt durable-execution engines，Temporal / LangGraph / Restate）：**长达一小时的人在回路等待、跨区域协调、复杂重试 / 补偿策略。
- **I/O 层采用异步（Async for the I/O layer）。**线程仅用于受 CPU 限制的后处理。

## 练习（Exercises）

1. 运行 `code/main.py`。确认检查点恢复有效；测量异步与线程的并发差异。
2. 实现**发件箱（outbox）**表：每次工具调用先写入发件箱，再由独立 goroutine / 任务执行。将工具调用运行两次，验证幂等性。
3. 模拟**彩虹部署（rainbow deploy）**：两个运行时版本并发；各路由一半新 thread_ids；确认旧版本上正在进行的线程不受中断。
4. 阅读下方链接中的 LangGraph 运行时文档。在自行搭建的 FastAPI + Postgres 版本中，哪些运行时功能最耗时？这是否构成采用它的理由，还是可以推迟？
5. 阅读 MegaAgent（arXiv:2408.09955）第 3 节。其两层协调（组内 + 组间管理员聊天）是显式的。画出如何将其映射到具有两类队列的消息队列。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 持久化执行（Durable execution） | “持久化程序状态” | 引擎在每个超步后写入状态；崩溃恢复具有确定性。 |
| 超步（Super-step） | “事务边界” | 检查点之间的工作单元。LangGraph 术语。 |
| thread_id | “智能体运行标识符” | 绑定检查点与恢复逻辑的键。 |
| 幂等性（Idempotency） | “可安全重试” | 重复副作用产生的结果与执行一次相同。 |
| 发件箱模式（Outbox pattern） | “解耦副作用” | 将意图写入表；由独立执行器执行并标记完成。 |
| 至少一次投递（At-least-once delivery） | “可能重复” | 消息队列语义；去重键使消费者实现有效一次。 |
| 彩虹部署（Rainbow deploy） | “版本重叠” | 长时工作负载期间，多个运行时版本并发存在。 |
| 异步纤程（Async fiber） | “协作式让出” | 用户态并发；对于受 I/O 限制的负载，比线程便宜。 |
| 检查点（Checkpoint） | “状态快照” | 超步边界处的序列化状态，是恢复的关键。 |

## 延伸阅读（Further Reading）

- [LangChain：生产级深度智能体背后的运行时（The runtime behind production deep agents）](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents)：LangGraph 运行时设计。
- [MegaAgent](https://arxiv.org/abs/2408.09955)：逐智能体生产者消费者队列；数千并发智能体的两层协调。
- [Matrix](https://arxiv.org/abs/2511.21686)：以消息队列作为协调基础的去中心化框架。
- [Temporal 文档（docs）](https://docs.temporal.io/)：持久化执行的参考工作流引擎。
- [Anthropic：多智能体研究系统（Multi-agent research system）](https://www.anthropic.com/engineering/multi-agent-research-system)：包含彩虹部署在内的生产经验。
