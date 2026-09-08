---
name: speculative-tuning
description: 分析解码负载，为推测解码（Speculative Decoding）选择草稿模型、草稿长度 K、温度门限和回退策略。
version: 1.0.0
phase: 10
lesson: 25
tags: [speculative-decoding, draft-model, alpha, throughput, inference, decode-latency]
---

给定目标模型（规模、家族、分词器（Tokenizer））、负载遥测（Telemetry）（任务组合、提示与解码词元比例、p50/p99 解码延迟、加速器及高带宽内存（High Bandwidth Memory，HBM）余量、平均批量大小、采样温度分布）和可用草稿检查点（Checkpoint），输出：

1. 草稿选择。从同家族小模型（Llama-70B 配 Llama-3.2-1B）、蒸馏草稿（Qwen3-0.6B-spec）、附加于目标的 Medusa 头中选择；若没有草稿的浮点运算（Floating-Point Operation，FLOP）成本比低于 30%，选择“不使用推测解码”。逐字节确认分词器与目标一致，拒绝不匹配的分词器。
2. 草稿长度 K。求 E[tokens] / (1 + K x c) 的最大值，其中 c 是草稿与目标成本比。用 5_000 个同分布（In-Distribution）词元校准实测 alpha，展示 K 为 2、3、4、5、6 时的计算。聊天默认 K=4，代码 K=6，高温度创意写作 K=2。
3. 温度门限（Temperature Gate）。超过阈值关闭推测解码，默认 0.8；若校准显示 alpha 更早崩塌，降低至 0.6。拒绝依赖逐请求检查、且增加超过 50 微秒开销的门限。
4. 树预算（Tree Budget）。若服务栈支持树状草稿（Tree Drafting），批量小于 8 时选择小型固定树（深度 2，分支 3-2），批量大于 32 时选择平坦链。以字节说明验证器键值（Key-Value，KV）临时空间大小，确认可装入 HBM 余量。
5. 回退策略（Fallback Policy）。明确指标为最近 1_000 次验证的滑动窗口实测 alpha，阈值为低于 0.4；达到条件时，该请求流退回普通自回归解码。说明回退决策对各请求的有效期。

若批量大小超过验证器进入计算受限（Compute-Bound）的临界点，拒绝推测解码。超过此点，推测器原本用于利用的空闲 FLOPs 已不存在，吞吐量会下降。若某任务家族实测 alpha 低于 0.4，拒绝推测解码：草稿开销主导，实际延迟更差。拒绝尚未在 1_000 词元留出样本上对照目标验证的草稿，未验证草稿会导致无声的 KL 漂移（KL Drift）。

输入示例：“Llama-3.3-70B，8xH100，聊天负载，批量 16，p50 解码 28 ms、p99 60 ms，温度均值 0.4、最大 1.2；校准 alpha 为聊天 0.78、代码 0.61。”

输出示例：
- 草稿：Llama-3.2-1B-Instruct-spec。相同分词器、相同家族，成本比 c 约 0.03。
- K：4。E[tokens/verify] = 聊天 3.4、代码 2.5。K=5 仅多获得 0.1 个聊天词元，却增加 0.03 的 c，拒绝。
- 温度门限：0.8。校准集上超过 0.8 时，alpha 低于 0.45。
- 树预算：深度 2、分支 (3, 2)。批量 16 时，480 MB KV 临时空间可容纳。
- 回退：最近 1_000 次验证的滑动窗口 alpha 低于 0.40 时，对该流关闭推测解码 30 秒，再重新探测。
