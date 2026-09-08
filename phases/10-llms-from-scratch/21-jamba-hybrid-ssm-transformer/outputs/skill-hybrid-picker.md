---
name: hybrid-picker
description: 根据工作负载，在纯 Transformer、Jamba 式混合架构（Hybrid）和纯状态空间模型（State Space Model，SSM）之间选择。
version: 1.0.0
phase: 10
lesson: 21
tags: [jamba, mamba, ssm, hybrid, long-context, memory-budget, architecture]
---

给定工作负载规格（上下文长度分布 p50/p99、任务组合、每 GPU 内存预算、目标吞吐量、质量与速度的优先级），在纯 Transformer（+MoE +MLA）、Jamba 式混合模型和纯 Mamba 之间推荐。

产出：

1. 上下文长度分档。短（小于 16k）、中（16k–64k）、长（64k–256k）或超长（256k 以上），用来驱动初步决策。
2. 架构推荐。从纯 Transformer、1:7 混合、1:3 混合、1:15 混合或纯 Mamba 中选择。结合长度分档和任务的上下文内回忆（In-Context Recall）需求论证。
3. 内存预算检查。计算目标上下文的键值缓存（Key-Value Cache，KV Cache）加 SSM 状态。计入权重和激活内存（Activation Memory）后，确认可装入目标加速器；激活通常在权重及 KV 缓存之外再占 10–20 GB。
4. 质量权衡披露。记录所选稀疏水平的质量代价。比例低于 1:7 的混合模型在上下文内检索上会出现可测退化；纯 Mamba 在某些状态跟踪（State Tracking）任务上会失败。
5. 推理栈兼容性。确认目标栈（vLLM、TensorRT-LLM、SGLang、llama.cpp）支持所选架构。混合模型的工具覆盖弱于纯 Transformer。

必须拒绝的情况：
- 上下文小于 16k 却采用 Jamba 式混合模型，架构开销缺乏理由。
- 重推理或跨文档交叉引用任务采用纯 Mamba，状态跟踪限制会产生影响。
- 混合比例低于 1:15。低于此比例，上下文内回忆不可靠。
- 计算出的内存预算无法装入指定加速器的任何推荐。

拒绝规则：
- 若工作负载确实混合短、长上下文，拒绝推荐混合模型，改为推荐纯 Transformer，尽可能采用多头潜在注意力（Multi-Head Latent Attention，MLA）；混合模型专长于长上下文负载。
- 若加速器为消费级（24GB 或更少），拒绝混合模型这一规模，推荐蒸馏的小型混合模型或量化纯 Transformer。
- 若工作负载是延迟敏感、批量为 1 的生成，且模型较新、没有现成部署路径，则拒绝，推荐支持成熟的纯 Transformer 加推测解码（Speculative Decoding）（阶段 10 · 15），作为更简单的方案。

输出：一页推荐，列出上下文分档、架构选择、目标上下文的 KV 缓存、质量权衡及推理栈兼容性。以“监控内容”段落结尾，明确前 10k 个生产请求中用于验证推荐的长上下文评估：RULER、LongBench 或大海捞针（Needle-in-a-Haystack）。
