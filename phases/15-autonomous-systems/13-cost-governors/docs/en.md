# 动作预算、迭代上限与成本控制器（Action Budgets, Iteration Caps, and Cost Governors）

> 一家中型电商的智能体启用“订单跟踪”技能后，月度 LLM 成本从 $1,200 跳至 $4,800。这不是定价错误，而是智能体找到新循环并持续花钱。Microsoft Agent Governance Toolkit（2026 年 4 月 2 日）将此类防御规范化：每请求 `max_tokens`、每任务词元与美元预算、每日/每月上限、迭代上限、分层模型路由、提示词缓存、上下文窗口化、昂贵动作上的 HITL 检查点、超预算紧急停止。Anthropic Claude Code Agent SDK 以不同名称提供同类机制。财务速率限制（Financial velocity limit），例如 10 分钟超过 >$50 即切断访问，比月度上限更快捕获循环。

**Type:** Learn
**Languages:** Python（标准库，分层成本控制器模拟器）
**Prerequisites:** 阶段 15 · 10（权限模式，Permission modes），阶段 15 · 12（持久执行，Durable execution）
**Time:** ~60 分钟

## 问题（The Problem）

自主智能体每轮都花真钱。聊天机器人的糟糕输出是一条糟糕回复，智能体的糟糕循环是一张账单。业界将此失效模式称为“钱包拒绝服务（Denial of Wallet）”：不断推理、调用工具、计费，而没有任何东西阻止，因为根本未设计阻止机制。

解决办法不是设定一个数值，而是在不同时间尺度和粒度上设置多层限制：每个请求、每个任务、每小时、每日、每月。设计良好的控制体系，能在几分钟内发现失控循环、几小时内发现持续的小额超支、一天内发现发布新版本带来的成本问题。长时程智能体自主运行时，也需要这些限制来守住预算。

这是工程课：数学简单，团队失败在执行纪律。下列限制都见于 Microsoft Agent Governance Toolkit 或 Anthropic Claude Code Agent SDK 文档。

## 概念（The Concept）

### 成本控制器栈（The cost-governor stack）

1. **每请求 `max_tokens`。** 简单直接，防止单次调用生成无限长补全。
2. **每任务词元预算。** 整次运行不超过 N 词元，到上限硬停止。
3. **每任务美元预算。** 与词元预算相同，但用货币计量；Claude Code 中为 `max_budget_usd`。
4. **每工具调用上限。** 最多 N 次 `WebFetch`、N 次 `shell_exec` 等。
5. **迭代上限（`max_turns`）。** 限制智能体循环总迭代数，防止无限推理循环。
6. **每分钟 / 每小时 / 每日 / 每月上限。** 滚动窗口，在不同时间尺度捕获泄漏。
7. **财务速率限制。** 例如“10 分钟花费超过 $50，切断访问”，在月度上限触发前捕获循环烧钱。
8. **分层模型路由（Tiered model routing）。** 默认小模型，仅在分类器认为任务需要时升级大模型。
9. **提示词缓存（Prompt caching）。** 系统提示词和稳定上下文存于服务商缓存，重发词元成本接近零。
10. **上下文窗口化（Context windowing）。** 通过压缩/摘要将活跃上下文保持在阈值下，直接降低词元成本。
11. **昂贵动作上的 HITL 检查点。** 已知昂贵动作前，如长工具调用、大下载、高价模型升级，要求人类点击确认。
12. **预算超限紧急停止。** 任一上限触发，会话中止；记录上限，并要求独立重新启用路径。

### 为什么需要栈而非单一上限（Why the stack, not one cap）

单一月度上限只能在钱包耗尽后捕获失控智能体；单请求上限无法捕获会话级问题。不同失效模式需要不同时间尺度：

- **失控循环**（困在 5 秒重试中）：由速率限制捕获。
- **缓慢泄漏**（每任务工作量约为预期 ~2x）：由每日上限捕获。
- **有问题的发布**（新版本使用 5x 词元）：由每周 / 每月上限捕获。
- **合理激增**（真实需求而非错误）：由小时 / 日上限捕获，附清晰日志。

