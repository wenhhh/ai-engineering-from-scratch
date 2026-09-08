# Anthropic 负责任扩展政策（Responsible Scaling Policy）v3.0

> RSP v3.0 于 2026 年 2 月 24 日生效，取代 2023 年的政策。缓解措施分为两层：Anthropic 将单方面采取的行动，以及面向整个行业的建议（包括 RAND SL-4 安全标准）。新版把前沿安全路线图（Frontier Safety Roadmap）和风险报告（Risk Report）设为持续维护的文档，而非一次性交付物；删除了 2023 年的暂停承诺；引入 AI R&D-4 阈值：一旦跨过该阈值，Anthropic 必须发布正面论证（affirmative case），说明失准风险及缓解措施。Claude Opus 4.6 尚未跨过该阈值。Anthropic 在 v3.0 公告中表示：“要有把握地排除这种可能性，正变得越来越困难。”SaferAI 给 2023 年 RSP 的评分为 2.2；新版 v3.0 被降至 1.9，使 Anthropic 与 OpenAI、DeepMind 一同进入 RSP“弱”等级。定性阈值取代了 2023 年的定量承诺；删除暂停条款是最明显的倒退。

**Type:** Learn
**Languages:** Python（标准库，RSP 阈值决策引擎）
**Prerequisites:** 阶段 15 · 06（自动化对齐研究，AAR），阶段 15 · 07（递归自我改进，RSI）
**Time:** 约 45 分钟

## 问题（The Problem）

前沿实验室发布的扩展政策，兼具技术文档、治理文档和向监管机构传递信号的作用。RSP v3.0 是 Anthropic 当前的政策文档。仔细阅读它之所以重要，并非因为遵守它具有强制约束力（实际上没有），而是因为其表述方式塑造了实验室如何理解灾难性风险，以及如何向公众解释取舍。

分析这份政策，最有用的办法是对照 v3.0 与 v2.0 的变化。新增的是前沿安全路线图、风险报告和 AI R&D-4 阈值；删除的是 2023 年的暂停承诺；重新划分的是缓解措施，将其分为 Anthropic 单方面行动与行业建议两层。外部评审方 SaferAI 把评分从 2.2（v2）降至 1.9（v3.0）。这说明，扩展政策即使写得更精致，实际要求也可能更宽松。

## 概念（The Concept）

### 两层缓解措施安排（The two-tier mitigation schedule）

- **Anthropic 单方面行动（unilateral actions）**：无论其他实验室怎么做，Anthropic 都会采取的措施。包括达到阈值后停止训练、具体安全措施、具体部署关卡。
- **全行业建议（industry-wide recommendations）**：Anthropic 认为行业应共同采取的措施，其中包括 RAND SL-4 安全标准。这些不是 Anthropic 自身的承诺，而是政策倡议。

v2 中没有这种两层结构。这意味着读者需要查看每项承诺落在哪一栏。“全行业建议”栏中的安全措施，不是 Anthropic 的保证，而是其期望。

### AI R&D-4 阈值（The AI R&D-4 threshold）

这是 RSP v3.0 指定的下一个重要能力阈值。具体而言：模型能够以有竞争力的成本，将相当大比例的 AI 研究自动化。一旦 Anthropic 认为模型跨过了这一阈值，就必须在继续扩展前发布正面论证，说明失准风险及缓解措施。

根据 v3.0 公告，Claude Opus 4.6 尚未跨过该阈值。文档补充说：“要有把握地排除这种可能性，正变得越来越困难。”这一措辞承认，模型能力已经足够接近该阈值，需要现在就关注，而不能仅将其视为假设中的界限。

第 6 课（自动化对齐研究）和第 7 课（递归自我改进）直接关联这一阈值。自动化对齐研究者达到研究质量门槛，是 AI R&D-4 阈值正在逼近的证据。

### 前沿安全路线图与风险报告（Frontier Safety Roadmaps and Risk Reports）

v3.0 将两类产出提升为持续维护的文档：

- **前沿安全路线图（Frontier Safety Roadmap）**：面向未来的文档，描述计划中的安全工作、能力预期和缓解措施研究。
- **风险报告（Risk Report）**：针对已发布具体模型的回顾性文档，描述已观察到的能力及残余风险。

两者都公开发布，并按声明的频率更新。其价值在于：读者能够对照 Anthropic 在路线图中说要做的事，与其在风险报告中报告的实际情况。

### 删除暂停条款（Removing the pause clause）

2023 年 RSP 包含明确的暂停承诺：如果模型跨过特定能力阈值，就暂停训练，直至缓解措施就绪。v3.0 用更宽松的表述取代了明确暂停要求：发布正面论证，若缓解措施充分便可继续。SaferAI 和其他分析者直接指出，这是新文档中最明显的倒退。

