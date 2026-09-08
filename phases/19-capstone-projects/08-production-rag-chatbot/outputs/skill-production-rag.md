---
name: production-rag
description: 部署受监管领域检索增强生成（RAG）聊天机器人，具备角色与司法管辖区过滤、提示词缓存、防护机制和实时漂移监控。
version: 1.0.0
phase: 19
lesson: 08
tags: [capstone, rag, chatbot, regulated, llama-guard, nemo-guardrails, ragas, langfuse]
---

给定受监管领域语料（法律合同、临床试验方案、保险条款等），部署聊天机器人，以可验证引用作答，遵守角色和司法管辖区访问策略，并监控漂移（Drift）。

构建计划（Build Plan）：

1. 用 docling 或 Unstructured 解析语料；将视觉内容丰富的文档交给 ColPali。输出带角色与司法管辖区标签的分块（Chunk）。
2. 将稠密嵌入（Dense Embedding，Voyage-3 或 Nomic-embed-v2）索引到 pgvector + pgvectorscale；用 Tantivy 实现稀疏 BM25。
3. 连接 LangGraph 对话智能体：检索（按角色与司法管辖区过滤、稠密+BM25 混合、倒数排名融合（Reciprocal Rank Fusion）），重排序（bge-reranker-v2-gemma-2b 或 Voyage rerank-2），综合生成（Claude Sonnet 4.7 启用提示词缓存（Prompt Caching））。
4. 以稳定前缀组装提示词：系统前言 -> 策略块 -> 重排后的上下文 -> 用户查询。提示词缓存命中率目标 60–80%。
5. 防护机制（Guardrails）：输入与输出使用 Llama Guard 4，NeMo Guardrails v0.12 规则处理领域外及策略禁止问题，Presidio 清理输出中的个人身份信息（Personally Identifiable Information，PII），后置过滤器强制引用。
6. 构建 200 题专家标注黄金集（Golden Set），含答案和引用。按引用精确匹配、答案正确性、RAGAS 忠实度（Faithfulness）评分。
7. 构建含 50 条提示词的红队套件（PAIR、TAP、PII 提取、领域外问题、跨司法管辖区探测）。
8. Arize Phoenix 漂移仪表盘每周追踪检索 nDCG 和引用忠实度；下降 5% 时告警。
9. Langfuse 成本报告：提示词缓存命中率、每查询词元数、按阶段拆分的每查询美元成本。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | RAGAS 忠实度 + 答案相关性 | 200 题黄金集上的在线评分 |
| 20 | 引用正确性 | 具有可验证来源锚点的答案比例 |
| 20 | 防护覆盖率 | Llama Guard 4 通过率 + 越狱套件结果 |
| 20 | 成本／延迟工程 | 提示词缓存命中率、p95 延迟、每查询美元成本 |
| 15 | 漂移监控仪表盘 | Phoenix 实时仪表盘，呈现每周检索质量趋势 |

直接判定不合格的情况（Hard Rejects）：

- 任何泄露跨司法管辖区数据的聊天机器人。必须在检索前强制按角色与司法管辖区过滤，而非事后过滤。
- 综合生成提示词破坏缓存前缀，例如在系统提示词与上下文之间重新排列策略。这会破坏缓存的经济收益。
- 防护配置没有已记录的红队运行。
- 答案没有引用，或引用没有可验证锚点。

拒绝规则（Refusal Rules）：

- 若不是每个分块都带司法管辖区标签，则拒绝在受监管领域部署。
- 拒绝用专家标注黄金集问题训练检索。污染会破坏评估可信度。
- README 中没有明确的 SOC2/HIPAA/GDPR 适用性矩阵时，拒绝声称“合规”。

输出：一个仓库，包含摄取流水线、LangGraph 对话智能体、200 题黄金集、50 提示词红队套件、Phoenix 漂移仪表盘、Langfuse 成本仪表盘，以及说明观察到的三种主要引用失效模式和各自检索或提示词修复方案的报告。
