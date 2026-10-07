# 梯度检查点与激活重计算（Gradient Checkpointing and Activation Recomputation）

> 反向传播（Backpropagation）保留每个中间激活。在 70B 参数、128K 上下文下，每个进程（Rank）的激活占用达 3 TB。检查点（Checkpointing）用浮点运算量（Floating-Point Operations，FLOPs）换内存：不保存，改为重新计算。问题是丢弃哪些分段，答案不是“全部”。

**Type:** Build
**Languages:** Python (with numpy, optional torch)
**Prerequisites:** 阶段 10 第 04 课（预训练 Mini-GPT）、阶段 10 第 05 课（扩展与分布式）
**Time:** 约 70 分钟

## 问题（The Problem）

训练 Transformer 时，每层都保存反向求导所需的各操作输入：注意力输入、Q/K/V 投影、softmax 输出、前馈网络（Feed-Forward Network，FFN）输入、归一化输出和残差流（Residual Stream）。隐藏维度 `d`、序列长度 `L`、批量 `B` 的层，每层约需 `12 * B * L * d` 个浮点数。

在 `d=8192, L=8192, B=1` 时，BF16 下每层约 800 MB，64 层模型激活约 51 GB。这还没乘微批量大小，没加注意力 softmax 中间量（每头 `L^2`），也没计入张量并行的部分副本。

成本来自两面：BF16 权重加优化器状态可能装得进 80GB，但激活会使总量超限。梯度检查点（Gradient Checkpointing），又称激活重计算（Activation Recomputation），是标准解决方案：丢弃大部分激活，反向期间重做前向将其恢复。代价是额外 FLOPs，收益是内存按检查点分段数相对总层数的比例下降。

朴素检查点每步增加约 33% 前向 FLOPs。若采用 Korthikanti 等人的“智能选择”进行选择性检查点（Selective Checkpointing），可以低于 5% 的 FLOP 开销节省 5 倍内存。配合 FP8 矩阵乘法、FSDP 卸载和专家并行 MoE，这一点尤其重要：内存和浪费的计算都负担不起。

## 概念（The Concept）

### 反向实际需要什么（What Backward Actually Needs）

`output = layer(input)`。反向需要 `grad_input` 和 `grad_params`，计算它们需要：

- `input`，线性层用它计算 `grad_params = input.T @ grad_output`。
- 部分激活导数中间量，ReLU/GELU/softmax 的导数依赖激活值。

前向自动在自动求导图（Autograd Graph）中保存这些内容。每次 `tensor.retain_grad()`，以及每个需要输入的操作，都会保留引用。

### 朴素全量检查点（Naive Full Checkpointing）

将网络拆为 `N` 段。前向只保存各段的*输入*。反向需要中间量时，重新运行该段前向，将中间量重新物化（Rematerialization），再求导。

例如：32 层 Transformer 拆为 32 段，每段 1 层。

- 内存：32 个层输入（小），对比 32 *（每层激活量）（大）。
- 额外计算：每段多一次前向，总前向 FLOPs 约增加 33%；由于反向是前向两倍，完整训练步从 1 + 2 = 3 单位变为 1 + 1 + 2 = 4 单位。

这是 Chen 等人 2016 年的原始方法：每 `sqrt(L)` 层一个检查点，平衡内存与计算。L=64 时为 8 个检查点。

### 选择性检查点（Selective Checkpointing，Korthikanti 2022）

各激活的成本不同。注意力 softmax 输出大小为 `B*L*L*heads`，随序列长度*二次*增长；FFN 隐藏激活为 `B*L*4d`，线性增长。长序列下 softmax 占主导。

选择性检查点保留存储便宜的激活，如线性投影、残差，只重算存储昂贵的注意力激活。只付出少量重算 FLOPs，就能省下 O(L^2) 内存。

Megatron-Core 将其实现为“选择性”激活重计算。2024 年起多数前沿训练都采用此方法。

