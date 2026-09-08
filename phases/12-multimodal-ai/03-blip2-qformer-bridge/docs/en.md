# 从 CLIP 到 BLIP-2：作为模态桥接器的 Q-Former（From CLIP to BLIP-2 — Q-Former as Modality Bridge）

> CLIP 能对齐图像与文本，却无法生成描述、回答问题或对话。BLIP-2（Salesforce，2023）用一个小型可训练桥接器解决了这个问题：32 个可学习查询向量通过交叉注意力（Cross-attention）关注冻结 ViT 的特征，再直接接入冻结 LLM 的输入流。188M 参数的桥接器将一个 11B LLM 与 ViT-g/14 相连。直到 2026 年，所有基于适配器（Adapter）的 VLM，包括 MiniGPT-4、InstructBLIP 和 LLaVA 的近亲，都是其后继者。本课将阅读 Q-Former 架构，解释两阶段训练，并构建把视觉词元送入冻结文本解码器的玩具版本。

**Type:** Build
**Languages:** Python（标准库，交叉注意力 + 可学习查询演示）
**Prerequisites:** 阶段 12 · 02（CLIP）、阶段 7（变换器，Transformers）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 解释为什么冻结视觉编码器与冻结 LLM 之间的可训练瓶颈（Trainable bottleneck），在成本和稳定性上优于端到端微调。
- 实现一个交叉注意力块，让固定数量的可学习查询关注外部图像特征。
- 梳理 BLIP-2 的两阶段预训练：先学习表示（ITC + ITM + ITG），再学习生成（冻结解码器下的 LM 损失）。
- 将 Q-Former 与 LLaVA 使用的更简单的 MLP 投影器比较，论证各自在什么情况下占优。

## 问题（The Problem）

你有一个冻结 ViT，每张图像生成 256 个 1408 维图像块词元；还有一个冻结的 7B LLM，要求 4096 维词元嵌入。直观的桥接器是从 1408 到 4096 的线性层。它有效，但将全部 256 个图像块词元送入 LLM 上下文，每张图像会额外消耗 256 个词元。一批 32 张图像中，仅视觉模态就占用 8192 个词元。

BLIP-2 的问题是：能否将 256 词元的图像表示压缩为少得多的词元（例如 32 个），同时保留足够信息，让 LLM 生成描述、回答问题并对图像进行推理？能否在不改动冻结骨干网络的情况下训练桥接器，让训练成本仅对应桥接器参数？

答案是 Q-Former。32 个可学习“查询”向量对 ViT 图像块词元进行交叉注意力，生成供 LLM 使用的 32 词元视觉摘要。总计 188M 参数，在接触 LLM 之前就用对比、匹配和生成目标训练。

## 概念（The Concept）

### 可学习查询（Learnable queries）

Q-Former 的核心技巧是：不让 LLM 的文本词元直接关注图像块，而是引入一组新的 32 个可学习查询向量 `Q`，让*它们*关注图像块。查询是模型参数，在训练中学习；每张图像都使用相同的 32 个查询。

交叉注意力之后，每个查询持有图像的压缩摘要，例如“描述主要对象”“描述背景”“统计对象数量”等。查询并不真的按语义标签分工，而是学习任何能降低下游损失的编码。

### 架构（Architecture）

Q-Former 是具有两条路径的小型变换器（12 层，约 100M 参数）：

1. 查询路径：32 个查询向量先经过彼此之间的自注意力，再对冻结 ViT 的图像块词元进行交叉注意力，最后经过前馈网络（FFN）。
2. 文本路径：类 BERT 文本编码器与查询路径共享自注意力和 FFN 权重。文本路径禁用交叉注意力。

训练时两条路径都运行。查询和文本通过共享自注意力交互，因此对于需要文本的任务（ITM、ITG），查询可以以文本为条件。推理时向 VLM 交接，只运行查询路径，生成 32 个视觉词元。

### 两阶段训练（Two-stage training）

BLIP-2 分两个阶段预训练：

阶段 1：表示学习（不使用 LLM）。三种损失：
- 图文对比（Image-text contrastive，ITC）：在池化查询词元与文本 CLS 词元之间应用 CLIP 式对比。
- 图文匹配（Image-text matching，ITM）：二分类器判断图文对是否匹配，采用难负样本挖掘。
- 基于图像的文本生成（Image-grounded text generation，ITG）：以查询为条件，在文本上使用因果语言模型输出头，迫使查询编码可用于生成文本的内容。

