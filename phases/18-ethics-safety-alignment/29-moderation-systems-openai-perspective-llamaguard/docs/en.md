# 内容审核系统（Moderation Systems）— OpenAI、Perspective、Llama Guard

> 生产内容审核系统将第 12–16 课定义的安全政策付诸实施。OpenAI Moderation API 的 `omni-moderation-latest`（2024）基于 GPT-4o，能在一次调用中对文本和图像分类；在多语言测试集上比前一版本提升 42%；响应结构返回 13 个类别布尔值：harassment（骚扰）、harassment/threatening（威胁性骚扰）、hate（仇恨）、hate/threatening（威胁性仇恨）、illicit（违法）、illicit/violent（暴力违法）、self-harm（自残）、self-harm/intent（自残意图）、self-harm/instructions（自残指导）、sexual（性内容）、sexual/minors（涉及未成年人的性内容）、violence（暴力）、violence/graphic（血腥暴力）。大多数开发者可以免费使用。分层模式包括输入审核（生成前）、输出审核（生成后）和自定义审核（领域规则）。异步并行调用隐藏延迟，内容被标记时可返回占位响应。Llama Guard 3/4（第 16 课）覆盖 14 个 MLCommons 危害类别，包括代码解释器滥用；v3 支持 8 种语言，v4 支持多图像。Perspective API（Google Jigsaw）早于 LLM 担任审核器的浪潮，主要提供单维度的有害内容评分，并有严重有害内容、侮辱和粗俗语言等变体，是内容审核研究的基线。弃用情况：Azure Content Moderator 于 2024 年 2 月弃用，2027 年 2 月退役，由 Azure AI Content Safety 替代。

**Type:** Build
**Languages:** Python (stdlib, three-layer moderation harness)
**Prerequisites:** 阶段 18 · 16（Llama Guard / Garak / PyRIT）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说明 OpenAI Moderation API 的类别体系，以及它与 Llama Guard 3 的 MLCommons 类别集有何不同。
- 说明三层审核模式，即输入、输出和自定义审核，并分别指出一种失效模式。
- 说明 Perspective API 作为 LLM 时代之前基线的地位，以及研究为何仍使用它。
- 陈述 Azure 的弃用时间表。

## 问题（The Problem）

第 12–16 课介绍攻击和防御工具。第 29 课讨论部署中的审核系统，它们在用户接触产品的界面上落实防御。三层模式是 2026 年的默认配置。

## 核心概念（The Concept）

### OpenAI Moderation API

`omni-moderation-latest`（2024）基于 GPT-4o，能在一次调用中对文本和图像分类，对大多数开发者免费。

类别如下，响应结构中共有 13 个布尔值：
- harassment（骚扰）、harassment/threatening（威胁性骚扰）
- hate（仇恨）、hate/threatening（威胁性仇恨）
- self-harm（自残）、self-harm/intent（自残意图）、self-harm/instructions（自残指导）
- sexual（性内容）、sexual/minors（涉及未成年人的性内容）
- violence（暴力）、violence/graphic（血腥暴力）
- illicit（违法）、illicit/violent（暴力违法）

多模态支持适用于 `violence`、`self-harm` 和 `sexual`，但不适用于 `sexual/minors`；其余类别仅支持文本。

为简化教学，`code/main.py` 中的代码框架将 `/threatening`、`/intent`、`/instructions` 和 `/graphic` 子类别合并到各自顶层父类别。生产代码应使用完整的 13 类响应结构。

在多语言测试集上，它比上一代审核端点提升 42%。系统为每个类别返回分数，由应用设置阈值。

### Llama Guard 3/4

第 16 课已介绍。它覆盖 14 个 MLCommons 危害类别，组织方式不同于 OpenAI 响应结构中的 13 个布尔值。v3 支持 8 种语言。Llama Guard 4 于 2025 年 4 月推出，具有 12B 参数，原生支持多模态。

OpenAI 与 Llama Guard 的类别体系既有重叠，也有差异。OpenAI 设有宽泛的“illicit（违法）”类别；Llama Guard 则将“暴力犯罪”和“非暴力犯罪”分开。部署应根据与自身政策类别体系的匹配程度选择。

### Perspective API（Google Jigsaw）

这是早于 LLM 担任审核器浪潮的有害内容评分系统，出现在 2020 年之前。类别包括 TOXICITY（有害性）、SEVERE_TOXICITY（严重有害性）、INSULT（侮辱）、PROFANITY（粗俗语言）、THREAT（威胁）和 IDENTITY_ATTACK（身份攻击）。它以 TOXICITY 作为单维度主分数，并提供子维度变体。