### 卸载（Offload）

重计算的替代方案是：在前向与反向之间把激活送到中央处理器（Central Processing Unit，CPU）内存。它需要 PCIe 带宽，空闲带宽相对于重新物化成本足够有利时可获益。常见混合策略是某些层做检查点，其他层卸载。

完全分片数据并行第二版（Fully Sharded Data Parallel 2，FSDP2）将卸载作为原生选项。当 GPU 受内存限制、CPU-GPU 传输仍有余量时，卸载很有效。

### 重计算成本模型（Recompute Cost Model）

在 `L` 层中每 `k` 层设置朴素检查点，每步 FLOPs 为：

```
flops_fwd_normal = L * f_layer
flops_bwd_normal = 2 * L * f_layer
flops_total_normal = 3 * L * f_layer

flops_fwd_ckpt = L * f_layer
flops_recompute = L * f_layer  # one extra forward per layer in the segment
flops_bwd_ckpt = 2 * L * f_layer
flops_total_ckpt = 4 * L * f_layer
overhead = 4 / 3 - 1 = 0.33 = 33%
```

选择性检查点只重算注意力内核（Kernel），不重算整层：

```
flops_recompute_selective = L * f_attention ~= L * f_layer * 0.15
overhead_selective = (3 + 0.15) / 3 - 1 = 0.05 = 5%
```

### 内存节省模型（Memory Savings Model）

每层激活量为 `A`。`L` 层总激活内存为 `L * A`。

全量检查点（分段大小 1）只保存 `L * input_volume`，标准 Transformer 约为 `L * 1/10 A`，节省约 `9 * L * A * 1/10`。

每 `k` 层一个检查点：保存 `L/k * A`，加上当前活动段内 `k-1` 层的激活。

当 `k = sqrt(L)`，内存和重计算成本都随 `sqrt(L)` 缩放，是各层成本相同时的最佳权衡。

### 何时不做检查点（When Not to Checkpoint）

- 已在执行的流水线阶段最内层，它们无论如何都必须完成。
- 若首尾层主导阶段计算，则不对其做检查点；Transformer 中较少见。
- 已使用 FlashAttention 的注意力内核。Flash 已快速重算 softmax，额外层级检查点新增收益很少。

### 实现模式（Implementation Patterns）

1. **函数包装（Function Wrapper）：** 用 `torch.utils.checkpoint.checkpoint(fn, input)` 包装分段。PyTorch 只保存 `input`，其他内容在反向重算。

2. **装饰器方式（Decorator-Based）：** 将层标记为可检查点化，由训练器在配置时决定包装哪些段。

3. **手动显式重算（Manual Explicit Recompute）：** 自己编写反向传播，调用自定义 `recompute_forward`，用保存的输入重复前向。

三者功能结果相同，包装器是标准惯用法。

### 与 TP / PP / FP8 的交互（Interaction with TP / PP / FP8）

- **张量并行（Tensor Parallelism，TP）：** 重算时检查点输入必须收集或重新分散，需要处理通信成本。
- **流水线并行（Pipeline Parallelism，PP）：** 通常对各流水线阶段的前向设置检查点，让逆序微批次复用激活内存。
- **FP8 重计算（FP8 Recompute）：** 重算期间更新的 amax 历史必须与原始前向一致，否则 FP8 缩放漂移。多数框架会保存缩放快照。

```figure
activation-recompute
```

## 动手实现（Build It）

### 步骤 1：分段玩具模型（Step 1: A Toy Model With Segments）

```python
import numpy as np


def linear_forward(x, w, b):
    return x @ w + b


def relu(x):
    return np.maximum(x, 0)


def layer_forward(x, w1, b1, w2, b2):
    h = relu(linear_forward(x, w1, b1))
    return linear_forward(h, w2, b2)


def model_forward(x, params):
    activations = [x]
    h = x
    for w1, b1, w2, b2 in params:
        h = layer_forward(h, w1, b1, w2, b2)
        activations.append(h)
    return h, activations
```

