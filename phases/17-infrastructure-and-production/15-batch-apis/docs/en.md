# 批处理 API（Batch APIs）：五折已成为行业标准

> 每家主要服务商都提供异步批处理 API，折扣 50%，周转约 24 小时。OpenAI、Anthropic、Google 及多数推理平台，包括 Fireworks 批处理档、Together 批处理，都采用相同模式。叠加提示词缓存后，夜间流水线成本降至同步无缓存的约 10%。规则很直接：非交互任务就应批处理。内容生成、文档分类、数据抽取、报告生成、大批量标注、目录打标签，只要能容忍 24 小时延迟，不迁移就意味着白花钱。2026 年生产模式是将每个新 LLM 负载分入三条路径：交互式，同步加缓存；半交互式，异步队列加回退；批处理，夜间执行并叠加缓存输入。被当成交互式、实际却能等待几分钟的负载浪费最多。

**Type:** Learn
**Languages:** Python (标准库，简化批处理与同步成本模拟器)
**Prerequisites:** 阶段 17 · 14（提示词与语义缓存，Prompt & Semantic Caching）
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 说出 OpenAI、Anthropic、Google 的三种批处理 API，以及共有的 50% 折扣和 24h 周转保证。
- 计算夜间分类负载叠加批处理与缓存输入的成本，与同步无缓存基线比较。
- 将负载归为交互式、半交互式、批处理并说明理由。
- 指出两个陷阱：用户期待快于 24h 的部分交互性，以及各服务商批文件格式不同导致的输出模式差异。

## 问题背景（The Problem）

团队交付夜间报告生成流水线：50,000 文档，逐一总结、聚类摘要、起草管理层简报。同步运行耗时 4 小时，每晚 $2,000。你听说了批处理 API。

批处理提供五折，再为全部 50k 调用共享的系统提示词启用缓存，账单降至每晚 $180，约为基线 9%。同一流水线，只改三处配置。

批处理是 LLM 成本工具箱中最便宜、却没人动用的手段，原因多在组织层面：团队想着“实时”，实际 SLA 却是“明早之前”。本课就是教你别白花账单中 90% 的钱。

## 核心概念（The Concept）

### 三种批处理 API（The three batch APIs）

**OpenAI Batch API**：上传包含请求列表的 JSONL 文件，承诺 24 小时内完成，实践通常约 2-8 小时。输入和输出词元均打五折，端点为 `/v1/batches`。满足缓存条件的输入还可叠加缓存输入定价。

**Anthropic Message Batches**：上传 JSONL，24 小时周转，五折。支持 `cache_control`，显式写缓存，批内自动读取。

**Google Vertex AI Batch Prediction**：输入为 BigQuery 或 GCS，Gemini 同样约五折，与 Vertex 流水线集成。

### 语义是异步，而非慢（Semantic: asynchronous, not slow）

批处理意味着“保证 24 小时内返回”，不是“一定花 24 小时”。典型 P50 为 2-6 小时，服务商在 GPU 库存利用率不足的低峰窗口调度批次。

### 叠加缓存（Stack with caching）

50k 文档摘要使用同一 4K 词元系统提示词：

- 同步无缓存：50000 × ($input × 4000 + $output × 200)，按完整费率。
- 同步有缓存：首次写入后缓存系统提示词，其余 49999 次输入便宜 10 倍。
- 批处理有缓存：上述基础上，读取和写入再打五折。

批处理 + 缓存约为同步无缓存账单的 10%。夜间运行且共享系统提示词的负载都应采用。

### 工作负载分流（Workload triage）

**交互式（Interactive）**：用户等待响应，TTFT 重要，使用同步调用加提示词缓存，不能批处理。

**半交互式（Semi-interactive）**：用户提交任务，几分钟后回来查看。使用异步队列，批处理不可用时回退同步，例如中等规模 RAG 索引。

