# 综合实践 01：终端原生编码智能体（Capstone 01 — Terminal-Native Coding Agent）

> 到 2026 年，编码智能体的形态已基本确定：终端用户界面（Terminal User Interface，TUI）运行框架、有状态计划、沙箱工具接口，以及规划、行动、观察、恢复的循环。远看 Claude Code、Cursor 3 和 OpenCode，它们都类似。本综合实践要求你端到端构建一个：输入命令行任务，输出拉取请求（Pull Request，PR），并在 SWE-bench Pro 上与 mini-swe-agent 和 Live-SWE-agent 比较。你将理解，难点不是调用模型，而是工具循环、沙箱，以及 50 轮运行的成本上限。

**Type:** Capstone
**Languages:** TypeScript / Bun (harness), Python (eval scripts)
**Prerequisites:** 阶段 11（大语言模型工程）、阶段 13（工具与协议）、阶段 14（智能体）、阶段 15（自主系统）、阶段 17（基础设施）
**涉及阶段（Phases exercised）：** P0 · P5 · P7 · P10 · P11 · P13 · P14 · P15 · P17 · P18
**Time:** 35 小时

## 问题（Problem）

编码智能体在 2026 年成为主要的 AI 应用类别。Claude Code（Anthropic）、带 Composer 2 和 Agent Tabs 的 Cursor 3（Cursor）、Amp（Sourcegraph）、OpenCode（112k 星标）、Factory Droids 和 Google Jules，都采用同一架构的变体：终端运行框架、带权限的工具接口、沙箱，以及围绕前沿模型构建的规划—行动—观察循环。前沿表现集中在少数系统，例如 Live-SWE-agent 配合 Opus 4.5 在 SWE-bench Verified 达到 79.2%，但工程工作覆盖很广。多数失效模式不是模型犯错，而是工具循环不稳定、上下文污染、词元成本失控，以及破坏性文件系统操作。

只从外部观察，无法理解这些智能体。你必须亲手构建一个，看着它在第 47 轮因 ripgrep 返回 8MB 匹配结果而崩溃，再重建截断层。这就是本综合实践的目的。

## 概念（Concept）

运行框架（Harness）有四个部分。**规划（Plan）** 维护 TodoWrite 风格的状态对象，由模型每轮重写。**行动（Act）** 分发工具调用，包括读取、编辑、运行、搜索和 git。**观察（Observe）** 捕获 stdout、stderr 和退出码，截断后反馈摘要。**恢复（Recover）** 处理工具错误，避免撑爆上下文窗口或无限循环。2026 年的形态还增加了**钩子（Hook）**：`PreToolUse`、`PostToolUse`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`Notification`、`Stop`、`PreCompact`，这些可配置扩展点允许操作者注入策略、遥测与防护机制。

沙箱使用 E2B 或 Daytona。每个任务在全新的开发容器（Devcontainer）中运行，以读写方式挂载 git 工作树（Worktree）。运行框架从不接触宿主文件系统，无论成功还是失败都会销毁工作树。成本控制分三层：每轮词元上限、每会话美元预算、硬性轮数上限（通常 50）。可观测性层使用符合 GenAI 语义约定的 OpenTelemetry 跨度（Span），发送到自托管 Langfuse。

## 架构（Architecture）

```
  用户命令行  ->  运行框架（Bun + Ink TUI）
                  |
                  v
           规划 / 行动 / 观察循环  <--->  Claude Sonnet 4.7 / GPT-5.4-Codex / Gemini 3 Pro
                  |                          （通过 OpenRouter，与模型无关）
                  v
           工具分发器（MCP StreamableHTTP 客户端）
                  |
     +------------+------------+----------+
     v            v            v          v
  read/edit    ripgrep     tree-sitter   git/run
     |            |            |          |
     +------------+------------+----------+
                  |
                  v
           E2B / Daytona 沙箱（工作树隔离）
                  |
                  v
           钩子：Pre/Post, Session, Prompt, Compact
                  |
                  v
           OpenTelemetry -> Langfuse（跨度、词元、美元）
                  |
                  v
           通过 GitHub 应用创建 PR
```

## 技术栈（Stack）

- 运行框架：Bun 1.2 + Ink 5（终端内的 React）
- 模型访问：OpenRouter 统一 API，支持 Claude Sonnet 4.7、GPT-5.4-Codex、Gemini 3 Pro，以及处理最难任务的 Opus 4.5
- 工具传输：模型上下文协议（Model Context Protocol，MCP）StreamableHTTP，采用 MCP 2026 修订版
- 沙箱：E2B 沙箱（JS SDK）或 Daytona 开发容器
- 代码搜索：ripgrep 子进程，17 种语言的预编译 tree-sitter 解析器
- 隔离：每个任务使用 `git worktree add`，成功或失败后清理
- 评估框架：SWE-bench Pro 已验证子集 + Terminal-Bench 2.0 + 自建 30 任务留出集
- 可观测性：OpenTelemetry SDK，采用 `gen_ai.*` 语义约定 → 自托管 Langfuse
- 发布 PR：使用细粒度令牌的 GitHub App，权限范围仅限目标仓库

```figure
ce-agent-loop
```

## 动手实现（Build It）

1. **TUI 与命令循环。** 使用 Ink 搭建 Bun 项目，接受 `agent run <repo> "<task>"`。输出分区视图：顶部计划面板、中部工具调用流、底部词元预算。添加 Ctrl-C 取消，在退出前触发 `SessionEnd` 钩子。

2. **计划状态。** 定义带类型的 TodoWrite 模式，包含 pending / in_progress / done 项目及备注。模型每轮通过工具调用重写完整状态，不允许增量修改。将计划持久化到 `.agent/state.json`，以便崩溃后恢复。