只训练 Q-Former。ViT 冻结，不涉及 LLM。

阶段 2：生成学习。接入冻结 LLM（OPT-2.7B 或 Flan-T5-XL 等）。通过小型线性层将 32 个查询输出投影到 LLM 的嵌入维度，放在文本提示词之前。在拼接的提示词 + 图像 + 描述序列上使用语言模型（LM）损失，只训练线性投影和 Q-Former。

阶段 2 后，Q-Former + 投影构成完整视觉适配器。推理路径为：图像 → ViT → Q-Former → 线性投影 → 前置于文本 → 冻结 LLM 输出结果。

### 参数经济性（Parameter economics）

BLIP-2 配置为 ViT-g/14（1.1B，冻结）+ OPT-6.7B（6.7B，冻结）+ Q-Former（188M，训练）= 总计 8B，仅训练 188M。Q-Former 只占完整系统参数的约 2.4%。训练成本反映了这一点：少量 A100 训练数天，而端到端训练需要数周。

质量方面，BLIP-2 在零样本视觉问答（VQA）上达到或超过 Flamingo-80B，同时小 50 倍。桥接器确实有效。

### InstructBLIP 与感知指令的 Q-Former（InstructBLIP and the instruction-aware Q-Former）

InstructBLIP（2023）为 Q-Former 增加了额外输入：指令文本本身。交叉注意力时，查询现在能访问图像块和指令。查询可以针对不同指令专门处理（“数汽车”“描述情绪”），而不是学习单一固定摘要。它在留出任务上取得了基准提升。

### MiniGPT-4 与仅训练投影器的方法（MiniGPT-4 and the projector-only approach）

MiniGPT-4 保留 Q-Former，但冻结其他所有部分，只训练输出线性投影。成本低，代价却是质量：查询来自 BLIP-2，而不是你自己的训练。它适合快速迭代，但不是最佳架构。

### 为什么 LLaVA 选择更简单的方案（Why LLaVA went simpler）

LLaVA（2023，第 12.05 课）用普通的两层多层感知机（MLP）取代 Q-Former，将每个 ViT 图像块词元投影到 LLM 空间。24x24 网格每张图像产生 576 个词元，全部送入 LLM。压缩更差，却让 LLM 能关注原始图像块。这在当时存在争议；到 2023 年末，它已占主导，因为视觉指令数据（LLaVA-Instruct-150k）证明 MLP 能被训练得保留足够信号。权衡是：LLaVA 更快填满上下文，但能自然扩展到多图像和视频。

到 2026 年，该领域分成两路：词元预算重要时（长视频、多图像）Q-Former 仍有用；以每词元原始质量为优先目标时，MLP 投影器占主导。

### 门控交叉注意力：先驱 Flamingo（Gated cross-attention: Flamingo, the ancestor）

Flamingo（第 12.04 课）早于 BLIP-2，使用了相同的交叉注意力思想，但将其应用于冻结 LLM 的每一层，而非单一桥接器。BLIP-2 表明，可以只压缩到输入层而仍然有效。Gemini 和 Idefics 将两者结合：交错输入词元，加上可选的门控交叉注意力，用于上下文内少样本学习。

### 2026 年的后继者（The 2026 descendants）

- Q-Former：BLIP-2、InstructBLIP、MiniGPT-4，以及多数出于词元预算考虑的视频语言模型。
- Perceiver 重采样器（Perceiver resampler）：Flamingo 的变体（第 12.04 课）；Idefics 家族、Eagle、OmniMAE。
- MLP 投影器（MLP projector）：LLaVA、LLaVA-NeXT、LLaVA-OneVision、Cambrian-1。
- 注意力池化（Attention pool）：VILA、PaliGemma。

四种方案都有效。决定性问题是你的约束来自词元预算，还是每词元质量。

```figure
modality-projection
```

## 实际应用（Use It）

`code/main.py` 用标准库构建 Q-Former 式交叉注意力：

1. 模拟 256 个图像块词元（128 维）。
2. 实例化 32 个可学习查询（128 维）。
3. 执行缩放点积交叉注意力（Q 来自查询，K/V 来自图像块）。
4. 通过线性层投影到 LLM 维度（512）。
5. 输出 32 个可直接交给 LLM 的视觉词元。

