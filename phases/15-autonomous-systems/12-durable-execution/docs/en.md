# 长时间后台智能体：持久执行（Long-Running Background Agents: Durable Execution）

> 生产环境中的长时程智能体，不是靠一个 `while True` 循环持续运行。每次 LLM 调用都被封装为支持检查点、重试和重放的活动（Activity）。Temporal 的 OpenAI Agents SDK 集成于 2026 年 3 月正式全面可用（General availability，GA）。Claude Code Routines（Anthropic）无需在本地维持常驻进程，就能定时调用 Claude Code。会话可以暂停等待人工输入，重新部署后仍保留状态，并从以 `thread_id` 为键的最新检查点恢复。这些更易用的接口背后，是工作流编排（Workflow orchestration）这一成熟模式；新增的只是 LLM 调用这种非确定性活动，其结果必须能在恢复时以确定的方式重放。

**Type:** Learn
**Languages:** Python（标准库，最小持久执行状态机）
**Prerequisites:** 阶段 15 · 10（权限模式，Permission modes），阶段 15 · 01（长时程智能体，Long-horizon agents）
**Time:** ~60 分钟

## 问题（The Problem）

设想智能体运行四小时，调用三个工具、两次询问用户、发出四十次 LLM 调用。运行到一半，宿主重启，会怎样？

- 朴素 `while True` 循环：全部丢失，从头重启。有真实副作用的三个工具调用再次执行，用户再次批准已批准事项，四十次 LLM 调用再次计费。
- 持久执行（Durable execution）：从最近检查点恢复。已完成活动不重执行，而从持久日志重放结果。用户不重复批准，已完成 LLM 调用不重复计费。

这正是工作流引擎十年来交付的模式（Temporal、Cadence、Uber 的 Cherami）。新处在于 LLM 调用成为一种活动：非确定、昂贵、有副作用，且自然适配该模式。

本课始终围绕一个问题：任务持续越久，可靠性就越低。METR 观察到“35 分钟退化”现象，成功率随任务时间跨度近似按二次关系下降。持久执行让智能体能够运行得更久，甚至超过其可靠性所能支撑的时长。这也带来了新的故障风险：设计得当时，故障可以受控地发生；设计不当时，故障就可能造成损害。

## 概念（The Concept）

### 活动、工作流与重放（Activities, workflows, and replay）

- **工作流（Workflow）**：确定性的编排代码，定义活动的执行顺序、分支和等待条件。只有保证确定性，才能根据事件日志重放，而不意外走入不同的执行路径。
- **活动（Activity）**：非确定、可能失败的工作单元，如 LLM 调用、工具调用、文件写入、HTTP 请求。记录每个活动输入及完成后的输出。
- **事件日志（Event log）**：持久后端存储，记录每次活动开始、完成、失败、重试及每个工作流决策。
- **重放（Replay）**：恢复时工作流代码从头重跑；已完成活动直接返回日志结果，不重执行；仅实际运行尚未完成的活动。

这与 React 面向虚拟 DOM 重新渲染，或 Git 从提交重建工作树形态相同。编排器的确定性让持久性成本低廉。

### LLM 调用为何适配（Why LLM calls fit the pattern）

LLM 调用具有以下特点：
- 结果不确定（温度 > 0；即使温度为 0，不同模型版本的结果也可能变化）。
- 成本高（既有费用，也有延迟）。
- 可能失败（触发速率限制或超时）。
- 可能产生副作用（在调用工具时）。

这恰是活动的特征。将每次 LLM 调用包装为活动，便获得指数退避重试、跨重启检查点和可重放调试轨迹。

### 以 `thread_id` 为键的检查点（Checkpoints keyed by thread_id）

LangGraph、Microsoft Agent Framework、Cloudflare Durable Objects、Claude Code Routines 都趋同于相同 API 形态：`thread_id` 或等价标识确定会话，每次状态转移持久化到后端（默认 PostgreSQL，开发用 SQLite，缓存用 Redis），恢复读取最新检查点。

后端选择很重要：

- **PostgreSQL**：支持持久化和查询，重新部署后数据仍然保留；是 LangGraph 的默认选择。
- **SQLite**：仅用于本地开发，迁移到其他主机时会丢失原主机上的数据。
- **Redis**：快速，但未配置 AOF/快照时是临时的。
- **Cloudflare Durable Objects**：透明分布式，以唯一键界定范围，存续数小时到数周。

