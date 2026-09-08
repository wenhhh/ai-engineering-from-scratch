---
name: skill-advanced-rag
description: 使用混合搜索（Hybrid search）、重排序（Reranking）和评估构建生产级 RAG
version: 1.0.0
phase: 11
lesson: 7
tags: [rag, hybrid-search, bm25, reranking, hyde, evaluation]
---

# 高级 RAG 模式（Advanced RAG Pattern）

基础 RAG：嵌入查询 -> 向量搜索 -> top-k -> 生成。
高级 RAG：嵌入查询 + BM25 -> 融合排名 -> 重排序 -> top-k -> 生成。

```
query -> [vector search (top-50)] -+-> RRF fusion -> reranker (top-5) -> prompt -> LLM
                                   |
query -> [BM25 search (top-50)]  --+
```

## 何时从基础 RAG 升级（When to upgrade from basic RAG）

- 检索质量的 Recall@5 降到 70% 以下
- 用户报告错误或无关答案
- 语料增长到超过 100K 块
- 查询与文档使用不同词汇
- 多跳问题持续失败

## 实现检查清单（Implementation checklist）

1. 在向量索引旁添加 BM25 索引
2. 并行运行两种搜索（各取 top-50）
3. 用倒数排名融合（Reciprocal Rank Fusion，k=60）合并
4. 用交叉编码器重排序靠前候选
5. 取 top-5 放入最终提示词
6. 在测试集上添加忠实度评估

## 技术选择指南（Technique selection guide）

- **混合搜索（Hybrid search）**：生产中始终使用，查询时不增加额外成本。
- **重排序（Reranking）**：Recall@50 良好但 Recall@5 差时使用，增加 50-200ms 延迟。
- **HyDE**：查询模糊或与文档用词不同时使用，增加一次 LLM 调用。
- **父子块（Parent-child chunks）**：小块缺上下文而大块稀释相关性时使用。
- **元数据过滤（Metadata filtering）**：语料有明确类别（日期、来源类型、部门）时使用。
- **查询分解（Query decomposition）**：需要多份文档信息的多跳问题使用。

## 常见错误（Common mistakes）

- BM25 与向量搜索使用不同块集合（必须搜索同一语料）
- 重排序候选池太小（top-10 太少，使用 top-50）
- 每次查询都添加 HyDE（仅当词汇不匹配是瓶颈时有帮助）
- 不评估变更（每项技术使用前后都测量 Recall@k）
- 未测量失败位置就过度设计流水线

## 评估工作流（Evaluation workflow）

1. 创建 50+ 个已知答案块的测试问题
2. 测量每种检索方法的 Recall@5 和 Recall@10
3. 对检索成功的查询，测量生成答案的忠实度
4. 随语料增长每周跟踪指标
5. 添加更多技术前，调查具体失败案例
