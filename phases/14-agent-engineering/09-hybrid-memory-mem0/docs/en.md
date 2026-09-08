# 混合记忆：向量 + 图 + KV（Hybrid Memory: Vector + Graph + KV）

> 混合记忆（Hybrid memory）并行运行三种存储：向量用于语义相似度，键值（KV）用于快速事实查询，图用于实体关系推理，再由评分层在检索时融合结果。这是广泛使用的生产外部记忆模式；Mem0（Chhikara 等人，2025）是参考实现之一。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 07（MemGPT）、阶段 14 · 08（Letta 记忆块，Letta Blocks）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释为什么单一存储，无论仅向量、仅图还是仅 KV，都不足以满足智能体记忆需求。
- 说出 Mem0 的三种并行存储，以及每种优化的目标。
- 描述 Mem0 的融合评分（Fusion scoring）：相关性、重要性、近期性，以及为什么它是加权和而不是层级结构。
- 用标准库实现玩具三存储记忆系统，`add()` 写入全部三种存储，`search()` 融合结果。

## 问题（The Problem）

单一存储不适合三类查询中的某些类别：

- **语义相似度（Semantic similarity）**：“上周我们讨论了哪些智能体偏移问题？”向量占优，KV 和图会漏掉。
- **事实查询（Fact lookup）**：“用户电话号码是什么？”KV 占优，向量浪费资源，图则过于复杂。
- **关系推理（Relationship reasoning）**：“哪些客户共享同一个计费实体？”图占优，向量和 KV 无法回答。

生产智能体会在同一次会话中发出这三类查询。单存储记忆总有两类不适合。Mem0 的贡献是在单一 `add`/`search` 接口后连接三者，再以评分函数融合它们。

## 概念（The Concept）

### 三种存储并行（Three stores in parallel）

Mem0（arXiv:2504.19413，2025 年 4 月）执行 `add(text, user_id, metadata)` 时：

1. 从文本中抽取候选事实，这是由 LLM 驱动的步骤。
2. 将每个事实写入向量存储，使用嵌入（Embedding）支持语义搜索。
3. 将每个事实写入 KV 存储，以 (user_id, fact_type, entity) 为键，支持 O(1) 查询。
4. 将每个事实以带类型的边写入图存储（Mem0g），支持关系查询。

执行 `search(query, user_id)` 时：

1. 向量存储按嵌入余弦相似度返回 top-k。
2. KV 存储按从查询推导出的 (user_id, type, entity) 键返回直接命中。
3. 图存储返回从查询实体可达的子图。
4. 评分层融合三者。

### 融合评分（Fusion scoring）

```
score = w_relevance * relevance(q, record)
      + w_importance * importance(record)
      + w_recency * recency(record)
```

- **相关性（Relevance）**：向量余弦相似度、KV 精确匹配、图路径权重。
- **重要性（Importance）**：写入时标注或通过学习获得。有些事实更重要，如姓名、标识、政策。
- **近期性（Recency）**：根据距上次写入或读取的时间进行指数衰减。

权重按产品调整。聊天智能体提高 `w_recency`，合规智能体提高 `w_importance`，检索智能体提高 `w_relevance`。

### Mem0g 与时态推理（Temporal reasoning）

Mem0g 增加冲突检测器。新事实与已有边矛盾时，已有边被标记为无效，但不删除。时态查询，例如“用户三月份住在哪个城市？”，遍历指定时间有效的子图。

这是 Letta 失效处理模式所推广的合规级行为。

### 基准测试数字（Benchmark numbers）

Mem0 论文报告了以下结果（2025）：

- **LoCoMo**（长对话记忆）：91.6
- **LongMemEval**（长时程情景记忆）：93.4
- **BEAM 1M**（1M 词元记忆基准）：64.1

对比基线，包括全上下文 128k LLM、平面向量存储、平面 KV，都落后 10 多分。单靠基准不足以决定选型，运行形态才是依据；但这些数字表明，融合设计的收益不是微不足道的误差。

### 作用域分类（Scope taxonomy）

Mem0 按作用域划分记忆：

- **用户记忆（User memory）**：跨会话持久化，以 `user_id` 为键。
- **会话记忆（Session memory）**：在单个线程内持续存在。
- **智能体记忆（Agent memory）**：每个智能体实例的状态。

