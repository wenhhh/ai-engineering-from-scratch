# Jamba：SSM 与 Transformer 混合架构（Hybrid SSM-Transformer）

> 状态空间模型（State Space Model，SSM）与 Transformer 追求的侧重点不同。Transformer 以二次复杂度的注意力换取质量；SSM 通过递推（Recurrence）实现线性时间推理和恒定内存，但质量落后。AI21 的 Jamba（2024 年 3 月）及 Jamba 1.5（2024 年 8 月）将两者放入同一模型：每 7 层 Mamba 配 1 层 Transformer，隔块应用混合专家（Mixture of Experts，MoE），256k 上下文窗口可装入单块 80GB GPU。Mamba-3（ICLR 2026）通过复数状态空间和多输入多输出（Multi-Input Multi-Output，MIMO）投影增强 SSM。本课完整阅读这两类架构，解释为何混合方案经历三年扩展仍延续，而纯 SSM 和纯 Transformer 的长上下文尝试未能如此。

**Type:** Learn
**Languages:** Python (stdlib, layer-mix calculator)
**Prerequisites:** 阶段 10 · 14（开放模型架构）、阶段 10 · 17（原生稀疏注意力）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 解释 Jamba 块的三种基本组件：Transformer 层、Mamba 层和 MoE，以及 1:7、隔层使用 MoE 的交错方案。
- 从高层说明 SSM 递推形式，以及为何能实现恒定内存推理。
- 计算 Jamba 在 256k 上下文下的键值缓存（Key-Value Cache，KV Cache）占用，与纯 Transformer 比较。
- 说出 Mamba-3 的三项创新：指数梯形离散化（Exponential-Trapezoidal Discretization）、复数状态更新（Complex-Valued State Update）、MIMO，以及各自解决的问题。

## 问题（The Problem）

注意力的复杂度随序列长度二次增长，状态空间模型则为线性。这一差异会累积放大：256k 词元时，Transformer 每个头的注意力矩阵有 65B 个元素；SSM 的递推状态大小固定，与序列长度无关。

纯 SSM 模型（Mamba、Mamba-2）在小规模下的困惑度（Perplexity）与 Transformer 相当，但在状态跟踪（State Tracking）任务上落后，某些上下文内检索（In-Context Retrieval）类别也会失败。直观上，SSM 将历史压入固定状态，历史变长时会丢失信息；注意力精确记住所有内容，却付出二次成本。

直接的解决方案是两者兼用：精确回忆重要的位置使用 Transformer 层，其他位置使用 SSM 层，再调节比例。Jamba 首次以生产级规模发布此混合方案：总参数 52B、激活参数 12B、256k 上下文、单块 80GB GPU。Jamba 1.5 将家族扩展至总参数 398B、激活参数 94B。Mamba-3（ICLR 2026）是当前最佳纯 SSM 基线，可作为重建混合模型的基础。

本课阅读三篇论文，形成“选择正确比例”的思考框架。

## 概念（The Concept）

### 一页理解 SSM（An SSM in one page）

状态空间模型通过固定大小状态 `h` 处理序列 `x_1, ..., x_N`：

```
h_t = A h_{t-1} + B x_t
y_t = C h_t
```

每一步，状态通过线性动力学（Linear Dynamics）`A` 演化，接收输入 `B x_t`，输出 `C h_t`。`A, B, C` 可以学习。关键性质是：计算 `y_t` 只需 `h_{t-1}` 和 `x_t`，不需要更早的 `x`。内存恒定，每词元推理复杂度为 O(1)。

建模质量的关键是 `A` 的结构。S4（Gu，2021）使用高度结构化矩阵，训练时可作为长卷积（Long Convolution）高效计算。Mamba（Gu、Dao，2023）将固定 `A, B, C` 换为数据依赖参数，这就是“选择性”（Selective）的来源。Mamba-2（2024）进一步简化结构，Mamba-3（2026）又在特定位置加入复杂性。

