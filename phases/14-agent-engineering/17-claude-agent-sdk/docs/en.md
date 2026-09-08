# 库形式的执行框架：子智能体与会话存储（The Harness as a Library — Subagents and Session Store）

> 可以像库一样导入的执行框架（Harness），提供内置工具、用于上下文隔离的子智能体、钩子、W3C 追踪传播和会话持久化。Claude Agent SDK 是参考示例，即 Claude Code 执行框架的库形式；Claude Managed Agents 则是适合长时间异步工作的托管替代方案。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 01（智能体循环），第 14 阶段 · 10（技能库）
**Time:** 约 75 分钟

## 学习目标（Learning Objectives）

- 解释 Anthropic Client SDK（原始 API）与 Claude Agent SDK（执行框架形式）的区别。
- 描述子智能体（Subagent）的并行化与上下文隔离作用，以及何时使用它们。
- 列出 Python SDK 的会话存储接口（`append`、`load`、`list_sessions`、`delete`、`list_subkeys`），说明 `--session-mirror` 的作用。
- 使用标准库实现一个执行框架，包含内置工具、具有隔离上下文的子智能体创建、生命周期钩子和会话存储。

## 问题（The Problem）

原始 LLM API 只提供一轮请求与响应。生产智能体还需要工具执行、MCP 服务器、生命周期钩子、子智能体创建、会话持久化和追踪传播。Claude Agent SDK 将这套结构作为库交付：它与 Claude Code 使用的是同一套执行框架（Harness），并对自定义智能体开放。

## 概念（The Concept）

### 客户端 SDK 与智能体 SDK（Client SDK vs Agent SDK）

- **客户端 SDK（Client SDK，`anthropic`）。** 原始 Messages API。循环、工具和状态由你负责。
- **智能体 SDK（Agent SDK，`claude-agent-sdk`）。** 内置工具执行、MCP 连接、钩子、子智能体创建和会话存储。它是 Claude Code 循环的库形式。

### 内置工具（Built-in tools）

SDK 开箱即用地提供 10 多种工具，包括文件读写、Shell、grep、glob、网页获取等。自定义工具通过标准的工具结构定义（Schema）接口注册。

### 子智能体（Subagents）

Anthropic 文档说明了两种用途：

1. **并行化（Parallelization）。** 并发运行独立工作。“为这 20 个模块逐一找出测试文件”可拆成 20 个并行子智能体任务。
2. **上下文隔离（Context isolation）。** 子智能体使用各自的上下文窗口，只有结果返回编排器，保留编排器的上下文预算。

Python SDK 近期增加了 `list_subagents()`、`get_subagent_messages()`，用于读取子智能体的对话记录。

### 会话存储（Session store）

协议与 TypeScript 对齐：

- `append(session_id, message)`：添加一轮消息。
- `load(session_id)`：恢复对话。
- `list_sessions()`：枚举会话。
- `delete(session_id)`：删除会话，并级联删除子智能体会话。
- `list_subkeys(session_id)`：列出子智能体键。

`--session-mirror`（CLI 标志）在对话记录流式产生时将其镜像到外部文件，以便调试。

### 钩子（Hooks）

可注册的生命周期钩子：

- `PreToolUse`、`PostToolUse`：把关或审计工具调用。
- `SessionStart`、`SessionEnd`：初始化与清理。
- `UserPromptSubmit`：在模型看到用户输入之前处理该输入。
- `PreCompact`：在上下文压缩之前运行。
- `Stop`：智能体退出时清理。
- `Notification`：通过旁路发送通知。

pro-workflow（第 14 阶段课程中的参考项目）及类似系统通过钩子添加横切行为。

### W3C 追踪上下文（W3C trace context）

调用方当前活跃的 OTel 跨度通过 W3C 追踪上下文头传播到 CLI 子进程。整个多进程执行过程在后端呈现为同一条追踪。

### Claude Managed Agents（Claude Managed Agents）

托管替代方案（测试版请求头 `managed-agents-2026-04-01`）。支持长时间异步工作、内置提示词缓存和内置压缩，以部分控制权换取托管基础设施。

### 模式的失效点（Where this pattern goes wrong）

- **子智能体过量创建（Subagent over-spawn）。** 为 100 个微小任务创建 100 个子智能体，开销占据主导。应改为批处理。
- **钩子膨胀（Hook creep）。** 每个团队都增加钩子，启动时间随之激增。应每季度审查钩子。
- **会话膨胀（Session bloat）。** 会话不断积累，体积增长。应结合 `list_sessions` 与过期策略。

```figure
ae-subagent-isolation
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现了 SDK 的基本形式：

- `Tool`、`ToolRegistry`，内置 `read_file`、`write_file`、`list_dir`。
- `Subagent`：私有上下文、隔离运行、返回结果。
- `SessionStore`：追加、加载、列出、删除、列出子键。
- `Hooks`：`pre_tool_use`、`post_tool_use`、`session_start`、`session_end`。
- 演示：主智能体并行创建 3 个相互隔离的子智能体，汇总结果并持久化会话。

运行：

```
python3 code/main.py
```

追踪展示子智能体的上下文隔离（编排器上下文大小保持有界）、钩子执行和会话持久化。

## 实际应用（Use It）

- **Claude Agent SDK**：适合以 Claude 为主、希望采用 Claude Code 执行框架（Harness）形式的产品。
- **Claude Managed Agents**：适合托管的长时间异步工作。
- **OpenAI Agents SDK**（第 16 课）：面向以 OpenAI 为主的同类产品。
- **LangGraph + 自定义工具**：适合更希望采用图式状态机的情况。

## 交付成果（Ship It）

`outputs/skill-claude-agent-scaffold.md` 为 Claude Agent SDK 应用搭建骨架，包含子智能体、钩子、会话存储、MCP 服务器挂载和 W3C 追踪传播。

## 练习（Exercises）

1. 添加子智能体创建器，将 20 个任务分批处理，每批并行运行 5 个子智能体。与每个任务创建一个子智能体相比，测量编排器上下文大小。
2. 实现 `PreToolUse` 钩子，对 `write_file` 调用限速：每个会话每分钟 5 次。追踪这一行为。
3. 接入 `list_subkeys`，渲染子智能体树。深层嵌套是什么样子？
4. 将实验程序移植到真实的 `claude-agent-sdk` Python 包。工具注册有哪些变化？
5. 阅读 Claude Managed Agents 文档。什么情况下会从自托管切换到托管？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 智能体 SDK（Agent SDK） | “库形式的 Claude Code” | 执行框架（Harness）的组成：工具、MCP、钩子、子智能体和会话存储 |
| 子智能体（Subagent） | “子代理” | 独立上下文、独立预算；结果逐层返回 |
| 会话存储（Session store） | “对话数据库” | 持久化、加载、列出、删除对话轮次，并级联处理子智能体 |
| 钩子（Hook） | “生命周期回调” | 覆盖工具前后、会话、提示词提交、压缩及停止 |
| W3C 追踪上下文（W3C trace context） | “跨进程追踪” | 父跨度传播到 CLI 子进程 |
| Managed Agents | “托管执行框架（Harness）” | 由 Anthropic 托管的长时间异步工作 |
| `--session-mirror` | “对话记录镜像” | 将流式产生的会话轮次写入外部文件 |
| MCP 服务器（MCP server） | “工具接口” | 挂载到智能体的外部工具或资源来源 |

## 延伸阅读（Further Reading）

- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)：Claude Code 的库形式
- [Anthropic《使用 Claude Agent SDK 构建智能体》（Building agents with the Claude Agent SDK）](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)：生产模式
- [Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)：托管替代方案
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)：对应方案
