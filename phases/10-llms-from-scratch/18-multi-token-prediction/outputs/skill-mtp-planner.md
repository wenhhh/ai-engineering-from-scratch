---
name: mtp-planner
description: 为新的预训练任务规划多词元预测（Multi-Token Prediction，MTP）集成方案。
version: 1.0.0
phase: 10
lesson: 18
tags: [mtp, multi-token-prediction, deepseek-v3, pre-training, speculative-decoding]
---

给定预训练任务规格（模型规模、隐藏维度、层数、数据词元预算、图形处理器（Graphics Processing Unit，GPU）拓扑、目标部署环境）和明确目标（更密集的训练信号、推测解码（Speculative Decoding）草稿网络或两者兼有），制定 MTP 集成方案。

产出：

1. 深度 D。选择 1 或 2。DeepSeek-V3 使用 D=1，报告首深度推测解码接受率超过 80%。对大多数训练任务而言，D=2 已进入收益递减区间。结合计算预算论证选择：每增加一个深度，每个训练步约增加一个 Transformer 块的计算。
2. Lambda 调度（Lambda Schedule）。默认训练前 10% 为 0.3，之后为 0.1。对小于 7B 的模型，更密集的信号更重要，早期可提高至 0.5；若观察到 MTP 损失主导主损失，则调低。
3. 参数预算。报告各模块参数量及其相对于主模型的比例。确认开销低于主参数量的 5%（稠密模型（Dense Model））或 3%（混合专家（Mixture of Experts，MoE））。
4. 内存和计算开销。量化每步额外前向浮点运算量（Floating-Point Operations，FLOPs）（约为 `D * transformer_block_cost`）、额外反向内存（D 个模块的激活内存（Activation Memory））和额外峰值显存（Video RAM，VRAM）：共享嵌入和输出头不计入，投影与 Transformer 块计入。
5. 推理连接方式。描述如何将 MTP 模块用作推理草稿网络。明确 Leviathan 规则的集成路径，以及键值（Key-Value，KV）缓存回滚的状态记录。确认与目标推理栈（vLLM、SGLang、TensorRT-LLM）兼容。

必须拒绝的情况：
- 为预训练时未使用 MTP 的稠密模型补加 MTP。无法直接改装，因为 MTP 模块没有训练过。
- 首次集成采用 D > 2。相比 D=1 收益有限，复杂度却迅速上升。
- 激活参数少于 1B 的模型采用 MTP。在此规模下，信号收益不足以抵消开销。
- 以推测解码为目标，却使用并行（Gloeckle 式）头。它们没有因果依赖链。

拒绝规则：
- 若预训练数据以短序列（小于 2k）为主，则拒绝。MTP 的收益要求序列足够长，使深度 2 的监督有意义。
- 若目标推理栈完全不支持推测解码，说明 MTP 仍可提供更密集的训练信号并继续规划，但标明这一不匹配。
- 若用户在不含 MTP 的现有稠密检查点（Checkpoint）上继续预训练，则拒绝；建议仅在全新训练开始时，或明确的数据边界重置点加入 MTP。

输出：一页集成方案，列出 D、lambda 调度、参数开销（绝对值及百分比）、计算开销（每训练步百分比）和推理时的推测解码连接方案。以“成功标准”段落结尾，说明保留 MTP 的实测依据：训练 50B 词元后，深度 1 接受率必须高于 70%，否则应恢复原架构。