关键性质：对于解码器大语言模型（Large Language Model，LLM），SSM 层可以直接替代注意力层，用每层固定大小状态替换不断增长的 KV 缓存。

### Jamba 块（The Jamba block）

Jamba 块根据两个数交错安排层：

- `l`：注意力与 Mamba 的比例。Jamba 使用 `l = 8`，即每 7 层 Mamba 配 1 层 Transformer，每组 7 Mamba + 1 注意力 = 8 层。
- `e`：MoE 频率。Jamba 使用 `e = 2`，即隔一层应用 MoE。

块内层序列：

```
M  M  M  M  M  M  M  A    （7 层 Mamba + 1 层注意力（Attention））
|  M  |  M  |  M  |  M    （| 表示该位置应用 MoE）
```

每个 Jamba 块包含 8 层。堆叠 4 块（共 32 层）时，得到 28 层 Mamba 和 4 层注意力，其中 16 层使用 MoE。

### 为何采用 1:7 比例（Why the 1:7 ratio）

AI21 进行了消融实验（Ablation）：什么注意力与 Mamba 比例，能在长上下文评估中同时获得最佳的单位参数困惑度和上下文内回忆能力？

- 注意力过多（1:1）：质量提高，但内存和速度变差。
- 注意力过少（1:15）：内存表现好，但上下文内检索失败。
- 最佳区间：1:7 或 1:8。

直观理解：Transformer 层负责精确回忆和状态跟踪，Mamba 层低成本完成大部分处理。

### 位置编码（Positional encoding）

Mamba 层通过递推本身感知位置。最初基于 Mamba 的混合模型，其注意力层不使用旋转位置嵌入（Rotary Position Embedding，RoPE），因为 SSM 层已提供位置信息。Jamba 1.5 根据长上下文实测评估，事后改进为在注意力层加入 RoPE，以增强更长上下文的泛化。

### 内存预算（The memory budget）

对于 Jamba-1 的形状（32 层：28 Mamba + 4 注意力，隐藏维度 4096，32 个注意力头）：

- KV 缓存（仅注意力层）：256k、BF16 下为 `2 * 4 * 32 * 128 * 256k * 2 = 8.4 GB`，只有 4 个注意力层贡献缓存。
- SSM 状态：每个词元前缀为 `28 * hidden * state_size`，但每层状态大小固定，不随序列长度增长。典型 Mamba 每特征状态为 16，隐藏维度为 4096：总计 `28 * 4096 * 16 * 2 = 3.7 MB`。

对比相同隐藏维度、32 层、32 头完整多头注意力（Multi-Head Attention，MHA）的纯 Transformer：256k、BF16 下为 `2 * 32 * 32 * 128 * 256k * 2 = 128 GB`。KV 缓存缩小 8 倍。即使对比多数 2024 年模型采用的分组查询注意力（Grouped-Query Attention，GQA）(8) 基线（`2 * 32 * 8 * 128 * 256k * 2 = 32 GB`），Jamba 的 1:7 混合模型只需 16 GB，仍缩小 2 倍。

这就是 AI21 所说的“单块 80GB GPU 支持 256k 上下文”。完整 MHA 纯 Transformer 的 KV 缓存装不下；即使 GQA 基线也没有空间留给权重和激活，而 Jamba 可以。

### Mamba-3：2026 年的纯 SSM 基线（Mamba-3: the pure-SSM baseline in 2026）

Mamba-3（ICLR 2026，arXiv:2603.15569）为纯 SSM 引入三项创新：

1. **指数梯形离散化（Exponential-Trapezoidal Discretization）。** 用表达力更强的递推替代 Mamba-2 的欧拉法离散化（Euler-Method Discretization）。类似卷积的操作应用于核心递推中的状态输入，而非对 `x_t` 做外部卷积。

2. **复数状态更新（Complex-Valued State Update）。** 先前 Mamba 系列将状态矩阵从复数（S4）简化为实对角矩阵（Mamba），再简化为缩放单位矩阵（Mamba-2）。Mamba-3 重新引入复数，等价于状态上的数据依赖旋转嵌入，恢复了先前实数简化损失的状态跟踪能力。