### 步骤 2：需要全部激活的朴素反向（Step 2: Naive Backward Needing All Activations）

```python
def model_backward(grad_output, activations, params):
    grads = [None] * len(params)
    g = grad_output
    for i in range(len(params) - 1, -1, -1):
        w1, b1, w2, b2 = params[i]
        x_in = activations[i]
        h_pre = linear_forward(x_in, w1, b1)
        h = relu(h_pre)
        gh = g @ w2.T
        gw2 = h.T @ g
        gb2 = g.sum(axis=0)
        g_pre = gh * (h_pre > 0)
        gx = g_pre @ w1.T
        gw1 = x_in.T @ g_pre
        gb1 = g_pre.sum(axis=0)
        grads[i] = (gw1, gb1, gw2, gb2)
        g = gx
    return g, grads
```

### 步骤 3：每 k 层检查点的内存（Step 3: Checkpoint-Every-k Memory）

```python
def model_forward_checkpointed(x, params, k=4):
    saved_inputs = [x]
    h = x
    for i, (w1, b1, w2, b2) in enumerate(params):
        h = layer_forward(h, w1, b1, w2, b2)
        if (i + 1) % k == 0:
            saved_inputs.append(h)
    return h, saved_inputs


def model_backward_checkpointed(grad_output, saved_inputs, params, k=4):
    grads = [None] * len(params)
    g = grad_output
    segments = [(j * k, min((j + 1) * k, len(params))) for j in range(len(saved_inputs))]
    for seg_idx in range(len(saved_inputs) - 1, -1, -1):
        start, end = segments[seg_idx]
        if start >= end:
            continue
        x_in = saved_inputs[seg_idx]
        _, seg_acts = model_forward(x_in, params[start:end])
        g, seg_grads = model_backward(g, seg_acts, params[start:end])
        for j, gr in enumerate(seg_grads):
            grads[start + j] = gr
    return g, grads
```

### 步骤 4：成本模型（Step 4: Cost Model）

```python
def checkpoint_cost(n_layers, segment_size, flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }


def selective_checkpoint_cost(n_layers, attention_fraction=0.15,
                              flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * attention_fraction * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }
```

### 步骤 5：内存估算器（Step 5: Memory Estimator）

```python
def activation_memory_mb(n_layers, hidden=8192, seq=8192,
                        batch=1, bytes_per_value=2):
    per_layer = 12 * batch * seq * hidden * bytes_per_value
    return n_layers * per_layer / 1e6


def memory_after_checkpoint(n_layers, segment_size, hidden=8192,
                           seq=8192, batch=1, bytes_per_value=2):
    n_seg = max(1, n_layers // segment_size)
    saved = (n_seg + segment_size) * 1 * batch * seq * hidden * bytes_per_value
    return saved / 1e6
```

### 步骤 6：最佳分段大小（Step 6: Optimal Segment Size）

```python
def optimal_segment(n_layers):
    return int(round(np.sqrt(n_layers)))
```

### 步骤 7：选择性检查点决策（Step 7: Selective Checkpoint Decision）

```python
def should_recompute(layer_type, activation_bytes, recompute_flops_ratio):
    if layer_type == "attention" and activation_bytes > 100 * 1e6:
        return True
    if layer_type == "ffn" and activation_bytes > 500 * 1e6:
        return recompute_flops_ratio < 0.1
    return False
```

## 使用方法（Use It）

- **torch.utils.checkpoint**：`from torch.utils.checkpoint import checkpoint`，PyTorch 的标准包装器。包装函数，只保存输入，反向时重算。
- **Megatron-Core 激活重计算（Activation Recomputation）**：支持 `selective`、`full`、`block` 模式，是 2024 年起前沿训练的标准选项。
- **FSDP2 卸载（Offload）**：`module.to_empty(device="cpu")` 配合 FSDP2 的 `offload_policy`，将激活分片到 CPU，而非重算。
- **DeepSpeed ZeRO-Offload**：将优化器状态和激活卸载到 CPU，补充检查点策略。

