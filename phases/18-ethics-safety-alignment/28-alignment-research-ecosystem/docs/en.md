# 对齐研究生态（Alignment Research Ecosystem）— MATS、Redwood、Apollo、METR

> 五家组织构成了 2026 年主要模型实验室之外的对齐研究层。MATS（ML Alignment & Theory Scholars）自 2021 年末以来培养了 527 名以上研究者，发表 180 篇以上论文，获得超过 1 万次引用，h 指数为 47；2024 年夏季项目约有 90 名学员和 40 名导师，并注册为 501(c)(3) 非营利组织；2025 年前的校友中有 80% 从事安全或安保工作，超过 200 人就职于 Anthropic、DeepMind、OpenAI、英国 AISI、RAND、Redwood、METR 和 Apollo。Redwood Research 是 Buck Shlegeris 创立的应用对齐实验室，提出了 AI 控制（AI Control，第 10 课），并与英国 AISI 合作开展控制安全论证。Apollo Research 为前沿实验室开展部署前密谋评估，发表了《上下文内密谋》（第 8 课）和《迈向 AI 密谋安全论证》。METR（Model Evaluation and Threat Research）开展基于任务的能力评估及自主任务时间跨度研究，其《前沿 AI 安全政策的共同要素》比较了实验室框架。Eleos AI Research 开展部署前模型福利评估（第 19 课），并实施了 Claude Opus 4 福利评估。

**Type:** Learn
**Languages:** none
**Prerequisites:** 阶段 18 · 01-27（第 18 阶段此前课程（prior Phase 18 lessons））
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 识别主要模型实验室之外的五家对齐研究组织及其核心产出。
- 说明 MATS 的规模，包括学员、论文和 h 指数，以及它作为人才培养渠道的作用。
- 说明 Redwood 的 AI 控制议程及其与英国 AISI 的合作。
- 说明 METR 基于任务的评估方法。

## 问题（The Problem）

前沿实验室（第 18 课）在内部开展安全评估，并选择性公开结果。实验室之外的生态则负责验证评估、率先发现新失效模式和培养人才。理解这一生态，有助于判断哪些研究发现得到哪些主体的信任。

## 核心概念（The Concept）

### MATS（ML Alignment & Theory Scholars）

MATS 于 2021 年末启动，是一个研究导师项目。学员与资深研究者一起，用 10–12 周研究某个具体对齐问题。

截至 2026 年的规模：
- 自创立以来，已有 527 名以上研究者。
- 发表 180 篇以上论文。
- 获得超过 1 万次引用。
- h 指数为 47。
- 2024 年夏季有 90 名学员和 40 名导师，并注册为 501(c)(3) 非营利组织。

职业去向：2025 年前的校友约有 80% 从事安全或安保工作，超过 200 人就职于 Anthropic、DeepMind、OpenAI、英国 AISI、RAND、Redwood、METR 和 Apollo。

### Redwood Research

这是 Buck Shlegeris 创立的应用对齐实验室，提出了 AI 控制议程（第 10 课），与英国 AISI 合作开展控制安全论证，并为 DeepMind 和 Anthropic 的评估设计提供建议。

代表论文包括 Greenblatt、Shlegeris 等人的《AI 控制》（arXiv:2312.06942，ICML 2024），以及 Greenblatt、Denison、Wright 等人与 Anthropic 合作的《伪装对齐》（arXiv:2412.14093）。

方法风格是：具体威胁模型、最坏情况对手，以及能够接受压力测试的具体协议。

### Apollo Research

它为前沿实验室开展部署前密谋评估，发表了《上下文内密谋》（第 8 课，arXiv:2412.04984），参与 2025 年与 OpenAI 的反密谋训练合作，并于 2024 年产出《迈向 AI 密谋安全论证》。

方法风格是：在可能出现欺骗的智能体场景中评估，并分解为三个支柱，即不对齐（Misalignment）、目标导向性（Goal-Directedness）和情境意识（Situational Awareness）。

### METR（Model Evaluation and Threat Research）