**批处理（Batch）**：用户希望“明早”或“下一小时”拿结果，包括内容流水线、大规模分类、离线分析。始终批处理，并叠加缓存。

常见错误是因为流水线用于生产，就把所有任务归成交互式。“生产”不是延迟规范，SLA 才是。

### 部分交互性陷阱（The partial-interactivity trap）

有些功能看似交互，却能等待 5-10 分钟。例如带“刷新”按钮的夜间客户健康报告，用户点击后等 10 分钟也可以，团队却做成同步。50 次并发刷新成本是批处理后发邮件的 10 倍。

应问：“24 小时对这位用户意味着什么？”如果答案是“不会注意到”，就批处理。

### 输出模式陷阱（The output-schema trap）

服务商批文件格式不同：

- OpenAI：JSONL，每行一个请求。
- Anthropic：JSONL，每行一条消息，内嵌响应格式。
- Vertex：BigQuery 表，或含 TFRecord 的 GCS 前缀。

跨服务商编写“一个批处理客户端”，需要各服务商适配代码。宣传多服务商批处理的网关，如 Portkey、LiteLLM 某些档位，也只是对原始格式做薄封装。

### 应记住的数值（Numbers you should remember）

- 服务商批处理折扣：输入、输出统一五折。
- 周转 SLA：保证 24 小时，典型 P50 为 2-6 小时。
- 批处理加缓存输入：同步无缓存成本的约 10%。
- 分流规则：可接受 24h 延迟时，始终批处理。

```figure
batch-lane-triage
```

## 实际应用（Use It）

`code/main.py` 计算 50k 文档负载的同步、同步加缓存、批处理、批处理加缓存成本，报告美元和百分比节省。

## 交付成果（Ship It）

本课产出 `outputs/skill-batch-triager.md`。根据负载特征，分入交互式、半交互式、批处理并估计节省。

## 练习（Exercises）

1. 运行 `code/main.py`。100k 文档流水线、3K 词元系统提示词、500 词元输出，计算批处理加缓存相对同步基线的节省。
2. 从熟悉的真实产品选三个功能，分别进行三类分流。
3. 用户抱怨报告花了 3 小时，这是批处理误分流，还是确属交互需求？写出判据。
4. 批处理返回 SLA 为 24h，P99 为 20 小时，如何向用户说明？边界情况下下游系统如何行动？
5. 计算共享前缀多长时，批处理加缓存比夜间运行自有预留 GPU 更便宜。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 批处理 API（Batch API） | “异步折扣” | 五折，24h 周转 |
| JSONL | “批处理格式” | 每行一个 JSON 请求，OpenAI/Anthropic 标准 |
| Message Batches | “Anthropic 批处理” | Anthropic 批处理 API 产品名 |
| Batch prediction | “Vertex 批处理” | Vertex AI 批处理 API 产品 |
| 周转 SLA（Turnaround SLA） | “24h 承诺” | 是保证而非典型值，典型为 2-6h |
| 工作负载分流（Workload triage） | “交互性决策” | 交互式、半交互式、批处理路由决策 |
| 输出模式（Output schema） | “响应格式” | 各服务商 JSONL 布局不同，不可直接移植 |
| 叠加折扣（Stacked discount） | “批处理加缓存” | 两者同时适用时，约为无缓存同步账单 10% |

## 延伸阅读（Further Reading）

- [OpenAI Batch API 文档](https://platform.openai.com/docs/guides/batch)：JSONL 格式与 `/v1/batches` 语义。
- [Anthropic Message Batches 文档](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing)：批格式与 `cache_control` 交互。
- [Vertex AI Batch Prediction 文档](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini)：Gemini 批处理语义。
- [Finout：2026 年 OpenAI 与 Anthropic API 定价对比](https://www.finout.io/blog/openai-vs-anthropic-api-pricing-comparison)
- [Zen Van Riel：2026 年 LLM API 成本比较](https://zenvanriel.com/ai-engineer-blog/llm-api-cost-comparison-2026/)