所有数学计算均采用纯 Python（在向量上嵌套循环）。虽然是玩具示例，但形状正确。程序会打印注意力权重矩阵，让你看到每个查询从哪些图像块提取信息。

## 交付成果（Ship It）

本课交付 `outputs/skill-modality-bridge-picker.md`。给定目标 VLM 配置（视觉编码器词元数、LLM 上下文预算、部署约束、质量目标），它会在 Q-Former、MLP 和 Perceiver 重采样器之间给出建议，附简短理由及每种桥接器的参数量估算。

## 练习（Exercises）

1. 用 PyTorch 实现交叉注意力块。验证当有 32 个查询、256 个键/值时，注意力权重矩阵为 32 x 256，且 softmax 后每行和为 1。

2. BLIP-2 阶段 1 中，Q-Former 同时运行 ITC、ITM、ITG 三种损失。用伪代码写出各自的前向函数签名。哪一种要求文本编码器路径启用？

3. 比较参数量：Q-Former（12 层，隐藏维度 768）与两层 MLP 投影器（1408 → 4096，两层）。LLM 达到什么规模时，188M Q-Former 的成本能通过训练效率收回？

4. 阅读 BLIP-2 论文（arXiv:2301.12597）第 3.2 节，了解 Q-Former 如何初始化。解释为什么从 BERT-base 初始化（而非随机初始化）能加快收敛。

5. 对一段以 1 FPS 采样为 60 帧的 10 分钟视频，计算 Q-Former（每帧 32 词元）和 MLP 投影器（每帧 576 词元）的逐帧词元开销。哪一种能放进 128k 词元的 LLM 上下文窗口？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|----------------|------------------------|
| Q-Former | “查询变换器（Querying transformer）” | 带 32 个可学习查询向量的小型变换器，通过交叉注意力关注冻结 ViT 特征 |
| 可学习查询（Learnable queries） | “视觉软提示词” | 固定的一组参数，作为交叉注意力的查询端；按模型学习，由所有输入共享 |
| 交叉注意力（Cross-attention） | “Q 来自这里，K/V 来自那里” | 查询、键和值来自不同来源的注意力；查询借此从 ViT 图像块中提取信息 |
| ITC | “图文对比（Image-text contrastive）” | 应用于 Q-Former 池化查询与文本 CLS 之间的 CLIP 式损失 |
| ITM | “图文匹配（Image-text matching）” | 对经难负样本挖掘的样本对进行二分类，迫使查询辨别细粒度不匹配 |
| ITG | “基于图像的文本生成（Image-grounded text generation）” | 以查询为条件生成文本的因果 LM 损失，迫使查询编码可解码为文本的内容 |
| 两阶段预训练（Two-stage pretraining） | “先表示，后生成” | 阶段 1 单独训练 Q-Former（ITC/ITM/ITG）；阶段 2 接入冻结 LLM，只训练投影 + Q-Former |
| 冻结骨干网络（Frozen backbone） | “不微调” | 视觉编码器和 LLM 权重固定，只训练桥接器 |
| 投影头（Projection head） | “线性映射到 LLM 维度” | 将 Q-Former 输出映射到 LLM 嵌入维度的最终线性层 |
| Perceiver 重采样器（Perceiver resampler） | “Flamingo 的版本” | 类似的可学习查询交叉注意力，Flamingo 在每一层使用，而非作为单一桥接器 |

## 延伸阅读（Further Reading）

- [Li 等人：BLIP-2（arXiv:2301.12597）](https://arxiv.org/abs/2301.12597)：核心论文。
- [Li 等人：BLIP（arXiv:2201.12086）](https://arxiv.org/abs/2201.12086)：采用 ITC/ITM/ITG 三目标的前身。
- [Li 等人：ALBEF（arXiv:2107.07651）](https://arxiv.org/abs/2107.07651)：“先对齐再融合”，阶段 1 训练的概念先驱。
- [Dai 等人：InstructBLIP（arXiv:2305.06500）](https://arxiv.org/abs/2305.06500)：感知指令的 Q-Former。
- [Zhu 等人：MiniGPT-4（arXiv:2304.10592）](https://arxiv.org/abs/2304.10592)：仅训练投影器的方法。
- [Jaegle 等人：Perceiver IO（arXiv:2107.14795）](https://arxiv.org/abs/2107.14795)：用于可学习查询交叉注意力的通用架构。
