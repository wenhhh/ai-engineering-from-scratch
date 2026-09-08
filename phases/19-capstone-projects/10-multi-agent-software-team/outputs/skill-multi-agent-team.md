---
name: multi-agent-team
description: 构建含架构师、并行编码者、评审者与测试者的多智能体软件团队，在 SWE-bench Pro 上测量，并生成交接复盘。
version: 1.0.0
phase: 19
lesson: 10
tags: [capstone, multi-agent, swe-bench, langgraph, a2a, worktree, roles]
---

给定 GitHub 问题 URL 和并行度，部署多智能体软件团队，生成可合并的 PR。在 50 个 SWE-bench Pro 问题上评估，发布交接失败直方图（Handoff-Failure Histogram）。

构建计划（Build Plan）：

1. 任务看板（Task Board）：以文件或 Redis 支持的 JSONL 存储类型化消息。消息类型：plan_request、subtask、diff_ready、review_needed、review_feedback、approved、test_needed、test_passed、test_failed、replan_needed。
2. 架构师（Architect，Opus 4.7）：读取问题、编写计划，输出接口明确的子任务 DAG，包括改动文件、公共函数、测试影响。
3. N 个编码者（Coders，Sonnet 4.7）：各自领取子任务，创建全新的 `git worktree add` + Daytona 沙箱，独立实现。
4. 合并协调者（Merge Coordinator）：三方合并；仅文件级重叠时由 LLM 协助解决冲突。
5. 评审者（Reviewer，GPT-5.4）：读取合并差异；不能批准自己编写的差异；输出 approved 或 review_feedback，路由到相关编码者。
6. 测试者（Tester，Gemini 2.5 Pro）：在干净沙箱中运行测试套件；输出 test_passed 或 test_failed，附交付物。
7. 交接核算（Handoff Accounting）：每条跨角色消息对应一个 Langfuse 跟踪区段（Span），记录载荷大小与模型。计算词元放大率（Token Amplification）= total_tokens / single_agent_baseline_tokens。
8. 在 10% 的运行中注入明显缺陷探测，测量评审者错误批准率（False-Approve Rate）。
9. 在 50 个 SWE-bench Pro 问题上运行；发布 pass@1、相对单智能体基线的实际运行时间、逐角色词元明细、交接失败直方图。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 50 问题子集 pass@1 |
| 20 | 并行加速比（Parallel Speedup） | 相比单智能体基线的实际运行时间 |
| 20 | 评审质量 | 注入缺陷探测中的错误批准率 |
| 20 | 词元效率 | 每个已解决问题的总词元数，与单智能体比较 |
| 15 | 协调工程 | 合并冲突解决、交接失败直方图 |

直接判定不合格的情况（Hard Rejects）：

- 评审者能够批准自己编写或建议的差异。这是硬性约束。
- 报告没有匹配的单智能体基线运行。多智能体必须在*每美元产出*上胜出，而不只是 pass@1。
- 任务看板消息是自由格式字符串，而非类型化 A2A 消息。
- 合并协调者静默丢弃冲突差异，而非退回重新规划。

拒绝规则（Refusal Rules）：

- 未逐角色设置预算上限（词元 + 美元）时，拒绝运行。
- 测试者尚未在干净沙箱中验证时，拒绝创建 PR。
- 拒绝在单次运行中将编码者扩展至 8 个以上。超过该数量后协调开销占主导。

输出：一个仓库，包含任务看板与角色工作者、SWE-bench Pro 50 问题运行日志、匹配的单智能体基线运行、带角色标签跟踪区段和逐角色词元明细的 Langfuse 仪表盘、缺陷注入探测报告，以及说明最常失效的三种交接及分别减少这些失败的消息模式或提示词改动的复盘。
