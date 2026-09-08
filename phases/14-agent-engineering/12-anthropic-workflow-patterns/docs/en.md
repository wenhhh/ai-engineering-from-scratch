# Anthropic 的工作流模式：简单优于复杂（Anthropic's Workflow Patterns: Simple Over Complex）

> Schluntz 和 Zhang（Anthropic，2024 年 12 月）区分了工作流（Workflow，预定义路径）与智能体（Agent，动态工具使用）。五种工作流模式覆盖大多数情况。从直接 API 调用开始，只有无法预知步骤时才添加智能体。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出 Anthropic 的五种工作流模式：提示词链（Prompt chaining）、路由（Routing）、并行化（Parallelization）、编排器-执行器（Orchestrator-workers）、评估器-优化器（Evaluator-optimizer）。
- 解释智能体与工作流的区别，以及各自的工程成本。
- 识别何时应选工作流而非智能体，以及相反情况。
- 使用脚本化 LLM，以标准库实现全部五种模式。

## 问题（The Problem）

有些问题只需要一次函数调用，团队却选择多智能体框架。代价真实存在：框架增加层次，遮蔽提示词、隐藏控制流，并引入过早的复杂性。Schluntz 和 Zhang 于 2024 年 12 月发表的文章，是业内被引用最多的反对声音：从简单方案开始，只有收益抵得上成本时才增加复杂性。

## 概念（The Concept）

### 工作流与智能体（Workflows vs agents）

- **工作流（Workflow）。** 通过预定义代码路径编排 LLM 与工具。工程师掌控图。
- **智能体（Agent）。** LLM 动态指挥自己的工具，自行决定步骤。模型掌控图。

两者各有适用场景。工作流更便宜、更快、更易调试。智能体能够解决开放式问题，但其故障模式更难推断。

### 增强型 LLM（The augmented LLM）

五种模式的基础都是：一个 LLM 接入三项能力，搜索（检索）、工具（行动）、记忆（持久化）。任何 API 调用都可以使用它们。

### 五种模式（The five patterns）

1. **提示词链（Prompt chaining）。** 调用 1 的输出是调用 2 的输入。适用于任务可清晰线性分解的情况。步骤间可添加程序化门禁。

2. **路由（Routing）。** 分类器 LLM 选择调用哪个下游 LLM 或工具。适用于不同类别输入需要不同处理的情况，如一线支持、退款、缺陷、销售。

3. **并行化（Parallelization）。** 并发运行 N 次 LLM 调用，再聚合结果。两种形态：分块（Sectioning，不同片段）和投票（Voting，同一提示词运行 N 次，再按多数或综合结果汇总）。

4. **编排器-执行器（Orchestrator-workers）。** 编排器 LLM 动态决定运行哪些执行器，执行器也是 LLM，再综合其输出。类似智能体循环，但编排器不会无限循环。

5. **评估器-优化器（Evaluator-optimizer）。** 一个 LLM 提出答案，另一个 LLM 评估它。迭代直到评估器通过。这是 Self-Refine（第 05 课）的推广。

### 工作流何时优于智能体（Where workflows beat agents）

- **可预测任务（Predictable tasks）。** 如果能列出步骤，就应该列出来。
- **成本受限任务（Cost-bound tasks）。** 工作流的步数有界，智能体可能失控增长。
- **合规受限任务（Compliance-bound tasks）。** 审计人员希望直接阅读图，而不是从轨迹推断它。

### 智能体何时优于工作流（Where agents beat workflows）

- **开放式研究（Open-ended research）。** 下一步取决于上一步返回的内容。
- **长度可变任务（Variable-length tasks）。** 工作可能持续几分钟到几小时，步数未知。
- **新领域（Novel domains）。** 尚不清楚正确工作流时，先探索，后固化。

### 配套的上下文工程（The context-engineering companion）

《面向 AI 智能体的有效上下文工程》（Effective context engineering for AI agents，Anthropic，2025）将相邻学科形式化：200k 窗口是预算，不是容器。需要决定放入什么、何时压缩、何时允许上下文增长。阶段 14 的上下文压缩课详细讨论此事，即本课程重新编号前阶段 14 的第 06 课。

```figure
workflow-chain
```

## 动手实现（Build It）

`code/main.py` 使用 `ScriptedLLM` 实现全部五种工作流模式：

- `prompt_chain(input, steps)`：顺序执行。
- `route(input, classifier, handlers)`：分类 + 分派。
- `parallel_vote(prompt, n, aggregator)`：运行 N 次并聚合。
- `orchestrator_workers(task, workers)`：编排器选择执行器。
- `evaluator_optimizer(task, proposer, evaluator, max_iter)`：循环直到通过。

运行：

```
python3 code/main.py
```

每种模式都打印自己的轨迹。每种模式约 10-15 行代码，而框架的成本以数千行计。

## 实际应用（Use It）

- 大多数任务直接使用 API 调用。
- 只有模式确实需要持久状态（LangGraph）、参与者模型并发（AutoGen v0.4）或角色模板（CrewAI）时，才使用框架。
- 希望复用 Claude Code 的执行框架（Harness）而不自行重建时，选择 Claude Agent SDK。

## 交付成果（Ship It）

`outputs/skill-workflow-picker.md` 根据任务描述选择合适模式，包含决策依据，以及工作流不足时重构为智能体的路径。

## 练习（Exercises）

1. 实现带置信度阈值的路由。低于阈值 -> 升级给人工。一线支持场景中的阈值应设在哪里？
2. 为 `parallel_vote` 添加超时。某次调用挂起时会怎样？缺少部分票时如何聚合？
3. 将 `evaluator_optimizer` 改为多臂老虎机（Bandit）：跨迭代保留前 2 个输出，避免后期的好结果被后期的坏结果覆盖。
4. 组合提示词链与路由：路由器从三条链中选择一条。与单个大提示词方案比较词元成本。
5. 选择一个你的生产功能，画出工作流图并统计步骤。这里使用智能体真的更好吗？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 工作流（Workflow） | “预定义流程” | 工程师掌控的 LLM 与工具调用图 |
| 智能体（Agent） | “自主 AI” | 模型掌控图，动态指挥工具 |
| 增强型 LLM（Augmented LLM） | “带工具的 LLM” | LLM + 搜索 + 工具 + 记忆，是基本单元 |
| 提示词链（Prompt chaining） | “顺序调用” | 调用 N 的输出是调用 N+1 的输入 |
| 路由（Routing） | “分类器分派” | 选择由哪条链或哪个模型处理输入 |
| 并行化（Parallelization） | “扇出” | N 次并发调用，通过分块或投票聚合 |
| 编排器-执行器（Orchestrator-workers） | “分派智能体” | 编排器 LLM 动态选择专门 LLM |
| 评估器-优化器（Evaluator-optimizer） | “提议者 + 裁判” | 迭代直到评估器通过，是 Self-Refine 的推广 |

## 延伸阅读（Further Reading）

- [Anthropic，构建有效智能体（Building Effective Agents，2024 年 12 月）](https://www.anthropic.com/research/building-effective-agents)：五种工作流模式。
- [Anthropic，面向 AI 智能体的有效上下文工程（Effective context engineering for AI agents）](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：配套学科。
- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：有状态图何时值得付出成本。
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)：产品化的编排器-执行器模式。
