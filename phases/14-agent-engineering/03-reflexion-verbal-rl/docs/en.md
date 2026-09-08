# Reflexion：语言强化学习（Verbal Reinforcement Learning）

> 基于梯度的强化学习（RL）需要数千次试验和 GPU 集群才能修正一种故障模式。Reflexion（Shinn 等人，NeurIPS 2023）用自然语言完成这件事：每次试验失败后，智能体写下反思，存入情景记忆（Episodic memory），并以该记忆作为下一次试验的条件。这正是 Letta 的休眠时计算（Sleep-time compute）、Claude Code 的 CLAUDE.md 经验记录和 pro-workflow 的 learn-rule 背后的模式。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 02（ReWOO）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出 Reflexion 的三个组件：行动者（Actor）、评估器（Evaluator）、自我反思器（Self-Reflector），以及情景记忆的作用。
- 使用标准库实现带二元评估器、反思缓冲区和重新尝试机制的 Reflexion 循环。
- 为给定任务选择标量（Scalar）、启发式（Heuristic）或自我评估（Self-evaluated）反馈来源。
- 解释为什么语言强化能够发现那些基于梯度的 RL 需要数千次试验才能修正的错误。

## 问题（The Problem）

智能体执行任务失败了。按照标准 RL 的方法，你会再运行数千次试验、计算梯度、更新权重。这既昂贵又缓慢，而大多数生产智能体没有针对每次失败开展训练的预算。

Reflexion（Shinn 等人，arXiv:2303.11366）换了一个问法：如果智能体只思考自己为什么失败，再把这段思考放进提示词中重新尝试，会怎样？不更新权重，也没有梯度，只在试验之间保存自然语言。

结果是：在 ALFWorld 上，它超过 ReAct 和其他未经微调的基线；在 HotpotQA 上，它优于 ReAct；在代码生成（HumanEval/MBPP）上，它达到了当时的最佳水平。全过程没有进行一次梯度更新。

## 概念（The Concept）

### 三个组件（The three components）

```
行动者（Actor）：生成轨迹（ReAct 风格循环）
评估者（Evaluator）：为轨迹评分，可采用二元判定、启发式或自我评估
自我反思者（Self-Reflector）：用自然语言撰写针对失败的反思
```

再加上一种数据结构：

```
情景记忆（Episodic Memory）：此前反思的列表，放在下一次试验的提示词开头
```

一次试验运行行动者，由评估器评分。如果分数低，自我反思器就生成反思，例如：“我选错了工具，因为我把问题误读成在问 X，而它实际问的是 Y。”反思进入情景记忆。下一次试验从头开始，但能看到这段反思。

### 三类评估器（Three evaluator types）

1. **标量（Scalar）**：外部二元信号。ALFWorld 成功或失败，HumanEval 测试通过或失败。最简单，信号也最明确。
2. **启发式（Heuristic）**：预定义故障特征。例如，“智能体连续两次产生相同行动，则标记为卡住”；“轨迹超过 50 步，则标记为低效”。
3. **自我评估（Self-evaluated）**：LLM 为自己的轨迹评分。没有真实参照（Ground truth）时需要这种方式。信号较弱，适合搭配以工具为依据的验证（第 05 课，CRITIC）。

2026 年的默认做法是混合使用：有标量信号就用标量，没有就用自我评估，再以启发式规则作为安全防线。

### 为什么能够推广（Why this generalizes）

与其说 Reflexion 是一种新算法，不如说它是一个命名模式。几乎每个生产“自愈”（Self-healing）智能体都运行着某种变体：

- Letta 的休眠时计算（第 08 课）：独立智能体反思过去的对话，并写入记忆块（Memory block）。
- Claude Code 的 `CLAUDE.md` / “保存记忆”模式：将反思记录为经验，前置到未来会话。
- pro-workflow 的 `/learn-rule` 命令：将纠正意见记录为显式规则。
- LangGraph 的反思节点：为输出评分，需要时路由到改进节点。

它们都来自同一个认识：自然语言的表达能力足以承载“我从失败中学到了什么”，并将这些经验传递给后续运行。

### 何时有效，何时无效（When it works and when it does not）

Reflexion 在以下条件下有效：

- 有明确的失败信号，如测试失败、工具错误或答案错误。
- 任务类别可复现，即可以再次提出同类问题。
- 反思有机会改善轨迹，即行动预算足够。

Reflexion 在以下情况下没有帮助：

