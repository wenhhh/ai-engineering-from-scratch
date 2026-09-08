# 使用 HTN 与进化搜索进行规划（Planning with HTN and Evolutionary Search）

> 符号规划（Symbolic planning）处理需要证明计划正确的场景。进化代码搜索（Evolutionary code search）处理适应度函数可由机器检查的场景。ChatHTN（2025）和 AlphaEvolve（2025）展示了两者结合 LLM 后各自能实现什么。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 02（ReWOO 与先规划后执行，ReWOO and Plan-and-Execute）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释分层任务网络（Hierarchical Task Networks，HTN）：任务、方法、算子、前置条件、效果。
- 描述 ChatHTN 的混合循环：符号搜索结合 LLM 后备分解。
- 解释 AlphaEvolve 的进化循环，以及为什么它必须有程序化评估器才能工作。
- 用标准库实现玩具 HTN 规划器和玩具进化搜索。

## 问题（The Problem）

ReWOO（第 02 课）、先规划后执行（Plan-and-Execute）和 ReAct 覆盖了大多数智能体规划。它们不擅长处理两种情况：

1. **可证明正确的计划（Plans with provable correctness）。** 调度、飞行路径规划、合规工作流等要求计划在构造时就保证可靠性。LLM 计划即使表达流畅，只要偶尔虚构一个步骤就不可接受。
2. **具有机器可检查适应度函数的优化（Optimizations with a machine-checkable fitness function）。** 矩阵乘法、调度启发式、编译器优化阶段等，目标不是“正确计划”，而是“最佳计划”。

HTN 规划和 AlphaEvolve 分别解决这两种不同问题。两者都把 LLM 当作增强手段，而不是替代品。

## 概念（The Concept）

### 分层任务网络（Hierarchical Task Networks）

HTN 包含：

- **任务（Tasks）**：复合任务有待分解，原始任务可以直接执行。
- **方法（Methods）**：将复合任务分解为子任务的方式，带前置条件。
- **算子（Operators）**：带前置条件和效果的原始行动。
- **状态（State）**：一组事实。

规划就是：给定目标任务和初始状态，找到由原始算子组成的分解，使它们的前置条件按顺序得到满足。

HTN 早于 LLM，仍是可证明正确计划的参考方法。

### ChatHTN（Gopalakrishnan 等人，2025）

ChatHTN（arXiv:2505.11814）交替使用符号 HTN 与 LLM 查询：

1. 尝试用已有方法分解当前复合任务。
2. 如果没有适用方法，询问 LLM：“在状态 `s` 下，你会如何分解 `task`？”
3. 将 LLM 响应转为候选子任务。
4. 对照算子的结构定义（Schema）进行验证，拒绝无效分解。
5. 递归处理。

论文的核心主张是：每个生成的计划都可证明可靠，因为 LLM 建议只作为候选分解进入系统，绝不直接编辑计划。符号层负责正确性，LLM 扩充方法库。

在线方法学习（Online method learning，OpenReview `gwYEDY9j2x`，2025 年后续研究）增加学习器，通过回归泛化 LLM 生成的分解，使 LLM 查询频率最多降低 75%。

### AlphaEvolve（Novikov 等人，2025）

AlphaEvolve（arXiv:2506.13131，DeepMind，2025 年 6 月）采用不同方法：由 Gemini 2.0 Flash/Pro 集成模型编排进化代码搜索。

循环如下：

1. 从种子程序和返回适应度分数的程序化评估器开始。
2. LLM 集成提出变异（Mutation）。
3. 通过评估器运行变异版本。
4. 保留最佳者，再次变异。

已发表的成果包括：

- 56 年来首次改进 Strassen 的 4x4 复数矩阵乘法，需要 48 次标量乘法。
- 通过 Borg 调度启发式回收 Google 0.7% 的计算资源。
- 在一项前沿工作负载上，将 FlashAttention 加速 32%。

硬约束是：适应度函数必须可由机器检查。针对自然语言答案的进化搜索不会收敛。

### 何时使用哪一种（When to use which）

