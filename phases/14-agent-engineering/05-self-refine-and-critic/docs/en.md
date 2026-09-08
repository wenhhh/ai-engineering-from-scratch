# Self-Refine 与 CRITIC：迭代改进输出（Iterative Output Improvement）

> Self-Refine（Madaan 等人，2023）让一个 LLM 在循环中扮演三个角色：生成、反馈、改进。在 7 项任务上，平均绝对提升为 20 个百分点。CRITIC（Gou 等人，2023）通过外部工具执行验证，增强反馈步骤的可靠性。2026 年，各框架都以“评估器-优化器”（Evaluator-optimizer，Anthropic）或防护循环（Guardrail loop，OpenAI Agents SDK）的形式提供这一模式。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 03（Reflexion）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出 Self-Refine 的三个提示词：生成（Generate）、反馈（Feedback）、改进（Refine），并解释历史记录为什么对改进提示词重要。
- 解释 CRITIC 的关键认识：没有外部依据时，LLM 的自我验证不可靠。
- 用标准库实现带历史记录和可选外部验证器的 Self-Refine 循环。
- 将这一模式映射到 Anthropic 的“评估器-优化器”工作流和 OpenAI Agents SDK 的输出防护机制。

## 问题（The Problem）

智能体生成了一个接近正确的答案。可能某行代码存在语法错误，可能摘要太长，也可能计划漏掉了边界情况。你希望智能体批评自己的输出，然后修正它。

Self-Refine 表明，单个模型无需训练数据或 RL，就能做到这一点。但有个问题：LLM 不擅长对确凿事实进行自我验证。CRITIC 给出了解法：让验证步骤经过外部工具，如搜索、代码解释器、计算器和测试运行器。

这两篇论文共同定义了 2026 年迭代改进的默认做法：生成、验证（尽可能使用外部验证）、改进，在验证器通过时停止。

## 概念（The Concept）

### Self-Refine（Madaan 等人，NeurIPS 2023）

一个 LLM，三个角色：

```
generate(task)            -> output_0
feedback(task, output_0)  -> critique_0
refine(task, output_0, critique_0, history) -> output_1
feedback(task, output_1)  -> critique_1
refine(task, output_1, critique_1, history) -> output_2
...
反馈为 "no issues"（没有问题）或预算耗尽时停止。
```

关键细节：`refine` 能看到全部历史，即所有先前输出和批评意见，因此不会重复错误。论文做了消融实验（Ablation）：去掉历史记录后，质量明显下降。

主要结果：在数学、代码、首字母缩略词、对话等 7 项任务上，平均绝对提升为 20 个百分点，测试模型包括 GPT-4。无需训练、无需外部工具，只用单个模型。

### CRITIC（Gou 等人，arXiv:2305.11738，v4，2024 年 2 月）

Self-Refine 的弱点是反馈步骤由 LLM 自己评分。对事实性说法，这并不可靠，因为幻觉在生成它的模型看来往往很有说服力。CRITIC 将 `feedback(task, output)` 替换为 `verify(task, output, tools)`，其中 `tools` 包括：

- 用于事实性说法的搜索引擎。
- 用于代码正确性的代码解释器。
- 用于算术的计算器。
- 领域专用验证器，如单元测试、类型检查器和代码检查器（Linter）。

验证器生成以工具结果为依据的结构化批评意见，改进器再以这些意见为条件进行改写。

主要结论：CRITIC 在事实性任务上优于 Self-Refine，因为批评有外部依据。在没有外部验证器的任务中，如创意写作、格式调整，CRITIC 就退化为 Self-Refine。

### 停止条件（The stop condition）

两种常见形式：

1. **验证器通过（Verifier passes）。** 外部测试返回成功。有条件时优先采用，如单元测试、类型检查器、防护断言。
2. **没有反馈（No feedback issued）。** 模型说“输出没问题”。成本较低，但不可靠；应搭配最大迭代次数上限。

2026 年的默认做法是组合两者：“验证器通过 OR 模型认为没问题 AND iterations >= 2 OR iterations >= max_iterations 时停止。”

### 评估器-优化器（Evaluator-Optimizer，Anthropic，2024）

Anthropic 在 2024 年 12 月的文章中，将它列为五种工作流模式之一。包含两个角色：

- 评估器（Evaluator）：为输出评分并生成批评意见。
- 优化器（Optimizer）：根据批评意见修改输出。

循环直到评估器判定通过。这就是 Anthropic 表述下的 Self-Refine/CRITIC。Anthropic 补充的关键工程细节是：评估器与优化器的提示词应当明显不同，避免模型只是不加审查地认可自己。

### OpenAI Agents SDK 输出防护机制（Output guardrails）

