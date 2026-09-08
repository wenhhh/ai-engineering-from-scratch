# DualPipe 并行（DualPipe Parallelism）

> DeepSeek-V3 在 2,048 块 H800 图形处理器（Graphics Processing Unit，GPU）上训练，混合专家（Mixture of Experts，MoE）分布在不同节点。跨节点专家全互连通信（All-to-All Communication）每执行 1 GPU 小时计算，就消耗 1 GPU 小时通信，GPU 有一半时间空闲。DualPipe（DeepSeek，2024 年 12 月）是双向流水线，将前向、反向计算与其触发的全互连通信重叠。气泡（Bubble）减少，吞吐量上升；专家并行（Expert Parallelism，EP）已将专家分散到各进程时，保存两份模型参数副本的成本并不高，这正是名称中“Dual”的来源。本课为 Learn 类型，讲解 DualPipe 的实际工作方式，以及 Sea AI Lab 的 DualPipeV 改进如何去掉两倍参数成本，并付出略微收紧气泡空间的代价。

**Type:** Learn
**Languages:** Python (stdlib, schedule simulator)
**Prerequisites:** 阶段 10 · 05（分布式训练、FSDP、DeepSpeed）、阶段 10 · 14（开放模型架构与 MoE）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 说出 DualPipe 前向/反向工作块（Chunk）的四个组成部分，以及为何分别安排重叠窗口。
- 解释大规模流水线气泡问题，区分实际工程与宣传语中的“无气泡”。
- 手工追踪 8 个流水线并行（Pipeline Parallelism，PP）进程、16 个微批次（Micro-Batch）的 DualPipe 调度，确认正反向流填补彼此的空闲时隙。
- 陈述 DualPipeV（Sea AI Lab，2025）的权衡：去掉两倍参数复制，在未启用专家并行时以稍大的气泡为代价。

## 问题（The Problem）

在约 2k 块 H800 GPU 上训练 671B MoE 模型，会遇到三个相互叠加的瓶颈：

1. **内存压力（Memory Pressure）。** 每块 GPU 保存模型的一部分。在 8k 序列、61 层、128 个头下，激活内存（Activation Memory）十分庞大。
2. **流水线气泡（Pipeline Bubbles）。** 传统流水线并行（GPipe、1F1B）让 GPU 在等待本阶段输入或梯度时空闲。在 8 个阶段下，即使使用 1F1B 调度，也可能约有 12% 的 GPU 时间消耗在气泡上。
3. **跨节点全互连（Cross-Node All-to-All）。** 带专家并行的 MoE 将专家分散在各节点。每次前向都会触发一次全互连，将词元分发给专家，再触发一次通信来合并结果。在 2k 块 GPU 下，计算与通信之比很容易达到 1:1。

各问题都有单独方案：梯度检查点（Gradient Checkpointing）解决内存，Zero Bubble（Sea AI Lab，2023）解决流水线气泡，专家并行通信内核（Kernel）解决全互连。DualPipe 将它们协调起来：在单个前向/反向工作块内部重叠计算和通信，同时从流水线两端注入微批次，利用形成的调度把全互连隐藏在计算窗口内。

报告结果：流水线气泡几乎消除，DeepSeek-V3 的 14.8T 词元训练中 GPU 利用率超过 95%。

## 概念（The Concept）

### 流水线并行回顾（Pipeline parallelism refresher）

将 N 层模型分布到 P 个设备。设备 `i` 保存层 `i * N/P .. (i+1) * N/P - 1`。微批次从设备 0 前向流至 P-1，再从 P-1 反向流至 0。每个设备只有收到前一设备的输出后才能开始前向，只有下游设备传来上游梯度后才能开始反向。

GPipe（Huang 等人，2019）一次调度一个微批次，浪费了大部分 GPU 时间。1F1B（Narayanan 等人，2021）交错执行多个微批次的前向与反向。Zero Bubble（Qi 等人，2023）将反向分为输入梯度计算（B）和权重梯度计算（W），并调度它们填补气泡。经过 Zero Bubble，流水线已接近紧密排满。

DualPipe 更进一步，在此基础上增加两个思路：

### 思路 1：工作块分解（Idea 1: chunk decomposition）

每个前向工作块拆成四部分：

- **注意力（Attention）。** Q/K/V 投影、注意力和输出投影。
- **全互连分发（All-to-All Dispatch）。** 跨节点通信，将词元送往对应专家。
- **多层感知机（Multilayer Perceptron，MLP）。** MoE 专家计算。
- **全互连合并（All-to-All Combine）。** 跨节点通信，将专家输出送回。

反向工作块增加这些操作各自的梯度版本。DualPipe 将全互连分发与下一个工作块的注意力计算并行，将全互连合并与随后工作块的 MLP 计算并行。

### 思路 2：双向调度（Idea 2: bidirectional scheduling）

