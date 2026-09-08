---
name: codebase-rag
description: 构建跨仓库语义搜索系统，包含 AST 感知分块、混合检索、增量重建索引与带引用的回答。
version: 1.0.0
phase: 19
lesson: 02
tags: [capstone, rag, code-search, tree-sitter, qdrant, bm25, hybrid-retrieval]
---

给定至少 10 个仓库、总计至少 2M 行代码，构建摄取流水线、混合索引，以及强制引用的查询智能体，用可验证 file:line 锚点回答跨仓库问题。

构建计划：

1. 用 tree-sitter 解析每个文件，在函数和类节点边界分块，存储 `{repo, path, start_line, end_line, symbol, body}`。
2. 使用 Claude Haiku 4.5 或 Gemini 2.5 Flash 为每块生成摘要，对系统提示词启用提示词缓存（Prompt Caching），将一句话摘要存于代码块旁。
3. 建立三种索引：Qdrant（稠密嵌入，Voyage-code-3 或 nomic-embed-code）、Tantivy（字段加权 BM25）、kuzu（导入、调用和继承的符号图边）。
4. 构建三节点 LangGraph 查询智能体：retrieve（稠密与 BM25 并行）、rerank（Cohere rerank-3 或 bge-reranker-v2-gemma-2b）、synth（Claude Sonnet 4.7，启用提示词缓存并要求 file:line 引用）。
5. 后置过滤：拒绝任何没有可验证 `(repo/path:start-end)` 锚点的论断，重新提问或删除。
6. 接入 git push webhook，计算符号级差异，仅重新嵌入变化代码块。目标：2M 行仓库群中，50 文件提交在 60s 内可搜索。
7. 使用 100 问题留出集评估，报告 MRR@10、nDCG@10、引用忠实度与延迟百分位。
8. 每周运行漂移任务，重做评估，在 MRR@10 下降 > 5% 时告警。

评估标准：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 检索质量 | 100 问题留出集上的 MRR@10 与 nDCG@10 |
| 20 | 引用忠实度 | 回答中具有可验证 file:line 锚点的论断比例 |
| 20 | 延迟与规模 | 在该索引语料规模上，10k QPS 时的 p95 查询延迟 |
| 20 | 增量索引正确性 | 50 文件提交从 git push 到可搜索的耗时 |
| 15 | 用户体验与回答格式 | 引用可点击性、片段预览、追问入口 |

直接不予验收的情况：

- 使用固定词元数分块，而非 AST 感知分块，会污染生成代码较多的语料。
- 只用余弦检索，没有 BM25 或重排序，已知会在精确符号名查询上失败。
- 回答没有强制 file:line 引用。
- 每次 git push 都重新嵌入全语料；必须采用增量方式。

拒绝规则：

- 未阅读仓库许可证时拒绝索引，有些许可证禁止嵌入到第三方向量存储。
- 拒绝声称引用索引从未见过文件的回答；返回前必须验证锚点。
- p95 超过 4s 时拒绝直接提供完整回答，改为返回部分结果与后续查询句柄。

输出：包含摄取流水线、LangGraph 查询智能体、100 问题标注评估集的仓库，Langfuse 仪表板链接，以及说明文档，列出修复的三种检索失效模式：生成代码污染、长尾符号召回、跨仓库符号解析，并说明各自的精确修复改动。
