---
name: checkpointing-planner
description: 根据训练配置和高带宽内存（High Bandwidth Memory，HBM）预算，逐层选择激活重计算（Activation Recomputation）策略（none / selective / full / offload）。
version: 1.0.0
phase: 10
lesson: 34
tags: [gradient-checkpointing, activation-recomputation, selective-checkpoint, fsdp-offload, training-memory]
---

给定训练配置（层数 L、隐藏维度 d、序列长度 S、微批量 B、数据类型每值字节数、注意力内核、张量并行（Tensor Parallelism，TP）度、流水线并行（Pipeline Parallelism，PP）度、若为 MoE 则给专家并行（Expert Parallelism，EP）度），以及扣除权重和优化器状态后的每进程 HBM 预算，输出：

1. 逐层策略。对嵌入、注意力、前馈网络（Feed-Forward Network，FFN）、MoE 专家、归一化、输出头各层族，选择 none、selective、full 或 offload。S 超过 4_096 时注意力默认 selective，残差流和归一化默认 none。只有该层激活实测 PCIe 传输时间小于实测重算时间时，FFN 才默认 offload。
2. 分段大小 k。启用全量检查点（Full Checkpointing）时，均匀层成本取 round(sqrt(L))；激活内存主导预算时，选更小 k。报告额外 FLOP 百分比为前向 FLOPs 的 (1/k)。
3. FlashAttention 交互。确认注意力内核是否已重算 softmax。若是，选择性注意力检查点收益有限，降为 none。明确内核名称：FlashAttention-2/3、xFormers memory-efficient 或原始版本。
4. TP / PP 方案。TP：指出重算时需要收集或重新分散的激活，以及每步新增通信字节数。PP：确认哪些流水线阶段端到端设置检查点，使反向微批次回流前释放激活内存。
5. 预算计算。预测策略应用前后的激活内存，单位为每进程 MB。预测 FLOP 开销占前向加反向的百分比。若方案无法在保留 10% 余量的前提下满足 HBM 预算，则拒绝。

若仅对注意力使用选择性检查点就满足预算，拒绝每层全量检查点；性能分析显示相同内存节省下，其 FLOP 开销是选择性方案的数倍，准确倍数依赖负载。若目标 PCIe 链路上传输该层激活的实测时间超过重算时间，拒绝卸载（Offload），选择重算。FP8 训练中，若框架不保存 amax 历史快照，拒绝“处处检查点”，否则重算会使缩放漂移并无声破坏梯度。

输入示例：“L=64, d=8192, S=8192, B=1, bf16, FlashAttention-3, TP=8, PP=4；扣除权重后每进程 HBM 预算 32 GB；MoE 含 8 个专家，EP=8。”

输出示例：
- 逐层策略：注意力 selective、FFN none、MoE 专家 full、嵌入 none、输出头 offload。
- 分段大小：仅 MoE 使用 full，k=8；专家路径 FLOP 开销 12%，其他为 0。
- FlashAttention 交互：FA-3 已重算 softmax；selective 放在层包装器，不在内核内部。
- TP / PP 方案：重算时 TP 收集注意力输入，每步增加 0.3 GB 通信；各 PP 阶段对完整前向设置检查点；PP 阶段 3 保留激活供最终反向使用。
- 预算计算：无策略时激活 38 GB，应用后 11 GB；总 FLOP 开销为前向加反向的 7.5%。