支持这一变更的政策论点是：由于能力基准本身重新调整了尺度，2023 年的定量阈值到了 2026 年的能力基准下变得无法达到。反方论点是：扩展政策中的暂停条款是一种承诺机制；删除它，也就削弱了政策的可信度。

### SaferAI 的降级（SaferAI's downgrade）

SaferAI 是对 RSP 类文档进行评级的独立组织。其公开评分中，2023 年 Anthropic RSP 得分为 2.2（该量表中，4.0 对应当前最佳 RSP，1.0 对应名义上的政策）。v3.0 得分为 1.9。这使 Anthropic 从“中等”降至“弱”，与 OpenAI、DeepMind 同处弱等级。

SaferAI 给出的降级因素包括：
- 定性阈值取代了定量阈值。
- 暂停承诺被删除。
- AI R&D-4 阈值对应的缓解措施，被描述为“正面论证”，而非具体措施。
- 评审机制依赖 Anthropic 的安全顾问组（Safety Advisory Group），独立监督有限。

### 本课不是什么（What this lesson is not）

这不是合规课程。RSP v3.0 并非法规，没有强制 Anthropic 遵守它的约束。本课要训练的是逐条细读、审慎质疑政策文档的能力。扩展政策是前沿实验室向公众表明其如何应对灾难性风险的主要渠道。对于工作依赖前沿模型能力的人，读懂这些政策是一项实用技能。

```figure
a5-rsp-ladder
```

## 动手使用（Use It）

`code/main.py` 实现了一个小型决策引擎，模拟 RSP 阈值评估的结构：给定候选模型和一组能力测量值，返回是否跨过 AI R&D-4 阈值、正面论证必须包含哪些部分，以及是否可以继续部署。实现刻意保持简单；目的是把文档中的逻辑明确表达出来。

## 交付成果（Ship It）

`outputs/skill-scaling-policy-review.md` 以 v3.0 为参照，审查扩展政策（Anthropic、OpenAI、DeepMind 或内部政策），涵盖两层结构、阈值、暂停承诺和独立评审。

## 练习（Exercises）

1. 运行 `code/main.py`。输入三个不同能力水平的合成模型。确认阈值评估器符合预期，并生成正确的正面论证模板。

2. 完整阅读 RSP v3.0（32 页）。找出所有位于“全行业建议”层的承诺。其中哪些在 v2 中原本属于“Anthropic 单方面行动”？

3. 阅读 SaferAI 的 RSP 评分方法。将其评分准则应用于文档，复现 v3.0 的 1.9 分。评分表中哪一行对降级影响最大？

4. 2023 年的暂停承诺已被删除。提出一项替代承诺，既保留政策的可信度，也承认 2026 年基准尺度重新调整的问题。

5. 将 RSP v3.0 与 OpenAI 准备度框架（Preparedness Framework）v2（第 20 课）进行比较。各选出一个 v3.0 更强和准备度框架更强的方面。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 负责任扩展政策（RSP） | “Anthropic 的扩展政策” | Responsible Scaling Policy；v3.0 于 2026 年 2 月 24 日生效 |
| AI R&D-4 | “研究自动化阈值” | 以有竞争力的成本，将大量 AI 研究自动化的能力 |
| 正面论证（Affirmative case） | “安全性论证” | 公开论证风险已被识别、缓解措施充分 |
| 前沿安全路线图（Frontier Safety Roadmap） | “未来计划” | 持续维护的文档，描述计划中的安全工作及预期能力 |
| 风险报告（Risk Report） | “模型回顾” | 持续维护的文档，描述发布后观察到的能力及残余风险 |
| 两层缓解措施（Two-tier mitigation） | “单方面与行业层面” | 将 Anthropic 的承诺与行业建议分开列示 |
| 暂停承诺（Pause commitment） | “2023 年条款” | 明确承诺暂停训练；v3.0 已删除 |
| SaferAI 评级（SaferAI rating） | “独立 RSP 评分” | 第三方评分准则；v3.0 得分 1.9（v2 为 2.2） |

## 延伸阅读（Further Reading）

- [Anthropic — 负责任扩展政策（Responsible Scaling Policy）v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) — 完整的 32 页政策。
- [Anthropic — RSP v3.0 公告（announcement）](https://www.anthropic.com/news/responsible-scaling-policy-v3) — 相比 v2 的变更摘要。
- [Anthropic — 前沿安全路线图（Frontier Safety Roadmap）](https://www.anthropic.com/research/frontier-safety) — RSP v3.0 链接的持续维护文档。
- [Anthropic — 风险报告（Risk Report）：Claude Opus 4.6](https://www.anthropic.com/research/risk-report-claude-opus-4-6) — 对当前前沿模型的回顾。
- [Anthropic — 测量实际中的智能体自主性（Measuring agent autonomy in practice）](https://www.anthropic.com/research/measuring-agent-autonomy) — 将 AI R&D-4 与实测自主性联系起来。
