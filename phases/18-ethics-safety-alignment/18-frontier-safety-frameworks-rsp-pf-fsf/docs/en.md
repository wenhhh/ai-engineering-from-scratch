# 前沿安全框架（Frontier Safety Frameworks）— RSP、PF、FSF

> 三家主要实验室的框架界定了 2026 年业界对前沿能力的治理方式。Anthropic《负责任扩展政策》（Responsible Scaling Policy，RSP）v3.0（2026 年 2 月）参照生物安全等级，引入了分级的 AI 安全等级（AI Safety Levels，ASL-1 至 ASL-5+）；针对具备化学、生物、放射性和核（CBRN）相关能力的模型，ASL-3 已于 2025 年 5 月启用。OpenAI《准备度框架》（Preparedness Framework，PF）v2（2025 年 4 月）为受跟踪能力规定了五项标准，并将能力报告与防护措施报告分开。DeepMind《前沿安全框架》（Frontier Safety Framework，FSF）v3.0（2025 年 9 月）引入了关键能力等级（Critical Capability Levels，CCL），其中包括新增的有害操纵 CCL。三者目前都包含竞争对手调整条款：如果同行实验室在没有同等防护措施的情况下发布模型，可以推迟要求。跨实验室的一致性体现在结构上，而非术语上：“能力阈值”“高能力阈值”和“关键能力等级”表示的是类似概念。

**Type:** Learn
**Languages:** none
**Prerequisites:** 阶段 18 · 17（WMDP）、阶段 18 · 07-09（欺骗相关失效（deception failures））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说明 Anthropic 的 ASL 分级结构，以及什么触发了 ASL-3。
- 列出 OpenAI《准备度框架》v2 对受跟踪能力规定的五项标准。
- 说明 DeepMind 的关键能力等级结构和有害操纵 CCL。
- 解释竞争对手调整条款，以及它们为什么会影响竞争动态。
- 定义安全论证（Safety Case），并说明其三支柱结构：监控、不可解读性和能力缺失。

## 问题（The Problem）

第 7–17 课表明，欺骗可能发生，双用途能力确实存在，而评估也有局限。拥有前沿能力模型的实验室需要一种内部治理结构，以便：
- 定义何时必须采取新防护措施的阈值。
- 定义在扩大规模前必须进行的评估。
- 说明安全论证应是什么样。
- 处理竞争动态问题：如果竞争对手在没有防护措施的情况下发布模型，你该怎么办？

这三个 2025–2026 年的框架代表了当前的发展水平。它们并不完善，仍在演进，但实验室之间已足够一致，以至于治理问题如今已从“是否存在框架”转向“这些框架是否足够”。

## 核心概念（The Concept）

### Anthropic《负责任扩展政策》v3.0（2026 年 2 月）（Anthropic Responsible Scaling Policy v3.0）

ASL 结构：
- ASL-1：不是前沿模型，归入弱于前沿模型的基线。
- ASL-2：当前前沿模型基线，采用常规防护措施部署。
- ASL-3：灾难性滥用风险明显更高，具备 CBRN 相关能力。该等级已于 2025 年 5 月启用。
- ASL-4：跨过 AI R&D-2 阈值，模型能够自动完成入门级 AI 研究。
- ASL-5+：具备高级 AI 研发能力，模型能够大幅加速有效的规模扩展。

v3.0 的新增内容：
- 前沿安全路线图（Frontier Safety Roadmaps），以删节形式公开。
- 风险报告（Risk Reports），每季度发布，其中一部分接受外部审查。
- AI 研发被细分为 AI R&D-2 和 AI R&D-4。
- 一旦跨过 AI R&D-4，就必须提出肯定性的安全论证，识别模型追求不对齐目标所带来的失配风险。

### OpenAI《准备度框架》v2（2025 年 4 月 15 日）（OpenAI Preparedness Framework v2）

受跟踪能力的五项标准：
- **可信性（Plausible）。** 存在合理的威胁模型。
- **可测量性（Measurable）。** 能够进行实证评估。
- **严重性（Severe）。** 伤害规模很大。
- **全新性（Net-New）。** 不是已有风险的规模放大。
- **瞬时性或不可补救性（Instantaneous-or-Irremediable）。** 伤害发生得很快，或无法撤销。

满足全部五项标准的能力才会被跟踪，其他能力则不会。

PF v2 的其他结构：
- 将能力报告（Capabilities Reports，模型能做什么）与防护措施报告（Safeguards Reports，存在哪些控制措施）分开。
- 由安全咨询组（Safety Advisory Group）审查。
- 由领导层批准，董事会安全与安保委员会监督。
- “调整条款”：如果另一家实验室在没有同等防护措施的情况下发布模型，OpenAI 可以降低要求。

### DeepMind《前沿安全框架》v3.0（2025 年 9 月）（DeepMind Frontier Safety Framework v3.0）

按领域设置的关键能力等级（CCL）包括：
- 生物武器能力提升（Bioweapon Uplift）
- 网络能力提升（Cyber Uplift）
- 机器学习研发加速（ML R&D Acceleration）
- 有害操纵（Harmful Manipulation，v3.0 新增）：模型能够在高风险情境下实质性改变人的信念或行为。

