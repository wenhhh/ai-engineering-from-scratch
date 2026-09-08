# 综合实践 11：大语言模型可观测性与评估仪表盘（LLM Observability & Eval Dashboard）

> Langfuse 转向开放核心（Open-Core）模式，Arize Phoenix 发布了 2026 生成式 AI 语义约定（GenAI Semantic Conventions，semconv）映射。Helicone 和 Braintrust 都加强了逐用户成本归因（Cost Attribution）。Traceloop 的 OpenLLMetry 成为事实上的 SDK 埋点工具。生产形态是 ClickHouse 存轨迹、Postgres 存元数据、Next.js 实现界面，并在抽样轨迹上运行一组评估作业（DeepEval、RAGAS、LLM 裁判）。构建一个自托管系统，至少接入四类 SDK，演示在五分钟以内捕获注入的回归问题（Regression）。

**Type:** Capstone
**Languages:** TypeScript（界面）, Python / TypeScript（摄取 + 评估）, SQL（ClickHouse）
**Prerequisites:** 阶段 11（大语言模型工程）、阶段 13（工具）、阶段 17（基础设施）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P11 · P13 · P17 · P18
**Time:** 25 小时

## 问题（Problem）

2026 年每个承载生产流量的 AI 团队都会在模型旁维护可观测性平面（Observability Plane）：成本归因、幻觉检测、漂移监控、越狱信号、服务等级目标（Service-Level Objective，SLO）仪表盘、个人身份信息（Personally Identifiable Information，PII）泄露告警。开源参考实现 Langfuse、Phoenix、OpenLLMetry 都采用 OpenTelemetry GenAI 语义约定作为摄取模式（Schema）。如今可以用一个 SDK 为 OpenAI、Anthropic、Google、LangChain、LlamaIndex 和 vLLM 埋点，发送兼容的跟踪区段（Span）。

你将构建自托管仪表盘，至少摄取四类 SDK 的数据，在抽样轨迹上运行一小组评估作业，检测漂移并告警。衡量标准是：面对故意注入的回归问题，例如某个提示词开始产生 PII，仪表盘能在五分钟以内捕获并触发告警。

## 概念（Concept）

摄取采用 OTLP HTTP。SDK 生成符合 GenAI semconv 的跟踪区段：`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`、`gen_ai.response.id`、`llm.prompts`、`llm.completions`。跟踪区段写入 ClickHouse，供列式分析（Columnar Analytics）；用户、会话、应用等元数据写入 Postgres。

评估以批作业形式运行在抽样轨迹上。DeepEval 评定忠实度（Faithfulness）、毒性（Toxicity）与答案相关性（Answer Relevance）。当轨迹携带检索上下文时，RAGAS 评定检索指标。自定义大语言模型裁判（LLM-Judge）执行领域专用检查，如 PII 泄露和违反策略的回答。评估运行将结果作为关联父轨迹的评估跟踪区段，回写到同一 ClickHouse。

漂移检测监控嵌入空间（Embedding Space）分布随时间的变化，例如提示词嵌入的总体稳定性指数（Population Stability Index，PSI）或 KL 散度（Kullback-Leibler Divergence），以及评估分数趋势。告警送入 Prometheus Alertmanager，再送往 Slack / PagerDuty。界面使用 Next.js 15 和 Recharts。

## 架构（Architecture）

```
生产应用：
  OpenAI SDK  +  Anthropic SDK  +  Google GenAI SDK
  LangChain + LlamaIndex + vLLM
       |
       v
  OpenTelemetry SDK，采用 GenAI 语义约定
       |
       v  OTLP HTTP
  收集器（Collector；摄取、采样、扇出）
       |
       +-------------+-----------+
       v             v           v
   ClickHouse    Postgres    S3 归档
   （跟踪区段）  （元数据）  （原始事件）
       |
       +---> 评估作业（DeepEval、RAGAS、LLM-Judge）
       |     抽样或全量轨迹
       |     回写评估跟踪区段
       |
       +---> 漂移检测器（提示词嵌入上的 PSI / KL）
       |
       +---> Prometheus 指标 -> Alertmanager -> Slack / PagerDuty
       |
       v
   Next.js 15 仪表盘（Recharts）
```

## 技术栈（Stack）

- 摄取：OpenTelemetry SDK + GenAI 语义约定；OTLP HTTP 传输
- 收集器：OpenTelemetry Collector，配尾部采样（Tail Sampling）处理器以控制成本
- 存储：ClickHouse 存跟踪区段，Postgres 存元数据，S3 归档原始事件
- 评估：DeepEval、RAGAS 0.2、Arize Phoenix 评估器包、自定义 LLM 裁判
- 漂移：每周对池化提示词嵌入（Pooled Prompt Embedding，sentence-transformers）计算 PSI / KL
- 告警：Prometheus Alertmanager -> Slack / PagerDuty
- 界面：Next.js 15 App Router + Recharts + 服务器操作（Server Actions）
- 开箱即用支持的 SDK：OpenAI、Anthropic、Google GenAI、LangChain、LlamaIndex、vLLM

```figure
ce-otel-drift
```

## 动手实现（Build It）

1. **收集器配置（Collector Config）。** OpenTelemetry Collector 配置 OTLP HTTP 接收器、保留 100% 错误轨迹与 10% 成功轨迹的尾部采样器，以及导出到 ClickHouse 和 S3 的导出器（Exporter）。

2. **ClickHouse 模式（ClickHouse Schema）。** `spans` 表的列对应 GenAI semconv：`gen_ai_system`、`gen_ai_request_model`、`input_tokens`、`output_tokens`、`latency_ms`、`prompt_hash`、`trace_id`、`parent_span_id`，另用 JSON 容器保存较长载荷。按 user_id 和 app_id 增加二级索引（Secondary Index）。

