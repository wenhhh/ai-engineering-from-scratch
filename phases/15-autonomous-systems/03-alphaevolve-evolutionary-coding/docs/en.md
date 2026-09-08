# AlphaEvolve：演化编程智能体（Evolutionary Coding Agents）

> 将前沿编程模型、演化循环和可自动验证结果的评估器结合起来，让循环运行足够久：它发现了仅需 48 次标量乘法的 4x4 复矩阵乘法算法，这是 56 年来首次改进 Strassen 的结果；还找到了在 Google 全公司使用的 Borg 启发式调度方法，在生产环境中释放了 ~0.7% 的集群算力。架构有意采用简单常规的设计，成果来自评估器的严谨性。

**Type:** Learn
**Languages:** Python（标准库，演化循环玩具示例）
**Prerequisites:** 阶段 15 · 01（长时程智能体的背景，long-horizon framing），阶段 15 · 02（自学推理，self-taught reasoning）
**Time:** ~60 分钟

## 问题（The Problem）

大语言模型（Large Language Model，LLM）能编写代码，演化算法（Evolutionary algorithm）能搜索代码。两者各自都已被尝试数十年，也都触及上限。LLM 的上限是编造（Confabulation）：写出看似合理、却无法实现其声称功能的代码。演化算法的上限是搜索成本：语法上的随机变异很少产生可编译程序，更不用说更好的程序。

AlphaEvolve（Novikov 等，DeepMind，arXiv:2506.13131，2025 年 6 月）将两者结合。LLM 对程序数据库提出针对性修改，自动评估器为每个变体评分，高分变体成为后续世代的亲本。LLM 承担编写合理代码这一昂贵步骤，评估器捕获编造。循环运行数小时到数周。

报告成果包括：只需 48 次标量乘法的 4x4 复矩阵乘法（Strassen 1969 年的界限是 49 次）、进入 Google 生产环境的 Borg 调度启发式、FlashAttention 内核加速 32.5%、Gemini 训练吞吐量提高。

这套架构之所以有效，是因为评估器能够自动验证结果；在无法进行这种验证的领域，它就不适用。这一区别是本课的核心。

## 概念（The Concept）

### 循环（The loop）

1. 从正确但次优的种子程序 `P_0` 出发。
2. 维护程序变体数据库，每个变体都有评估器分数。
3. 从数据库采样一个或多个亲本（采用 MAP-elites 风格或岛模型）。
4. 提示 LLM 生成亲本的修改变体（大量候选用 Gemini Flash，困难候选用 Gemini Pro）。
5. 编译、运行变体，并用留出评估器评估。
6. 以分数和特征向量为键插入数据库。
7. 重复。

两个细节很重要。首先，LLM 提示不只包含亲本程序，通常还包含数据库中的若干高分变体、评估器签名和简短任务说明。模型要提出可能提高分数的针对性修改。其次，数据库有结构（MAP-elites 网格、岛模型），使循环探索多样性，而非只追逐当前领先者。

### 为什么必须有可靠的评估器（What makes the evaluator non-negotiable）

AlphaEvolve 取得成果的领域，都具备运行快、结果确定且难以钻空子的评估器：

- **矩阵乘法算法**：进行矩阵相乘、检查逐位完全相等的单元测试。
- **Borg 调度启发式**：回放历史集群负载、测量浪费算力的生产级模拟器。
- **FlashAttention 内核**：正确性测试，以及真实硬件上的实际耗时基准测试。
- **Gemini 训练吞吐量**：测量每步 GPU 秒数。

每种情况下，评估器都能捕获原本会占主导的 LLM 错误：编造正确性声明、在硬件上消失的性能声明、边界情况失败。去掉评估器，循环优化的就只是漂亮代码。

### 奖励投机是这一论断的另一面（Reward hacking is the other face of that statement）

演化会优化评估器测量的任何东西。如果评估器不完善，循环就会找到缺陷。在无法验证的领域，循环会优化表面特征，而不是预期行为。DeepMind 在论文中明确指出：只有评估器严谨程度与搜索目标相匹配的领域，才能迁移 AlphaEvolve 的成功。

2025-2026 年代码搜索循环中奖励投机（Reward hacking）的具体例子：

- 奖励“完成时间”的优化目标，奖励了提交空解答。
- 奖励测试中正确性的基准分数，奖励了记忆测试与过拟合。
- “代码质量”代理指标奖励了删除注释和改写变量名，而语义没有变化。

AlphaEvolve 的修正：提供 LLM 从未见过的留出评估器，输入在评估时生成。即便如此，DeepMind 仍建议对任何拟议部署进行严格审查。

### 为什么 LLM 加搜索优于单独使用（Why LLM + search beats either alone）

