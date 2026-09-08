# Flamingo 与用于少样本 VLM 的门控交叉注意力（Flamingo and Gated Cross-Attention for Few-Shot VLMs）

> DeepMind 的 Flamingo（2022）率先做到了两件事：证明单个模型可以处理任意交错的图像、视频和文本序列；证明 VLM 能在上下文中学习，给出包含三组（图像、描述）示例的少样本提示词后，无需任何梯度步骤，就能为新图像生成描述。其机制是在冻结 LLM 的既有层之间插入门控交叉注意力（Gated cross-attention）层，使用从零开始的可学习 tanh 门，使 LLM 在初始化时保留文本能力。本课将梳理 Flamingo 的 Perceiver 重采样器（Perceiver resampler）与门控交叉注意力架构，它们是 Gemini 交错输入和 Idefics2 视觉词元的先驱。

**Type:** Learn
**Languages:** Python（标准库，门控交叉注意力 + Perceiver 重采样器演示）
**Prerequisites:** 阶段 12 · 03（BLIP-2 Q-Former）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 解释门控交叉注意力如何通过 tanh(gate) = 0，在初始化时保留冻结 LLM 的文本能力。
- 梳理 Perceiver 重采样器：通过交叉注意力将 N 个图像块转换为固定 K 个“潜在”查询。
- 描述 Flamingo 如何通过尊重图像位置的因果掩码处理交错图文序列。
- 复现少样本多模态提示词结构：3 个图像—描述示例，随后是待查询图像。

## 问题（The Problem）

BLIP-2 将 32 个视觉词元送入冻结 LLM 的输入层。这适用于每条提示词一张图像。但如果想让*多张*图像与文本交错输入，例如“这是图像 A，描述它；这是图像 B，描述它；现在是图像 C，描述它”，会怎样？LLM 的自注意力需要在单一流中处理图像词元和文本词元，哪些位置能关注哪些图像的问题会变得繁琐。

Flamingo 的答案是完全不改变 LLM 输入流。在既有 LLM 块之间插入额外交叉注意力层。文本词元仍照常经过 LLM 的因果自注意力。每隔几个 LLM 块，文本词元还会通过新的门控层对图像特征进行交叉注意力。门初始化为零，意味着第零步新层不执行任何有效操作，模型行为与预训练 LLM 完全一致。随着训练推进，门逐渐打开，视觉信息开始流入。

Flamingo 回答的第二个问题是：如何处理每条提示词中数量可变的图像（0、1 或多张）？使用 Perceiver 重采样器：一个小型交叉注意力模块，接收任意数量的图像块，并生成固定数量的视觉潜在词元。无论提示词包含多少图像，LLM 交叉注意力层看到的形状都相同。

## 概念（The Concept）

### 冻结的 LLM（The frozen LLM）

Flamingo 从冻结的 Chinchilla 70B LLM 起步。全部 70B 权重保持不动，既有文本自注意力和前馈网络（FFN）正常运行。

### Perceiver 重采样器（Perceiver resampler）

对于提示词中的每张图像，ViT 生成 N 个图像块词元。Perceiver 重采样器具有固定 K 个可学习潜在向量（Flamingo 使用 K=64）。每个重采样块包含两个子步骤：

1. 交叉注意力：K 个潜在向量关注 N 个图像块词元（Q 来自潜在向量，K/V 来自图像块）。
2. 潜在向量内部的自注意力 + FFN。

经过 6 个重采样块后，无论 ViT 生成多少图像块，输出都是 K=64 个 1024 维视觉词元。224x224 图像（196 个图像块）和 480x480 图像（900 个图像块）均输出 64 个重采样词元。

对于视频，重采样器沿时间应用：每帧的图像块生成 64 个潜在向量，时间位置编码让模型区分 t=0 与 t=N。完整视频变成 T * 64 个视觉词元。

### 门控交叉注意力（Gated cross-attention）

在冻结 LLM 中，每隔 M 层（Flamingo 使用 M=4）插入一个新的门控交叉注意力块：

```
x_after_llm_block = llm_block(x_before)
cross = cross_attn(x_after, resampler_output)
gated = tanh(alpha) * cross + x_after
x_before_next_block = gated
```

