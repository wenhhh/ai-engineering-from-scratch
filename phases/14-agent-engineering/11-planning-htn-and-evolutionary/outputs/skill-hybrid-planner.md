---
name: hybrid-planner
description: 构建混合规划器（Hybrid planner）：ChatHTN 用于可证明可靠的计划，AlphaEvolve 用于带机器可检查评估器的代码搜索，并为问题选择合适方案。
version: 1.0.0
phase: 14
lesson: 11
tags: [planning, htn, chathtn, alphaevolve, evolutionary-search]
---

给定问题类别，如受策略约束的工作流、代码优化或开放式任务，选择规划器并生成正确骨架。

决策：

1. 问题是否具有硬前置条件、策略或调度约束？-> HTN（ChatHTN）。
2. 问题是否具有确定、机器可检查的适应度函数？-> 进化式（AlphaEvolve）。
3. 两者都没有？-> 改用 ReAct（第 01 课）或 ReWOO（第 02 课）。

对于 HTN，请生成：

1. `Operator` 类型，包含 `preconditions`、`effects_add`、`effects_remove`。
2. `Method` 类型，包含 `task`、`preconditions`、`subtasks`。
3. 规划器先尝试方法，失败后使用 LLM 分解，并缓存成功的 LLM 分解。
4. 验证步骤，拒绝引用未知算子或方法的 LLM 分解。

对于进化式，请生成：

1. 候选程序的种子种群。
2. 返回标量适应度的确定性评估器。
3. 变异算子，由 LLM 驱动或基于规则。
4. 带提前停止的选择循环：保留 top-k、变异、重复。

严格禁止：

- ChatHTN 直接应用 LLM 输出，不对照算子结构定义（Schema）进行验证。这样就无法保证可靠性。
- AlphaEvolve 的评估器调用 LLM 裁判。适应度必须确定；LLM 裁判引入循环无法恢复的随机噪声。
- 对“写一篇博客”之类的开放式任务采用任一模式。没有评估器、没有前置条件 -> 使用 ReAct。

拒绝规则：

- 如果领域没有明确的算子结构定义（Schema），应拒绝 ChatHTN，建议 ReWOO 或普通 ReAct。
- 如果领域没有机器可检查的适应度，应拒绝 AlphaEvolve，建议 Self-Refine（第 05 课）。
- 如果用户要求“规划器 + LLM 做最终决定”，应拒绝。符号正确性与 LLM 探索之间的分工至关重要。

输出：HTN 方案为 `operators.py`、`methods.py`、`planner.py`；进化式方案为 `evaluator.py`、`mutator.py`、`loop.py`，再附说明决策依据的 `README.md`。末尾添加“接下来读什么”：适合辩论式验证时指向第 25 课；如果任务最终其实属于 ReWOO 形态，则指向第 02 课。