3. **SDK 覆盖测试（SDK Coverage Test）。** 针对每个 SDK（OpenAI、Anthropic、Google、LangChain、LlamaIndex、vLLM）编写小型客户端，使用 OpenLLMetry 自动埋点（Auto-Instrumentation）。验证各自生成规范的 GenAI 跟踪区段并写入 ClickHouse。

4. **评估作业（Eval Jobs）。** 定时作业读取最近 15 分钟的抽样轨迹，运行 DeepEval 忠实度、毒性和答案相关性评估。输出为关联父轨迹的评估跟踪区段。

5. **自定义大语言模型裁判（Custom LLM-Judge）。** 构建 PII 泄露裁判：给定回答，调用防护 LLM 为 PII 泄露可能性评分。高分回答进入分诊队列（Triage Queue）。

6. **漂移检测（Drift Detection）。** 每周作业计算本周池化提示词嵌入与此前四周基线之间的 PSI。超过阈值则告警。

7. **仪表盘（Dashboard）。** 使用 Next.js 15，页面包括概览（跟踪区段/秒、每用户成本、p95 延迟）、轨迹（搜索 + 瀑布图（Waterfall））、评估（忠实度趋势、毒性）、漂移（PSI 时间序列）、告警。

8. **告警链路（Alerting Chain）。** Prometheus 导出器读取评估分数聚合值与延迟百分位；Alertmanager 将警告路由到 Slack，将严重违约路由到 PagerDuty。

9. **回归探测（Regression Probe）。** 注入缺陷：被评估聊天机器人以 1% 概率泄露虚假的社会安全号码（Social Security Number，SSN）。测量 MTTR：从缺陷部署到 Slack 告警的时间。

## 实际应用（Use It）

```
$ curl -X POST https://my-otel-collector/v1/traces -d @trace.json
[collector]  accepted 1 trace, 3 spans
[clickhouse] inserted 3 spans (app=chat, user=u_42)
[eval]       DeepEval faithfulness 0.82, toxicity 0.03
[drift]      weekly PSI 0.08 (below 0.2 threshold)
[ui]         live at https://obs.example.com
```

## 交付成果（Ship It）

`outputs/skill-llm-observability.md` 是交付物。给定 LLM 应用，仪表盘摄取其轨迹、运行评估、对漂移告警，并在 Next.js 中展示每用户成本明细。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 轨迹模式覆盖率 | 产生规范 GenAI 跟踪区段的 SDK 类别数（目标：6 类以上） |
| 20 | 评估正确性 | DeepEval / RAGAS 分数与人工标注集比较 |
| 20 | 仪表盘用户体验（UX） | 注入回归问题的 MTTR（目标少于 5 分钟） |
| 20 | 成本／规模 | 持续摄取 1000 个跟踪区段/秒，无积压 |
| 15 | 告警与漂移检测 | Prometheus/Alertmanager 链路端到端演练 |
| **100** | | |

## 练习（Exercises）

1. 为 Haystack 框架增加自定义埋点。验证规范跟踪区段写入 ClickHouse，且 `gen_ai.*` 属性忠实保留。

2. 在相同轨迹上将 DeepEval 替换为 Phoenix 评估器。测量两种评估引擎之间的分数漂移。

3. 细化漂移检测器：按应用标识符计算 PSI，而非全局计算。展示逐应用漂移轨迹。

4. 增加“用户影响”页面：每用户成本与失败率，配迷你趋势图（Sparkline）。

5. 构建尾部采样策略，保留毒性 > 0.5 的全部轨迹，并对其余轨迹分层抽样（Stratified Sampling）10%。测量引入的采样偏差。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| GenAI 语义约定（GenAI Semconv） | “OTel LLM 属性” | OpenTelemetry 2025 年规范，定义系统、模型、词元等 LLM 跟踪区段属性 |
| 尾部采样（Tail Sampling） | “轨迹完成后采样” | 收集器在轨迹完成后决定保留或丢弃，因此能看到错误 |
| 总体稳定性指数（Population Stability Index，PSI） | “总体稳定性指数” | 比较两个分布的漂移指标；> 0.2 通常表示显著漂移 |
| 大语言模型裁判（LLM-Judge） | “用模型评估” | LLM 按忠实度、毒性、PII 等标准为另一 LLM 的输出评分 |
| 尾部采样策略（Tail-Sampling Policy） | “保留规则” | 决定哪些轨迹持久保存、哪些丢弃的规则；错误轨迹 + 采样率 |
| 评估跟踪区段（Eval Span） | “关联评估轨迹” | 携带评估分数、关联原始 LLM 调用跟踪区段的子区段 |
| 每用户成本（Cost per User） | “单位经济性（Unit Economics）” | 在时间窗口内归因到 user_id 的美元成本；关键产品指标 |

## 延伸阅读（Further Reading）

- [Langfuse](https://github.com/langfuse/langfuse)：开放核心可观测性平台参考
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)：另一参考实现，漂移支持较强
- [OpenLLMetry（Traceloop）](https://github.com/traceloop/openllmetry)：自动埋点 SDK 家族
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)：摄取模式
- [Helicone](https://www.helicone.ai)：另一托管可观测性平台
- [Braintrust](https://www.braintrust.dev)：另一评估优先平台
- [ClickHouse 文档](https://clickhouse.com/docs)：列式跟踪区段存储
- [DeepEval](https://github.com/confident-ai/deepeval)：评估器库