由于 API 稳定、文档充分，且积累了多年的校准数据，它被广泛用作内容审核研究基线。对于现代 LLM 相关场景，Llama Guard 或 OpenAI Moderation 通常更合适。

### 三层模式（The Three-Layer Pattern）

1. **输入审核（Input Moderation）。** 生成前对用户提示词分类；被标记则拒绝。延迟为一次分类器调用。
2. **输出审核（Output Moderation）。** 交付前对模型输出分类；被标记则替换为拒绝响应。延迟为生成后的一次分类器调用。
3. **自定义审核（Custom Moderation）。** 执行领域特定规则，例如正则表达式、允许列表和业务政策，可在输入端或输出端运行。

这三层在设计上是顺序执行的：输入审核必须在生成前完成，输出审核则在生成后运行。并行发生在同一层内：对相同文本并发运行多个分类器，例如 OpenAI Moderation、Llama Guard 和 Perspective，可以隐藏逐个调用分类器的延迟。作为可选优化，可以在等待输入审核完成时显示“请稍候，正在检查……”等占位响应，并延后第一个词元的流式输出。标记后的行为可配置为拒绝、净化内容或升级到人工审查。

### 失效模式（Failure Modes）

- **仅输入审核（Input Only）。** 无法捕捉输出幻觉；第 12–14 课的编码攻击会绕过输入分类器。
- **仅输出审核（Output Only）。** 允许任何输入到达模型，增加成本，并使攻击者能够接触内部推理。
- **仅自定义审核（Custom Only）。** 无法跨类别保持鲁棒，正则表达式也很脆弱。

默认采用分层审核，以多重措施相互补充。

### Azure 弃用（Azure Deprecation）

Azure Content Moderator 于 2024 年 2 月弃用，2027 年 2 月退役，由基于 LLM、与 Azure OpenAI 集成的 Azure AI Content Safety 替代。对于 Azure 部署，这次迁移是贯穿 2024–2027 年的业界工作。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 16 课在红队语境中介绍审核工具，第 29 课介绍已部署的审核系统，第 30 课以当前双用途能力证据收尾。

```figure
an-moderation-layers
```

## 动手使用（Use It）

`code/main.py` 构建了三层审核框架：输入审核器使用关键词和类别分数，输出审核器将同一个分类器应用于输出，自定义审核器使用领域规则。你可以输入不同内容，观察每层捕捉到什么。

## 交付成果（Ship It）

本课产出 `outputs/skill-moderation-stack.md`。给定部署，它会推荐审核工具栈配置：输入端用什么分类器、输出端用什么分类器、采用哪些自定义规则，以及边缘案例由谁评判。

## 练习（Exercises）

1. 运行 `code/main.py`。让良性、边缘和有害输入分别经过三层，报告各输入触发了哪一层。

2. 为框架增加针对某一类别的 Perspective API 式有害内容评分，并将其阈值行为与类别分数比较。

3. 阅读 OpenAI Moderation API 文档及 Llama Guard 3 类别列表。将每个 OpenAI 类别映射到最接近的 Llama Guard 类别，并指出三个无法清晰映射的类别。

4. 为代码助手部署，例如 GitHub Copilot，设计审核工具栈。指出最相关与最不相关的类别，并提出自定义规则。

5. Azure Content Moderator 将于 2027 年 2 月退役。制定迁移到 Azure AI Content Safety 的计划，并指出迁移中风险最高的环节。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| OpenAI Moderation | “omni-moderation-latest” | 基于 GPT-4o 的 13 类文本分类器，部分支持多模态 |
| Perspective API | “Google Jigsaw 有害内容评分” | LLM 时代之前的有害内容评分基线 |
| Llama Guard | “MLCommons 14 类” | Meta 危害分类器；v3 为 8B 文本模型，支持 8 种语言；v4 为 12B 多模态模型 |
| 输入审核（Input Moderation） | “生成前过滤器” | 在调用模型前对用户提示词分类 |
| 输出审核（Output Moderation） | “生成后过滤器” | 在交付前对模型输出分类 |
| 自定义审核（Custom Moderation） | “领域规则” | 部署特定规则，包括正则表达式、允许列表和政策 |
| 分层审核（Layered Moderation） | “全部三层” | 标准生产部署模式 |

## 延伸阅读（Further Reading）

- [OpenAI Moderation API 文档](https://platform.openai.com/docs/api-reference/moderations) — omni-moderation 端点
- [Meta PurpleLlama + Llama Guard](https://github.com/meta-llama/PurpleLlama) — Llama Guard 仓库
- [Google Jigsaw Perspective API](https://perspectiveapi.com/) — 有害内容评分
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/) — Azure 替代产品
