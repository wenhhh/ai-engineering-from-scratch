---
name: search-policy
description: 根据任务形态、词元预算和评估器质量，选择搜索策略（Search strategy）：ReAct、ToT、LATS 或进化搜索。
version: 1.0.0
phase: 14
lesson: 04
tags: [tree-of-thoughts, lats, mcts, search, value-function]
---

给定任务形态（单答案 / 多答案 / 开放式）、词元预算和可用评估器（标量测试 / 启发式 / 自我评估），给出包含具体参数的搜索策略建议。

请生成：

1. 决策。选择一种：单线 ReAct、束搜索 ToT（带束宽 k）、BFS ToT（带最大深度）、带剪枝的 DFS ToT、MCTS LATS（带迭代次数和 UCT c），或进化搜索（仅当评估器程序化且可检查时）。
2. 参数。为每种策略给出具体数值默认值：束宽、深度上限、分支因子 K、每层模拟次数、UCT c（默认 1.4）、超时。
3. 价值函数（Value function）。明确说明用什么为节点评分。选项包括：单元测试通过率、到目标的数值距离、指定格式的 LLM 提示评分（sure/likely/impossible、1..10 或投票），或者环境奖励。
4. 词元预算估计。最坏情况下的词元数 = branching_factor ^ depth * avg_prompt_tokens。展示这个数值。超过用户预算时，推荐成本更低的策略。
5. 故障模式（Failure modes）。为每个选定策略列出最主要的两种故障模式和缓解措施，例如 LATS + 噪声评估器 -> 按 CRITIC 添加以工具为依据的验证，参见第 05 课。

严格禁止：

- 评估器不可靠时仍推荐搜索，例如只有自我评估，没有真实参照。应退回 ReAct + CRITIC。
- 没有充分理由就将分支因子 K 设为大于 5。论文默认 K=3-5；K=10 会使成本激增。
- 将 LATS 用于聊天式任务。对于没有程序化目标的对话问答，搜索没有帮助。
- 没有机器可检查的适应度（Fitness）就采用进化搜索。只有适应度可程序化计算时，如运行测试、测量速度、验证定理，AlphaEvolve 才有意义。

拒绝规则：

- 如果词元预算 < 单轨迹成本的 5 倍，应拒绝搜索并推荐 ReAct + Reflexion（第 03 课）。
- 如果实际延迟预算 < 10 秒，应拒绝 LATS 并推荐 ReAct。
- 如果任务是纯信息检索，应拒绝搜索并推荐 ReWOO（第 02 课）。

输出：建议块，包括选定策略、参数、价值函数、预算估计，再附“接下来读什么”说明：评估器可靠性指向第 05 课（CRITIC），进化变体指向第 11 课（AlphaEvolve），基准测试级验证指向第 30 课（评估驱动开发，Eval-driven development）。
