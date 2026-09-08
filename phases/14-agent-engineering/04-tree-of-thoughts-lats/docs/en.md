# 思维树与 LATS：审慎搜索（Tree of Thoughts and LATS: Deliberate Search）

> 单条思维链（Chain-of-thought，CoT）轨迹没有回溯空间。思维树（Tree of Thoughts，ToT，Yao 等人，2023）把推理变成树，并对每个节点进行自我评估。LATS（Zhou 等人，2024）通过蒙特卡洛树搜索（Monte Carlo Tree Search，MCTS）统一 ToT、ReAct 与 Reflexion。24 点游戏的准确率从 CoT 的 4% 提升到 ToT 的 74%；LATS 在 HumanEval 上达到 92.7% 的 pass@1。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 03（Reflexion）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 将推理表述为搜索：节点是“思考”，边是“扩展”，价值代表“前景如何”。
- 用标准库实现带自我评估评分的 ToT 式广度优先搜索（BFS）树搜索。
- 扩展为玩具 LATS MCTS 循环，包含选择、扩展、模拟和反向传播。
- 判断何时值得承受搜索带来的词元倍增，如 24 点游戏、代码生成；何时单条轨迹就够用，如简单问答。

## 问题（The Problem）

思维链沿单一路径逐步推理。如果第一步错了，后续每一步都会建立在错误前提上。在 24 点游戏中，用四个数字和 + − × ÷ 算出 24，GPT-4 CoT 的准确率只有 4%。模型在早期选错子表达式，便无法恢复。

推理需要的是提出多个候选、评估候选、选择有希望的候选，并在遇到死路时回溯的能力。这就是搜索。思维树与 LATS 是两种经典形式。

## 概念（The Concept）

### 思维树（Tree of Thoughts，Yao 等人，NeurIPS 2023）

每个节点是一个连贯的中间步骤，即“一段思考”。每个节点可以扩展为 K 个子思考。LLM 使用评分提示词对各节点进行自我评估。搜索通过广度优先（BFS）、深度优先（DFS）或束搜索（Beam search）探索这棵树。

```
                     (根节点（root）: "find 24 from 4 6 4 1")
                    /               |            \
           ("6 - 4 = 2")    ("4 + 1 = 5")    ("4 * 6 = 24")  <- 评分（Score）: HIGH
              /   \              |                  |
          ...    ...          ...                finish
```

自我评估是关键环节。论文展示三种变体：`sure / likely / impossible` 分类、`1..10` 数值评分，以及候选间投票。在 24 点游戏上，三者都显著优于 CoT，GPT-4 的准确率从 4% 提升到 74%。

### LATS（Zhou 等人，ICML 2024）

LATS 在 MCTS 框架下统一 ToT、ReAct 和 Reflexion。LLM 扮演三个角色：

- **策略（Policy）**：提出下一步候选行动，采用 ReAct 风格。
- **价值函数（Value function）**：为部分轨迹评分，采用 ToT 风格的自我评估。
- **自我反思器（Self-reflector）**：失败时写下自然语言反思，采用 Reflexion 风格，并用它为未来的模拟轨迹重新提供起点。

环境反馈，即观察结果，会混入价值函数，使搜索依据真实工具结果，而不只是模型意见。论文发表时的结果是：使用 GPT-4 在 HumanEval 上达到 92.7% 的 pass@1，为当时最佳；使用 GPT-3.5 在 WebShop 上平均得分 75.9，接近基于梯度的微调。

### MCTS 最简说明（MCTS, minimally）

每次迭代有四个阶段：

1. **选择（Select）**：使用树置信上界（Upper confidence bound for trees，UCT），从根节点走到叶节点。
2. **扩展（Expand）**：通过策略生成 K 个子节点。
3. **模拟（Simulate）**：从子节点出发，使用策略展开模拟轨迹，以价值函数或环境奖励为叶节点评分。
4. **反向传播（Backpropagate）**：沿路径向上更新访问次数和价值估计。

UCT 公式：`Q(s, a) + c * sqrt(ln N(s) / N(s, a))`。第一项是利用（Exploitation），第二项是探索（Exploration）。按任务调整 `c`。

### 成本现实（The cost reality）

搜索使词元用量激增。24 点游戏上的 ToT 使用 CoT 的 100–1000 倍词元，LATS 也类似。这并非没有代价，应将搜索留给：

