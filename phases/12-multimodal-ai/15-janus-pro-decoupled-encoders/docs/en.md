# Janus-Pro：统一多模态模型的解耦编码器（Decoupled Encoders for Unified Multimodal Models）

> 统一多模态模型存在不可避免的矛盾。理解需要语义特征，即 SigLIP 或 DINOv2 输出的、富含概念级信息的向量。生成需要便于重建的编码，即能组合还原出清晰像素的向量量化（VQ）词元。单一编码器无法兼顾这两个目标。Janus（DeepSeek，2024 年 10 月）和 Janus-Pro（DeepSeek，2025 年 1 月）认为解决办法是停止强求：将两个编码器解耦。任务之间共享变换器（Transformer）主体，但理解走 SigLIP 路径，生成走 VQ 分词器路径。参数规模为 7B 时，Janus-Pro 在 GenEval 上超过 DALL-E 3，同时在 MMMU 上与 LLaVA 相当。本课探究为什么两个编码器能解决单个编码器解决不了的问题。

**Type:** Build
**Languages:** Python（标准库，双编码器路由 + 共享主体信号）
**Prerequisites:** 阶段 12 · 13（Transfusion），阶段 12 · 14（Show-o）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 解释为什么共享单个编码器会牺牲理解或生成质量。
- 描述 Janus-Pro 的路由：理解任务的输入使用 SigLIP 特征，生成任务的输入和输出都使用 VQ 词元。
- 追踪使 Janus-Pro 在 Janus 未能成功之处取得成功的数据混合规模扩展。
- 比较解耦架构（Janus-Pro）、耦合连续架构（Transfusion）和耦合离散架构（Show-o）。

## 问题（The Problem）

统一模型让理解与生成共享变换器主体。此前的尝试（Chameleon、Show-o、Transfusion）均在两个方向使用同一个视觉分词器。这种分词器是一种折中：

- 针对重建（生成）优化：VQ-VAE 能捕获细粒度像素细节，但产生的词元在语义上的连贯性较弱。
- 针对语义（理解）优化：SigLIP 嵌入会将“猫”的图像聚集到“猫”词元附近，却无法实现良好重建。

Show-o 和 Transfusion 为此付出了代价，其中一个方向的质量明显受损。Janus-Pro 提出：既然任务需求不同，为什么非要使用一个分词器？

## 概念（The Concept）

### 解耦视觉编码（Decoupled visual encoding）

Janus-Pro 的架构将两个编码器分开：

- 理解路径。输入图像 → SigLIP-SO400m → 2 层多层感知机（MLP）→ 变换器主体。
- 生成路径。输入图像（如果以现有图像为条件）→ VQ 分词器 → 词元 ID → 变换器主体。
- 输出生成。变换器预测的图像词元 → VQ 解码器 → 像素。

变换器主体共享。主体上游和下游的所有部分都针对各自任务。

输入通过提示词格式区分：`<understand>` 标签路由到 SigLIP；`<generate>` 路由到 VQ。也可以根据任务隐式确定路由。

### 为什么有效（Why this works）

理解损失接收 SigLIP 特征，CLIP 风格预训练已经使这些特征适合表示语义相似性。由于输入特征更适合该任务，模型的感知基准表现优于 Show-o / Transfusion。

生成损失接收 VQ 词元，分词器已将这些词元针对重建进行优化。由于 VQ 编码能够清晰地组合还原为像素，图像质量优于 Show-o。

共享变换器主体接触两种输入分布（SigLIP 和 VQ），并学习处理两者。其主张是：只要数据和参数足够多，主体就能适应这种切换。

### 数据规模扩展：Janus 与 Janus-Pro（Data scaling — Janus vs Janus-Pro）

Janus（原版，arXiv 2410.13848）引入了解耦，但规模较小（1.3B 参数，数据有限）。Janus-Pro（arXiv 2501.17811）扩大了规模：

- 参数增加至 7B（原为 1.3B）。
- 阶段 1（对齐）的图文对从 72M 增加至 90M。
- 阶段 2（统一训练）的数据从 26M 增加至 72M。
- 阶段 3 新增 200k 条图像生成指令样本。

结果是：Janus-Pro-7B 在 MMMU 上与 LLaVA 相当（60.3 对约 58），并在 GenEval 上超过 DALL-E 3（0.80 对 0.67）。一个开放模型，在统一能力的两个方向都具备竞争力。

### JanusFlow：整流流变体（JanusFlow — the rectified flow variant）

JanusFlow（arXiv 2411.07975）将 VQ 生成路径替换为整流流（Rectified flow）生成路径（连续）。这种划分变成了用于理解的 SigLIP + 用于生成的整流流。质量上限进一步提高。架构仍然是解耦编码器加共享主体。

### 共享主体的职责（The shared body's job）