3. **工具接口。** 定义六个工具：`read_file`、带差异预览的 `edit_file`、`ripgrep`、`tree_sitter_symbols`、带超时的 `run_shell`、`git`（status / diff / commit / push）。通过 MCP StreamableHTTP 暴露，使框架不依赖具体传输。每个工具返回截断输出，每次调用最多 4k 词元。

4. **沙箱封装。** 每个任务启动 E2B 沙箱，使用 `git worktree add -b agent/$TASK_ID` 创建新分支。所有工具调用都在沙箱内执行，宿主文件系统不可访问。

5. **钩子。** 实现全部八种 2026 钩子类型，至少接入四个用户编写的钩子：(a) `PreToolUse` 破坏性命令防护，阻止工作树外的 `rm -rf`；(b) `PostToolUse` 词元记账；(c) `SessionStart` 预算初始化；(d) `Stop` 写出最终追踪包。

6. **评估循环。** 克隆 SWE-bench Pro Python 的 30 问题子集，对每项运行框架。与最小基线 mini-swe-agent 比较 pass@1、每任务轮数和每任务美元成本，将结果写入 `eval/results.jsonl`。

7. **成本控制。** 硬性截断：50 轮、200k 上下文、每任务 5 美元。到 150k 时，`PreCompact` 钩子将旧轮次概括为先前状态块，为新观测腾出空间，同时保留计划。

8. **发布 PR。** 成功后，最后执行 `git push`，再调用 GitHub API 创建 PR，正文包含计划和差异摘要。

## 实际应用（Use It）

```
$ agent run ./my-repo "Fix the race condition in worker.rs"
[plan]  1 locate worker.rs and enumerate mutex uses
        2 identify shared state under contention
        3 propose fix, verify tests
[tool]  ripgrep mutex.*lock -t rust           (44 matches, truncated)
[tool]  read_file src/worker.rs 120..180
[tool]  edit_file src/worker.rs (+8 -3)
[tool]  run_shell cargo test worker::          (passed)
[plan]  1 done · 2 done · 3 done
[done]  PR opened: #482   turns=9   tokens=38k   cost=$0.41
```

## 交付成果（Ship It）

交付技能位于 `outputs/skill-terminal-coding-agent.md`。给定仓库路径和任务描述，它会在沙箱中运行完整的规划—行动—观察循环，返回 PR URL 和追踪包。本综合实践评分标准如下：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 相对基线的 SWE-bench Pro pass@1 | 在相同 30 个 Python 任务上比较你的框架与 mini-swe-agent |
| 20 | 架构清晰度 | 规划 / 行动 / 观察分离、钩子接口、工具模式，参照 Live-SWE-agent 布局评审 |
| 20 | 安全 | 沙箱逃逸测试、权限提示、破坏性命令防护通过红队测试 |
| 20 | 可观测性 | 追踪完整性，100% 工具调用有跨度；逐轮词元记账 |
| 15 | 开发者体验 | 冷启动 < 2s，崩溃恢复后继续计划，Ctrl-C 能干净取消执行中的工具 |
| **100** | | |

## 练习（Exercises）

1. 将后端模型从 Claude Sonnet 4.7 换为 vLLM 提供的 Qwen3-Coder-30B。比较 pass@1 与每任务美元成本，报告开放模型在哪些地方表现不足。

2. 添加 `reviewer` 子智能体，在发布 PR 前读取差异，并可要求进入修订循环。衡量误报评审是否使 SWE-bench 通过率低于单智能体基线，提示：通常会。

3. 对沙箱做压力测试：编写尝试 `curl` 外部 URL 的任务，以及写入工作树外部的任务。确认两者都被 PreToolUse 钩子阻止，记录尝试。

4. 使用较小模型 Haiku 4.5 实现 `PreCompact` 摘要。衡量经历 3 次压缩后，计划保真度损失多少。

5. 将 MCP StreamableHTTP 传输换为 stdio，基准测试冷启动与每次调用延迟，选择更适合纯本地使用的方案。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 运行框架（Harness） | “智能体循环” | 围绕模型的代码，负责分发工具、维护计划状态并执行预算限制 |
| 钩子（Hook） | “智能体事件监听器” | 用户编写的脚本，由框架在八种生命周期事件之一发生时运行 |
| 工作树（Worktree） | “Git 沙箱” | 位于独立路径的关联 git 检出，可丢弃而不影响主克隆 |
| TodoWrite | “计划状态” | 模型每轮重写的带类型列表，项目状态为 pending/in-progress/done |
| StreamableHTTP | “MCP 传输” | MCP 2026 修订版中的长连接 HTTP 双向流式传输，替代 SSE |
| 词元上限（Token Ceiling） | “上下文预算” | 每轮或每会话输入与输出词元总量限制，触发压缩或终止 |
| pass@1 | “单次尝试通过率” | 不重试、不偷看测试集，首次运行就解决的 SWE-bench 任务比例 |

## 延伸阅读（Further Reading）

- [Claude Code 文档](https://docs.anthropic.com/en/docs/claude-code)：Anthropic 的参考运行框架
- [Cursor 3 更新日志](https://cursor.com/changelog)：Agent Tabs 与 Composer 2 产品说明
- [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)：SWE-bench 框架比较的最小基线
- [Live-SWE-agent](https://github.com/OpenAutoCoder/live-swe-agent)：配合 Opus 4.5 在 SWE-bench Verified 达到 79.2%
- [OpenCode](https://opencode.ai)：开放运行框架，112k 星标
- [SWE-bench Pro 排行榜](https://www.swebench.com)：本综合实践的目标评估
- [模型上下文协议 2026 路线图](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)：StreamableHTTP、能力元数据
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：工具调用与词元用量的跨度模式
