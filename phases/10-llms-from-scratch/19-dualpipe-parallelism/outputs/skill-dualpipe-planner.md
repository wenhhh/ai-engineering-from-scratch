---
name: dualpipe-planner
description: 为训练集群规划流水线并行（Pipeline Parallelism）策略（1F1B、Zero Bubble、DualPipe、DualPipeV）。
version: 1.0.0
phase: 10
lesson: 19
tags: [pipeline-parallelism, dualpipe, dualpipev, zero-bubble, expert-parallelism, distributed-training]
---

给定训练集群规格（图形处理器（Graphics Processing Unit，GPU）总数、互连拓扑、加速器型号、单 GPU 内存）、模型形状（总参数、激活参数、混合专家（Mixture of Experts，MoE）或稠密模型、预计层数）及目标训练数据量，推荐流水线并行策略，并确认预期气泡比例（Bubble Fraction）。

产出：

1. 流水线深度 P。根据 GPU 内存预算（每个进程必须容纳一个流水线阶段）、MoE 或稠密结构以及互连带宽选择。范围：小集群为 4，前沿 MoE 训练为 16–32。
2. 微批次数 M。DualPipe 和 DualPipeV 要求能被 2 整除。典型 M/P 比值为 8–16。结合梯度累积（Gradient Accumulation）目标和目标序列长度下的激活内存论证选择。
3. 调度选择。从 1F1B、Zero Bubble、DualPipe、DualPipeV 中选择。决策表：少于 500 块 GPU 的稠密训练 -> Zero Bubble；带专家并行（Expert Parallelism，EP）的 MoE -> DualPipe；超过 500 块 GPU 且无大量全互连（All-to-All）的稠密训练 -> DualPipeV；少于 100 块 GPU 的小任务 -> 1F1B 即可。
4. 预期气泡比例。在目标 P 和 M 下计算所选调度的气泡比例。报告百分比，以及在总训练预算内相对于 1F1B 节省的绝对 GPU 小时数。
5. 参数复制方案（仅 DualPipe）。确认两倍参数副本能装入可用显存（Video RAM，VRAM）。给出所选 P 下每 GPU 的有效参数密度。

必须拒绝的情况：
- 未使用专家并行却采用 DualPipe。没有大量 EP 通信需要隐藏，就不足以证明两倍复制合理。
- 任意训练采用 P > 64。不论调度方式，气泡比例都随 P 线性增长。
- DualPipe/DualPipeV 的微批次数不能被 2 整除。调度无法闭合。
- 模型能装入单 GPU 内存时仍采用流水线并行。仅使用数据并行（Data Parallelism）。

拒绝规则：
- 若每 GPU 互连速度不高于 200Gbps，拒绝 DualPipe，推荐 DualPipeV。全互连重叠窗口太窄，不足以证明复制成本合理。
- 若用户无法提供适合其集群拓扑的自定义全互连内核（Kernel），推荐 Zero Bubble，而非 DualPipe。
- 若训练量少于 1B 词元，完全拒绝流水线并行规划，推荐数据并行加张量并行（Tensor Parallelism）。

输出：一页方案，列出 P、M、调度、预期气泡比例、参数复制成本（若采用 DualPipe）及全互连内核建议。以“回滚触发条件”段落结尾，明确具体利用率指标：前 1000 步测得的总体 GPU 利用率百分比。若未达到目标值，应据此切换到更简单的调度。
