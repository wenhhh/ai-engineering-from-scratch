# 失效模式：智能体为什么出错（Failure Modes: Why Agents Break）

> MASFT（Berkeley，2025）将 14 种多智能体失效模式归为 3 类。Microsoft 的分类体系记录了现有 AI 失败如何在智能体场景中放大。行业实地数据指向五种反复出现的模式：幻觉动作、范围蔓延、级联错误、上下文丢失、工具误用。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 05（自我改进（Self-Refine）与 CRITIC），第 14 阶段 · 24（可观测性）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 列出 MASFT 的三种失败类别，并在每类中至少列出四种具体模式。
- 解释智能体失败为什么会放大现有 AI 失效模式，如偏见和幻觉。
- 描述行业反复出现的五种模式及其缓解措施。
- 使用标准库实现检测器，为智能体追踪标注失效模式。

## 问题（The Problem）

从运行追踪来看，团队交付的智能体可能有 90% 的运行正常。剩下 10% 的失败不是随机噪声，而是落在少数反复出现的类别中。能够识别这些类别，才能有针对性地监控和修复。

## 概念（The Concept）

### MASFT（Berkeley，arXiv:2503.13657）（MASFT）

多智能体系统失败分类体系（Multi-Agent System Failure Taxonomy）。14 种失效模式聚为 3 类。标注者间 Cohen's Kappa 为 0.88，说明这些类别可以可靠区分。

核心主张：失败源于多智能体系统的根本设计缺陷，而非可通过更好基础模型解决的 LLM 局限。

### Microsoft 智能体 AI 系统失效模式分类（Microsoft Taxonomy of Failure Mode in Agentic AI Systems）

- 现有 AI 失败，如偏见、幻觉和数据泄漏，在智能体场景中被放大。
- 自主性带来新失败：大规模非预期动作、工具误用、任务漂移。
- 该白皮书是智能体产品的风险登记表。

### 智能体 AI 故障特征（Characterizing Faults in Agentic AI，arXiv:2603.06847）

- 失败来自编排、内部状态演化和环境交互。
- 不只是“坏代码”或“糟糕的模型输出”。

### LLM 智能体幻觉综述（LLM Agent Hallucinations Survey，arXiv:2509.18970）

两种主要表现：

1. **指令遵循偏离（Instruction-following Deviation）**：智能体不遵循系统提示词。
2. **长距离上下文误用（Long-range Contextual Misuse）**：智能体忘记或错误使用早期轮次的上下文。

子意图错误（Sub-intention errors）：遗漏（Omission，漏掉步骤）、冗余（Redundancy，重复步骤）、乱序（Disorder，步骤顺序错误）。

### 行业反复出现的五种模式（The five industry-recurring modes）

Arize、Galileo、NimbleBrain 在 2024–2026 年的实地分析共同指出：

1. **幻觉动作（Hallucinated actions）。** 智能体调用不存在的工具或捏造参数。
2. **范围蔓延（Scope creep）。** 智能体将任务扩展到用户要求之外，如创建额外 PR、发送额外邮件。
3. **级联错误（Cascading errors）。** 一个错误调用引发下游影响。虚构 SKU 的幻觉触发四次 API 调用，演变为多系统事故。
4. **上下文丢失（Context loss）。** 长周期任务忘记早期轮次的约束。
5. **工具误用（Tool misuse）。** 用错误参数调用正确工具，或完全调用错工具。

级联最具破坏性。智能体无法区分“我失败了”与“任务不可能完成”，常在收到 400 错误时编造成功消息，以结束循环。

### 缓解措施：每步设置门禁（Mitigation: gates at every step）

在推理链每一步设置自动验证门禁，对照环境状态检查事实依据。具体包括：

- 逐步骤安全分类器（第 21 课）。
- 工具调用参数校验（第 06 课）。
- 将检索内容与已知事实交叉核查（第 05 课，CRITIC）。
- 重新探测状态，检测成功幻觉，例如文件是否真的创建了。

### 失败监控的误区（Where failure monitoring goes wrong）

- **只标注崩溃（Tagging only crashes）。** 大多数智能体失败会产生看似有效的输出，需要内容层面检查。
- **没有基线（No baseline）。** 漂移检测需要最后一个已知正常版本；否则无法判断“情况正在变差”。
- **过度告警（Over-alerting）。** 每次失败都呼叫值班人员。应聚类并限速。

```figure
failure-cascade
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现失效模式标注器：

- 覆盖五种模式的合成追踪数据集。
- 每种模式的检测函数，在工具调用、输出和重复动作上匹配特征。
- 为每条追踪标注并报告模式分布的标注器。

运行：

```
python3 code/main.py
```

输出：逐追踪标签与汇总分布，以低成本复现 Phoenix 追踪聚类揭示的内容。

## 实际应用（Use It）

- **Phoenix**：用于生产漂移聚类（第 24 课）。
- **Langfuse**：用于会话回放与标注。
- **自定义实现（Custom）**：检测可观测性平台无法识别的领域特定特征。

## 交付成果（Ship It）

`outputs/skill-failure-detector.md` 生成针对自身领域的失效模式检测器，并接入追踪存储。

## 练习（Exercises）

1. 添加“成功幻觉”检测器：智能体返回成功，但目标状态没有变化。
2. 标注自己开发产品的 100 条真实追踪。哪种模式占主导？修复成本是什么？
3. 实现“级联半径”指标：第 N 步失败影响了多少下游步骤？
4. 阅读 MASFT 的 14 种失效模式，选三种适用于你的产品的模式，编写检测器。
5. 将一个检测器接入 CI：如果 >=5% 的追踪标注了某种模式，就使构建失败。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| MASFT | “多智能体失败分类体系” | Berkeley 的 14 模式分类 |
| 级联错误（Cascading error） | “连锁失败” | 一个早期错误传播到 N 个步骤 |
| 上下文丢失（Context loss） | “忘了约束” | 长周期轮次丢失早期事实 |
| 工具误用（Tool misuse） | “工具错 / 参数错” | 调用形式有效，实际使用错误 |
| 成功幻觉（Success hallucination） | “伪造完成” | 收到 400 时声称成功，但状态未变 |
| 范围蔓延（Scope creep） | “越界” | 智能体做得比要求更多 |
| 指令遵循偏离（Instruction-following deviation） | “不服从” | 忽略系统提示词或用户约束 |
| 子意图错误（Sub-intention errors） | “计划缺陷” | 执行计划时遗漏、冗余或乱序 |

## 延伸阅读（Further Reading）

- [Cemri 等，MASFT（arXiv:2503.13657）](https://arxiv.org/abs/2503.13657)：14 种模式，3 个类别
- [Microsoft《智能体 AI 系统失效模式分类》（Taxonomy of Failure Mode in Agentic AI Systems）](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-brand/documents/Taxonomy-of-Failure-Mode-in-Agentic-AI-Systems-Whitepaper.pdf)：风险登记表
- [Arize Phoenix](https://docs.arize.com/phoenix)：漂移聚类实践
- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：何时可用更简单的模式完全避开失效模式
