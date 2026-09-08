# 生产运行时：队列、事件与定时任务（Production Runtimes: Queue, Event, Cron）

> 生产智能体运行于六种形态：请求响应、流式、持久执行、队列式后台、事件驱动、定时运行。先选形态，再选框架。每种形态都离不开可观测性。

**Type:** Learn
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 13（LangGraph），第 14 阶段 · 22（语音）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 列出六种生产运行时形态，并为每种匹配框架或产品模式。
- 解释持久执行（LangGraph）为什么对长周期任务重要。
- 描述事件驱动运行时及 Claude Managed Agents 的适用场景。
- 解释为什么可观测性是多步骤智能体不可缺少的基础。

## 问题（The Problem）

生产智能体会遇到 Jupyter 笔记本难以暴露的故障：第 37 步网络超时、用户在语音通话中途挂断、定时任务因机器重启而终止、后台工作者内存耗尽。运行时形态决定了哪些失败可以恢复。

## 概念（The Concept）

### 请求响应（Request-response）

- 同步 HTTP，用户等待完成。
- 仅适用于短任务，<30 秒。
- 技术栈：Agno（Python + FastAPI）、Mastra（TypeScript + Express/Hono/Fastify/Koa）。
- 可观测性：标准 HTTP 访问日志与 OTel 跨度。

### 流式（Streaming）

- 通过 SSE 或 WebSocket 逐步输出。
- LiveKit 将其扩展为面向语音和视频的 WebRTC（第 22 课）。
- 技术栈：任意支持流式输出的框架，加上能处理 SSE/WS 的前端。
- 可观测性：逐块计时、首词元延迟、尾延迟。

### 持久执行（Durable execution）

- 每一步后对状态建立检查点，失败后自动恢复。
- AutoGen v0.4 参与者模型将失败隔离到单个智能体（第 14 课）。
- LangGraph 的核心差异化能力（第 13 课）。
- 步骤数未知且恢复成本高时不可缺少。

### 队列式 / 后台（Queue-based / background）

- 作业进入队列，工作者领取，通过 Webhook 或发布订阅返回结果。
- 对长周期智能体不可缺少；根据 Anthropic 计算机使用公告，每个任务可能有数十至数百步。
- 技术栈：Celery（Python）、BullMQ（Node）、SQS + Lambda（AWS）、自定义实现。
- 可观测性：队列深度、逐作业延迟分布、死信队列（DLQ）大小。

### 事件驱动（Event-driven）

- 智能体订阅触发条件：新邮件、PR 创建、定时任务触发。
- Claude Managed Agents 开箱即用地覆盖此场景（第 17 课）。
- CrewAI Flows（第 15 课）组织事件驱动的确定性工作流。
- 可观测性：触发来源、事件到启动的延迟、智能体延迟。

### 定时运行（Scheduled）

- 周期运行的 Cron 式智能体。
- 与持久执行结合，让失败的夜间运行在下次触发时继续。
- 技术栈：Kubernetes CronJob + 持久框架；托管服务如 Render cron、Vercel cron。

### 2026 年部署模式（2026 deployment patterns）

- **CrewAI Flows**：用于事件驱动生产。
- **Agno**：以无状态 FastAPI 服务 Python 微服务。
- **Mastra**：通过 Express、Hono、Fastify、Koa 服务器适配器嵌入。
- **Pipecat Cloud / LiveKit Cloud**：托管语音（第 22 课）。
- **Claude Managed Agents**：托管长时间异步工作。

### 可观测性是必要基础（Observability is load-bearing）

没有 OpenTelemetry GenAI 跨度（第 23 课）以及 Langfuse/Phoenix/Opik 后端（第 24 课），就无法调试在第 40 步失败的多步骤智能体。生产中这不是可选项。它决定了你是“快速调试”，还是“增加日志后从头重放”。

### 生产运行时的失效点（Where production runtimes fail）

- **形态选择错误（Wrong shape choice）。** 为 5 分钟任务选择请求响应。用户会断开连接，工作者不断积压，重试进一步加重负担。
- **没有死信队列（No DLQ）。** 队列工作者没有死信机制，失败作业就消失。
- **不透明的后台工作（Opaque background work）。** 后台智能体运行却不导出追踪，直到用户报告才知道失败。
- **跳过持久状态（Skipping durable state）。** 任何超过 30 秒且无法承受重新开始成本的运行，都需要持久执行。

```figure
wb-runtime-shapes
```

## 动手实现（Build It）

`code/main.py` 是标准库多形态演示：

- 请求响应端点，使用普通函数。
- 流式处理器，使用生成器。
- 带死信队列的队列式工作者。
- 事件触发器注册表。
- Cron 式调度器。

运行：

```bash
python3 code/main.py
```

输出：五条追踪展示不同形态处理同一任务的行为。同样的智能体逻辑，不同的外壳。第六种形态持久执行，特意放在第 13 课用 LangGraph 检查点讲解。

## 实际应用（Use It）

- **请求响应（Request-response）**：聊天式用户体验。
- **流式（Streaming）**：逐步响应。
- **持久执行（Durable）**：长周期任务。
- **队列（Queue）**：批量、异步、长时间运行。
- **事件（Event）**：智能体响应外部事件。
- **定时任务（Cron）**：维护工作，如记忆整合、评估、成本报告。

## 交付成果（Ship It）

`outputs/skill-runtime-shape.md` 为任务选择运行时形态，并接入所需可观测性。

## 练习（Exercises）

1. 在自己的技术栈中，将第 01 课 ReAct 循环移植到全部六种形态。每种形态适合产品中的哪些功能场景？
2. 为队列式演示增加死信队列。模拟 10% 作业失败，展示死信队列大小。
3. 编写定时触发的评估智能体，每晚评估当天最重要的 20 条追踪。
4. 实现带背压（Backpressure）的流式输出：客户端缓慢时暂停智能体。这会如何影响轮次预算？
5. 阅读 Claude Managed Agents 文档。何时会将自托管长周期智能体转移到托管服务？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 请求响应（Request-response） | “同步” | 用户等待，仅用于短任务 |
| 流式（Streaming） | “SSE / WS” | 逐步输出，改善体验，可按块观测延迟 |
| 持久执行（Durable execution） | “失败后恢复” | 对状态建立检查点，从最后一步重启 |
| 队列式（Queue-based） | “后台作业” | 生产者 / 工作者池 / 死信队列 |
| 事件驱动（Event-driven） | “基于触发器” | 智能体响应外部事件 |
| DLQ | “死信队列（Dead-letter queue）” | 暂存失败作业的位置 |
| Claude Managed Agents | “托管执行框架（Harness）” | Anthropic 托管的长时间异步工作，带缓存与压缩 |

## 延伸阅读（Further Reading）

- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)：持久执行细节
- [Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)：托管长时间异步
- [Anthropic《引入计算机使用能力》（Introducing computer use）](https://www.anthropic.com/news/3-5-models-and-computer-use)：“每个任务数十至数百步”
- [AutoGen v0.4（Microsoft Research）](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)：参与者模型故障隔离
