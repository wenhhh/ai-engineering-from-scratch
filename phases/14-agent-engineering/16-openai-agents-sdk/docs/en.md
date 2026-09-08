# OpenAI Agents SDK：交接、护栏与追踪（Handoffs, Guardrails, Tracing）

> OpenAI Agents SDK 是基于 Responses API 的轻量级多智能体框架。它包含五种基本构件：智能体（Agent）、交接（Handoff）、护栏（Guardrail）、会话（Session）和追踪（Tracing）。交接以名为 `transfer_to_<agent>` 的工具呈现。护栏可在输入或输出环节触发拦截。追踪默认开启。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 01（智能体循环），第 14 阶段 · 06（工具使用）
**Time:** 约 75 分钟

## 学习目标（Learning Objectives）

- 列出 OpenAI Agents SDK 的五种基本构件。
- 解释交接：为何将它建模为工具、模型看到的名称形式，以及上下文如何转移。
- 区分输入护栏、输出护栏和工具护栏；解释 `run_in_parallel` 与阻塞模式。
- 使用标准库实现包含交接、护栏和跨度（Span）式追踪的运行时。

## 问题（The Problem）

无法清晰委派工作的智能体，最终会把所有内容塞进一个提示词。缺少护栏的智能体可能泄露个人身份信息（PII）、输出违反策略的内容，或陷入无限循环。OpenAI 的 SDK 将使多智能体工作变得可控的三种基本构件规范化。

## 概念（The Concept）

### 五种基本构件（Five primitives）

1. **智能体（Agent）。** 大语言模型（LLM）+ 指令 + 工具 + 交接。
2. **交接（Handoff）。** 将任务委派给另一个智能体。在模型面前，它表现为名为 `transfer_to_<agent_name>` 的工具。
3. **护栏（Guardrail）。** 校验输入（仅第一个智能体）、输出（仅最后一个智能体）或工具调用（逐个函数工具）。
4. **会话（Session）。** 自动维护跨轮次的对话历史。
5. **追踪（Tracing）。** 为 LLM 生成、工具调用、交接和护栏内置跨度记录。

### 作为工具的交接（Handoffs as tools）

模型会在工具列表中看到 `transfer_to_billing_agent`。调用它会通知运行时执行以下操作：

1. 复制对话上下文（或通过处于测试阶段的 `nest_handoff_history` 将其折叠）。
2. 使用目标智能体的指令初始化该智能体。
3. 由目标智能体继续本次运行。

这是监督者模式（第 13 课 / 第 28 课）的产品化实现。

### 护栏（Guardrails）

三种类型：

- **输入护栏（Input guardrails）。** 作用于第一个智能体的输入。在任何 LLM 调用之前拒绝不安全或超出范围的请求。
- **输出护栏（Output guardrails）。** 作用于最后一个智能体的输出。捕获 PII 泄露、策略违规和格式错误的响应。
- **工具护栏（Tool guardrails）。** 对每个函数工具运行。校验参数、检查权限并审计执行过程。

运行模式：

- **并行（Parallel）**（默认）。护栏 LLM 与主 LLM 同时运行，尾延迟更低。如果触发拦截，主 LLM 的工作将被丢弃，造成词元浪费。
- **阻塞（Blocking）**（`run_in_parallel=False`）。先运行护栏 LLM。如果触发拦截，主调用不会浪费词元。

触发拦截时会抛出 `InputGuardrailTripwireTriggered` / `OutputGuardrailTripwireTriggered`。

### 追踪（Tracing）

默认开启。每次 LLM 生成、工具调用、交接和护栏执行都会发出一个跨度。设置 `OPENAI_AGENTS_DISABLE_TRACING=1` 可关闭追踪。`add_trace_processor(processor)` 会将跨度同时分发到你自己的后端和 OpenAI 的后端。

### 会话（Sessions）

`Session` 将对话历史存储在后端中（SQLite、Redis 或自定义后端）。`Runner.run(agent, input, session=session)` 会自动加载历史并追加新内容。

### 模式的失效点（Where this pattern goes wrong）

- **交接漂移（Handoff drift）。** 智能体 A 交给 B，B 又交回 A。应添加跳数计数器。
- **护栏绕过（Guardrail bypass）。** 工具护栏仅对函数工具触发；内置工具（文件读取、网页获取）需要单独的策略。
- **过度追踪（Over-tracing）。** 跨度可能包含敏感内容。应结合 OTel GenAI 内容采集规则（第 23 课），将内容存到外部，通过 ID 引用。

```figure
ae-agent-handoff
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现了 SDK 的基本形式：

- `Agent`、`FunctionTool`、`Handoff`（具有转移语义的函数工具）。
- 包含输入、输出及工具护栏、交接分派和跳数计数器的 `Runner`。
- 用于展示追踪结构的简单跨度发射器。
- 根据用户查询交给账单或支持智能体的分诊智能体；其中一个输入会触发护栏拦截。

运行：

```
python3 code/main.py
```

追踪结果展示两次成功交接、一次输入护栏拦截，以及与真实 SDK 输出对应的跨度树。

## 实际应用（Use It）

- **OpenAI Agents SDK**：用于以 OpenAI 为主的产品。
- **Claude Agent SDK**（第 17 课）：用于以 Claude 为主的产品。
- **LangGraph**（第 13 课）：用于需要显式状态与持久化恢复的场景。
- **自定义实现（Custom）**：用于需要精确控制的场景，如语音、多提供商和联邦式部署。

## 交付成果（Ship It）

`outputs/skill-agents-sdk-scaffold.md` 为 Agents SDK 应用搭建骨架，包含分诊智能体、交接、输入/输出/工具护栏、会话存储和追踪处理器。

## 练习（Exercises）

1. 添加交接跳数计数器：转移 N 次后拒绝继续。追踪这一行为。
2. 将 `nest_handoff_history` 实现为可选配置，在转移之前把此前消息折叠为一条摘要。
3. 编写一个阻塞式输出护栏。比较触发拦截和通过检查的提示词各自的延迟。
4. 将 `add_trace_processor` 接到 JSON 日志记录器。它针对每个跨度输出什么结构？
5. 阅读 SDK 文档。将标准库实验程序移植到 `openai-agents-python`。哪些部分原先建模错了？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 智能体（Agent） | “LLM + 指令” | SDK 中的智能体类型，拥有工具和交接 |
| 交接（Handoff） | “转移” | 模型调用的工具，用于委派给另一个智能体 |
| 护栏（Guardrail） | “策略检查” | 对输入、输出或工具调用进行校验 |
| 触发线（Tripwire） | “护栏触发拦截” | 护栏拒绝时抛出的异常 |
| 会话（Session） | “历史存储” | 在运行之间持久保存的对话记忆 |
| 追踪（Tracing） | “跨度” | 对 LLM、工具、交接和护栏提供内置可观测性 |
| 阻塞式护栏（Blocking guardrail） | “顺序检查” | 先运行护栏；拦截时不浪费词元 |
| 并行式护栏（Parallel guardrail） | “并发检查” | 护栏同时运行；延迟更低，但拦截时会浪费词元 |

## 延伸阅读（Further Reading）

- [OpenAI Agents SDK 文档](https://openai.github.io/openai-agents-python/)：基本构件、交接、护栏和追踪
- [Claude Agent SDK 概览](https://platform.claude.com/docs/en/agent-sdk/overview)：面向 Claude 的对应方案
- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：何时值得使用交接
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：Agents SDK 跨度所映射的标准
