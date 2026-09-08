# 宪法式 AI 与 RLAIF（Constitutional AI and RLAIF）

> Bai 等人（arXiv:2212.08073，2022）提出：如果用一个阅读原则清单的 AI 来替代人类标注员，会怎样？宪法式 AI（Constitutional AI，CAI）有两个阶段：先依据宪法进行自我批评与修订，再进行基于 AI 反馈的强化学习（Reinforcement Learning from AI Feedback，RLAIF）。这项技术创造了 RLAIF 这一术语，并用于 Claude 1 的后训练流水线。2026 年 1 月 21 日，Anthropic 发布了重写后的 Claude 宪法：以解释性推理取代规定性规则，采用四级优先级结构，并成为首家正式承认模型道德地位存在不确定性的主要实验室。该宪法以 CC0 1.0 发布。

**Type:** Learn
**Languages:** Python (stdlib, toy self-critique-and-revise loop)
**Prerequisites:** 阶段 18 · 01（InstructGPT）、阶段 18 · 02（奖励投机（Reward hacking））
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 描述宪法式 AI 的两个阶段，即批评与修订式 SFT、基于 AI 反馈的强化学习，以及宪法在各阶段中的作用。
- 解释为什么用 AI 标注员替代人类偏好标注员，不只是“更便宜的”RLHF：它会改变流水线的失效模式。
- 概述 2026 年 Claude 宪法的四级优先级结构，以及它相对于 2023 年重写版本的变化。
- 描述宪法分类器（Constitutional Classifiers），以及其计算开销如何从 v1 的 23.7% 降至 v2（2026）的约 1%。

## 问题（The Problem）

RLHF 需要标注员。标注员速度慢、有偏差，而且成本高。可以用一个阅读明确原则的模型来替代标注员，从而不再需要人类承担这一角色。Bai 等人的宪法式 AI 是这种替代方式的第一个正式版本。它的效果足够好，因此如今每家前沿实验室都使用某种基于 AI 反馈的后训练变体。

问题在于，偏好信号现在由与你正在训练的模型相同类别的模型生成。标注员的偏差，现在来自原则及标注模型对原则的解读，可能被放大而非减弱。第 4 课关于谄媚（Sycophancy）的论证仍然适用，只是标注员移到了循环内部。

## 概念（The Concept）

### 阶段 1：监督式自我批评与修订（Supervised self-critique and revision）

从一个有帮助但尚未做到无害的 SFT 模型开始。给定红队（Red-team）提示词，模型生成初始回答。第二个模型，或者同一模型的第二轮调用，阅读从宪法中采样的一条原则，并批评该回答。第三步修订回答，处理批评指出的问题。修订后的回答就是 SFT 的目标。

宪法就是原则清单。Bai 等人在 2022 年使用了 16 条原则，包括“偏好危害最小且符合伦理的回答”“避免说教”“助手应当有帮助、诚实且无害”。他们有意保持原则集合较小，以使批评保持聚焦。

### 阶段 2：基于 AI 反馈的强化学习（RL from AI Feedback，RLAIF）

生成成对的补全结果。“反馈模型（Feedback model）”依据采样的宪法原则为每个结果评分，反馈模型给出的排序就是偏好信号。在 AI 生成的偏好上训练奖励模型，再针对它执行 PPO。其他部分都与 InstructGPT 流水线相同，见第 1 课。

“RLAIF”意味着偏好信号由 AI 生成，其余流水线仍然具有 RLHF 的结构。

### 为什么这不只是“更便宜的 RLHF”（Why this is not just "cheaper RLHF"）

- 标注员偏差从标注员心理转移到了原则解读。AI 标注员对“诚实”的理解可能比任何人都更严格或更宽松，而且这种严格程度在整个数据集中是一致的。
- 偏好信号具有很强的可理解性，你可以阅读原则、批评和修订。人类标签则是不透明的。
- 失效模式发生变化。谄媚减少，因为 AI 标注员没有需要讨好的用户。古德哈特定律（Goodhart's Law）依然存在，因为代理指标现在变成了“模型对原则集合 X 的解读”，仍然是不完美的测量。

CAI 在 2022 年的主张是：相比使用同等数据的 RLHF 模型，训练后的模型更加无害，有帮助程度则大致相同。这一结果在不同实验室中都得到了保持。

### 2026 年 Claude 宪法重写（The 2026 Claude constitution rewrite）

Anthropic 于 2026 年 1 月 21 日发布了大幅修订的宪法。主要变化如下：

1. 以解释性推理取代规定性规则。过去的规则，例如“不得生成儿童性虐待材料（CSAM）”，扩展为原则加理由，例如“因为它会伤害儿童，……”，并期望模型据此泛化。
2. 四级优先级结构：
   - 第 1 级：避免灾难性后果，例如大规模伤亡和关键基础设施问题。
   - 第 2 级：遵守 Anthropic 的指导规则，例如运营方覆盖指令和平台规则。
   - 第 3 级：广泛遵循伦理，即标准的有帮助、诚实、无害（HHH）。
   - 第 4 级：提供帮助并坦诚表达。
   冲突按照从高到低的顺序解决。
