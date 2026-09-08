# 提示词缓存与语义缓存经济性（Prompt Caching and Semantic Caching Economics）

> **定价快照日期：2026-04。** 下列数值来自本课发布时采集的服务商费率表；对外引用前，应根据链接文档核实。

> 缓存有两层。L2 是服务商级提示词/前缀缓存，复用重复前缀的注意力 KV。Anthropic 文档宣称长提示词成本最多降低 90%、延迟降低 85%；Claude 3.5 Sonnet 缓存读取 $0.30/M，新输入 $3.00/M，TTL 为 5 分钟，1 小时 TTL 选项写入溢价为基础价格的 2 倍（docs.anthropic.com，2026-04）。OpenAI 对 ≥1024 词元提示词自动缓存，缓存输入相较新输入折扣约 90%（platform.openai.com，2026-04），各模型精确费率以实时费率表为准。L1 是应用级语义缓存（Semantic caching），嵌入相似度命中时完全跳过 LLM。服务商“95% 准确率”指匹配正确率，不是命中率。生产报告命中率从开放聊天约 10% 到结构化 FAQ 最高 70%；两家服务商均无官方基线，应视为社区遥测而非保证。生产陷阱有两种：并行化破坏缓存，首次写入前发出 N 个并行请求可能让支出增至数倍；前缀中的动态内容使缓存完全无法命中。ProjectDiscovery 在 2025-11 报告，将动态文本移出可缓存前缀后，命中率从 7% 升到 74%。

