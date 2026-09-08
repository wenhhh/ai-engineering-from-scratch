---
name: llm-observability
description: 构建自托管大语言模型可观测性（LLM Observability）仪表盘，摄取 OpenTelemetry GenAI 跟踪区段、运行评估，并在五分钟以内捕获注入的回归问题。
version: 1.0.0
phase: 19
lesson: 11
tags: [capstone, observability, otel, langfuse, phoenix, evals, drift, clickhouse]
---

给定覆盖至少六类 SDK（OpenAI、Anthropic、Google GenAI、LangChain、LlamaIndex、vLLM）的生产 LLM 流量，部署自托管可观测性平面，摄取 OTLP GenAI 语义约定跟踪区段（Span），运行评估、检测漂移并告警。

构建计划（Build Plan）：

1. OpenTelemetry Collector 配置 OTLP HTTP 接收器、尾部采样（Tail Sampling）处理器（保留 100% 错误、10% 成功、100% 高毒性／PII 轨迹），导出到 ClickHouse + S3。
2. ClickHouse 跟踪区段模式对应 GenAI semconv：gen_ai.system、gen_ai.request.model、usage.input/output_tokens、latency_ms、user_id、app_id，另用 JSON 容器保存提示词／补全。
3. Postgres 元数据存储保存应用、用户、会话、标注队列。
4. 每类 SDK 的客户端应用通过 OpenLLMetry 自动埋点；验证规范跟踪区段写入。
5. 在抽样轨迹上定时运行 DeepEval + RAGAS + Phoenix 评估器包；自定义 LLM 裁判检查个人身份信息（Personally Identifiable Information，PII）与策略违例。
6. 每周对池化提示词嵌入运行总体稳定性指数（Population Stability Index，PSI）/ KL 散度漂移检测；告警阈值 0.2。
7. Prometheus 导出器提供评估分数聚合值与延迟百分位；Alertmanager 发送到 Slack（警告）和 PagerDuty（严重）。
8. Next.js 15 App Router 仪表盘：概览、轨迹搜索与瀑布图、评估趋势、漂移图、告警。
9. 回归探测（Regression Probe）：注入以 1% 概率泄露虚假社会安全号码（Social Security Number，SSN）的回答模式；测量 MTTR（告警触发耗时）。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 轨迹模式覆盖率 | 产生规范 GenAI 跟踪区段的 SDK 类别数（目标 6 类以上） |
| 20 | 评估正确性 | DeepEval / RAGAS 分数与人工标注集比较 |
| 20 | 仪表盘用户体验（UX） | 注入回归问题的 MTTR（目标少于 5 分钟） |
| 20 | 成本／规模 | 持续摄取 1000 个跟踪区段/秒，无积压 |
| 15 | 告警与漂移检测 | Prometheus/Alertmanager 链路端到端演练 |

直接判定不合格的情况（Hard Rejects）：

- 跟踪区段模式使用 OpenTelemetry GenAI 语义约定中不存在的自创属性名。
- 尾部采样策略丢弃错误，这是公认的反模式（Anti-Pattern）。
- 不采样而按摄取速率运行评估，成本不可接受。
- 仪表盘只显示“延迟”，不区分 p50/p95/p99。

拒绝规则（Refusal Rules）：

- 没有 PII 脱敏（Redaction）策略时，拒绝持久保存提示词或补全。
- 没有逐 SDK 规范跟踪区段回归测试时，拒绝声称“支持多 SDK”。
- 没有基线窗口时，拒绝交付漂移检测；零样本漂移检测没有用。

输出：一个仓库，包含收集器配置、ClickHouse 模式、Next.js 15 仪表盘、评估作业、漂移检测器、告警链路、一万条附回归标注的演示轨迹数据集，以及记录注入 PII 回归问题的 MTTR 和迭代中最能降低 MTTR 的三项仪表盘用户体验改进的报告。