- 已经证明单条轨迹不够用的任务，如 24 点游戏、复杂代码。
- 正确性比实际耗时更重要的任务。
- 具有廉价且可靠价值函数的任务，如代码的单元测试、数学的明确目标。

如果任务只有一个正确答案，而评估器噪声很大，搜索常会使情况更糟：它会找到一个“评分很高”的错误答案。

### 2026 年的定位（2026 positioning）

大多数生产智能体不运行 LATS，而是运行结合工具依据验证的 ReAct，即 CRITIC（第 05 课）。搜索用于专门场景：

- 将测试作为价值函数的编码智能体，类似 HumanEval。
- 探索多条查询路径的深度研究智能体。
- LangGraph 子图中高度依赖规划的工作流。

AlphaEvolve（第 11 课）是 2025 年的极致案例：对代码进行进化搜索（Evolutionary search），使用机器可检查的适应度（Fitness），取得前沿进展，包括 56 年来首次改进 4x4 矩阵乘法。

```figure
tree-of-thoughts
```

## 动手实现（Build It）

`code/main.py` 实现：

- 在简化的“选择算术运算”任务上运行一个小型 ToT BFS。
- 在同一任务上运行玩具 LATS MCTS 循环，包含选择、扩展、模拟、反向传播，并使用 UCT 选择。
- 将符号评分与自我评估分数组合起来的价值函数。

运行：

```
python3 code/main.py
```

轨迹展示 ToT 如何用 BFS 为每个节点扩展三个候选，并与 LATS 通过 MCTS 收敛到最佳模拟轨迹的过程对比。两者都会打印词元数。

## 实际应用（Use It）

LangGraph 以子图模式提供 ToT 式探索；LangChain 团队 2024 年 5 月关于 LATS 的博客是参考教程。LlamaIndex 提供 `TreeOfThoughts` 智能体。对大多数 2026 年生产智能体，这种模式置于 `if task_complexity > threshold: use_search()` 门禁之后；参见第 05 课的评估器-优化器（Evaluator-optimizer）模式。

## 交付成果（Ship It）

`outputs/skill-search-policy.md` 根据任务形态、预算和评估器保真度，在单线 ReAct、ToT、LATS 和进化搜索之间作出选择。

## 练习（Exercises）

1. 分别以 UCT c=0.1 和 c=2.0 运行玩具 LATS。轨迹有何变化？
2. 换成噪声更大的价值评分器，即加入随机扰动。MCTS 还能找到最佳叶节点吗？它能容忍的最低信噪比是多少？
3. 实现束搜索 ToT，每层保留前 k 个节点，并与 BFS 比较。词元预算紧张时哪一种更好？
4. 阅读 LATS 第 5.1 节。复现 HumanEval 的轨迹数量：达到论文报告的 pass@1 需要多少次模拟？
5. 阅读 LATS 论文关于“LATS 何时帮助较小”的讨论。写一段决策规则，将任务形态映射到搜索策略。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 思维树（Tree of Thoughts） | “分支式 CoT” | Yao 等人提出，由带自我评估的思考节点构成的树 |
| LATS | “面向 LLM 的 MCTS” | Zhou 等人提出，在 MCTS 下统一 ToT + ReAct + Reflexion |
| 树置信上界（UCT） | “置信上界” | 平衡利用（Q）与探索（ln N / n）的选择公式 |
| 价值函数（Value function） | “这个状态有多好” | 提示词诱导的 LLM 评分或环境奖励，用于反向传播 |
| 策略（Policy） | “行动提议器” | ReAct 式生成器，输出下一步候选思考或行动 |
| 模拟轨迹（Rollout） | “模拟的轨迹” | 使用策略从节点走到叶节点，再用价值函数评分 |
| 反向传播（Backpropagate） | “更新祖先节点” | 将叶节点奖励沿路径向上传递，更新访问次数与 Q |
| 搜索成本（Search cost） | “词元激增” | 24 点游戏中为 CoT 的 100-1000 倍，采用之前先做预算 |

## 延伸阅读（Further Reading）

- [Yao 等人，思维树（Tree of Thoughts，arXiv:2305.10601）](https://arxiv.org/abs/2305.10601)：经典论文。
- [Zhou 等人，LATS（arXiv:2310.04406）](https://arxiv.org/abs/2310.04406)：结合 Reflexion 反馈的 MCTS。
- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：用于搜索的子图模式。
- [AlphaEvolve（arXiv:2506.13131）](https://arxiv.org/abs/2506.13131)：使用程序化评估器的进化搜索。
