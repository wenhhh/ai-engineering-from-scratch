# 前缀缓存服务（Prefix-Cache Serving）：RadixAttention 与 KV 复用

> 将 KV 缓存作为存储在基数树（Radix tree）中的一等可复用资源，调度方式也随之改变：缓存感知调度器不采用 vLLM 的先来先服务（First-come, first-served，FCFS），而优先处理共享前缀更长的请求，实际上相当于深度优先遍历基数树，使热门分支驻留 HBM。SGLang 围绕这个理念构建服务引擎。使用 ShareGPT 式 1K 提示词时，Llama 3.1 8B 在 SGLang 达到约 16,200 tok/s，vLLM 约 12,500，领先约 29%。前缀密集的 RAG 工作负载上，优势达到 6.4 倍。语音克隆类工作负载缓存命中率超过 86%。2026 年，xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS 已在 400,000+ 块 GPU 上部署它。陷阱在于前缀顺序不一致会让 6.4 倍收益消失，顺序正是工程师能控制的因素。

**Type:** Learn
**Languages:** Python (标准库，简化基数树缓存与缓存感知调度器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）、阶段 14（智能体式 RAG，Agentic RAG）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 绘制 RadixAttention：前缀如何存入基数树，同一分支下的序列如何共享 KV 块。
- 解释缓存感知调度（Cache-aware scheduling），以及为何 FCFS 不适合前缀密集流量。
- 根据前缀缓存命中率和提示词长度分布，计算工作负载的预期加速比。
- 说出让 6.4 倍收益落地而不落空的提示词排序规范。

## 问题背景（The Problem）

经典服务将每个请求的提示词当作不透明内容。即使 5,000 个 RAG 请求都以同样的 2,000 词元系统提示词和检索前导内容开头，vLLM 仍会将这 2,000 词元前缀预填充 5,000 次。GPU 反复做同一份工作。

关键观察是：智能体和 RAG 工作负载的提示词几乎总有长共享前缀。系统提示词、工具模式、少样本示例、检索头、对话历史都会跨请求重复。若将该前缀的 KV 缓存存一次后复用，就无需再次预填充。

RadixAttention 正是如此。词元以基数树索引，每个节点拥有从根到该节点路径中词元序列的 KV 块。新请求遍历树，词元匹配的节点就复用其 KV 块。预填充成本变为与“新增”后缀成正比，而非与完整提示词成正比。

难点在调度。如果两个请求共享 2,000 词元前缀，第三个只共享其中 200 词元，你希望一起处理前两个，让长前缀留在 HBM。FCFS 却只看谁先来，可能在下一个长前缀请求到来前就淘汰热门分支。

## 核心概念（The Concept）

### 基数树作为 KV 索引（The radix tree as a KV index）

基数树又称压缩字典树（Compact trie），存储词元序列。每个节点拥有一段词元范围及为其计算的 KV 块，子节点将序列延长一个或多个词元。

```
根节点
 |- "你是一位乐于助人的助手……"      （2,000 词元，124 个 KV 块）
      |- "上下文：<doc A>……"        （500 词元，31 块）
           |- "问题：Alice……"       （80 词元，5 块）
           |- "问题：Bob……"         （95 词元，6 块）
      |- "上下文：<doc B>……"        （520 词元，33 块）
```

新请求包含系统提示词、“上下文：<doc A>”和“问题：Carol”。调度器遍历树：系统前缀匹配，复用 124 块；doc-A 分支匹配，复用 31 块；只为“问题：Carol”新分配 4 块。预填充只需处理 4 块新词元，而没有树时需要 160 块，预填充开销约节省 40 倍。

### 缓存感知调度（Cache-aware scheduling）

如果缓存反复换入换出，基数树复用就没有意义。两项关键策略：

1. **深度优先派发（Depth-first dispatch）**：从队列挑选下一个请求时，优先选择与当前运行集合处于同一分支的请求，使热门分支保持驻留。
2. **分支级 LRU，而非块级 LRU（LRU at branch level, not block level）**：淘汰整个分支，从使用时长最短的叶子开始，而非单个块，使缓存形状与基数树匹配。

FCFS 违反两者。共享 2,000 词元的请求排在仅共享 50 词元的请求后，为接纳后者，2,000 词元分支被淘汰。

### 应记住的基准数值（Benchmark numbers you should memorize）

- Llama 3.1 8B、H100、ShareGPT 1K 提示词：SGLang 约 16,200 tok/s，vLLM 约 12,500，领先约 29%。
- 前缀密集 RAG：相同系统提示词和文档、不同问题，SGLang 最多达到 6.4 倍。
- 语音克隆工作负载：前缀缓存命中率 86.4%。
- SGLang 客户生产命中率为 50-99%，取决于提示词规范。
- 2026 年部署于 400,000+ 块 GPU。

### 顺序陷阱（The ordering gotcha）

6.4 倍依赖一致的提示词模板顺序。如果客户端部分请求使用 `[system, tools, context, history, question]`，其他请求使用 `[system, context, tools, history, question]`，树就找不到共享前缀。人眼看似共享的前缀，对基数树是两条不同序列。

工程师能控制的是：提示词模板就是缓存键。固定顺序，把系统提示词、工具、模式等不变内容放最前，随后放检索上下文，用户问题最后。不要把动态内容穿插到前缀中。

研究中的真实案例：一次将动态内容移出可缓存前缀的改动，就让某部署的缓存命中率从 7% 提升到 74%。

### RadixAttention 的优势与局限（Where RadixAttention wins and loses）

有优势的场景：
- RAG：相同检索前导内容，不同问题。
- 智能体：相同工具模式，不同查询。
- 带长系统提示词的聊天。
- 前导内容重复的语音和视觉工作负载。

无优势、吞吐量回到 vLLM 水平的场景：
- 提示词独特的单次生成，如代码补全、无系统提示词的开放聊天。
- 每个请求都在前缀中穿插独特内容的动态提示词。

### 为什么这是调度器问题，而不只是内核问题（Why this is a scheduler problem, not just a kernel problem）

KV 复用可以实现为内核技巧。SGLang 的洞见是：只有调度器保持热门分支驻留，复用才有收益。朴素的“可用就复用”策略会在混合负载下造成缓存抖动。基数树索引的调度器，才把内核技巧变成 29% 的生产优势。

### 与 vLLM 的关系（Interplay with vLLM）

两者并非严格对立。2026 年，vLLM 增加前缀缓存（`--enable-prefix-caching`）和缓存感知路由器，即 Rust 实现的 vLLM Router。差距缩小但未完全消失：SGLang 整个技术栈以基数树为先，vLLM 则是后加。在前缀复用主导的工作负载中，SGLang 仍是默认选择；没有明显前缀模式的通用服务中，vLLM 仍相当或更好。

```figure
roofline
```

## 实际应用（Use It）

`code/main.py` 实现简化基数树 KV 缓存与两种调度策略：FCFS 和缓存感知。它用同一工作负载运行两者，报告前缀缓存命中率及吞吐量差异，再运行“顺序打乱”的负载，展示 6.4 倍优势如何崩塌。

## 交付成果（Ship It）

本课产出 `outputs/skill-radix-scheduler-advisor.md`。根据工作负载描述，包括提示词模板形态、检索模式、并发租户数，给出提示词排序方案，以及是否采用 SGLang 的结论。

## 练习（Exercises）

1. 运行 `code/main.py`。在同一负载上比较 FCFS 与缓存感知，差异来自预填充节省、解码节省还是排队延迟？
2. 修改负载，随机打乱提示词中的 `[system, tools, context]`，重跑。命中率如何变化，为什么？
3. 计算 Llama 3.1 8B 将 2,000 词元系统提示词作为基数树一个分支持续驻留的 HBM 成本，与不复用前缀的 16 序列批次比较。
4. 阅读 SGLang RadixAttention 论文，用三句话解释前缀密集负载下，树状 LRU 淘汰为何优于块状 LRU。
5. 客户报告缓存命中率仅 8%。列出三个可能原因，以及针对每个原因执行的诊断。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| RadixAttention | “SGLang 那个机制” | 用基数树索引 KV 缓存，共享前缀复用块 |
| 基数树（Radix tree） | “压缩字典树” | 每节点拥有词元范围及其 KV 块的树 |
| 缓存感知调度器（Cache-aware scheduler） | “热门分支优先” | 优先处理共享驻留分支的请求 |
| 前缀缓存命中率（Prefix-cache hit rate） | “提示词有多少免费” | 由复用 KV 块提供的提示词词元比例 |
| 先来先服务（FCFS） | “先到先服务” | 会破坏前缀局部性的默认调度 |
| 分支级 LRU（Branch-level LRU） | “淘汰叶子” | 与基数树形状匹配的淘汰策略 |
| 提示词模板顺序（Prompt template ordering） | “缓存键” | 提示词组成部分的顺序决定树能共享什么 |
| 系统提示词固定驻留（System prompt pinning） | “驻留前缀” | 固定不变系统部分，避免反复淘汰抖动 |

## 延伸阅读（Further Reading）

- [SGLang GitHub 仓库](https://github.com/sgl-project/sglang)：源码与文档。
- [SGLang 文档](https://sgl-project.github.io/)：RadixAttention 与调度细节。
- [SGLang 论文：高效编程大语言模型（arXiv:2312.07104）](https://arxiv.org/abs/2312.07104)：设计参考。
- [LMSYS 博客：带 RadixAttention 的 SGLang](https://www.lmsys.org/blog/2024-01-17-sglang/)：基准数值与调度依据。
- [vLLM：前缀缓存](https://docs.vllm.ai/en/latest/features/prefix_caching.html)：vLLM 自身类似基数树的实现，供比较。
