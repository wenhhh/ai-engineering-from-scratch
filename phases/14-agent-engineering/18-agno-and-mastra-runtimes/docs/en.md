# 生产智能体运行时：快速实例化与类型化工作流（Production Agent Runtimes — Fast Instantiation and Typed Workflows）

> 生产智能体运行时优化原型框架忽略的问题：实例化成本、类型化工作流接口和可直接提供服务的后端。2026 年的两种选择：Agno（Python）追求微秒级智能体实例化和无状态 FastAPI 后端；Mastra 基于 Vercel AI SDK 提供智能体、工具、工作流、统一模型路由和组合存储。

**Type:** Learn
**Languages:** Python, TypeScript
**Prerequisites:** 第 14 阶段 · 01（智能体循环），第 14 阶段 · 13（LangGraph）
**Time:** 约 45 分钟

## 学习目标（Learning Objectives）

- 识别 Agno 的性能目标及其适用场景。
- 列出 Mastra 的三种基本构件：智能体（Agents）、工具（Tools）、工作流（Workflows），以及支持的服务器适配器。
- 解释为什么 Agno 推荐在生产中采用按会话组织的无状态 FastAPI 后端。
- 根据技术栈选择 Agno 或 Mastra：以 Python 为主，还是以 TypeScript 为主。

## 问题（The Problem）

LangGraph、AutoGen、CrewAI 依赖较重的框架。希望“在自己的运行时中，只要一个快速智能体循环”的团队会选择 Agno（Python）或 Mastra（TypeScript）。二者都以放弃部分框架自带构件为代价，换取执行速度和与周边技术栈更紧密的适配。

## 概念（The Concept）

### Agno（Agno）

- Python 运行时，前身为 Phi-data。
- “没有图、链或复杂模式，只有纯 Python。”
- 文档给出的性能目标：智能体实例化约 2 微秒，每个智能体约占 3.75 KiB 内存，支持约 23 家模型提供商。
- 生产路径：按会话组织的无状态 FastAPI 后端。每个请求启动一个新智能体；会话状态存放在数据库中。
- 原生支持多模态（文本、图像、音频、视频、文件）及智能体式检索增强生成（Agentic RAG）。

当每秒有数千个短生命周期智能体时，这些速度目标才重要，例如聊天请求汇聚或评估流水线。如果一个智能体运行 10 分钟，它们的重要性就低得多。

### Mastra（Mastra）

- TypeScript，基于 Vercel AI SDK。
- 三种基本构件：**智能体（Agents）**、**工具（Tools）**（由 Zod 定义类型）、**工作流（Workflows）**。
- 统一模型路由器（Unified Model Router）：涵盖 94 家提供商的 3,300 多个模型（2026 年 3 月）。
- 组合存储（Composite storage）：记忆、工作流和可观测性可使用不同后端；大规模可观测性场景推荐 ClickHouse。
- 使用 Apache 2.0 许可证，但 `ee/` 目录采用源码可见的企业许可证。
- 提供 Express、Hono、Fastify、Koa 服务器适配器；对 Next.js 和 Astro 提供一等集成支持。
- 提供用于调试的 Mastra Studio（localhost:4111）。
- 1.0 版本发布时（2026 年 1 月），GitHub 星标超过 22,000，npm 每周下载量超过 300,000。

### 定位（Positioning）

两者都不打算成为 LangGraph。它们竞争的方面包括：

- **语言适配（Language fit）。** Agno 面向以 Python 为主的团队；Mastra 面向以 TypeScript 为主的团队。
- **运行时易用性（Runtime ergonomics）。** Agno 追求接近零开销；Mastra 融入 Vercel 生态。
- **可观测性（Observability）。** 两者都集成 Langfuse/Phoenix/Opik（第 24 课），但 Mastra Studio 是官方自带工具。

### 各自的适用条件（When to pick each）

- **Agno**：Python 后端、大量短生命周期智能体、严格性能要求、采用 FastAPI 的团队。
- **Mastra**：TypeScript 后端、Next.js / Vercel 部署、统一的多提供商模型路由、Zod 类型化工具。
- **LangGraph**（第 13 课）：持久状态和显式图推理比单纯速度更重要时。
- **OpenAI / Claude Agent SDK**：希望采用提供商产品化框架时（第 16–17 课）。

### 模式的失效点（Where this pattern goes wrong）

- **为性能而性能（Perf-for-perf's-sake）。** 每个请求只有一次缓慢的智能体调用，却因为“2 微秒”听起来不错而选择 Agno。此时框架开销不是瓶颈。
- **生态锁定（Ecosystem lock-in）。** Mastra 偏向 Vercel 的集成在 Vercel 上是优点，在其他环境则是缺点。
- **企业许可证混淆（Enterprise license confusion）。** Mastra 的 `ee/` 目录只是源码可见，并非 Apache 2.0。计划创建分支版本时应阅读许可证。

```figure
wb-runtime-spawn
```

## 动手实现（Build It）

本课以比较为主，单个代码产物无法充分体现两个框架。参见 `code/main.py` 中的并排实验：同一套最小流程“运行智能体、流式输出、持久化会话”实现两次，一次采用 Agno 式结构，一次采用 Mastra 式结构。

运行：

```
python3 code/main.py
```

得到两条结构不同但功能等价的追踪。

## 实际应用（Use It）

- **Agno**：需要速度和 FastAPI 结构的 Python 后端。
- **Mastra**：需要多个提供商和工作流基本构件的 TypeScript 后端。
- 两者都提供官方可观测性钩子，也都集成 Langfuse。

## 交付成果（Ship It）

`outputs/skill-runtime-picker.md` 根据技术栈、延迟预算和运维形态，在 Agno、Mastra、LangGraph 或提供商 SDK 之间进行选择。

## 练习（Exercises）

1. 阅读 Agno 文档。将标准库 ReAct 循环（第 01 课）移植到 Agno。哪些部分消失了？哪些保留下来？
2. 阅读 Mastra 文档。将同一个循环移植到 Mastra。工具类型定义有什么变化：使用 Zod 与没有类型定义有何区别？
3. 基准测试：在你的技术栈中测量智能体实例化延迟。Agno 的 2 微秒对你的工作负载重要吗？
4. 设计迁移：如果此前在 Python 中运行 CrewAI，迁移到 Agno 会破坏什么？
5. 阅读 Mastra 的 `ee/` 许可证条款。哪些限制会影响开源分支版本？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Agno | “快速 Python 智能体” | 按会话组织的无状态智能体运行时 |
| Mastra | “Vercel AI SDK 上的 TypeScript 智能体” | 智能体 + 工具 + 工作流 + 模型路由器 |
| 统一模型路由器（Unified Model Router） | “多提供商访问” | 通过单个客户端访问 94 家提供商的 3,300 多个模型 |
| 组合存储（Composite storage） | “多个后端” | 记忆、工作流、可观测性分别写入不同存储 |
| Mastra Studio | “本地调试器” | 在 localhost:4111 提供用于检查智能体内部状态的界面 |
| 源码可见（Source-available） | “不是开源软件” | 许可证允许阅读源码，但限制商业使用 |

## 延伸阅读（Further Reading）

- [Agno Agent Framework 文档](https://www.agno.com/agent-framework)：性能目标、FastAPI 集成
- [Mastra 文档](https://mastra.ai/docs)：基本构件、服务器适配器、模型路由器
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)：有状态图替代方案
- [Comet Opik](https://www.comet.com/site/products/opik/)：Mastra 集成所引用的可观测性比较