### 运行框架预算接口（A harness budget surface）

Claude Code Agent SDK 公开文档提供：

- `max_turns`：迭代上限。
- `max_budget_usd`：美元上限，超限中止会话。
- `allowed_tools` / `disallowed_tools`：工具允许与拒绝列表。
- 工具使用前的钩子，用于自定义成本核算。

这些限制应与权限阶梯（第 10 课）结合使用。未设置 `max_budget_usd` 的 `autoMode` 会话，会在缺少预算约束的情况下自主运行。Anthropic 明确要求为 Auto Mode 配置预算控制；动作分类审查与成本控制解决的是两个独立问题。

### 欧盟 AI 法案与 OWASP Agentic Top 10（EU AI Act, OWASP Agentic Top 10）

Microsoft Agent Governance Toolkit 覆盖 OWASP Agentic Top 10 和欧盟 AI 法案第 14 条（人工监督）要求。面向欧盟的生产部署，日志与上限执行不是可选项。

### 已观察到的 $1,200 → $4,800 案例（The observed $1,200 → $4,800 case）

Microsoft 文档中的真实案例：电商智能体增加工具后，月成本增加了三倍。工具允许它在每次会话轮询订单状态。无循环检测、无每工具上限、无周环比增长告警。修正是每工具上限加每日增长告警。这是通用模板：每个新增工具面都是潜在新循环，每个新工具都需自己的上限与告警。

```figure
cost-governor-stack
```

## 实际应用（Use It）

`code/main.py` 模拟有无分层成本控制器的运行。智能体若干轮后漂移到轮询循环；分层栈在速率窗口内捕获它，而单一月度上限要几天后才触发。

## 交付成果（Ship It）

`outputs/skill-agent-budget-audit.md` 审计拟议部署的成本控制器栈，标记缺失层。

## 练习（Exercises）

1. 运行 `code/main.py`。确认轮询轨迹中速率限制先于迭代上限触发，再禁用速率限制，测量迭代上限捕获前“花费”多少。

2. 为浏览器智能体（第 11 课）设计每工具上限。哪个工具需最紧上限？哪个可无限运行而无风险？

3. 阅读 Microsoft Agent Governance Toolkit 文档，列出每种上限，映射到失控循环、缓慢泄漏、有问题发布、激增之一。

4. 为一个实际任务的通宵无人值守运行估算成本，例如“对仓库中的 50 个问题进行分类和初步处理”。将 `max_budget_usd` 设为点估计的 2x，并解释为何采用 2x。

5. Claude Code 的 `max_budget_usd` 按会话累计成本触发。设计外部补充速率限制：什么触发切断，如何重新启用？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 钱包拒绝服务（Denial of Wallet） | “失控账单” | 智能体循环产生花费，没有上限阻止 |
| max_tokens | “每请求上限” | 单次补全大小上限 |
| max_turns | “迭代上限” | 会话内智能体循环迭代上限 |
| max_budget_usd | “美元紧急停止开关” | 会话成本上限，超限中止 |
| 速率限制（Velocity limit） | “速率上限” | 短窗口花费限制，例如 $50 / 10 分钟 |
| 分层路由（Tiered routing） | “小模型优先” | 默认廉价模型，仅分类器认为需要时升级 |
| 提示词缓存（Prompt caching） | “缓存系统提示词” | 服务商缓存使重发词元成本接近零 |
| HITL 检查点（HITL checkpoint） | “人工批准门禁” | 昂贵动作前需人类点击 |

## 延伸阅读（Further Reading）

- [Anthropic Claude Code Agent SDK：智能体循环与预算](https://code.claude.com/docs/en/agent-sdk/agent-loop)：`max_turns`、`max_budget_usd`、工具允许列表。
- [Microsoft Agent Framework：人在回路与治理](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)：成本控制器检查点。
- [Anthropic：Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)：服务商侧成本控制。
- [Anthropic：提示词缓存（Claude API 文档）](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)：缓存机制。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：长时程智能体成本特征。