3. **多输入多输出投影（Multi-Input Multi-Output，MIMO）。** 用矩阵值投影替代各特征的标量投影。在不增加解码延迟的情况下，提高建模能力和推理硬件利用率。

在 1.5B 参数下，Mamba-3 的平均下游准确率比 Gated DeltaNet 高 0.6 个百分点；MIMO 变体再提高 1.2 个点，总计提高 1.8 个点。在相同状态大小比较中，Mamba-3 用一半状态即可匹配 Mamba-2。

Mamba-3 尚未用于大规模生产混合模型，但显然是下一代 Jamba 类模型中 SSM 部分的候选。

### 何时选择混合模型（When to reach for a hybrid）

混合模型在以下情况占优：

- 上下文足够长（64k 以上），使纯 Transformer 的 KV 缓存成为负担。
- 任务同时涉及短程结构（适合 SSM）和长程回忆（需要 Transformer）。
- 希望在单 GPU 内存预算下部署，而纯 Transformer 的 KV 缓存本身就装不下。

混合模型在以下情况不占优：

- 上下文短（小于 16k），SSM 开销没有价值，纯 Transformer 即可。
- 任务需要所有位置之间的注意力，例如深度推理和跨文档交叉引用，混合模型中注意力层稀少会产生负面影响。
- 扩展至万亿参数前沿模型。目前纯 Transformer + MLA + MoE（DeepSeek-V3 式）在能力竞争中领先。

### 竞争格局（The competitive landscape）

| 模型 | 家族 | 规模 | 独特主张 |
|-------|--------|------|-------------|
| Mamba-2 | 纯 SSM | 3B | 线性时间、恒定内存 |
| Jamba | 混合 | 52B/12B | 80GB 上支持 256k |
| Jamba 1.5 Large | 混合 | 398B/94B | 企业级长上下文 |
| Mamba-3 | 纯 SSM | 1.5B（论文） | 恢复状态跟踪 |
| DeepSeek-V3 | 纯 Transformer + MoE | 671B/37B | 前沿能力 |

2026 年格局：纯 Transformer MoE 主导前沿能力，混合模型则占据 256k 以上上下文的细分领域。Mamba-3 的状态跟踪进步可能让下一代混合比例进一步降低，即更多 SSM、更少注意力。

```figure
swiglu-ffn
```

## 使用方法（Use It）

`code/main.py` 是混合架构内存计算器。给定 SSM 与 Transformer 比例，以及隐藏维度、层数配置，它计算：

- 目标上下文的 KV 缓存。
- SSM 状态内存。
- 多种模型形状在上下文 N 下的总内存。

计算器支持：

- 纯 Transformer 基线，KV 缓存随 N 增长。
- Jamba 式 1:7 混合。
- 纯 SSM，完全没有 KV 缓存。

已发布形状的数值直接来自 Jamba-1 和 Jamba-1.5 论文，假想变体则通过外推得到。

真实部署的集成注意事项：

- 多数生产推理服务（vLLM、SGLang）支持 Jamba 和 Mamba，但需检查具体版本。
- 256k 上下文下，Jamba 的内存优势体现为并发请求吞吐量。同样显存（Video RAM，VRAM）能容纳更多 Jamba 序列。
- Mamba-3 独立模型尚未用于生产，目前是 1.5B 规模的研究预览。

## 交付成果（Ship It）

本课产出 `outputs/skill-hybrid-picker.md`。给定工作负载规格（上下文长度分布、任务组合、内存预算），它在纯 Transformer、Jamba 式混合模型和纯 SSM 之间做推荐，明确论证内存与质量的权衡。

## 练习（Exercises）

1. 运行 `code/main.py`，计算 32 层纯 Transformer（隐藏维度 4096、32 头）及相同形状 Jamba-1 混合模型在 256k 上下文的 KV 缓存。验证 AI21 论文声称的约 8 倍内存缩减。

