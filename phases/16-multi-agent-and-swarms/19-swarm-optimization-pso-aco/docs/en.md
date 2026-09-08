# 面向 LLM 的群体优化（Swarm Optimization for LLMs，PSO、ACO）

> 仿生优化正在 LLM 领域回归。**LMPSO**（arXiv:2504.09247）使用 PSO，将每个粒子的速度表示为提示，由 LLM 生成下一个候选；它适用于结构化序列输出（数学表达式、程序）。**Model Swarms**（arXiv:2410.11163）将每个 LLM 专家视为模型权重流形上的 PSO 粒子，仅使用 200 个实例，在 9 个数据集上相对 12 个基线取得**平均 13.3% 的提升**。**SwarmPrompt**（ICAART 2025）混合 PSO 与灰狼算法优化提示。**AMRO-S**（arXiv:2603.12933）借鉴 ACO 的信息素专家机制，用于多智能体 LLM 路由，获得 **4.7 倍加速**、可解释的路由证据，以及将推理与学习解耦的质量门控异步更新。本课在提示参数空间实现 PSO，在智能体路由上实现 ACO，测量这些经典算法为何适合 LLM 时代，以及何时不适合。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 09 并行群体网络（Parallel Swarm Networks）, Phase 16 · 14 共识与拜占庭容错（Consensus and BFT）
**Time:** ~75 分钟

## 问题（Problem）

你的提示在任务评估中得分为 62%，你希望改进它。最朴素的做法是无梯度的手动微调，但其扩展性很差。强化学习需要奖励信号和足够的轨迹采样来训练。通过提示做反向传播实际上不可行：提示是离散字符串，不是可微参数。

经典仿生优化，包括面向连续搜索空间的 PSO 和面向路径选择的 ACO，正是为这种情形设计的：无需梯度、基于群体、每次评估成本低。将它们与 LLM 配合进行无梯度搜索，可以得到出乎意料地实用的优化器。

同样的模式也适用于多智能体系统中的智能体*路由（routing）*。ACO 风格的信息素轨迹记录哪个智能体最擅长哪类任务，让路由器利用这条轨迹，并通过信息素衰减重新发现路由。

## 概念（Concept）

### PSO 回顾（PSO refresher，Kennedy 与 Eberhart，1995）

粒子群优化（Particle Swarm Optimization）：连续搜索空间中的粒子群。每个粒子具有位置 `x_i` 和速度 `v_i`。每次迭代：

```
v_i <- w * v_i + c1 * r1 * (p_best_i - x_i) + c2 * r2 * (g_best - x_i)
x_i <- x_i + v_i
评估 fitness(x_i)
若有改善，更新 p_best_i
若为全局最优，更新 g_best
```

其中，`p_best` 是粒子自身的历史最优，`g_best` 是群体最优，`w, c1, c2` 分别是惯性、认知和社会权重，`r1, r2` 是随机因子。

### LLM 输出上的 PSO：LMPSO（PSO on LLM outputs — LMPSO）

arXiv:2504.09247 将 PSO 适配到 LLM 生成的结构化输出（数学表达式、程序）。每个粒子都是候选输出。速度是一个*提示（prompt）*，描述如何朝个体或全局最优方向修改当前输出。LLM 根据速度提示生成新输出。速度的“惯性”可表现为“进行小幅增量修改”这样的提示。

以下条件下效果良好：
- 输出具有结构（可解析、可评估）。
- 适应度（fitness）可自动计算（运行测试、算术求值）。
- 群体较小（约 10–30 个粒子），因此 LLM 调用总数可控。

当适应度需要人工审查时效果不佳，因为每次迭代的成本会变得难以承受。

### Model Swarms

arXiv:2410.11163 将 PSO 从输出层移到*模型*层。每个“粒子”是一个专家 LLM（参数）。群体通过无梯度更新，将参数移向集体最优位置。报告结果：每次迭代仅使用 200 个实例，在 9 个数据集上相对 12 个基线取得平均 13.3% 的提升。