**Type:** Learn
**Languages:** Python (标准库，简化双层缓存模拟器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）、阶段 17 · 06（SGLang RadixAttention）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 区分 L2 提示词/前缀缓存，即服务商 KV 复用，与 L1 语义缓存，即相似提示词绕过 LLM。
- 解释 Anthropic 的 `cache_control` 显式标记，以及 5 分钟、1 小时两种 TTL 和价格倍数。
- 根据命中率、提示词/响应比例和词元价格，计算预期月度节省。
- 指出让账单膨胀 5-10 倍的并行化反模式，以及使命中率崩塌的动态内容反模式。

## 问题背景（The Problem）

RAG 服务加了提示词缓存，账单却没变。测得命中率只有 7%。提示词看似静态，实际系统提示词含精确到分钟的日期、请求 ID，以及为了多样性随机重排的示例。每请求都写新条目，读取为零。

另一个情况是智能体为每个用户问题并行执行十次工具调用，十次都在首次缓存写入完成前到达服务商。十次写入、零次读取，账单是预期“启用缓存”成本的 5-10 倍。

缓存是一套协议，而非一个开关；两层对应两种故障模式。

## 核心概念（The Concept）

### L2：服务商提示词/前缀缓存（L2 — provider prompt/prefix caching）

服务商保存可缓存前缀的注意力 KV，下个匹配请求复用。你支付一次写入费，后续读取接近免费。

**Anthropic（Claude 3.5 / 3.7 / 4 系列）**：请求中显式设置 `cache_control`，标记可缓存块。TTL 为 5 分钟时写入费 1.25 倍，1 小时时 2 倍。Claude 3.5 Sonnet 缓存读取 $0.30/M，对比新输入 $3.00/M，便宜 10 倍（docs.anthropic.com，截至 2026-04）。Opus/Haiku 等模型费率单独发布，必须核对实时定价页。

**OpenAI**：对 ≥1024 词元提示词自动缓存（platform.openai.com，2026-04），无需显式开关。当前 gpt-4o/gpt-5 费率表中，缓存输入约便宜 10 倍。文档和发行说明均无官方命中率基线，认真设计提示词的社区报告多为 30–60%。监控 `usage.cached_tokens` 测量自己的结果。

**Google（Gemini）**：通过显式 API 进行上下文缓存，1M 词元上下文让缓存更划算。

**自托管（vLLM、SGLang）**：阶段 17 · 06 的 RadixAttention 是同一模式，只是使用自己的算力。

### L1：应用级语义缓存（L1 — app-level semantic caching）

调用 LLM 前，先对提示词计算哈希和嵌入，查找相似缓存请求，余弦相似度通常要求 0.95 以上。命中就返回缓存响应，未命中才调用 LLM 并缓存结果。

开源方案有 Redis Vector Similarity、GPTCache、Qdrant，商业方案有 Portkey Cache、Helicone Cache。

服务商准确率指返回缓存响应在语义上是否合适，而非命中频率。生产命中率：

- 开放聊天：10-15%。
- 结构化 FAQ / 客服：40-70%。
- 代码问题：20-30%，小变化也会破坏命中。
- 语音智能体重复提示词：50-80%，语音归一化为固定集合。

### 并行化反模式（The parallelization anti-pattern）

智能体并行发出 10 次工具调用，都有相同 4K 词元系统提示词。Anthropic 缓存按请求写入，服务商看到提示词约 300 ms 后首次写入完成。请求 2-10 在同一毫秒窗口到达，均未命中，付出 10 次写入溢价，没有读取折扣。

修复采用“先串行一个，再并行展开”：单独发请求 1，等它填好缓存，再发 2-10。首个工具调用增加 300 ms，但账单节省 5-10 倍。

### 动态内容反模式（The dynamic content anti-pattern）

系统提示词如下：

```
你是一个乐于助人的助手。当前时间为 14:32:17。
用户 ID：abc123。今天是星期二……
```

每请求都独特，每请求都写入，零命中。

修复是将真正静态的内容移入可缓存前缀，在缓存边界后追加动态内容：

```
[cacheable]
你是一个乐于助人的助手。[规则、示例、指令]
[/cacheable]
[dynamic, not cached]
当前时间：14:32:17。用户：abc123。
```

ProjectDiscovery 通过此方式将命中率从 7% 提升至 74%，并发布了过程分析。

### 夜间负载叠加批处理与缓存（Stack batch + cache for overnight workloads）

批处理 API（阶段 17 · 15）以 24 小时周转提供 50% 折扣，缓存输入再带来约 10 倍收益。夜间分类、标注、报告生成叠加两者，成本可降到同步无缓存的约 10%。

### 应记住的数值（Numbers you should remember）

定价于 2026-04 从链接服务商文档采集，每隔几个月可能变化，使用前重新核对。

- Anthropic Claude 3.5 Sonnet 缓存读取 $0.30/M，约比新输入便宜 10 倍（docs.anthropic.com）。
- Anthropic 写入溢价：5 分钟 TTL 为 1.25 倍，1 小时 TTL 为 2 倍。
- OpenAI 自动缓存适用于 ≥1024 词元，当前费率表缓存输入约为新输入价格的 10%（platform.openai.com）。
- 社区报告语义缓存命中率：开放聊天约 10%，结构化 FAQ 最高约 70%，不是服务商文档基线。
- ProjectDiscovery：移出动态前缀后，命中率 7% → 74%（项目博客，2025-11）。
- 并行化反模式：N 个并行请求错过首次缓存写入，典型报告账单膨胀 5–10 倍。

```figure
semantic-cache-hit
```

## 实际应用（Use It）

`code/main.py` 在混合负载上模拟 L1 + L2 缓存，报告命中率、账单，并展示并行化代价。

## 交付成果（Ship It）

本课产出 `outputs/skill-cache-auditor.md`。根据提示词模板和流量，审计可缓存性并建议重组。

## 练习（Exercises）

1. 运行 `code/main.py`，切换并行化开关，账单变化多少？
2. 系统提示词含日期，将其移出，展示修改前后的命中率计算。
3. 根据自己的请求到达率，计算 1 小时 TTL（写入 2 倍）相对 5 分钟 TTL（1.25 倍）的盈亏平衡点。
4. 语义缓存阈值 0.95 时命中 20%，降到 0.85 时命中 50%，却出现错误缓存响应。选择正确阈值并论证。
5. 每用户问题并行处理 10 个子查询，重写为缓存友好方案，同时不增加端到端延迟。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| L2 提示词缓存（L2 prompt cache） | “前缀缓存” | 服务商为重复前缀保存 KV |
| `cache_control` | “Anthropic 缓存标记” | 显式标记可缓存块的属性 |
| 缓存写入溢价（Cache write premium） | “写入税” | 首次未命中写缓存的额外费用，1.25 倍或 2 倍 |
| L1 语义缓存（L1 semantic cache） | “嵌入缓存” | 调用 LLM 前在应用层计算哈希与嵌入 |
| GPTCache | “LLM 缓存库” | 常用开源 L1 缓存库 |
| 缓存命中率（Cache hit rate） | “命中/总数” | 从缓存提供服务的请求比例 |
| 并行化反模式（Parallelization anti-pattern） | “N 次写入陷阱” | N 个并行请求发生 N 次未命中 |
| 动态内容陷阱（Dynamic content trap） | “提示词内时间陷阱” | 前缀中的动态字节破坏命中率 |
| RadixAttention | “副本内缓存” | SGLang 前缀缓存实现 |

## 延伸阅读（Further Reading）

- [Anthropic 提示词缓存](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)：官方 `cache_control` 语义与 TTL。
- [OpenAI 提示词缓存](https://platform.openai.com/docs/guides/prompt-caching)：自动缓存行为和适用条件。
- [TianPan：生产 LLM 语义缓存](https://tianpan.co/blog/2026-04-10-semantic-caching-llm-production)
- [ProjectDiscovery：通过提示词缓存降低 59% LLM 成本](https://projectdiscovery.io/blog/how-we-cut-llm-cost-with-prompt-caching)
- [DigitalOcean / Anthropic：提示词缓存](https://www.digitalocean.com/blog/prompt-caching-with-digital-ocean)
