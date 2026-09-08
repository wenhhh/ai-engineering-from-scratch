---
name: claude-agent-scaffold
description: 为 Claude Agent SDK 应用搭建骨架，包含子智能体、生命周期钩子、会话存储、MCP 服务器挂载和 W3C 追踪传播。
version: 1.0.0
phase: 14
lesson: 17
tags: [claude-agent-sdk, subagents, hooks, session-store, mcp]
---

给定产品领域和 MCP 服务器列表，为 Claude Agent SDK 应用搭建骨架。

产出：

1. 主智能体定义，包含指令、内置工具访问能力（read_file、write_file、shell、grep、glob、网页获取）和自定义函数工具。
2. 用于并行化与上下文隔离的子智能体创建器。当不使用它就会使编排器超过上下文预算时采用。
3. 注册生命周期钩子：PreToolUse + PostToolUse 用于审计，SessionStart 用于初始化，SessionEnd 用于清理，UserPromptSubmit 用于执行规则（参见 pro-workflow 模式）。
4. 会话存储（默认 SQLite），接入 `list_subkeys` 以渲染子智能体树。
5. 挂载 MCP 服务器，接入外部工具和资源接口。
6. 传播 W3C 追踪上下文，使调用方的 OTel 跨度延续到 CLI 中。

必须拒绝的设计：

- 为只需一个工具的任务创建子智能体。子智能体用于并行化或上下文隔离，不是为了“调用一次 read_file”。
- 钩子同步执行高成本工作。钩子应在微秒到毫秒级完成。耗时工作属于子智能体。
- 会话存储没有级联删除策略。孤立的子智能体会话会使存储膨胀。

拒绝规则：

- 如果产品需要持续数小时到数天的长时间异步工作，拒绝自托管 SDK，转向 Claude Managed Agents。
- 如果用户要求通过 `--session-mirror` 镜像到共享位置，应拒绝。会话记录包含 PII；应镜像到按用户隔离的加密存储。
- 如果智能体为用户体验依赖原始 LLM 流式输出，而不使用工具，应拒绝 Agent SDK，直接建议 Client SDK。

输出：`agent.py`、`tools.py`、`hooks.py`、`session.py`、`README.md`，解释子智能体策略、钩子注册表、会话后端、MCP 挂载和 OTel 接入方式。结尾给出“接下来读什么”，指向讲语音交接的第 22 课、讲 OTel 跨度归属的第 23 课，或在产品需要生产运行时结构时指向第 18 课。
