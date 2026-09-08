---
name: prompt-caching-planner
description: 设计适合缓存的提示词布局，并选择合适的供应商缓存模式。
version: 1.0.0
phase: 11
lesson: 15
tags: [llm-engineering, caching, cost]
---

给定提示词（系统 + 工具 + 少样本示例（Few-shot）+ 检索 + 历史 + 用户）和使用特征（每小时请求数、所需生存时间（TTL）、供应商），输出：

1. 布局（Layout）。重新排序各部分，并标出单一缓存断点（Cache Breakpoint）；说明哪些部分稳定，哪些容易变化。
2. 供应商模式（Provider mode）。选择 Anthropic cache_control、OpenAI 自动缓存或 Gemini CachedContent。根据 TTL 和复用模式说明理由。
3. 盈亏平衡（Break-even）。计算 TTL 内每次写入预期对应的读取次数，以及相较于无缓存的净成本。
4. 验证方案（Verification plan）。在持续集成（CI）中断言第二个相同请求的 cache_read_input_tokens > 0；仪表盘区分已缓存与未缓存词元（Token）。
5. 故障模式（Failure modes）。列出此配置下最可能导致未命中的三个原因：动态时间戳、工具重排、近似重复文本，并说明如何逐一预防。

拒绝交付将动态字段放在断点上方的缓存方案。如果复用次数不足以抵消 2 倍写入溢价，就拒绝启用 1 小时 TTL。