关键洞见是：LLM 专家模型在共享参数流形（适配器权重、LoRA 增量）中本就彼此接近。在这个低维子空间运行 PSO，成本低且有效。

### ACO 回顾（ACO refresher，Dorigo，1992）

蚁群优化（Ant Colony Optimization）：蚂蚁遍历图，每条路径都有信息素轨迹。蚂蚁的移动概率按信息素强度加权。完成任务的蚂蚁按解的质量成比例沉积信息素。信息素随时间衰减。

### AMRO-S：用于智能体路由的 ACO（ACO for agent routing）

arXiv:2603.12933 将 ACO 用于多智能体路由。每种任务类型是一个“目的地”，每个智能体是一条可选路由。产生优质输出的路由会获得更强的信息素。主要贡献：

- **可解释的路由证据（Interpretable routing evidence）。**信息素强度是人类可读的信号。
- **质量门控异步更新（Quality-gated asynchronous update）。**只有质量检查通过后才更新信息素，将推理与学习解耦。
- 在多智能体路由基准上实现 **4.7 倍加速**。

质量门控很重要：没有它，速度快但答案错误的智能体也会累积信息素，使系统锁定在糟糕的路由上。

### 何时将 PSO / ACO 用于 LLM（When to use PSO / ACO for LLMs）

**以下情况使用 PSO：**
- 搜索空间连续，或能映射为连续参数（提示嵌入、LoRA 权重、数值生成参数）。
- 适应度计算成本低且可自动完成。
- 群体可以较小（10–30）。

**以下情况使用 ACO：**
- 问题涉及路由或路径选择。
- 决策随时间强化（相同任务类型会反复出现）。
- 需要可解释的路由决策证据。

**以下情况两者都不要使用：**
- 适应度需要人工审查（每次迭代过于昂贵）。
- 搜索空间以 PSO 无法覆盖的方式呈现离散组合结构（改用遗传算法）。
- 实时决策有严格延迟要求（相对单遍启发式方法，PSO/ACO 收敛较慢）。

### 仿生方法为何仍有优势（Why bio-inspired still wins）

基于梯度的方法需要可微信号。LLM 输出和路由决策并非天然可微。伪梯度方法（强化学习路由器、DPO 风格提示调优器）有效，但需要昂贵训练。

PSO 和 ACO 只需要一个*评估器（evaluator）*函数。只要能为候选输出或路由决策评分，就可以在该空间上优化。这使适用门槛低得多。

### 实际限制（Practical limits）

- **群体预算（Population budget）。**N 个粒子 × T 次迭代 × 单次评估成本。若 LLM 评估约为每次调用 $0.02，20 个粒子的 PSO 运行 50 次迭代约花费 $20。应据此规划。
- **探索与利用（Exploration vs exploitation）。**信息素衰减率与 PSO 惯性涉及权衡；衰减过快会遗忘解，过慢会困在早期局部最优。
- **灾难性漂移（Catastrophic drift）。**如果适应度景观变化（新数据分布），两种算法都可能先收敛再发散。监控最优适应度的稳定性。

```figure
swarm-stigmergy
```

## 动手构建（Build It）

`code/main.py` 实现了：

- `LMPSO`：在数值提示参数（temperature、top_k 权重）上运行 PSO。每个粒子的“LLM 生成”通过脚本化适应度函数模拟。运行 30 次迭代，展示 g_best 收敛。
- `AMRO_S`：ACO 风格路由。3 个智能体、4 种任务类型、信息素矩阵、100 个路由任务。打印随时间变化的（task_type → 智能体选择）分布，展示轨迹形成。
- 比较：在同一任务流上对比随机路由与 ACO 路由，测量质量和延迟。

运行：

```
python3 code/main.py
```

预期输出：
- LMPSO：g_best 适应度在 30 次迭代中从随机水平提升到接近最优。
- AMRO-S：信息素表稳定到每类任务的合适智能体；ACO 路由的质量比随机路由高约 30–40%，延迟也降低（重试更少）。

