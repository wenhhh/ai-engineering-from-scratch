# 交接与例程：无状态编排（Handoffs and Routines — Stateless Orchestration）

> OpenAI Swarm（2024 年 10 月）将多智能体编排提炼为两种原语：**例程（Routine）**，即作为系统提示词的指令 + 工具；**交接（Handoff）**，即返回另一个 Agent 的工具。没有状态机或分支领域特定语言（DSL），LLM 调用正确交接工具来路由。OpenAI Agents SDK（2025 年 3 月）是生产继任者。Swarm 本身仍是最清晰的概念参考，全部源码仅几百行。模式广泛流行，因为接口大致就是“智能体 = 提示词 + 工具；交接 = 返回智能体的函数”。局限是无状态，因此记忆由调用者负责。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）
**Time:** ~60 分钟

## 问题（Problem）

每个多智能体框架都要求学习其 DSL：LangGraph 节点和边、CrewAI 团队和任务、AutoGen GroupChat 和管理者。DSL 是真实抽象，但让事情显得比实际需要更沉重。

Swarm 反其道而行，使用模型已有的工具调用能力。交接成为工具调用，当前持有对话的智能体就是编排者，状态机隐含在智能体系统提示词中。

## 概念（Concept）

### 两种原语（Two primitives）

**例程（Routine）。** 定义智能体角色和可用工具的系统提示词，可视为一组限定范围的指令：“你是分流智能体；若用户询问退款，交接给退款智能体。”

**交接（Handoff）。** 智能体可调用、返回新 Agent 对象的工具。Swarm 运行时检测 Agent 返回值，将下一轮的活动智能体切换为它。

这就是全部抽象。

```
def transfer_to_refunds():
    return refund_agent  # Swarm sees Agent return → switch active agent

triage_agent = Agent(
    name="triage",
    instructions="Route the user to the right specialist.",
    functions=[transfer_to_refunds, transfer_to_sales, transfer_to_support],
)
```

分流智能体系统提示词让它根据用户消息选择正确交接。LLM 工具调用负责路由。

### 为何流行（Why it is viral）

- **小型 API。** 只需学习两个概念。
- **复用模型已有能力。** 各服务商的工具调用已经达到生产级。
- **没有状态机负担。** 不必描述图；智能体提示词描述交接给谁。

### 无状态权衡（The stateless trade）

Swarm 明确在运行之间无状态。框架运行中保存消息历史，但不持久化任何内容。记忆、连续性、长任务都由调用者负责。

生产继任者 OpenAI Agents SDK（2025 年 3 月）的主要变化之一就是这点：保留交接原语，同时增加内置会话管理、防护机制和追踪。

### Swarm/交接何时适合（When Swarm/handoffs fit）

- **分流模式（Triage patterns）。** 一线智能体把用户路由给专职智能体。
- **基于技能的交接。** “任务需要代码就调用编码者，需要研究就调用研究员。”
- **短而有界的对话。** 客服、常见问题到工单、简单工作流。

### Swarm 的困难场景（When Swarm struggles）

- **有共享记忆的长会话。** 交接将对话状态重设为新智能体提示词加历史。没有调用者管理的记忆，就没有跨智能体持久状态。
- **并行执行。** 交接每次只切换一个活动智能体。并行需要调用者编排多次 Swarm 运行。
- **审计与重放。** 无状态运行难以精确重放；LLM 的交接选择非确定性。

### OpenAI Agents SDK（2025 年 3 月 / March 2025）

生产继任者增加：

- **会话状态（Session state）。** 跨运行持久对话线程。
- **防护机制（Guardrails）。** 输入输出验证钩子。
- **追踪（Tracing）。** 记录每次工具调用和交接。
- **交接过滤器（Handoff filters）。** 控制交接转移哪些上下文。

交接原语得以保留，周围增加了生产易用性功能。

### Swarm 与 GroupChat（Swarm vs GroupChat）

