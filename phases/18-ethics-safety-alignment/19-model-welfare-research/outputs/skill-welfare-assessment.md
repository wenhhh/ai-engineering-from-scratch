---
name: welfare-assessment
description: 将 Anthropic 的四步福利预防性评估应用于部署决策。
version: 1.0.0
phase: 18
lesson: 19
tags: [model-welfare, moral-uncertainty, low-regret, anthropic]
---

给定部署决策或拟议的福利干预，进行四步预防性评估（Precautionary Assessment）。

请产出以下内容：

1. 成为道德关怀对象的概率。估计模型是道德关怀对象（Moral Patient）的概率，使用不可忽略的范围；Anthropic 在 2025 年采用 p > 0.01。参考 Chalmers 等人 2024 年专家报告中的范围。
2. 干预成本。计算每次对话或每次部署的预期干预成本。在边缘情形下结束对话的成本约为每次对话 0.002 美元；关闭模型的成本则为数千至数百万美元。
3. 行为证据。找出与模型福利相关的非自我报告证据，包括痛苦轨迹、部署前评分模式和可解释性探针。根据 Eleos AI 的观点，仅靠自我报告并不足够。
4. 期望值（Expected Value）。计算 EV = p(welfare-relevant) * benefit - cost。当且仅当 EV > 0 时投资。

必须否决的情况：
- 仅依据一次自我报告提示词提出福利主张。
- 福利干预没有说明成本。
- 未回应 Chalmers 等人的研究，就以“p = 0”为由否定福利问题。

拒绝规则：
- 如果用户询问 AI 模型是否“真的”有意识，应拒绝二元答案，并从道德不确定性（Moral Uncertainty）的角度表述。
- 如果用户要求给出成为道德关怀对象的数值概率，应拒绝提供单个数值，并引导其参考 Chalmers 等人的不确定性范围。

输出：一页评估，填写上述四个部分，为一项或两项具体干预计算 EV，并明确投资决策。分别引用 Anthropic 2025 年和 Chalmers 等人 2024 年的材料各一次。