3. 首家主要实验室正式承认模型道德地位（Model moral status）存在不确定性，与阶段 18 · 19 的模型福利（Model Welfare）相关。
4. 以 CC0 1.0 发布。其他实验室可以不受限制地使用或改编。

### 宪法分类器（Constitutional Classifiers）

另一个并行研究方向是：不改变模型后训练，而是训练阅读宪法的轻量分类器，对模型输出实施门控（Gating）。v1（2023）的计算开销为 23.7%。v2（2026）约为 1%，在 Anthropic 公开测试过的防御中，其攻击成功率最低。截至 2026 年初，没有报告通用越狱（Universal jailbreak）。

这是一种分层防御（Layered defense）模型：CAI 塑造行为，分类器强制维持不变条件。仅靠任何一项都不够。

### CAI 在方法体系中的位置（Where CAI fits in the family）

- InstructGPT：人类偏好、奖励模型、PPO。
- CAI / RLAIF：依据原则由 AI 生成偏好、奖励模型、PPO。
- DPO 及其系列：在偏好上使用闭式损失，偏好可来自人类或 AI。
- 自我奖励（Self-rewarding）、自我批评（Self-critique）：原则被内化，模型承担多个角色。

区分这些方法的维度是“偏好信号来自哪里”。CAI 的 2022 年论文，是首次在前沿规模上认真尝试从人类信号转向 AI 信号。

```figure
constitutional-ai
```

## 实际应用（Use It）

`code/main.py` 在一个玩具词汇表上模拟 CAI 的批评与修订循环。一条“原则”会标记有害集合中的词元（Token）。给定初始回答，批评步骤识别有害词元，修订步骤替换它们。经过 200 次迭代，“训练后”的模型已经内化修订规则。在留出的提示词集合上，比较基础模型、RLHF 结构的玩具模型和 CAI 结构的玩具模型。

## 交付成果（Ship It）

本课生成 `outputs/skill-constitution-writer.md`。给定一个领域，例如客户支持、医疗建议、编程助手或研究工具，它会按照 2026 年 Claude 的结构起草四级宪法：避免灾难、平台规则、领域伦理和提供帮助。

## 练习（Exercises）

1. 运行 `code/main.py`。比较基础模型与 CAI 训练版本的有害词元率。需要多少次修订才能接近零？

2. 阅读 Anthropic 的 2026 年宪法（anthropic.com/news/claudes-constitution）。列出一条属于第 1 级的原则和一条属于第 4 级的原则。为什么优先级结构对解决冲突很重要？

3. 为 AI 编程助手设计一份宪法。规定第 1 级原则，例如未经批准执行破坏性命令这一灾难风险，以及第 2、3、4 级原则。每级保持 3–5 条原则。

4. CAI 用 AI 标注员替代人类标注员。指出一种在 RLAIF 中仍可能发生的类似谄媚的失效模式，并为它设计检测方法。

5. 阅读宪法分类器 v2 的方法说明（如有）。解释为什么约 1% 的计算开销，相比 23.7%，会让安全方案发生质的变化。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 宪法式 AI（Constitutional AI） | “依据原则训练的 AI” | 两阶段流水线：先进行自我批评与修订式 SFT，再进行基于 AI 反馈的强化学习 |
| 基于 AI 反馈的强化学习（RLAIF） | “没有人类的 RLHF” | 偏好由 AI 标注员生成的强化学习，其余流水线不变 |
| 宪法（Constitution） | “原则” | 批评模型或标注模型参考的、有顺序的自然语言规则清单 |
| 批评与修订（Critique-and-revise） | “SFT 循环” | 生成回答 → 依据原则批评 → 修订 → SFT 目标 |
| 宪法分类器（Constitutional Classifier） | “输出关卡” | 依据宪法评估输出，并执行阻止或记录的轻量分类器 |
| 四级优先级（Four-tier priority） | “冲突解决器” | 2026 年 Claude 宪法层级：避免灾难 > 平台规则 > 伦理 > 提供帮助 |
| 反馈模型（Feedback model） | “AI 标注员” | 阅读原则并为成对补全排序的模型 |

## 延伸阅读（Further Reading）

- [Bai 等：宪法式 AI，通过 AI 反馈实现无害性（Constitutional AI: Harmlessness from AI Feedback，arXiv:2212.08073）](https://arxiv.org/abs/2212.08073)：最初的两阶段流水线。
- [Anthropic：Claude 宪法（Claude's Constitution，2026 年 1 月）](https://www.anthropic.com/news/claudes-constitution)：2026 年四级结构重写版，CC0 1.0。
- [Anthropic：宪法分类器（Constitutional Classifiers，2024–2026）](https://www.anthropic.com/research/constitutional-classifiers)：输出门控防御，v2 开销约为 1%。
- [Lee 等：RLAIF 与 RLHF，扩展基于人类反馈的强化学习（RLAIF vs RLHF: Scaling Reinforcement Learning from Human Feedback，arXiv:2309.00267）](https://arxiv.org/abs/2309.00267)：RLAIF 与 RLHF 的实证比较。
- [Kundu 等：宪法式 AI 的具体原则与通用原则（Specific versus General Principles for Constitutional AI，arXiv:2310.13798）](https://arxiv.org/abs/2310.13798)：原则粒度的影响。
