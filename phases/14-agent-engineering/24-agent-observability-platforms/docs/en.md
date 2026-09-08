# 智能体可观测性：Langfuse、Phoenix、Opik（Agent Observability: Langfuse, Phoenix, Opik）

> 三个开源智能体可观测性平台主导 2026 年。Langfuse（MIT）：每月安装量超过 600 万，提供追踪、提示词管理、评估与会话回放。Arize Phoenix（Elastic 2.0）：深入的智能体专用评估、RAG 相关性和 OpenInference 自动插桩。Comet Opik（Apache 2.0）：自动提示词优化、护栏和 LLM 裁判幻觉检测。

**Type:** Learn
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 23（OTel GenAI）
**Time:** 约 45 分钟

## 学习目标（Learning Objectives）

- 列出三个主要开源智能体可观测性平台及其许可证。
- 区分各自最强的领域：Langfuse（提示词管理与会话）、Phoenix（RAG 与自动插桩）、Opik（优化与护栏）。
- 解释为什么到 2026 年，89% 的组织报告已部署智能体可观测性。
- 使用标准库实现从追踪到仪表盘的流水线，包含 LLM 裁判评估。

## 问题（The Problem）

OTel GenAI（第 23 课）提供数据模式（Schema）。你仍需要一个平台来接收跨度、运行评估、存储提示词版本并发现质量退步。这三个候选平台分别侧重生命周期中的不同部分。

## 概念（The Concept）

### Langfuse（MIT）（Langfuse）

- SDK 每月安装量超过 600 万，GitHub 星标超过 19,000。
- 功能：追踪、带版本控制与试验场（Playground）的提示词管理、评估（LLM 作为裁判、用户反馈、自定义评估）、会话回放。
- 2025 年 6 月：此前商业化的模块（LLM 作为裁判、标注队列、提示词实验、Playground）以 MIT 许可证开源。
- 最强场景：与提示词管理循环紧密结合的端到端可观测性。

### Arize Phoenix（Elastic License 2.0）（Arize Phoenix）

- 更深入的智能体专用评估：追踪聚类、异常检测、RAG 检索相关性。
- 原生 OpenInference 自动插桩。
- 在生产环境与托管 Arize AX 配合。
- 不提供提示词版本控制，定位为配合更广泛平台使用的漂移与行为回归工具。
- 最强场景：RAG 相关性、行为漂移、异常检测。

### Comet Opik（Apache 2.0）（Comet Opik）

- 通过 A/B 实验自动优化提示词。
- 护栏：PII 脱敏、主题约束。
- LLM 裁判幻觉检测。
- Comet 自测基准：Opik 日志与评估耗时 23.44 秒，Langfuse 为 327.15 秒，差距约 14 倍。厂商基准只能作为方向参考。
- 最强场景：优化循环、自动实验、护栏执行。

### 行业数据（Industry data）

根据 Maxim 的 2026 年实地分析，89% 的组织已部署智能体可观测性；质量问题是首要生产障碍，32% 的受访者提及这一点。

### 如何选择（Picking one）

| 需求 | 选择 |
|------|------|
| 包含提示词管理的一体化平台 | Langfuse |
| 深入 RAG 评估与漂移检测 | Phoenix |
| 自动优化与护栏 | Opik |
| 开放许可，不使用 ELv2 | Langfuse（MIT）或 Opik（Apache 2.0） |
| Datadog / New Relic 集成 | 任意一个，三者都导出 OTel |

### 模式的失效点（Where this pattern goes wrong）

- **没有评估策略（No eval strategy）。** 没有评估的追踪只是昂贵的日志。
- **自制 LLM 裁判缺乏事实依据（Self-rolled LLM-judge without grounding）。** CRITIC 模式（第 05 课）同样适用：裁判需要外部工具核验事实。
- **提示词版本未关联追踪（Prompt versions not tied to traces）。** 生产发生回归时，无法二分定位到导致回归的提示词。

```figure
wb-trace-ingest
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现追踪收集器与 LLM 裁判评估器：

- 接收 GenAI 形式的跨度。
- 按会话分组，标记失败运行，例如护栏拦截和低置信度评估。
- 脚本化 LLM 裁判，按评分量规（Rubric）为智能体响应打分。
- 仪表盘式摘要：失败率、主要失败原因、评估分数分布。

运行：

```
python3 code/main.py
```

输出：逐会话评估分数和失败分类，对应 Langfuse/Phoenix/Opik 会展示的内容。

## 实际应用（Use It）

- **Langfuse**：自托管或云端，通过 OTel 或其 SDK 接入。
- **Arize Phoenix**：自托管，使用 OpenInference 自动插桩。
- **Comet Opik**：自托管或云端，提供自动优化循环。
- **Datadog LLM Observability**：适合已运行 Datadog 的运维与机器学习混合团队。

## 交付成果（Ship It）

`outputs/skill-obs-platform-wiring.md` 选择平台，将追踪、评估和提示词版本接入现有智能体。

## 练习（Exercises）

1. 将一周的 OTel 追踪导出到 Langfuse 云端免费层。哪些会话失败？为什么？
2. 为你的领域编写 LLM 裁判评分量规，涵盖事实正确性、语气、范围遵循，在 50 条追踪上测试。
3. 对比 Langfuse 提示词版本控制与 Phoenix 追踪聚类。哪个更快告诉你哪里出了问题？
4. 阅读 Opik 护栏文档。为一次智能体运行接入 PII 脱敏护栏。
5. 在自己的语料上对三个平台做基准测试。忽略厂商发布的数字，自己测量。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 追踪（Tracing） | “跨度收集器” | 接收 OTel / SDK 跨度，按会话索引 |
| 提示词管理（Prompt management） | “提示词 CMS” | 与追踪关联的版本化提示词 |
| LLM 作为裁判（LLM-as-judge） | “自动评估” | 独立 LLM 按评分量规对智能体输出评分 |
| 会话回放（Session replay） | “追踪播放” | 逐步查看过去运行以调试 |
| RAG 相关性（RAG relevancy） | “检索质量” | 检索到的上下文是否匹配查询 |
| 追踪聚类（Trace clustering） | “行为分组” | 聚类相似运行，以检测漂移 |
| 护栏执行（Guardrail enforcement） | “记录日志时应用策略” | 对记录内容检查 PII、有害性和范围 |

## 延伸阅读（Further Reading）

- [Langfuse 文档](https://langfuse.com/)：追踪、评估、提示词管理
- [Arize Phoenix 文档](https://docs.arize.com/phoenix)：自动插桩、漂移
- [Comet Opik](https://www.comet.com/site/products/opik/)：优化与护栏
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：三者共同使用的数据模式（Schema）