## 交付成果（Ship It）

本课产出 `outputs/prompt-activation-recompute-policy.md`，提示词接收模型配置（层数、隐藏维度、序列长度、批量）和可用 GPU 内存，输出逐层重计算策略（none / selective / full / offload）。

## 练习（Exercises）

1. 验证正确性。比较 `model_forward` + `model_backward`（完整激活）与 `model_forward_checkpointed` + `model_backward_checkpointed`（分段）。参数梯度必须在机器精度范围内相同。

2. 将分段大小 `k` 从 1 扫描到 `L`，绘制 FLOP 开销和内存曲线，找出拐点。

3. 实现选择性检查点：保存注意力模块输入，但不保存中间量。对 seq=8192 的 32 层模型，测量相对于整层检查点的 FLOP 开销。

4. 增加卸载。将分段输入保存到模拟的“CPU 缓冲区”（独立列表）。按字节/时间测量“PCIe 带宽”，找到卸载与重算的盈亏平衡点。

5. 对真实 PyTorch Transformer 开启和关闭 `torch.utils.checkpoint` 做基准测试。通过 `torch.cuda.max_memory_allocated` 测内存，同时测每步时间。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 梯度检查点（Gradient Checkpointing） | “重做前向以省内存” | 只保存分段输入，反向重算中间量，得到梯度所需张量 |
| 激活重计算（Activation Recomputation） | “就是检查点” | 同一技术在高性能计算（High-Performance Computing，HPC）中的称呼 |
| 分段大小 k（Segment Size） | “每检查点多少层” | 一同丢弃并重新物化中间量的层数 |
| 选择性检查点（Selective Checkpointing） | “Korthikanti 的技巧” | 只重算存储昂贵的激活，如注意力 softmax，保留便宜的 |
| 全量检查点（Full Checkpointing） | “朴素版本” | 重算每段每层的中间量 |
| 块检查点（Block Checkpointing） | “粗粒度” | 对整个 Transformer 块设置检查点，粒度最大 |
| FLOP 开销（FLOP Overhead） | “计算税” | 每步额外 FLOPs = (recompute FLOPs) / (fwd + bwd FLOPs)；朴素为 33%，选择性为 5% |
| 激活卸载（Activation Offload） | “送到 CPU” | 前向到反向期间将激活转移到 CPU 内存，替代重计算 |
| sqrt-L 规则（sqrt-L Rule） | “经典最优值” | 各层成本相同时，最佳检查点间隔为 sqrt(L) 层 |
| 注意力 softmax 体积（Attention-Softmax Volume） | “O(L^2) 问题” | L^2 * heads * batch 个浮点数，长上下文下主导激活内存 |

## 延伸阅读（Further Reading）

- [Chen 等人，2016：以次线性内存成本训练深度网络](https://arxiv.org/abs/1604.06174)：正式提出梯度检查点的原始论文。
- [Korthikanti 等人，2022：减少大型 Transformer 模型的激活重计算](https://arxiv.org/abs/2205.05198)：选择性重计算及形式化成本分析。
- [Pudipeddi 等人，2020：使用新执行算法以恒定内存训练大型神经网络](https://arxiv.org/abs/2002.05645)：通过反向模式重新物化实现恒定内存的替代方案。
- [Ren 等人，2021：ZeRO-Offload，让十亿级模型训练普及](https://arxiv.org/abs/2101.06840)：大规模激活卸载。
- [PyTorch torch.utils.checkpoint 文档](https://pytorch.org/docs/stable/checkpoint.html)：标准应用程序接口（Application Programming Interface，API）。
- [Megatron Bridge 激活重计算文档](https://docs.nvidia.com/nemo/megatron-bridge/latest/training/activation-recomputation.html) -- 选择性、全量和分块模式。