两者都用 LLM 驱动路由，但**谁选下一位**不同：

- GroupChat：外部选择器（函数或 LLM）选择下一发言者。
- Swarm：当前智能体通过交接工具选择继任者。

Swarm 是“智能体决定下一步”，GroupChat 是“管理者决定下一步”。Swarm 决策位于活动智能体的工具调用，GroupChat 决策位于 `GroupChatManager`。

```figure
sw-handoff-routing
```

## 动手实现（Build It）

`code/main.py` 从零实现 Swarm：Agent 数据类、交接机制（工具返回 Agent）、检测智能体切换的运行循环。

演示：分流智能体路由给退款、销售或支持专职智能体。各自拥有工具，运行循环打印每次交接。

运行：

```
python3 code/main.py
```

## 实际应用（Use It）

`outputs/skill-handoff-designer.md` 为给定任务设计交接拓扑：有哪些智能体、各可调用哪些交接、转移哪些上下文。

## 交付成果（Ship It）

检查清单：

- **交接日志。** 每次交接写入包含来源智能体、目标智能体、上下文快照的追踪事件。
- **上下文转移规则。** 决定转移完整历史（昂贵）、最近 N 条消息，还是摘要。
- **交接防护机制。** 向不同工具权限的专职智能体交接必须认证，否则提示词注入可强制触发非预期交接。
- **循环检测。** 两个智能体来回交接是常见故障；用简单的最近 K 次环检查检测。
- **兜底智能体。** 目标不存在时，回退到安全默认智能体。

## 练习（Exercises）

1. 运行 `code/main.py`，分流到退款智能体，确认第二轮活动智能体是退款智能体。
2. 增加循环检测规则：同两个智能体连续交接 3 次就强制退出，设计兜底行为。
3. 阅读 OpenAI Agents SDK 交接过滤器文档。实现“交接时摘要”：移交方先把上下文压缩为要点摘要，再让接收方接管。
4. 比较 Swarm 交接与 GroupChatManager 选择器。哪种模式使提示词注入更严重，为什么？
5. 阅读 Swarm 示例指南（https://developers.openai.com/cookbook/examples/orchestrating_agents），指出 OpenAI Agents SDK 改变或保留的一项明确 Swarm 设计决策。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 例程（Routine） | “智能体提示词” | 系统提示词 + 工具列表，定义角色和可用交接。 |
| 交接（Handoff） | “转给另一个智能体” | 活动智能体可调用、返回新 Agent 的工具，运行时切换活动智能体。 |
| 无状态（Stateless） | “运行间没有记忆” | Swarm 不持久化任何内容，记忆由调用者负责。 |
| 活动智能体（Active agent） | “现在谁在说” | 当前持有对话的智能体，交接改变它。 |
| 上下文转移（Context transfer） | “交接带走什么” | 接收智能体可见历史的策略：完整、最近 N 条或摘要。 |
| 交接循环（Handoff loop） | “智能体来回推” | 两个智能体不断交回彼此的故障模式。 |
| OpenAI Agents SDK | “生产级 Swarm” | 2025 年 3 月继任者，在交接原语之上增加会话、防护、追踪。 |
| 交接过滤器（Handoff filter） | “转移关卡” | SDK 在交接边界检查和修改上下文的功能。 |

## 延伸阅读（Further Reading）

- [OpenAI 示例指南：编排智能体，例程与交接（Orchestrating Agents: Routines and Handoffs）](https://developers.openai.com/cookbook/examples/orchestrating_agents)：参考阐述
- [OpenAI Swarm 仓库（repo）](https://github.com/openai/swarm)：保留作概念参考的原始实现
- [OpenAI Agents SDK 文档（docs）](https://openai.github.io/openai-agents-python/)：提供会话与追踪的生产继任者
- [Anthropic Claude 交接说明（handoff-in-Claude notes）](https://docs.anthropic.com/en/docs/claude-code)：Claude Code 子智能体如何通过 `Task` 使用类似交接的模式