多数流水线调度从阶段 0 注入微批次，流向阶段 P-1。DualPipe 从两端同时注入。阶段 0 接收从自身出发的前向微批次，阶段 P-1 也接收从自身出发的前向微批次。两股流在中间相遇。

为此，设备 `i` 必须同时保存流水线前部的层 `i` 和后部的层 `P - 1 - i`。这就是 DualPipe 中“Dual”的含义：每个设备保留所需模型层的两份副本，每个方向一份。在 DeepSeek-V3 规模下，参数复制成本为两倍。因为专家并行已将 MoE 专家充分分散，把非专家层复制两份的额外成本相对很小，所以可以承受。

关键在于，一个方向的前向流与另一个方向的反向流，恰好在单向调度原本产生气泡的位置重叠，从而消除气泡。

### 手工追踪调度（A hand-traced schedule）

考虑 P = 4 个进程（Rank）、8 个微批次，分为 4 个正向和 4 个逆向。时间从左向右推进，各行为设备进程。

```
           时间（Time）→
进程 0:  F1 F2 F3 F4  F5R F6R F7R F8R  B1 B2 B3 B4  ...
进程 1:     F1 F2 F3  F4/F5R F6R F7R   B1 B2 ...
进程 2:        F1 F2  F3/F5R F4/F6R    B1 ...
进程 3:           F1  F2/F5R F3/F6R    ...
```

“F4/F5R”表示：进程 1 在同一时隙中，同时执行微批次 4 的前向（沿流水线从左到右）和微批次 5 的前向（从右到左）。这就是“双向”的具体操作含义。

交叉流在进程 2 较早重叠，在进程 0 和 P-1 最晚重叠。调度中间的稳定阶段，每个进程都将 X 方向的前向与 Y 方向的反向重叠。计算持续忙碌，前向所需的全互连分发隐藏在反向计算内，全互连合并隐藏在前向计算内，气泡被挤出。

### 气泡核算（Bubble accounting）

标准 1F1B 流水线气泡，即每个进程浪费的时间：

```
bubble_1F1B = (P - 1) * forward_chunk_time
```

Zero Bubble 的改进会降低气泡，但并未归零。DualPipe 在稳定阶段，当微批次数能被流水线深度的两倍整除时，气泡为零。在稳定阶段之外，即预热（Warmup）和收尾（Cooldown）阶段，仍有一些气泡，但不随微批次数增长，这是论文强调的关键性质。

宣传说法是“无气泡”；技术含义是气泡不随微批次数增长。Sea AI Lab 的后续分析（DualPipeV / Cut-in-half）指出，只有专家并行不是瓶颈时才完全无气泡；存在 EP 驱动的全互连通信时，总会有调度折中。

### DualPipeV 改进（DualPipeV — the refinement）

Sea AI Lab（2025）发现，不以重叠 EP 通信为目的时，两倍参数复制是一种浪费。DualPipeV 将双向注入折叠为“V 形”调度，只需一份参数副本。气泡比 DualPipe 稍大，但显著节省内存。DeepSeek 在开源 DualPipe 实现中采用 DualPipeV，作为关闭 EP 时的模式。

权衡如下：

| 特性 | DualPipe | DualPipeV | 1F1B | Zero Bubble |
|---------|---------|-----------|------|------------|
| 每设备参数副本数 | 2 | 1 | 1 | 1 |
| 气泡随微批次数的变化 | 恒定 | 小幅增长 | 增长 | 增长 |
| 计算与通信重叠 | 完全 | 部分 | 极少 | 部分 |
| 适用情形 | EP 密集的 MoE | 稠密模型或轻量 EP | 基线 | 任意流水线 |

### 对 14.8T 词元训练的意义（What it means for a 14.8T-token run）

DeepSeek-V3 在 2,048 块 H800 GPU 上预训练 14.8T 词元，约消耗 2.8M GPU 小时。使用朴素 1F1B 时，12–15% 会损失于流水线气泡，即 340–420K GPU 小时，足够训练一个完整 70B 模型。DualPipe 收回了其中大部分。没有内部日志很难直接量化贡献，但论文声称整个训练的平均 GPU 利用率超过 95%。

对较小规模的训练（少于 1k 块 GPU），DualPipe 过于复杂：气泡相对于总成本的比例更小，稠密模型训练也很少遇到全互连瓶颈。对于数千块 GPU 上的前沿 MoE 训练，它实际上不可或缺。

### 在技术栈中的位置（Where it sits in the stack）

- 与**完全分片数据并行（Fully Sharded Data Parallel，FSDP）**互补（阶段 10 · 05）。FSDP 将模型参数分片到各进程，DualPipe 调度跨进程计算，两者可以组合。
- 兼容 **ZeRO-3** 梯度分片。双副本复制的状态记录必须与 ZeRO 的分片梯度协同。
- 需要针对集群拓扑调优的**自定义全互连内核（Custom All-to-All Kernels）**。DeepSeek 的开源内核是参考实现。

```figure
expert-capacity
```

## 使用方法（Use It）

