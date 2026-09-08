---
name: skill-rag-pipeline
description: 从第一性原理构建和调试检索增强生成（RAG）流水线
version: 1.0.0
phase: 11
lesson: 6
tags: [rag, retrieval, embeddings, vector-search, llm-engineering]
---

# RAG 流水线模式（RAG Pipeline Pattern）

每个 RAG 系统都遵循此模式：

```
documents -> chunk -> embed -> store
query -> embed -> search(top_k) -> build_prompt -> generate
```

每份文档建立一次索引，每次用户请求都进行查询。

## 何时使用 RAG（When to use RAG）

- LLM 需要访问私有或近期文档
- 微调成本过高，或更新太慢
- 答案需要引用来源
- 知识库频繁变化

## 何时不使用 RAG（When NOT to use RAG）

- 答案属于 LLM 已掌握的常识
- 任务是创意类（写作、头脑风暴），不是事实类
- 需要模型采用特定推理风格（使用微调）

## 实现检查清单（Implementation checklist）

1. 将文档分为 256-512 词元片段，重叠 50 词元
2. 使用一致的嵌入模型嵌入每块
3. 将嵌入与原文一起存入向量数据库
4. 查询时，用相同模型嵌入用户问题
5. 通过余弦相似度检索最相似的 top-k（5-10）块
6. 构建提示词：系统指令 + 检索上下文 + 用户问题
7. 以检索上下文为依据生成答案
8. 返回答案及来源引用

## 常见错误（Common mistakes）

- 索引与查询使用不同嵌入模型（向量不兼容）
- 块过小（丢失上下文）或过大（稀释相关性）
- 块之间没有重叠（在边界截断句子）
- 文档变化后忘记重建索引
- 直接将检索块返回用户，不生成连贯答案
- 事实型 RAG 查询未设置 temperature=0（温度越高，幻觉越多）

## 调试检索（Debugging retrieval）

如果没有检索到正确的块：
1. 打印查询嵌入，验证非零
2. 手动检查已知相关块的余弦相似度
3. 尝试改写查询，使其匹配文档词汇
4. 验证索引与查询时的嵌入模型一致
5. 检查相关内容是否在分块时丢失

## 生产参数（Production parameters）

- 块大小：256-512 词元
- 重叠：50 词元（块大小的 10-20%）
- Top-k：多数场景为 5-10
- 温度（Temperature）：事实回答设为 0
- 嵌入模型：text-embedding-3-small（性价比高）或 text-embedding-3-large（准确率更高）