它开展基于任务的能力评估，以及自主任务完成时间跨度研究。《前沿 AI 安全政策的共同要素》（metr.org/common-elements，2025）比较了实验室框架。

METR 还与 Apollo 共同撰写了 AI 密谋安全论证草案。

方法风格是：长时间跨度任务评估、实证能力测量和框架综合分析。

### Eleos AI Research

它开展部署前模型福利评估，实施了 Claude Opus 4 系统卡第 5.3 节记录的福利评估，并为第 19 课与福利相关的主张提供外部方法论检查。

### 人才与研究流动（The Flow）

MATS 培养研究者。毕业学员进入 Anthropic、DeepMind、OpenAI 的实验室安全团队，或进入 Redwood、Apollo、METR、Eleos 从事外部评估。外部评估者与实验室、英国 AISI 和美国 CAISI 合作。研究发表再反馈到 MATS，为下一届学员提供材料。

### 为什么这一层很重要（Why This Layer Matters）

单一来源的评估并不可靠：实验室评估自己的模型，存在结构性的利益冲突。外部评估者可以提出并验证实验室可能少报的失效模式。2024 年的《潜伏智能体》（第 7 课）由 Anthropic 与 Redwood 合作；《伪装对齐》同样由两者合作；《上下文内密谋》来自 Apollo；反密谋研究来自 Apollo 与 OpenAI。多组织结构构成了质量控制。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 7–11 课引用了 Redwood 和 Apollo 的工作，第 18 课引用 METR 的框架比较，第 19 课引用 Eleos。第 28 课明确给出了本阶段其他课程所依赖生态的组织地图。

```figure
sae-features
```

## 动手使用（Use It）

本课没有代码。阅读 METR 的《前沿 AI 安全政策的共同要素》，以此了解外部综合分析如何为实验室内部政策工作增加价值。

## 交付成果（Ship It）

本课产出 `outputs/skill-ecosystem-map.md`。给定对齐声明或评估，它会识别组织、发表渠道和方法风格，并与已知从事相关工作的组织交叉核查。

## 练习（Exercises）

1. 从第 7–15 课选择一篇论文，识别参与组织，并交叉核查作者是否为 MATS 校友及其当前生态内所属机构。

2. 阅读 METR 的《前沿 AI 安全政策的共同要素》。指出其中强调的三项跨实验室趋同，以及最大的两项分歧。

3. MATS 校友约有 80% 从事安全或安保工作。论证这种选择压力是适应性的，即培养了该领域，还是有偏的，即过滤了非主流立场。

4. Redwood 与 Apollo 都研究控制或密谋，但风格不同。选择一种失效模式，分别说明两者会如何研究它。

5. Eleos AI 是唯一专门从事模型福利的组织。设计一个假想的第二家组织，关注另一种福利相关问题，例如认知自由或机器人具身，并阐明其方法。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| MATS | “导师项目” | ML Alignment & Theory Scholars；自 2021 年以来培养 527 名以上研究者 |
| Redwood Research | “控制实验室” | 从事应用对齐；AI 控制论文作者；英国 AISI 合作伙伴 |
| Apollo Research | “密谋评估” | 为前沿实验室开展部署前密谋评估 |
| METR | “任务时间跨度评估” | 基于任务的能力评估与框架综合分析 |
| Eleos AI | “福利实验室” | 部署前模型福利评估 |
| 人才培养渠道（Talent Pipeline） | “MATS → 实验室” | MATS 毕业学员流向 Anthropic、DM、OpenAI、Redwood、Apollo、METR |
| 外部评估（External Evaluation） | “实验室外部检查” | 不由模型生产者执行的评估，可增加可信度 |

## 延伸阅读（Further Reading）

- [MATS（ML Alignment & Theory Scholars）](https://www.matsprogram.org/) — 研究导师项目
- [Redwood Research](https://www.redwoodresearch.org/) — AI 控制论文
- [Apollo Research](https://www.apolloresearch.ai/) — 密谋评估
- [METR —《前沿 AI 安全政策的共同要素》](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/) — 框架比较
- [Eleos AI Research](https://www.eleosai.org/research) — 模型福利方法论