v2.0（2025 年 2 月）加入了欺骗性对齐（Deceptive Alignment）一节，并为机器学习研发 CCL 设置了更高的安保等级。

### 跨实验室的一致性（Cross-Lab Alignment）

- Anthropic 使用“能力阈值（Capability Thresholds）”。
- DeepMind 使用“关键能力等级（Critical Capability Levels）”。
- OpenAI 使用“高能力阈值（High Capability Thresholds）”。

业界没有统一术语，但结构一致：前沿能力分为三个层级，并公开评估标准。自 2025 年起，三者都包含竞争对手调整条款。

### 安全论证（Safety Cases）

安全论证是一份书面论证，说明在最坏情况假设下，某项部署仍具有可接受的安全性。标准结构针对三个支柱：

- **监控（Monitoring）。** 如果不良行为发生，我们能否检测到？
- **不可解读性（Illegibility）。** 模型是否缺乏执行连贯计划以造成伤害的能力？
- **能力缺失（Incapability）。** 模型是否不具备造成所讨论伤害的能力？

不同的安全论证针对不同支柱。对于 ASL-3 的 CBRN 论证，主要目标是通过机器遗忘实现能力缺失。对于欺骗性对齐，目标是监控和不可解读性。对于网络能力提升，三个支柱都相关。

### 竞争动态问题（The Race-Dynamic Problem）

竞争对手调整条款存在争议。批评者认为，它们会引发逐底竞争：如果三家实验室都会在竞争对手背离约定时降低要求，均衡就会向背离约定的方向移动。支持者则认为，如果背离约定的实验室更不重视安全，那么替代方案，即单方面坚持防护措施，会产生更糟的结果。

英国 AISI、美国 CAISI 和欧盟 AI 办公室（第 24 课）是对应的外部治理机构。实验室框架属于自愿措施，而监管框架仍在形成。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 17–18 课在欺骗与红队分析之上增加了测量和治理层。第 19–24 课涵盖福利、偏差、隐私、水印和监管结构。第 28 课梳理了将这些评估付诸实施的研究生态，包括 MATS、Redwood、Apollo 和 METR。

```figure
al-asl-ladder
```

## 动手使用（Use It）

本课没有代码。阅读三个一手来源：RSP v3.0、PF v2 和 FSF v3.0。将各实验室的分级结构相互映射，并分别找出一个该实验室定义而其他实验室没有定义的阈值。

## 交付成果（Ship It）

本课产出 `outputs/skill-framework-diff.md`。给定安全框架或发布说明，它会将阈值定义、所需评估和安全论证结构与 RSP v3.0、PF v2、FSF v3.0 比较，并标出跨实验室的差距。

## 练习（Exercises）

1. 阅读 RSP v3.0、PF v2 和 FSF v3.0。制作一张表，汇总各实验室的 CBRN 阈值、AI 研发阈值以及部署前必须进行的评估。

2. 三个框架自 2025 年起都包含竞争对手调整条款。分别写一段支持论证和反对论证，并指出每种立场依赖的假设。

3. 为跨过 Anthropic AI R&D-4 阈值的模型设计安全论证。列出三个支柱（监控、不可解读性和能力缺失）分别需要的证据。

4. DeepMind 的 FSF v3.0 引入了有害操纵 CCL。提出三项实证测量，用来表明模型已经跨过这个阈值。

5. 阅读 METR 的《前沿 AI 安全政策的共同要素》（2025 年）。列出跨实验室最明显的三项趋同，以及最大的两项分歧。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| RSP | “Anthropic 的框架” | 负责任扩展政策（Responsible Scaling Policy）；包含 ASL 分级；v3.0 发布于 2026 年 2 月 |
| PF | “OpenAI 的框架” | 准备度框架（Preparedness Framework）；包含五项标准；v2 发布于 2025 年 4 月 |
| FSF | “DeepMind 的框架” | 前沿安全框架（Frontier Safety Framework）；包含 CCL；v3.0 发布于 2025 年 9 月 |
| ASL-3 | “类似生物安全等级 3” | Anthropic 为 CBRN 相关能力设置的等级，于 2025 年 5 月启用 |
| CCL | “关键能力等级” | DeepMind 按领域设置的阈值概念 |
| 安全论证（Safety Case） | “正式论证” | 说明在最坏情况的 U 下，部署仍具有可接受安全性的书面论证 |
| 调整条款（Adjustment Clause） | “允许应对竞争对手背离约定” | 框架中的规定：如果竞争对手在没有同等防护措施的情况下发布模型，可以降低要求 |

## 延伸阅读（Further Reading）

- [Anthropic —《负责任扩展政策》v3.0（2026 年 2 月）](https://www.anthropic.com/responsible-scaling-policy) — ASL 分级、路线图和 AI 研发细分
- [OpenAI — 更新《准备度框架》（2025 年 4 月 15 日）](https://openai.com/index/updating-our-preparedness-framework/) — 五项标准与调整条款
- [DeepMind — 加强《前沿安全框架》（2025 年 9 月）](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) — CCL v3.0 与有害操纵
- [METR —《前沿 AI 安全政策的共同要素》（2025 年）](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/) — 跨实验室比较