### 人工输入作为一等状态（Human-input as a first-class state）

先提案后提交（第 15 课）需要持久的“等待人类”状态。工作流暂停，外部队列保留待处理请求，批准后精确从该点恢复。没有持久性就只能尽力而为；有了它，隔夜到达的批准能让工作流在早晨接续。

### 35 分钟退化（The 35-minute degradation）

METR 观察到，接受测量的每类智能体在持续运行超过 ~35 分钟后，可靠性都会下降。任务时长翻倍，失败率大约变为四倍。持久执行无法解决这一问题，只是让智能体能够运行到其可靠性不足以支撑的时长。更安全的做法是：在持久执行的基础上设置检查点，要求恢复执行时重新获得人工确认（HITL）；再通过预算紧急停止开关（第 13 课）限制总算力消耗，而不受实际运行时长影响。

### 何时持久执行不是正确答案（When durable execution is the wrong answer）

- 短于几分钟且无人工输入的运行，开销 > 收益。
- 严格只读的信息检索。
- 正确性要求在单个上下文窗口内端到端完成的任务，例如某些推理任务、一次性生成。

```figure
memory-consolidation
```

## 实际应用（Use It）

`code/main.py` 用 Python 标准库实现最小持久执行引擎，支持：

- `@activity` 装饰器，将输入输出记录到 JSON 事件日志。
- 串联活动的工作流函数。
- `run_or_replay(workflow, event_log)` 函数，重放已完成活动而不重执行。

驱动程序模拟三活动工作流，中途崩溃，展示（a）朴素重试重新执行全部活动，与（b）重放只运行缺失活动的对比。

## 交付成果（Ship It）

`outputs/skill-durable-execution-review.md` 审查拟议长时间智能体部署是否具备正确持久执行形态：活动、确定性、检查点后端、人工输入状态、恢复时 HITL 策略。

## 练习（Exercises）

1. 运行 `code/main.py`。观察朴素重试与重放的活动执行次数差异。改变崩溃点，展示重放次数相应变化。

2. 将玩具引擎改为明确使用 `thread_id`。模拟共享引擎的两个并发会话，确认事件日志不冲突。

3. 选引擎中的一个活动，引入非确定性，例如在工作流决策中读取实际时钟时间戳。展示重放分歧，解释真实引擎如何处理（副作用注册、`Workflow.now()` API）。

4. 阅读 LangChain“生产深度智能体背后的运行时”文章，列出运行时持久化的每种状态及其覆盖的失效模式。

5. 为 6 小时自主编程任务设计检查点策略：何处设检查点、崩溃恢复如何进行、什么需要新 HITL？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 工作流（Workflow） | “智能体脚本” | 确定性编排代码，可从事件日志重放 |
| 活动（Activity） | “一个步骤” | 非确定单元（LLM/工具调用），前后记录日志 |
| 事件日志（Event log） | “后端存储” | 每次状态转移的持久记录 |
| 重放（Replay） | “恢复” | 重跑工作流，已完成活动返回日志结果而不重执行 |
| 检查点（Checkpoint） | “存档点” | 以 thread_id 为键的持久状态，恢复取最新 |
| thread_id | “会话键” | 界定持久状态范围的标识符 |
| 35 分钟退化（35-minute degradation） | “可靠性衰减” | METR：成功率随时程近似二次下降 |
| 非确定性（Non-determinism） | “重放漂移” | 实际时钟、随机数、LLM 输出，必须注册为副作用 |

## 延伸阅读（Further Reading）

- [Anthropic：Claude Code Agent SDK 智能体循环](https://code.claude.com/docs/en/agent-sdk/agent-loop)：预算、轮次、恢复语义。
- [Microsoft：Agent Framework 人在回路与检查点](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)：RequestInfoEvent 形态。
- [LangChain：生产深度智能体背后的运行时](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents)：具体运行时要求。
- [OpenAI Agents SDK + Temporal 集成（Trigger.dev 公告）](https://trigger.dev)：LLM 调用的活动形态。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：35 分钟退化引用。