- `alpha` 是初始化为零的可学习标量。
- `tanh(0) = 0`，因此初始化时门控分支贡献为零。
- 随着 `alpha` 偏离零，交叉注意力贡献平滑增大。
- 残差连接（Residual connection）意味着即使门完全打开，也不会覆盖 LLM 的文本表示，只会在其上添加视觉信息。

这是 Flamingo 最重要的一项设计选择：视觉条件信息以加法加入、受门控控制，并在初始化时为零。第 0 步的 Flamingo 对纯文本输入而言就是完整的 Chinchilla 70B。

### 用于交错输入的掩码交叉注意力（Masked cross-attention for interleaved inputs）

在“<图像 A> 描述 A <图像 B> 描述 B <图像 C> ?”这样的提示词中，每个文本词元只能看到序列中位于它之前的图像。交叉注意力掩码强制规定：位置 `t` 的文本词元，只关注图像索引满足 `i < i_t` 的图像重采样词元，其中 `i_t` 是位置 `t` 之前最近的图像。“只看最近的前置图像”和“看所有前置图像”都是有效选择；Flamingo 选择前者。

### 上下文内少样本学习（In-context few-shot learning）

Flamingo 提示词如下：

```
<image1> 一张猫的照片。 <image2> 一张狗的照片。 <image3> 一张
```

模型看到补全模式后，输出“鸟”（或图像 3 中实际展示的对象）。无需梯度步骤。冻结 LLM 的上下文学习能力通过门控交叉注意力得以延续，这正是论文的核心结论及其重要性所在。

### 训练数据（Training data）

Flamingo 使用三个数据集训练：

1. MultiModal MassiveWeb（M3W）：43M 个包含交错图文的网页，重建阅读顺序。
2. Image-Text Pairs（ALIGN + LTIP）：4.4B 对图文。
3. Video-Text Pairs（VTP）：27M 个短视频片段。

OBELICS（2023）是交错网页语料的开放复现，Idefics、Idefics2 以及多数开放“类 Flamingo”模型使用它训练。

### OpenFlamingo 与 Otter（OpenFlamingo and Otter）

OpenFlamingo（2023）是开放复现。架构相同：冻结 LLaMA 或 MPT 上的 Perceiver 重采样器 + 门控交叉注意力。提供 3B、4B、9B 检查点。由于基础 LLM 更小、数据更少，质量落后于 Flamingo。

Otter（2023）基于 OpenFlamingo，在多模态指令数据集 MIMIC-IT 上进行指令微调（Instruction tuning），表明门控交叉注意力也适用于指令遵循。

### 后继者（The descendants）

- Idefics / Idefics2 / Idefics3：Hugging Face 的门控交叉注意力谱系，逐步简化（Idefics2 去掉重采样器，改用带自适应池化的直接图像块词元）。
- 从 Flamingo 到 Chameleon 的转变：到 2024 年，许多团队转向早期融合（Early fusion，第 12.11 课）；在要求冻结骨干网络的生产环境中，Flamingo 式门控交叉注意力仍在使用。
- Gemini 的交错输入：概念上继承了 Flamingo 交错格式的灵活性，但具体机制属于专有信息。

### 与 BLIP-2 比较（Comparison to BLIP-2）

| | BLIP-2 | Flamingo |
|---|---|---|
| 视觉桥接器 | 输入处使用一次 Q-Former | 每隔 M 层使用门控交叉注意力 |
| 视觉词元 | 每图 32 个 | 每图、每个交叉注意力层 64 个 |
| 冻结 LLM | 是 | 是 |
| 上下文内少样本能力 | 弱 | 强，是论文核心 |
| 交错输入 | 无原生支持 | 支持，是设计目标 |
| 训练数据 | 130M 对 | 1.3B 对 + 43M 交错网页 |
| 参数量 | 训练 188M | 训练约 10B（交叉注意力层） |
| 计算量 | 8 个 A100 上数天 | 数千 TPUv4 上数周 |

预算有限的单图 VQA 选择 BLIP-2。交错输入、少样本或多图像推理选择 Flamingo/Idefics2。

```figure
cross-attention-fusion
```

## 实际应用（Use It）

`code/main.py` 演示：

