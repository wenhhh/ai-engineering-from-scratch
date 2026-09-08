# 流水线并行与气泡分析（Pipeline Parallel and Bubble Analysis）

> 张量并行跨 rank 拆分矩阵乘法，流水线并行跨 rank 拆分模型，每 rank 一个阶段。微批次沿流水线流动，开始和结束的空闲时间就是气泡；将它最小化是核心技术。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 19 路线 C 第 42–49 课
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 将顺序模型拆为 N 个阶段，模拟跨 N 个 rank 的前向流水线。
- 按 GPipe 调度 M 个微批次：先只做前向填充，再反向，并计算气泡比例。
- 与 Megatron-LM、PipeDream 使用的交错 1F1B 调度比较气泡。
- 论证阶段分配：逐阶段计算均衡比参数量相等更重要。

## 问题（The Problem）

700 亿参数 fp16 模型仅参数就需 140 GB，没有消费级 GPU 能装下。ZeRO-3 跨 rank 分片参数，但每次前向仍需各 rank allgather 完整层，每层支付 log(N) 跳。流水线并行（Pipeline parallelism）采取另一条路：把模型切为 N 阶段，各放在一个 rank。第 1 层前向在 rank 0 完成，将激活张量交给 rank 1；rank 1 运行第 2 层，再交给 rank 2，依此类推。反向逆流。各 rank 只持有一阶段，内存线性下降；计算却是顺序的，这就是气泡问题。

气泡（Bubble）是流水线开始时等待首个微批次抵达最后阶段，以及结束时等待最后微批次反向排空的空闲时间。M 微批次、N 阶段时，每阶段气泡比例为 (N-1)/(M+N-1)。M=8、N=4 时为 27%；M=64、N=4 时为 4.5%。每步微批次越多，气泡越小，这意味着单微批次批大小更小，也是驱动微批次设计的约束。

## 概念（The Concept）

```mermaid
flowchart LR
  R0[rank 0：阶段 0 / 层 0] --> R1[rank 1：阶段 1 / 层 1]
  R1 --> R2[rank 2：阶段 2 / 层 2]
  R2 --> R3[rank 3：阶段 3 / 损失]
  R3 -.反向.-> R2
  R2 -.反向.-> R1
  R1 -.反向.-> R0
```

### GPipe 调度（GPipe schedule）

先让全部 M 微批次前向填充流水线，再逆序反向排空。各微批次激活必须保留到其反向，因此内存随 M 线性增长。前向需 M+N-1 周期，反向再需 M+N-1 周期。每阶段有效工作 2M 周期，气泡 2(N-1) 周期。当前向和反向各用一个时间单位时，气泡比例为 (N-1)/(M+N-1)。M 远大于 N 可隐藏气泡。

### 1F1B 调度（1F1B schedule）

交错执行：某微批次前向一到最后阶段，立即开始其反向并向回流动。每阶段交替一次前向、一次反向。气泡仍为 N-1，但激活内存由流水线深度而非微批次数限制。生产流水线（Megatron、PipeDream）采用 1F1B。本课先实现更简单的 GPipe，将 1F1B 留作练习。

### 为何逐阶段计算均衡重要（Why equal compute per stage matters）

阶段 0 用 50 ms、阶段 1 用 100 ms 时，每周期都受阶段 1 限制。其他阶段每周期空闲 50 ms 等它释放。参数量相等是错误维度：Transformer 计算由每层注意力和 MLP 主导，嵌入层参数多但计算少。应均衡逐阶段 FLOPs，而非逐阶段权重。

### 微批次与批次（Microbatch versus batch）

流水线运行 M 个大小各为 B 的微批次，有效批大小 M*B。流水线一步结束的梯度，就是合并 M*B 个样本的梯度。气泡比例依赖 M，优化器看到 M*B。调 M 要权衡气泡（M 大则低）与逐微批次内存（GPipe 中 M 大使激活内存更高）。

```figure
cd-pipeline-bubble
```

## 动手实现（Build It）

`code/main.py` 实现了：

- `PipelineStage`：持有一个阶段参数的小型 `nn.Module`，暴露 `forward(activation)`。
- `Pipeline(stages, num_microbatches)`：使用模拟的逐阶段实际时间，在模拟阶段上编排 GPipe。
- `bubble_fraction(num_stages, num_microbatches)`：闭式公式 (N-1)/(M+N-1)。
- 四阶段演示，打印逐微批次轨迹与测得气泡比例。

运行：

```bash
python3 code/main.py
```

输出：阶段与微批次甘特图，以及气泡百分比与闭式预测的对比。

## 真实生产模式（Production patterns in the wild）

三种模式使流水线并行足够稳健，可供交付。

**激活检查点与流水线配合。** GPipe 中 M 个微批次在途，激活内存是一个微批次的 M 倍。激活检查点在反向时重算前向，以计算换内存；两者结合使长序列流水线可行。

**阶段均衡靠测量，不靠假设。** 生产团队在目标硬件上分析实际逐层计算（FLOPs 和实际时间），再据此分区。Megatron-LM 的 `--num-layers-per-stage` 接受列表，允许逐层成本不同时各阶段层数不等。

**收发调度必须避免死锁。** 各阶段都先发后收会在通信中死锁。标准修复是交错：偶数 rank 先发后收，奇数 rank 先收后发。本课显式调度 rank，使模式可见。

## 实际应用（Use It）

生产模式：

- **Megatron-LM。** 大规模流水线并行参考方案，使用 1F1B，支持张量、流水线和数据并行组合。
- **DeepSpeed Pipeline。** 与 ZeRO 集成；ZeRO-1 + 流水线是最大开放模型的常见组合。
- **PyTorch Pipe。** PyTorch 原生流水线包装器，基于 `torch.distributed.pipeline.sync.Pipe`。

## 交付成果（Ship It）

第 80 课在分片检查点中存逐阶段参数分片。第 81 课端到端演示组合 DDP + ZeRO + 流水线（理念上如此；为控制运行时间，流水线仍为模拟）。

## 练习（Exercises）

1. 实现 1F1B，验证气泡比例与 GPipe 相同，但激活内存有界。
2. 在更深模型上分析真实逐阶段时间，按实际测量重新均衡。
3. 跨流水线微批次累积梯度，检查等于等价完整批次前向所得梯度。
4. 结合激活检查点，测量内存下降与计算代价。
5. 结合流水线与 DDP：每个流水线 rank 在数据并行组中复制，并推演二维调度。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 流水线（Pipeline） | “沿深度模型并行” | 每 rank 一阶段，激活逐阶段流动 |
| 气泡（Bubble） | “流水线空闲时间” | 开始与结束的 (N-1) 步中，部分阶段无工作 |
| 微批次（Microbatch） | “批次切片” | 一个前向/反向单位；M 增大使气泡缩小 |
| GPipe | “先填后排” | 全部 M 次前向后才反向；激活内存高 |
| 1F1B | “交错调度” | 每阶段一次前向一次反向；激活内存有界 |

## 延伸阅读（Further Reading）

- [Huang 等：GPipe：巨型神经网络高效训练（Efficient Training of Giant Neural Networks）](https://arxiv.org/abs/1811.06965)
- [Narayanan 等：PipeDream：DNN 训练的通用流水线并行（Generalized Pipeline Parallelism for DNN Training）](https://arxiv.org/abs/1806.03377)
- [Megatron-LM 流水线并行（Pipeline parallel）文档](https://github.com/NVIDIA/Megatron-LM)
- 阶段 19 第 76 课：调度使用的 send/recv 原语
- 阶段 19 第 78 课：与流水线正交且常组合的 ZeRO
