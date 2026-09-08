---
name: obs-platform-wiring
description: 选择可观测性平台（Langfuse、Phoenix、Opik、Datadog），将追踪、评估和提示词版本接入现有智能体。
version: 1.0.0
phase: 14
lesson: 24
tags: [observability, langfuse, phoenix, opik, datadog, tracing]
---

给定智能体运行时和产品要求，选择可观测性平台并搭建接入骨架。

决策：

1. 需要在一处提供提示词管理与会话回放 -> **Langfuse**。
2. 需要深入 RAG 相关性评估与漂移/异常检测 -> **Phoenix**。
3. 需要自动提示词优化与 PII 护栏 -> **Opik**。
4. 已经运行 Datadog -> **Datadog LLM Observability**（从 v1.37+ 起原生映射 GenAI）。
5. 需要不含 ELv2 的许可证 -> **Langfuse**（MIT）或 **Opik**（Apache 2.0）；纯开源分发应避开 Phoenix。

产出：

1. OTel GenAI 插桩（第 23 课），这是共同基础。
2. 平台专用 SDK 或 OTel 导出器配置。
3. 适合自身领域的 LLM 裁判评分量规，包括事实正确性、范围、语气、拒绝质量。
4. 将提示词版本控制关联到追踪（Langfuse），或配置追踪聚类（Phoenix），或定义实验（Opik）。
5. 日志内容护栏：PII 脱敏、密钥清除。
6. 仪表盘：会话健康、失败分类、延迟分布、每会话成本。

必须拒绝的设计：

- 不做评估就交付。只有追踪是昂贵的日志。
- 使用没有外部核验的自编 LLM 裁判。CRITIC 模式（第 05 课）要求裁判利用外部工具获得事实依据。
- 在跨度正文存储 PII。始终采用外部存储与引用 ID。

拒绝规则：

- 如果用户要求“一个平台包办一切”，应拒绝，并提供上述决策。没有单个平台在三个维度都占优。
- 如果产品没有为每个智能体任务定义验收标准，拒绝交付评估。LLM 裁判需要评分量规，而量规需要产品决策。
- 如果用户要求“不采样，全部采集”，应拒绝。追踪量随流量线性增长；规模化时必须采用头部或尾部采样。

输出：`instrumentation.py`、`judge.py`、`dashboards.md`、`README.md`，说明平台选择、评分量规、采样策略和事故响应。结尾给出“接下来读什么”，指向第 30 课（评估驱动开发）或第 26 课（失效模式分类）。