1. 用 8 个可学习潜在向量处理 36 个模拟图像块词元的 Perceiver 重采样器（纯 Python 交叉注意力）。
2. 门控交叉注意力步骤：`alpha = 0` → 输出等于输入（LLM 不变）；随后 `alpha = 2.0` → 混入视觉贡献。
3. 交错掩码构建器，为“（图像 1）（文本 1）（图像 2）（文本 2）”序列生成二维注意力掩码。

## 交付成果（Ship It）

本课交付 `outputs/skill-gated-bridge-diagnostic.md`。给定开放 VLM 的配置（是否使用重采样器、交叉注意力频率、门控方案），它识别 Flamingo 谱系元素并解释冻结策略。可用于诊断微调为何降低文本性能，答案可能是门开得太大、太快。

## 练习（Exercises）

1. 计算 Flamingo-9B 的视觉参数量：9B LLM + 1.4B 门控交叉注意力层 + 64M 重采样器。训练参数占总参数的比例是多少？

2. 用 PyTorch 实现门控残差 `y = tanh(alpha) * cross + x`。通过实验展示 `alpha=0` 时，初始化阶段严格满足 `y==x`。

3. 阅读 OpenFlamingo 第 3.2 节（arXiv:2308.01390），了解每条提示词图像数量不同时，如何处理一个批次中的多张图像。描述其填充策略。

4. 为什么 Flamingo 的交叉注意力掩码让文本词元*只关注最近的*前置图像，而不是所有前置图像？阅读 Flamingo 论文第 2.4 节，解释其中的权衡。

5. 上下文内少样本：为一个新 Flamingo 变体构造提示词，包含 4 个“图像 → 主要对象颜色”的示例。描述当示例数量从 0 变为 8 时预期的准确率变化模式。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|----------------|------------------------|
| Perceiver 重采样器（Perceiver resampler） | “固定潜在向量交叉注意力” | 从可变数量输入图像块生成固定 K 个词元的模块 |
| 门控交叉注意力（Gated cross-attention） | “Tanh 门控桥接器” | 残差层 `y = tanh(alpha)*cross + x`，alpha 可学习，初始化为 0 |
| 交错输入（Interleaved input） | “混合序列” | 图像和文本按阅读顺序自由混合的提示词格式 |
| 冻结 LLM（Frozen LLM） | “没有 LLM 梯度” | 文本 LLM 的权重不更新，只训练重采样器 + 交叉注意力层 |
| 少样本（Few-shot） | “上下文内示例” | 在提示词中给出少量（图像、答案）对，模型无需微调就能泛化 |
| OBELICS | “交错网页语料” | 包含 141M 个网页的开放数据集，图像和文本按阅读顺序排列 |
| Chinchilla | “70B 冻结基座” | Flamingo 冻结的文本 LLM，来自 DeepMind 的 Chinchilla 论文 |
| 门控调度（Gate schedule） | “alpha 如何变化” | 训练过程中交叉注意力门打开的速率 |
| 交叉注意力频率（Cross-attn frequency） | “每隔 M 层” | 门控交叉注意力块的插入频率，Flamingo 使用 M=4 |
| OpenFlamingo | “开放复现” | MosaicML/LAION 的 3-9B 开放检查点，与 Flamingo 架构相同 |

## 延伸阅读（Further Reading）

- [Alayrac 等人：Flamingo（arXiv:2204.14198）](https://arxiv.org/abs/2204.14198)：原始论文。
- [Awadalla 等人：OpenFlamingo（arXiv:2308.01390）](https://arxiv.org/abs/2308.01390)：开放复现。
- [Laurençon 等人：OBELICS（arXiv:2306.16527）](https://arxiv.org/abs/2306.16527)：交错网页语料。
- [Jaegle 等人：Perceiver IO（arXiv:2107.14795）](https://arxiv.org/abs/2107.14795)：通用 Perceiver 架构。
- [Li 等人：Otter（arXiv:2305.03726）](https://arxiv.org/abs/2305.03726)：经过指令微调的 Flamingo 后继者。
- [Laurençon 等人：Idefics2（arXiv:2405.02246）](https://arxiv.org/abs/2405.02246)：Flamingo 方法的现代简化。