- 智能体第一次就成功。
- 失败来自外部，如网络中断、工具损坏；反思“网络断了”对未来运行没有帮助。
- 反思变成迷信，即为一次偶发的不稳定运行编造叙事并保存。

2026 年的陷阱是记忆腐化（Memory rot）：反思不断积累，其中一些过时或错误；随着情景缓冲区增大，重新运行也越来越慢。缓解方式包括定期压缩（Compaction，第 06 课）、为反思设置生存期（TTL），或使用独立的休眠时清理智能体（Letta）。

```figure
react-trace
```

## 动手实现（Build It）

`code/main.py` 在玩具谜题上实现 Reflexion：生成一个含 3 个元素、总和等于目标值的列表。行动者输出候选列表，评估器检查总和，自我反思器写一行说明哪里出了问题。反思进入情景记忆，供下一次试验使用。

组件如下：

- `Actor`：看到反思后会改进的脚本化策略。
- `Evaluator.binary()`：判断是否达到目标总和，返回通过或失败。
- `SelfReflector`：生成一行失败诊断。
- `EpisodicMemory`：带 TTL 语义的有界列表。

运行：

```
python3 code/main.py
```

轨迹展示三次试验。试验 1 失败并保存反思；试验 2 看到反思后有所改进，但仍失败；试验 3 成功。与不使用反思的基线运行比较，后者始终停留在试验 1 的答案。

## 实际应用（Use It）

LangGraph 将反思作为一种节点模式提供。Claude Code 的 `/memory` 命令和 pro-workflow 的 `/learn-rule` 将情景缓冲区外置为 Markdown 文件。Letta 的休眠时计算在空闲期运行自我反思器，使主智能体仍能满足延迟约束。OpenAI Agents SDK 不直接提供 Reflexion；你可以用自定义防护机制（Guardrail）按分数拒绝轨迹，再用跨运行保留的记忆 `Session` 构建它。

## 交付成果（Ship It）

`outputs/skill-reflexion-buffer.md` 创建并维护情景缓冲区，支持反思记录、TTL 和去重（Deduplication）。给定任务类别和失败情况，它会输出真正有助于下一次试验的反思，而不是泛泛地说“更小心一点”。

## 练习（Exercises）

1. 将二元评估器改为返回距离指标的标量评估器，衡量距离目标有多远。收敛是否更快？
2. 将反思的 TTL 设为 10 次试验。在这之后，旧反思会带来帮助还是损害？
3. 实现启发式评估器：如果相同行动重复出现，就把试验标记为卡住。它如何与自我反思器交互？
4. 使用无视反思的对抗性行动者运行 Reflexion。最少需要怎样的反思提示词工程，才能迫使行动者注意到反思？
5. 阅读 Reflexion 论文第 4 节关于 AlfWorld 的内容。从概念上复现成功率提高 130% 的结果：与普通 ReAct 相比，关键差别是什么？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Reflexion | “自我纠错” | Shinn 等人于 2023 年提出，包含行动者、评估器、自我反思器与情景记忆 |
| 语言强化（Verbal reinforcement） | “无梯度学习” | 将自然语言反思前置到下一次试验的提示词 |
| 情景记忆（Episodic memory） | “按任务保存的反思” | 针对某一任务类别，保存先前反思的有界缓冲区 |
| 标量评估器（Scalar evaluator） | “二元成功信号” | 来自真实参照的通过、失败信号或数值分数 |
| 启发式评估器（Heuristic evaluator） | “基于模式的检测器” | 预定义故障特征，如循环卡住、步数过多 |
| 自我评估器（Self-evaluator） | “LLM 为自己的轨迹当裁判” | 没有真实参照时的弱信号后备方案，应结合以工具为依据的验证 |
| 记忆腐化（Memory rot） | “过时反思” | 情景缓冲区被过时条目填满，通过压缩或 TTL 修复 |
| 休眠时反思（Sleep-time reflection） | “异步自我反思” | 在关键执行路径之外运行自我反思器，使主智能体保持快速响应 |

## 延伸阅读（Further Reading）

- [Shinn 等人，Reflexion：采用语言强化学习的语言智能体（Language Agents with Verbal Reinforcement Learning，arXiv:2303.11366）](https://arxiv.org/abs/2303.11366)：经典论文。
- [Letta，休眠时计算（Sleep-time Compute）](https://www.letta.com/blog/sleep-time-compute)：生产环境中的异步反思。
- [Anthropic，面向 AI 智能体的有效上下文工程（Effective context engineering for AI agents）](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：将情景缓冲区作为上下文的一部分管理。
- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：反思节点模式。