OpenAI Agents SDK 以“输出防护机制”提供这一模式。防护机制是在智能体最终输出上运行的验证器。触发防护机制时，它抛出 `OutputGuardrailTripwireTriggered`，输出被拒绝，智能体可以重试。防护机制可以调用工具，采用 CRITIC 风格；也可以是纯函数，采用 Self-Refine 风格。

### 2026 年的陷阱（2026 pitfalls）

- **盲目认可循环（Rubber-stamp loop）。** 同一个模型以同样的提示词风格进行生成和批评，会收敛到“我觉得不错”。使用结构不同的提示词，或使用更小、更便宜的模型负责批评。
- **过度改进（Over-refinement）。** 每次改进都会增加延迟和词元用量。预算设为 1-3 轮，之后升级为人工评审。
- **在简单任务上使用 CRITIC。** 没有外部验证器时，CRITIC 会退化为 Self-Refine；不要为占位验证器付出延迟成本。

```figure
self-refine
```

## 动手实现（Build It）

`code/main.py` 在玩具任务上实现 Self-Refine 和 CRITIC：根据主题生成简短的项目符号列表。验证器检查格式，要求 3 个条目、每条少于 60 个字符。CRITIC 添加一个外部“事实验证器”，惩罚已知幻觉。

组件如下：

- `generate`：脚本化生成器。
- `feedback`：LLM 式自我批评。
- `verify_external`：CRITIC 式有依据的验证器。
- `refine`：根据历史记录重写输出。
- 停止条件：验证器通过，或达到最多 4 次迭代。

运行：

```
python3 code/main.py
```

比较 Self-Refine 和 CRITIC 的运行。CRITIC 能发现 Self-Refine 漏掉的事实错误，因为外部验证器拥有自我批评器所没有的依据。

## 实际应用（Use It）

Anthropic 的评估器-优化器是用适合 Claude 的语言表述这一模式。OpenAI Agents SDK 的输出防护机制具有 CRITIC 形态，因为防护机制可以调用工具。LangGraph 提供类似 Self-Refine 的反思节点。Google 的 Gemini 2.5 Computer Use 增加了逐步安全评估器，这是 CRITIC 的变体：每个行动在提交执行前都要验证。

## 交付成果（Ship It）

`outputs/skill-refine-loop.md` 根据任务形态、验证器可用性和迭代预算配置评估器-优化器循环，输出生成器、评估器或验证器、优化器的提示词，以及停止策略。

## 练习（Exercises）

1. 以 max_iterations=1 运行玩具示例。CRITIC 还有帮助吗？
2. 将外部验证器换成带噪声的版本，随机产生 30% 的假阳性。循环会怎样运行？这是 2026 年大多数防护技术栈的现实。
3. 实现“生成器和批评器使用不同模型”的变体：大模型生成，小模型批评。它比使用同一模型更好吗？
4. 阅读 CRITIC 第 3 节（arXiv:2305.11738 v4）。说出三类验证工具，并分别举例。
5. 将 OpenAI Agents SDK 的 `output_guardrails` 映射到 CRITIC 的验证器角色。SDK 哪些地方做错了，哪些地方做对了？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Self-Refine | “会修正自己的 LLM” | 单模型中的生成 -> 反馈 -> 改进循环，带历史记录 |
| CRITIC | “以工具为依据的验证” | 用外部验证器替代反馈，如搜索、代码、计算器、测试 |
| 评估器-优化器（Evaluator-Optimizer） | “Anthropic 工作流模式” | 两个角色：评估器评分、优化器修改，循环到收敛 |
| 输出防护机制（Output guardrail） | “事后检查” | 智能体产生输出后运行的 OpenAI Agents SDK 验证器 |
| 验证步骤（Verify step） | “批评阶段” | 关键决策在于使用外部依据还是自我评分 |
| 改进历史（Refine history） | “模型已经尝试过什么” | 将先前输出和批评意见前置到改进提示词；去掉后质量会崩塌 |
| 盲目认可循环（Rubber-stamp loop） | “自我赞同故障” | 同提示词批评只返回“看起来不错”，用结构不同的提示词修复 |
| 停止条件（Stop condition） | “收敛测试” | 验证器通过 OR 没有反馈 AND 迭代上限，绝不只用单一条件 |

## 延伸阅读（Further Reading）

- [Madaan 等人，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)：经典论文。
- [Gou 等人，CRITIC（arXiv:2305.11738）](https://arxiv.org/abs/2305.11738)：以工具为依据的验证。
- [Anthropic，构建有效智能体（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：评估器-优化器工作流模式。
- [OpenAI Agents SDK 文档（Docs）](https://openai.github.io/openai-agents-python/)：将输出防护机制用作 CRITIC 式验证器。