`code/main.py` 是流水线调度模拟器，接收 `(P, n_micro_batches, schedule)`，打印 1F1B、Zero Bubble、DualPipe 和 DualPipeV 各自的稳定阶段利用率。它是教学工具，数值对应论文中的定性结论，不代表生产环境实测加速。

模拟器的价值在于：改变 P 和微批次数，观察 1F1B 的气泡比例如何增长，而 DualPipe 不会。

真实训练的集成注意事项：

- 选择能整除微批次数的流水线并行深度。
- 确保专家并行网格（Mesh）支持双向全互连。DeepSeek 内核可作为参考。
- 首次使用预计要花一周调试调度本身，状态记录细节繁琐。
- 按进程监控 GPU 利用率，而不只看汇总。DualPipe 的收益来自减少落后进程的空闲。

## 交付成果（Ship It）

本课产出 `outputs/skill-dualpipe-planner.md`。给定训练集群规格（GPU 数量、拓扑、互连和模型形状），它会推荐流水线并行策略、调度算法及目标规模下的预期气泡比例。

## 练习（Exercises）

1. 使用 `(P=8, micro_batches=16, schedule=dualpipe)` 和 `(P=8, micro_batches=16, schedule=1f1b)` 运行 `code/main.py`。计算 GPU 利用率差异，将其表达为每训练百万词元收回的 GPU 小时数。

2. 手工绘制 `(P=4, micro_batches=8, schedule=dualpipe)` 的调度表。在每个时隙标注微批次 ID 和方向，找出首次不存在气泡的时隙。

3. 阅读 DeepSeek-V3 技术报告（arXiv:2412.19437）的图 5。找出 DualPipe 前向工作块内全互连分发的重叠窗口，解释计算调度如何隐藏它。

4. 分别计算 DualPipe 在 70B 稠密模型、P=8 流水线阶段，以及 671B MoE 模型、P=16 阶段时的两倍参数开销。说明 MoE 情况下开销比例为何更小：大部分参数属于专家，已分片到较大的 EP 组。

5. 将 DualPipe 与 Chimera（2021 年的另一种双向调度器）比较。参考论文第 3.4 节，指出 DualPipe 增加、而 Chimera 不具备的两项具体性质。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 流水线气泡（Pipeline Bubble） | “各进程空闲时间” | 流水线阶段等待输入或梯度而浪费的 GPU 周期 |
| 一前向一反向（One Forward One Backward，1F1B） | “默认流水线调度” | 交错执行一次前向和一次反向，是 DualPipe 对比的基线 |
| Zero Bubble | “Sea AI Lab 2023” | 将反向拆为 B（输入梯度）和 W（权重梯度），几乎填满流水线 |
| DualPipe | “DeepSeek-V3 调度” | 双向流水线加计算通信重叠，气泡不随微批次数增长 |
| DualPipeV | “减半” | V 形改进，去掉两倍参数复制，代价是气泡稍大 |
| 工作块（Chunk） | “流水线工作单元” | 一个微批次经过一个流水线阶段的一次前向或反向 |
| 全互连分发（All-to-All Dispatch） | “把词元送给专家” | 将词元路由到指定 MoE 专家的跨节点通信 |
| 全互连合并（All-to-All Combine） | “取回专家输出” | MLP 后收集专家输出的跨节点通信 |
| 专家并行（Expert Parallelism，EP） | “专家分布在各 GPU” | 将 MoE 专家分片到各进程，让不同 GPU 保存不同专家 |
| 流水线并行（Pipeline Parallelism，PP） | “层分布在各 GPU” | 将模型层分片到各进程，是 DualPipe 调度的维度 |
| 气泡比例（Bubble Fraction） | “浪费的 GPU 时间” | (bubble_time / total_time)，DualPipe 将其推向零 |

## 延伸阅读（Further Reading）

- [DeepSeek-AI：DeepSeek-V3 技术报告（arXiv:2412.19437），第 3.3.2 节和图 5](https://arxiv.org/abs/2412.19437)：DualPipe 的主要参考资料。
- [DeepSeek：DualPipe GitHub 仓库](https://github.com/deepseek-ai/DualPipe)：开源参考实现，包含 DualPipeV（Cut-in-half）模式。
- [Qi 等人：零气泡流水线并行（arXiv:2401.10241，Sea AI Lab 2023）](https://arxiv.org/abs/2401.10241)：前身 Zero Bubble。
- [Sea AI Lab：去掉 Dual 后，DualPipe 可以更好](https://sail.sea.com/blog/articles/63)：推动 DeepSeek 关闭 EP 模式设计的 DualPipeV 分析。
- [Narayanan 等人：PipeDream / 1F1B（arXiv:1806.03377，2018–2021）](https://arxiv.org/abs/1806.03377)：DualPipe 对比的 1F1B 调度。
- [Huang 等人：GPipe（arXiv:1811.06965，2018）](https://arxiv.org/abs/1811.06965)：最初的流水线并行论文及气泡问题。