| 问题类别 | 使用方案 | 原因 |
|---------------|-----|-----|
| 带硬约束的调度 | HTN + ChatHTN | 可证明可靠性（Provable soundness） |
| 编译器优化 | AlphaEvolve | 机器可检查的适应度 |
| 多步任务执行 | ReAct / ReWOO | LLM 在循环中，没有形式化保证 |
| 带测试的代码改进 | AlphaEvolve | 测试就是评估器 |
| 受策略约束的自动化 | HTN | 前置条件编码策略 |

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **没有算子的 HTN（HTN without operators）。** 没有前置条件和效果的结构定义（Schema），可靠性主张就不成立。ChatHTN 在让 LLM 提议分解时，必须依据这些结构定义拒绝无效行动。
- **没有真实评估器的 AlphaEvolve（AlphaEvolve without a real evaluator）。** “问 LLM 代码是否更好”不是适应度函数。评估器必须确定且快速。
- **过度工程（Over-engineering）。** 大多数智能体任务不需要二者。先考虑 ReAct 或 ReWOO。

```figure
htn-tree-expand
```

## 动手实现（Build It）

`code/main.py` 实现两个玩具示例：

- 标准库 HTN 规划器，包含算子、方法、前置条件、效果，以及在没有方法匹配复合任务时介入的 `LLMFallback`。“LLM”是脚本化分解器，因此规划器可离线运行。
- 对算术程序进行标准库进化搜索：逐步生成表达式，使测试集上的 `|f(x) - target|` 最小。评估器是确定性的。

运行：

```
python3 code/main.py
```

轨迹展示 HTN 规划器分解复合任务，中途使用 LLM 后备方案，以及进化循环收敛到目标表达式的过程。

## 实际应用（Use It）

- **HTN 规划器（HTN planners）**：`pyhop`、`SHOP3`，或为领域专用策略执行自行构建。
- **ChatHTN**：研究代码；符号方法 + LLM 后备的模式可直接迁移到任意 HTN 规划器。
- **AlphaEvolve**：DeepMind 论文；集成模型 + 评估器的模式可复现。OpenEvolve 和类似开源分支正在出现。
- **智能体框架（Agent frameworks）**：目前尚无框架提供一等 HTN 或 AlphaEvolve 支持。可将其构建为子智能体或后台工作单元。

## 交付成果（Ship It）

`outputs/skill-hybrid-planner.md` 生成混合规划器骨架，可以是 HTN 或进化式，并明确限定 LLM 的角色范围。

## 练习（Exercises）

1. 为 HTN 规划器扩展回溯：算子的后置条件在运行时失败时，回滚并尝试下一个方法。
2. 为 ChatHTN 添加 LLM 方法缓存：LLM 在状态模式 `P` 下分解任务 `T` 时保存结果。下次调用先重新检查方法库。
3. 将进化搜索评估器换成真实测试套件。进化出通过 20 个测试用例的排序函数，报告收敛所需代数。
4. 阅读 AlphaEvolve 的评估器设计说明。为你关心的领域设计评估器，如 SQL 查询优化、测试套件最小化、部署 YAML。
5. 组合两者：用 HTN 将复合任务分解为子任务，再对每个子任务的原始算子使用进化搜索。哪里能发挥优势，哪里会过度工程？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 分层任务网络（HTN） | “分层规划器” | 带算子、前置条件、效果的任务分解 |
| 方法（Method） | “分解规则” | 将复合任务拆为子任务的方式 |
| 算子（Operator） | “原始行动” | 带前置条件和效果的具体步骤 |
| ChatHTN | “LLM + HTN” | 没有匹配方法时，符号规划器询问 LLM |
| AlphaEvolve | “进化代码搜索” | LLM 集成对代码进行变异，确定性评估器进行选择 |
| 适应度函数（Fitness function） | “评估器” | 对输出进行确定、机器可检查的评分 |
| 在线方法学习（Online method learning） | “缓存 LLM 分解” | 保存并泛化 LLM 计划，以减少查询成本 |

## 延伸阅读（Further Reading）

- [Gopalakrishnan 等人，ChatHTN（arXiv:2505.11814）](https://arxiv.org/abs/2505.11814)：符号方法 + LLM 混合规划器。
- [Novikov 等人，AlphaEvolve（arXiv:2506.13131）](https://arxiv.org/abs/2506.13131)：使用 LLM 变异的进化代码搜索。
- [Anthropic，构建有效智能体（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：何时选择规划器，何时使用简单循环。