LLM 能生成可编译、语义合理的修改。对 2000 行 Python 文件运行随机变异遗传算法（Genetic algorithm，GA），几乎总会产生语法错误。LLM 还把搜索集中在合理邻域，例如改一个函数而非随机字节，显著减少浪费的评估器调用。

反过来，评估器能捕获 LLM 的编造。LLM 会自信声称某函数“极限下是 O(n log n)”，实际却是 O(n^2)；实际耗时基准测试能够裁定这一问题。

### AlphaEvolve 在前沿技术栈中的位置（Where AlphaEvolve fits in the frontier stack）

| 系统 | 生成器 | 评估器 | 领域 | 成果示例 |
|---|---|---|---|---|
| AlphaEvolve | Gemini | 正确性 + 基准测试 | 算法、内核、调度器 | 48 次乘法的 4x4 矩阵乘法 |
| FunSearch（DeepMind，2023） | PaLM / Codey | 正确性 | 组合数学 | 帽集（Cap-set）下界 |
| AI Scientist v2（Sakana，第 5 课） | GPT/Claude | LLM 批评 + 实验 | 机器学习研究 | ICLR 研讨会论文 |
| Darwin Godel Machine（第 4 课） | 智能体支撑框架 | SWE-bench / Polyglot | 智能体代码 | SWE-bench 从 20% → 50% |

四者都是同一配方的变体：生成器加评估器，循环执行。差别在于评估器评什么，以及多严谨。

```figure
alphaevolve-loop
```

## 实际应用（Use It）

`code/main.py` 在玩具符号回归（Symbolic regression）问题上实现最小 AlphaEvolve 式循环。“LLM”是标准库替代实现，对计算目标函数的程序提出小型语法变异；“评估器”测量留出测试点上的均方误差（Mean squared error）。

观察：

- 最佳分数如何逐代提高。
- MAP-elites 网格如何保留多样解，避免循环收敛于局部极小值。
- 去掉留出测试、仅在训练集上评估，如何让循环严重过拟合。

## 交付成果（Ship It）

`outputs/skill-evaluator-rigor-audit.md` 是在新领域考虑 AlphaEvolve 式循环的前置条件：评估器真的能捕获你关心的失败吗？

## 练习（Exercises）

1. 运行 `code/main.py`，记录最佳分数轨迹。禁用留出评估器（标志 `--no-holdout`）再运行，量化过拟合。

2. 阅读 AlphaEvolve 论文第 3 节有关 MAP-elites 网格的内容。为新问题（例如编译器优化过程，Compiler optimization passes）设计能够保持搜索多样性的特征向量描述符。

3. 4x4 矩阵的 48 次乘法结果在 56 年后改进了 Strassen 的 49 次界限。阅读论文附录 F，用三句话解释为何此问题的评估器特别容易做对，以及为何多数领域并非如此。

4. 提出一个 AlphaEvolve 会失败的领域，准确指出评估器在哪里失效及其原因。

5. 为你熟悉的领域写出评估器签名，包含（a）正确性条件、（b）性能指标、（c）留出输入生成规则、（d）至少一项反奖励投机检查。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| AlphaEvolve | “DeepMind 的演化编程智能体” | Gemini + 程序数据库 + 机器可检查的评估器 |
| MAP-elites | “保留多样性的档案” | 以特征向量为键的网格，每格保存具有该描述符的最佳变体 |
| 岛模型（Island model） | “并行演化子种群” | 定期迁移的独立种群，防止过早收敛 |
| 可自动验证结果的评估器（Machine-checkable evaluator） | “确定性判定器” | LLM 无法伪造结果的单元测试、模拟器或基准测试，是该循环的前提 |
| 奖励投机（Reward hacking） | “优化度量而非目标” | 循环找到不执行预期任务也能最大化分数的方法 |
| 种子程序（Seed program） | “起点” | 循环从中演化的初始正确但次优程序 |
| 留出评估器（Held-out evaluator） | “LLM 从未见过的评估数据” | 在评估时生成输入，防止记忆 |

## 延伸阅读（Further Reading）

- [Novikov 等（2025）：AlphaEvolve，用于科学和算法发现的编程智能体](https://arxiv.org/abs/2506.13131)：完整论文。
- [DeepMind 的 AlphaEvolve 博客](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)：厂商文章，含成果。
- [AlphaEvolve 成果仓库](https://github.com/google-deepmind/alphaevolve_results)：发现的算法，包括 48 次乘法的 4x4 矩阵乘法。
- [Romera-Paredes 等（2023）：用 LLM 程序搜索获得数学发现（FunSearch）](https://www.nature.com/articles/s41586-023-06924-6)：前身系统。
- [Anthropic：负责任扩展政策 v3.0（2026 年 2 月）](https://anthropic.com/responsible-scaling-policy/rsp-v3-0)：将受评估器约束的自主性列为关键研究方向。