变换器主体处理统一序列，但面对两种输入分布。其职责是：

- 对于理解：接收 SigLIP 特征 + 文本词元 → 自回归地输出文本。
- 对于生成：接收文本词元 +（可选的图像 VQ 词元）→ 自回归地输出图像 VQ 词元。

主体的每个块都没有模态专属权重。它就是 Qwen 或 Llama 内部常见的文本式变换器，再加上两个输入适配器。

有意思的是，这意味着 Janus-Pro 的主体可以从预训练大语言模型（LLM）初始化。Janus-Pro 确实从 DeepSeek-MoE-7B 初始化。这一选择很关键：LLM 提供了纯从头训练的统一模型难以达到的推理能力。

### 与 InternVL-U 比较（Compared to InternVL-U）

InternVL-U（第 12.10 课）是 2026 年的后续方案。它结合了：

- 原生多模态预训练（InternVL3 骨干网络）。
- 解耦编码器路由（SigLIP 输入，VQ + 扩散头输出）。
- 统一的理解 + 生成 + 编辑。

InternVL-U 将 Janus-Pro 的架构选择纳入更大的框架。解耦编码器理念如今已成为大规模统一模型的默认选择。

### 局限（Limitations）

解耦编码器增加了架构复杂性。需要训练两个分词器，维护两条输入路径，应对两组故障模式。对于不需要生成的产品，Janus-Pro 属于过度设计，应选择 LLaVA 系列理解模型。

对于不需要理解的产品，Janus-Pro 的能力超出了需求，应选择 Stable Diffusion 3 / Flux 模型。

对于两者都需要的产品，Janus-Pro 如今是参考开放架构。

```figure
l5-janus-decouple
```

## 动手使用（Use It）

`code/main.py` 模拟 Janus-Pro 路由：

- 两个模拟编码器：类 SigLIP 编码器（生成 256 维语义向量）和类 VQ 编码器（生成整数编码）。
- 一个根据任务标签选择编码器的提示词路由器。
- 一个共享主体（替身），无论词元序列来自哪个编码器，都能处理它们。
- 从阶段 1（对齐）切换到阶段 3（指令微调）的加权采样调度。

打印 3 个示例的路由路径：图像问答、文生图（T2I）、图像编辑。

## 交付成果（Ship It）

本课产出 `outputs/skill-decoupled-encoder-picker.md`。给定一个希望同时获得接近前沿质量的统一生成与理解能力的产品，它会在 Janus-Pro、JanusFlow 和 InternVL-U 之间选择，并提出具体的数据规模建议。

## 练习（Exercises）

1. Janus-Pro-7B 在 GenEval 上超过 DALL-E 3。解释为什么一个 7B 开放模型能够在生成方面匹敌前沿专有模型，却无法在理解方面做到这一点。

2. 实现路由函数：给定提示词文本，将其分类为 `understand` 或 `generate`。如何处理“先描述，再画草图”这类模糊提示词？

3. JanusFlow 将 VQ 路径替换为整流流。变换器主体现在输出什么？损失会发生什么变化？

4. 为 Janus-Pro 架构提出第四种任务，通过再增加一个解耦编码器来处理。例如：图像分割（DINO 风格）、深度（MiDaS 风格）。

5. 阅读 Janus-Pro 第 4.2 节关于数据规模扩展的内容。与 Janus 相比，哪个数据阶段对文生图质量提升贡献最大？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 解耦编码（Decoupled encoding） | “两个视觉编码器” | 每个方向使用独立的分词器或编码器：理解侧面向语义，生成侧面向重建 |
| 共享主体（Shared body） | “一个变换器” | 单个变换器处理任一编码器的输出；没有模态专属权重 |
| 用于理解的 SigLIP（SigLIP for understanding） | “语义特征” | CLIP 系列视觉塔，提供丰富的概念特征，但重建能力较弱 |
| 用于生成的 VQ（VQ for generation） | “重建编码” | 能清晰解码还原为像素的向量量化词元 |
| JanusFlow | “整流流变体” | 用连续流匹配生成头取代 VQ 的 Janus-Pro |
| 路由标签（Routing tag） | “任务标签” | 选择输入编码器的提示词标记（`<understand>` / `<generate>`） |

## 延伸阅读（Further Reading）

- [Wu 等人：Janus（arXiv:2410.13848）](https://arxiv.org/abs/2410.13848)
- [Chen 等人：Janus-Pro（arXiv:2501.17811）](https://arxiv.org/abs/2501.17811)
- [Ma 等人：JanusFlow（arXiv:2411.07975）](https://arxiv.org/abs/2411.07975)
- [InternVL-U（arXiv:2603.09877）](https://arxiv.org/abs/2603.09877)
- [Dong 等人：DreamLLM（arXiv:2309.11499）](https://arxiv.org/abs/2309.11499)