每次写入选择一个作用域。检索可以跨作用域查询，并设置各作用域权重。不加思考地混合范围，就会出现“助手向 Alice 透露 Bob 的项目”这类事故。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **嵌入偏移（Embedding drift）。** 前一百次查询看似正确的向量结果，会随着语料增长而退化。为使用次数最多的前 N 条记录增加定期重新嵌入。
- **KV 结构定义无序扩张（KV schema creep）。** `(user_id, type, entity)` 看起来简单，但每个团队都添加自己的 `type` 后就不再如此。每季度审计类型集合。
- **图膨胀（Graph explosion）。** 一个带噪声的抽取器每条消息增加 50 条边。限制每次 `add` 的图写入量，丢弃低置信度边。

```figure
ae-memory-fusion
```

## 动手实现（Build It）

`code/main.py` 用标准库实现三存储模式：

- `VectorStore`：以简单词元重叠相似度代替嵌入。
- `KVStore`：以 `(user_id, fact_type, entity)` 为键的字典。
- `GraphStore`：带类型的边 (subject, relation, object, valid)。
- `Mem0`：顶层门面（Facade），提供 `add()`、`search()`、融合评分和感知作用域的检索。
- 一份多用户、多会话对话的完整轨迹示例。

运行：

```
python3 code/main.py
```

输出展示三条独立召回路径和融合后的 top-k。调整 `main()` 顶部的评分权重，观察排序变化。

## 实际应用（Use It）

- **Mem0（Apache 2.0）**：可用于生产。用 Postgres + Qdrant + Neo4j 自托管，或使用托管云。
- **Letta**：核心、回忆、归档三层；可自带向量和图后端。
- **Zep**：商业替代方案，包含时态知识图谱（KG）和事实抽取。
- **自定义构建（Custom builds）**：适合需要精确控制抽取器的场景，如合规，或需要控制融合权重的场景，如近期性主导的语音智能体。

## 交付成果（Ship It）

`outputs/skill-hybrid-memory.md` 生成三存储记忆骨架，接好融合评分器、作用域分类和时态失效处理。

## 练习（Exercises）

1. 用真实嵌入模型替换玩具向量相似度，如 sentence-transformers、Ollama、OpenAI embeddings。在合成长对话上测量 recall@10。写入 1000 次后排序会偏移吗？
2. 添加时态查询：`search(query, as_of=timestamp)`。只返回该时间或此前有效的记录。哪种存储需要最多改动？
3. 实现冲突检测器：传入事实与图边矛盾时，使旧边失效并记录两者。使用“用户住在柏林” -> “用户住在里斯本”测试。
4. 扩展融合评分器，加入 `user_feedback` 维度，即对检索记录点赞。如何防止钻空子，例如智能体只返回它已经喜欢的记录？
5. 阅读 Mem0 文档（`docs.mem0.ai`）。将玩具实现迁移到 `mem0` 客户端调用，用相同的 20 条测试查询比较检索质量。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 混合记忆（Hybrid memory） | “向量加图加 KV” | 并行写入三种存储，检索时融合 |
| 事实抽取（Fact extraction） | “记忆摄入” | 用 LLM 将文本分解为 (entity, relation, fact) 元组 |
| 融合评分（Fusion scoring） | “相关性排序” | 相关性、重要性、近期性的加权和 |
| 作用域（Scope） | “记忆命名空间” | user / session / agent，决定谁能看到什么 |
| Mem0g | “记忆图” | 带时态有效性的类型化边，用于关系查询 |
| 时态失效（Temporal invalidation） | “软删除” | 将被反驳的边标记为无效，绝不删除 |
| 嵌入偏移（Embedding drift） | “检索腐化” | 向量质量随语料增长而退化，应定期重新嵌入 |

## 延伸阅读（Further Reading）

- [Chhikara 等人，Mem0（arXiv:2504.19413）](https://arxiv.org/abs/2504.19413)：原始论文。
- [Mem0 文档（Docs）](https://docs.mem0.ai/platform/overview)：生产 API、SDK、托管云。
- [Packer 等人，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)：虚拟上下文前身。
- [Letta，记忆块博客（Memory Blocks）](https://www.letta.com/blog/memory-blocks)：同源的三层设计。
