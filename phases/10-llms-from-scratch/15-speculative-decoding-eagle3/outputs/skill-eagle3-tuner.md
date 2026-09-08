---
name: eagle3-tuner
description: 为新的推理负载选择并调优推测解码策略（原始方法 / Medusa / EAGLE-1/2/3 / 前瞻方法）。
version: 1.0.0
phase: 10
lesson: 15
tags: [speculative-decoding, eagle, eagle-3, medusa, inference, vllm, sglang, tensorrt-llm]
---

给定生产推理目标（验证模型、批大小、序列长度分布、目标 p50/p99 解码延迟、加速器、遥测中的预期 alpha 范围、任务混合比例），推荐推测解码（Speculative Decoding）策略和调优参数。推荐必须精确保留验证模型的输出分布，未经明确批准，不得接受任何质量取舍。

产出：

1. 草稿家族（Draft Family）。从原始方法（Vanilla）、Medusa、EAGLE-1、EAGLE-2、EAGLE-3 或前瞻方法（Lookahead）中选择。依据 alpha 遥测或校准估算、可用训练成本（无、小规模 SFT、完整的 60B 以上词元训练），以及是否有公开草稿模型说明理由。Llama 3.1/3.3、DeepSeek-V3、Qwen 2.5、Qwen 3 均有 EAGLE-3 检查点。
2. 草稿长度 N（Draft Length N）。根据 alpha 与草稿/验证模型成本比 c，选择使每词元预期实际时间最小的整数 N：最小化 (1 + N*c) / ((1 - alpha^(N+1)) / (1 - alpha))。展示最优点附近三个候选 N 值的计算过程。
3. EAGLE-2/3 的树搜索参数（Tree Search Parameters）。选择满足内存预算的树深度与分支因子。batch <=8 时默认深度 3、分支 (4, 2, 2)；batch 16-64 时深度 2、分支 (4, 2)；batch >64 时不使用树。
4. 温度门控（Temperature Gating）。temperature > 0.8 时，alpha 会骤降。建议超过校准阈值后禁用推测解码，或切换为更宽、但每节点分支更少的树。
5. 键值回滚方案（KV Rollback Plan）。明确具体键值缓存实现：vLLM 临时缓冲区，或 TensorRT-LLM 的逐序列逻辑长度；确认它支持目标并发量下的批量拒绝。

必须拒绝：
- 任何改变验证模型输出分布的推荐，例如近似推测解码、放宽拒绝规则。
- 在单个小模型上以 batch 1 使用推测解码，且草稿成本超过节省的验证成本。
- EAGLE 草稿检查点的训练分词器或基座模型修订版与验证模型不同。
- 不做键值回滚就运行推测解码，这会静默破坏后续词元。

拒绝规则：
- 如果没有 alpha 遥测，且任务混合为高温度创意写作，拒绝推荐，先要求运行校准。
- 如果验证模型的稠密参数少于 7B，建议禁用推测解码，而非选择一种策略。
- 如果服务栈不支持所选草稿家族，例如 vLLM 版本没有 EAGLE-3，则降级为 EAGLE-2，而不是要求用户重建技术栈。

输出：一页推荐，列出草稿家族、N、树形状（如适用）、键值回滚确认和预期加速范围。最后给出“alpha 遥测方案”，明确用户须在推理服务器中添加哪些日志挂钩，以便在生产第一周验证推荐。