2. 修改计算器，模拟 1:3 混合（4 Mamba : 1 Attention）和 1:15 混合（14 Mamba : 1 Attention）。绘制 KV 缓存随比例变化的曲线。什么比例下 KV 缓存等于 SSM 状态内存？

3. 阅读 Jamba 论文（arXiv:2403.19887）第 3 节。解释为何 Mamba-2 更快，AI21 却采用 Mamba-1。提示：混合架构消融部分记录了原因。

4. 计算 Jamba 1.5 Large（总参数 398B、激活参数 94B）隔层使用 MoE 的参数开销。与 DeepSeek-V3（37B/671B）的激活比例比较，解释为何 Jamba 架构使激活比例更高。

5. 阅读 Mamba-3 论文（arXiv:2603.15569）第 3 节。用三句话解释复数状态更新为何等价于数据依赖旋转嵌入，并关联阶段 7 第 04 课的 RoPE 推导。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 状态空间模型（State Space Model，SSM） | “固定状态递推” | 使用可学习递推 `h_t = A h_{t-1} + B x_t` 的层，每词元内存恒定 |
| 选择性 SSM（Selective SSM） | “Mamba 的技巧” | 数据依赖的 A、B、C 参数，以线性时间提供类似门控的选择性 |
| 注意力与 Mamba 比例（Attention-to-Mamba Ratio） | “多少注意力层” | Jamba 中 `l = 8` 表示每 7 层 Mamba 配 1 层注意力 |
| Jamba 块（Jamba Block） | “8 层组” | 1 层注意力 + 7 层 Mamba，交替位置应用 MoE |
| SSM 状态（SSM State） | “隐藏缓冲区” | 每层固定大小状态，在 Mamba 层替代 KV 缓存 |
| 256k 上下文（256k Context） | “Jamba 的代表性数字” | Jamba-1 可在单块 80GB GPU 容纳的序列长度，纯 Transformer 在此规模做不到 |
| Mamba-3 | “2026 年纯 SSM” | 当前最佳纯 SSM 架构，采用复数状态与 MIMO，可作为重建混合模型的基线 |
| 多输入多输出（Multi-Input Multi-Output，MIMO） | “多输入多输出” | Mamba-3 用矩阵值投影替代逐特征标量投影的创新 |
| 指数梯形离散化（Exponential-Trapezoidal Discretization） | “Mamba-3 递推” | 更有表达力的递推，涵盖 Mamba-2 欧拉法离散化 |
| 混合架构（Hybrid Architecture） | “混合注意力与 SSM” | 交错排列 Transformer 和 SSM 层的模型，Jamba 是生产范例 |

## 延伸阅读（Further Reading）

- [Lieber 等人：Jamba，一种混合 Transformer-Mamba 语言模型（arXiv:2403.19887）](https://arxiv.org/abs/2403.19887)：原始 Jamba 论文、比例消融、256k 上下文主张。
- [AI21：Jamba 1.5，大规模混合 Transformer-Mamba（arXiv:2408.12570）](https://arxiv.org/abs/2408.12570)：扩展后的家族，公开 398B/94B 和 12B/52B 版本。
- [Gu、Dao：Mamba，以选择性状态空间实现线性时间序列建模（arXiv:2312.00752）](https://arxiv.org/abs/2312.00752)：Jamba 所基于的选择性 SSM 论文。
- [Dao、Gu：Mamba-2（arXiv:2405.21060）](https://arxiv.org/abs/2405.21060)：简化结构化状态空间的后继。
- [Lahoti 等人：Mamba-3（arXiv:2603.15569，ICLR 2026）](https://arxiv.org/abs/2603.15569)：复数状态、MIMO 和 2026 年纯 SSM 前沿。
- [Gu 等人：用结构化状态空间高效建模长序列（arXiv:2111.00396）](https://arxiv.org/abs/2111.00396)：S4 论文，LLM 中 SSM 谱系的起点。
