---
name: terminal-coding-agent
description: 构建终端原生编码智能体，以受限成本、沙箱工具和完整的 2026 钩子接口，在 SWE-bench Pro 上评估。
version: 1.0.0
phase: 19
lesson: 01
tags: [capstone, coding-agent, claude-code, swe-bench, mcp, hooks, sandbox]
---

给定目标仓库和自然语言任务，构建能够规划、在沙箱执行并创建拉取请求（Pull Request，PR）的运行框架（Harness）。在 SWE-bench Pro 的 30 任务子集上达到或超过 mini-swe-agent 基线，同时将每任务预算控制在 5 美元以下。

构建计划：

1. 搭建 Bun + Ink 终端用户界面（TUI）框架，包含计划面板、工具调用流，以及实时词元 / 美元预算。
2. 通过模型上下文协议（Model Context Protocol，MCP）StreamableHTTP 定义六个工具：read_file、edit_file、ripgrep、tree_sitter_symbols、run_shell、git。每次调用最多返回 4k 词元。
3. 所有工具调用都在 E2B 或 Daytona 沙箱内的新 `git worktree add` 分支上执行，绝不接触宿主文件系统。
4. 接入全部八种 2026 钩子事件：SessionStart、SessionEnd、PreToolUse、PostToolUse、UserPromptSubmit、Notification、Stop、PreCompact。至少交付四个用户编写的钩子：破坏性命令防护、词元记账、OTel 跨度发射器、追踪包写入器。
5. 执行三项预算限制：50 轮、200k 词元、5 美元。PreCompact 在 150k 时触发并概括旧轮次。
6. 将符合 GenAI 语义约定的 OpenTelemetry 跨度（Span）发送到自托管 Langfuse。
7. 成功后推送分支并创建 PR，正文包含计划与追踪包。
8. 在 SWE-bench Pro Python 的 30 问题子集上与 mini-swe-agent 比较，记录每任务 pass@1、轮数、词元和美元成本。

评估标准：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 相同 30 任务子集上对比 mini-swe-agent 基线 |
| 20 | 架构清晰度 | 规划 / 行动 / 观察分离、钩子接口、工具模式可读性 |
| 20 | 安全 | 沙箱逃逸红队测试 + 破坏性命令防护审计 |
| 20 | 可观测性 | 100% 工具调用有跨度，逐轮词元记账 |
| 15 | 开发者体验 | 冷启动低于 2s，崩溃恢复，Ctrl-C 取消语义 |

直接不予验收的情况：

- 框架通过 shell 在宿主文件系统上运行 git，而非在沙箱内运行。
- 智能体可以写入工作树外，或在没有显式允许列表钩子的情况下 curl 外部 URL。
- 报告评估数值，却未在相同 30 个问题上运行匹配基线。
- “通过率”依赖重试之间执行 `git reset --hard`；SWE-bench Pro 衡量 pass@1。

拒绝规则：

- 任何配置下都拒绝直接推送 main，只使用 PR 分支。
- 拒绝禁用破坏性命令防护，这是评分标准的硬性要求。
- 拒绝没有预算上限的运行；无限制运行会污染评估比较。

输出：包含运行框架的仓库；固定 30 任务的 SWE-bench Pro 评估框架及匹配的 mini-swe-agent 基线运行；至少 5 次完整运行的 OpenTelemetry 追踪归档；一份说明，列出框架能解决但基线不能解决的任务，反之亦然。结尾说明观察到的前三种失效模式，以及分别修复它们的钩子改动。
