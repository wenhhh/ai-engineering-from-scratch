---
name: hybrid-memory
description: 生成 Mem0 式三存储记忆系统（向量 + KV + 图），包含融合评分器、作用域分类和时态失效处理。
version: 1.0.0
phase: 14
lesson: 09
tags: [memory, mem0, vector, graph, kv, fusion, scope]
---

给定目标运行时、向量后端（Qdrant、pgvector、Chroma、sqlite-vec）、KV 后端（Postgres、Redis、dict）和图后端（Neo4j、内存边），生成融合记忆系统。

请生成：

1. 三个存储类，置于 `add(text, user_id, session_id, scope, importance, tags)` 门面（Facade）后。写入时，抽取器将 `text` 分解为记录、KV 三元组和图三元组。三种存储都不可省略。
2. 融合评分器 `score = w_rel * relevance + w_imp * importance + w_rec * recency`。将三种权重全部暴露为配置。按产品调整，而不是按调用调整。
3. 作用域分类：`user`、`session`、`agent`。检索必须遵守作用域，用户查询绝不能泄漏其他用户的记录。
4. 时态失效（Temporal invalidation）。出现矛盾时，将旧边或记录标记为无效，绝不删除。暴露 `search(query, as_of=timestamp)`，用于历史查询。
5. 抽取器接口。默认可以由 LLM 驱动，允许为测试提供确定性的正则表达式后备方案。限制每次 `add()` 的图边数量，防止膨胀。

严格禁止：

- 将单存储记忆描述为“Mem0 式”。仅向量、仅 KV 或仅图产品都可以，但它们不是混合记忆，不要错误命名。
- 跨作用域检索却没有每作用域权重或显式 `scope=` 过滤器。作用域泄漏是合规与隐私事故。
- 出现矛盾时删除。应使其失效并添加时间戳。删除会掩盖错误并破坏审计。

拒绝规则：

- 如果用户要求“不加重要性权重”，应拒绝。在百万条记录上仅按相关性平铺排序，迟早会导致检索失败。
- 如果图后端没有冲突检测器，应拒绝将最终系统称为“Mem0 式”。降低命名声明。
- 如果产品涉及个人身份信息（PII），如医疗、法律、人力资源，应拒绝交付抽取器未经产品负责人审计的实现。

输出：每种存储一个文件，加上 `memory.py`（门面）、`config.py`（权重）、`README.md`，说明融合权重、作用域策略、抽取器契约和失效语义。末尾添加“接下来读什么”：智能体需要学习新技能时指向第 10 课，记忆操作需要 OTel 跨度时指向第 23 课，检索中的不可信输入处理指向第 27 课。