## 实际使用（Use It）

`outputs/skill-swarm-optimizer.md` 帮助为 LLM / 智能体优化问题选择 PSO、ACO、遗传算法或基于梯度的优化器。

## 交付上线（Ship It）

- **从小规模开始（Start small）。**10–20 个粒子，20–50 次迭代。只有收敛曲线显示明确收益时才扩大规模。
- **逐次迭代记录信息素或 g_best（Log pheromones or g_best per iteration）。**没有轨迹记录，调试群体优化器会很困难。
- **对更新施加质量门控（Quality-gate updates）。**尤其是 ACO 路由：速度快但答案错误的智能体不得累积信息素。
- **分布变化时重设衰减（Reset decay on distribution shift）。**评估分布改变后，旧信息素会过时；重置它们，或暂时将衰减率翻倍。
- **限制单次迭代成本（Cap the per-iteration cost）。**输出每次迭代成本指标。每次迭代花费 $500、仅提升 0.5% 的 PSO 无法交付。

## 练习（Exercises）

1. 运行 `code/main.py`，观察 LMPSO 收敛。将群体大小设为 5、10、20、50。达到多大规模后，收敛时间的收益趋于饱和？
2. 实现“灾难性漂移”实验：在第 30 次迭代后改变适应度函数。PSO 适应有多快？重置 `p_best` 是否有帮助？
3. 为 AMRO-S 增加质量门控：只在评估得分 > 0.7 时沉积信息素。与无门控版本相比，收敛如何变化？
4. 阅读 LMPSO（arXiv:2504.09247）。将论文的“速度即提示”映射回你的数值速度。模拟丢失了什么，又保留了什么？
5. 阅读 AMRO-S（arXiv:2603.12933）。实现解耦的“推理快速路径”，异步更新信息素。这如何改变持续负载下的系统延迟？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 粒子群优化（PSO） | “Particle Swarm Optimization” | Kennedy 与 Eberhart，1995。基于群体的无梯度优化器。 |
| 蚁群优化（ACO） | “Ant Colony Optimization” | Dorigo，1992。通过信息素轨迹优化路径或路由。 |
| LMPSO | “结合 LLM 生成的 PSO” | arXiv:2504.09247。速度是提示；LLM 产生候选。 |
| Model Swarms | “专家权重上的 PSO” | arXiv:2410.11163。在模型参数子空间执行无梯度更新。 |
| AMRO-S | “用于智能体路由的 ACO” | arXiv:2603.12933。任务类型 × 智能体上的信息素矩阵。 |
| p_best / g_best | “个体 / 全局最优” | 每个粒子及整个群体截至当前发现的最优解。 |
| 信息素（Pheromone） | “路由记忆” | 边上的强度，随时间衰减，依据质量沉积。 |
| 质量门控更新（Quality-gated update） | “只从良好运行中学习” | 以质量检查作为信息素沉积的条件。 |
| 灾难性漂移（Catastrophic drift） | “分布变化” | 适应度景观改变；旧 p_best 和信息素过时。 |

## 延伸阅读（Further Reading）

- [Kennedy 与 Eberhart：粒子群优化（Particle Swarm Optimization）](https://ieeexplore.ieee.org/document/488968)：1995 年 PSO 论文。
- [Dorigo：蚁群优化（Ant Colony Optimization）](https://www.aco-metaheuristic.org/about.html)：1992 年 ACO 基础。
- [LMPSO：语言模型粒子群优化（Language Model Particle Swarm Optimization）](https://arxiv.org/abs/2504.09247)：面向结构化 LLM 输出的 PSO。
- [Model Swarms：无梯度 LLM 专家优化（gradient-free LLM expert optimization）](https://arxiv.org/abs/2410.11163)：模型权重子空间上的 PSO。
- [AMRO-S：蚁群多智能体路由（ant-colony multi-agent routing）](https://arxiv.org/abs/2603.12933)：具有质量门控的信息素驱动路由。
