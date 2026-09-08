---
name: prompt-distributed-training-planner
description: 根据模型规模和可用硬件规划分布式训练
version: 1.0.0
phase: 10
lesson: 5
tags: [distributed-training, fsdp, deepspeed, tensor-parallelism, pipeline-parallelism, scaling]
---

# 分布式训练规划器（Distributed Training Planner）

为大语言模型（Large Language Model，LLM）规划分布式训练时，使用此框架确定并行策略、内存预算、通信开销和预期吞吐量。

## 输入要求（Input Requirements）

请提供：
- **模型规模**：参数量，以十亿为单位
- **目标训练词元数**：以万亿为单位
- **可用 GPU**：类型 A100/H100/H200、数量、互连 NVLink/InfiniBand
- **GPU 显存**：A100/H100 为 80GB，H200 为 141GB
- **节点**：每节点 GPU 数量、节点总数
- **预算约束**：最大美元成本、最长实际耗时

## 步骤 1：内存预算（Step 1: Memory Budget）

计算各组件的单卡内存：

| 组件 | 公式 | FP16 | FP32 |
|-----------|---------|------|------|
| 权重 | params x bytes_per_param | params x 2 | params x 4 |
| Adam 优化器（m + v） | params x 4 x 2 | 始终每参数 8 字节 | 每参数 8 字节 |
| 梯度 | params x bytes_per_param | params x 2 | params x 4 |
| 激活，估计值 | seq_len x batch x hidden x layers x 2 | 不固定 | 不固定 |

如果总量超过 GPU 显存，就需要分片（Sharding）。依次尝试：
1. ZeRO-1，仅分片优化器状态，通信最少
2. ZeRO-2，再加梯度，通信适中
3. 全分片数据并行（Fully Sharded Data Parallel，FSDP）/ZeRO-3，再加权重，通信最多，但内存节省最大
4. 激活仍太大时，加入激活检查点（Activation checkpointing）
5. 单层无法装入一张 GPU 时，加入张量并行（Tensor parallelism）

## 步骤 2：并行策略（Step 2: Parallelism Strategy）

### 决策树（Decision Tree）

1. **单层能放进一张 GPU 吗？**
   - 否：需要张量并行（Tensor Parallelism，TP），在节点内设置 TP = 2、4 或 8。
   - 是：跳过张量并行。

2. **分片后的完整模型能放进一个节点的 GPU 吗？**
   - 否：需要流水线并行（Pipeline Parallelism，PP），设置 PP = 节点数 / 组数。
   - 是：跳过流水线并行。

3. **还有多少 GPU 可用于数据并行（Data Parallelism，DP）？**
   - DP = total_gpus / (TP x PP)

4. **数据并行组内采用什么分片级别？**
   - 从 FSDP（ZeRO-3）开始。如果通信成为瓶颈，降到 ZeRO-2 或 ZeRO-1。

### 典型配置（Typical Configurations）

| 模型规模 | GPU 总数 | TP | PP | DP | 分片 |
|-----------|-----------|----|----|-----|----------|
| 7B | 8 | 1 | 1 | 8 | FSDP |
| 13B | 16 | 2 | 1 | 8 | FSDP |
| 70B | 64 | 8 | 1 | 8 | FSDP |
| 70B | 128 | 8 | 2 | 8 | FSDP |
| 405B | 16,384 | 8 | 16 | 128 | FSDP |

## 步骤 3：通信分析（Step 3: Communication Analysis）

估算每训练步的通信量：

- **数据并行，全归约（All-reduce）**：每步 2 x gradient_size x (N-1)/N
- **FSDP，全收集（All-gather）+ 归约散发（Reduce-scatter）**：每步 ~3 x weight_size x (N-1)/N，高于数据并行
- **张量并行，每层全归约**：每步 2 x activation_size x num_layers，需要 NVLink
- **流水线并行，点对点通信**：每阶段边界 activation_size，通信最少

如果通信时间超过计算时间的 20%，策略就受通信限制。解决方法：
- 梯度累积（Gradient accumulation），降低全归约频率
- 让通信与计算重叠，FSDP 默认这样做
- 增大微批次（Micro-batch），提高计算与通信之比
- 改用通信量更少的分片阶段

## 步骤 4：吞吐量与成本估算（Step 4: Throughput and Cost Estimate）

**每训练步的 FLOPS：**
- 前向：~2 x params x tokens_per_batch
- 反向：~4 x params x tokens_per_batch，为前向的 2 倍
- 总计：~6 x params x tokens_per_batch

**训练时间：**
- total_flops = 6 x params x total_tokens
- time_seconds = total_flops / (num_gpus x gpu_tflops x 1e12 x utilization)
- 典型利用率为 35-45%，已计入通信、流水线气泡（Pipeline bubble）、内存开销

**成本：**
- total_gpu_hours = num_gpus x time_seconds / 3600
- cost = total_gpu_hours x cost_per_gpu_hour

## 步骤 5：验证清单（Step 5: Validation Checklist）

启动前确认：

1. 单卡内存低于硬件限制，并预留 10% 余量
2. 有效批大小符合目标，per_gpu_batch x DP x gradient_accumulation_steps
3. 通信与计算时间比低于 20%
4. 流水线气泡比例低于 15%，微批次数量足够
5. 学习率已按有效批大小调整
6. 检查点保存频率已考虑故障概率，大规模训练每 1-2 小时保存
7. 已设置梯度裁剪（Gradient clipping），大模型通常为 1.0
8. 预热步数与总步数成比例，通常为总步数的 0.1-1%

## 警示信号（Red Flags）

- **TP > 8**：跨节点、经 InfiniBand 的张量并行几乎总比流水线并行慢
- **流水线阶段 > 32**：即使微批次很多，气泡开销仍显著
- **有效批大小 > 10M 词元**：收益递减，可能损害收敛
- **利用率低于 30%**：受通信限制，应重新评估并行策略
- **超过 13B 却没有激活检查点**：反向传播时会耗尽内存
- **单卡批次小却没有梯度累积**：梯度噪声增加，应累积到有效批大小至少 256 个样本
