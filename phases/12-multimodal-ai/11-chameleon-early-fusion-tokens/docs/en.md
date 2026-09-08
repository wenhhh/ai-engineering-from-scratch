# Chameleon 与早期融合的纯词元多模态模型（Chameleon and Early-Fusion Token-Only Multimodal Models）

> 到目前为止，每个 VLM 都把图像与文本分开。视觉词元来自视觉编码器，经过投影器，再在 LLM 内与文本相遇。视觉与文本词表从不重叠。Chameleon（Meta，2024 年 5 月）提出：如果让它们共享词表呢？训练一个 VQ-VAE，将图像转换为共享词表中的离散词元序列。每篇多模态文档现在都是一个序列，文本词元与图像词元交错，共用单一自回归损失。附带效果是模型能生成混合模态输出，在一次推理调用中交替输出文本和图像词元。本课阅读早期融合（Early fusion）的主张，并端到端构建玩具版本。

**Type:** Build
**Languages:** Python（标准库，VQ-VAE 分词器 + 交错解码器）
**Prerequisites:** 阶段 12 · 05、阶段 8（生成式 AI，Generative AI）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 解释为何共享词表 + 单一损失会改变模型的能力。
- 描述 VQ-VAE 如何将图像分词为兼容变换器下一词元目标的离散序列。
- 说出 Chameleon 的训练稳定技巧：QK-Norm、随机失活（Dropout）位置、LayerNorm 顺序。
- 比较 Chameleon 与 BLIP-2 的 Q-Former 方法，描述各自适用情况。

## 问题（The Problem）

基于适配器的 VLM（LLaVA、BLIP-2、Qwen-VL）将文本和图像视为不同事物。文本词元经过 `embed(text_token)`，图像经过 `visual_encoder(image) → projector → ... pseudo_tokens`。模型有两条输入路径，中途合并。

这带来三个结果：

1. LLM 只能接收图像，不能输出图像。输出仅为文本。
2. 混合模态文档（例如文章中交替出现的段落和图像）处理起来不便，必须在模型外解析多模态输入，或串联多次生成。
3. 分布不匹配。视觉词元和文本词元位于隐藏空间的不同区域，产生细微对齐问题。

Chameleon 拒绝这一前提：图像就是共享词表中的离散词元序列。用交错文档、单一损失和单一自回归解码器训练模型，就能自然获得混合模态生成能力。

## 概念（The Concept）

### 作为图像分词器的 VQ-VAE（VQ-VAE as image tokenizer）

分词器是向量量化变分自编码器（Vector-quantized variational autoencoder）。架构为：

- 编码器：CNN + ViT，将图像映射为空间特征图，例如 32x32 个 256 维特征。
- 码本（Codebook）：包含 K 个向量的可学习词表（Chameleon 使用 8192），同样为 256 维。
- 量化（Quantization）：对每个空间特征，按 L2 距离查找最近码本条目，用整数索引替换连续特征。
- 解码器：将量化特征转换回像素的 CNN。

训练采用 VAE 重建损失 + 承诺损失（Commitment loss）+ 码本损失。码本索引构成图像的离散字母表。

Chameleon 中，一张图像变为 32*32 = 1024 个词元，取自大小为 8192 的词表。与文本词元拼接（来自 LLM 的 BPE 词表，例如 32000），最终词表为 40192。变换器看到一个序列，使用一种损失。

### 共享词表（The shared vocabulary）

Chameleon 词表结合文本词元、图像词元和模态分隔符。每个词元有唯一 ID。输入嵌入层将每个 ID 映射到 D 维隐藏向量；输出投影将隐藏向量映射回词表的未归一化分数（Logits）。Softmax 选择下一词元，不论模态。

分隔符很重要：`<image>` 与 `</image>` 标签包围图像词元序列。生成时，如果模型输出 `<image>`，下游软件就知道随后 1024 个词元是 VQ 索引，应送到解码器渲染像素。

### 混合模态生成（Mixed-modality generation）

推理就是共享词表中的下一词元预测。提示词示例：“画一只猫并描述它。”Chameleon 输出：

```
<image> 4821 1029 2891 ...（1024 个图像词元）</image>
猫是橘色的，坐在窗台上……
```

模型自主选择顺序：可能先图像后文本、先文本后图像，或交错输出。使用同一解码器和同一损失。

相比之下，适配器 VLM 只能生成文本。Chameleon 重新打开了模型输出模态的选择空间。

### 训练稳定性：QK-Norm、随机失活、LayerNorm 顺序（Training stability — QK-Norm, dropout, LayerNorm ordering）

大规模早期融合训练不稳定。Chameleon 论文记录了三项技巧：

- QK-Norm。在注意力内部、点积之前，对查询和键投影应用层归一化（LayerNorm）。防止深层未归一化分数幅度爆炸。2024 年之后多个大型模型使用它。
- 随机失活位置。每次残差相加后都应用随机失活，而不只是注意力和 MLP 之后。图像词元梯度可能占主导时，需要更强正则化。
- LayerNorm 顺序。残差分支采用标准的 Pre-LN，并在最后一块的跳跃连接上额外增加 LN，稳定最终层梯度流。

没有这些技巧，34B 参数 Chameleon 训练曾在多个检查点发散；加入后才收敛。训练方案与架构同样是贡献的重要部分。

### 分词器重建上限（The tokenizer's reconstruction ceiling）

VQ-VAE 是有损的。码本 8192 条目、每张 512x512 图像 1024 词元时，重建峰值信噪比（PSNR）上限约为 26-28 dB。这足以生成可识别图像，但明显差于连续空间扩散（Stable Diffusion 3 达到 32+ dB）。

分词器是瓶颈。更好的分词器（MAGVIT-v2、IBQ、SBER-MoVQGAN）提高上限。Emu3（第 12.12 课）仅通过更好的分词器，就达到 SDXL 质量的生成。

### Chameleon 与 BLIP-2 / LLaVA（Chameleon vs BLIP-2 / LLaVA）

Chameleon（早期融合，共享词表）：
- 一种损失，一个解码器。
- 生成混合模态输出。
- 分词器决定质量上限。
- 成本高：推理路径上每张生成图像都需要 VQ-VAE 解码器。

BLIP-2 / LLaVA（晚期融合，独立双塔）：
- 输入视觉，只输出文本。
- 复用预训练 LLM。
- 理解任务不受分词器瓶颈限制。
- 成本低：单次前向传播。

按任务选择。需要图像生成时，选择 Chameleon 家族；只需理解时，适配器 VLM 更简单，也复用更多预训练计算。

### Fuyu 与 AnyGPT（Fuyu and AnyGPT）

Fuyu（Adept，2023）是相关方法：完全跳过独立视觉编码器，把原始图像块当作词元，通过 LLM 输入投影送入，不使用分词器。比 Chameleon 简单，但失去了共享词表的输出生成能力。

AnyGPT（Zhan 等人，2024）将 Chameleon 扩展到四种模态：文本、图像、语音、音乐。每种模态使用同样的 VQ-VAE 技巧，共享变换器，实现任意到任意生成。第 12.16 课进一步讨论。

```figure
vq-codebook
```

## 实际应用（Use It）

`code/main.py` 构建玩具端到端早期融合模型：

- 微型 VQ-VAE 式量化器，将 8x8 图像块映射为码本索引（K=16）。
- 共享词表：文本 ID 0..31 + 图像 ID 32..47 + 分隔符 48、49。
- 玩具自回归解码器（二元组表），在合成描述 + 图像词元序列上训练。
- 采样循环，根据提示词交替输出文本与图像词元。

代码有意把变换器保持得很小（使用二元组），让你可以端到端追踪信号流。

## 交付成果（Ship It）

本课交付 `outputs/skill-tokenizer-vs-adapter-picker.md`。给定产品规格（仅理解，或理解 + 生成）、所需图像质量和成本预算，它在 Chameleon 家族（早期融合）与 LLaVA 家族（晚期融合）之间选择，并用定量经验规则说明理由。

## 练习（Exercises）

1. Chameleon 使用 K=8192 个码本条目，每张 512x512 图像 1024 词元。估算相对 24 位 RGB 图像的压缩率。有损吗？损失多少？

2. 4K 图像（3840x2160）在相同 VQ-VAE 密度下生成多少图像词元？Chameleon 式模型能在一次推理调用中生成 4K 图像吗？先出问题的是上下文、分词器质量还是 KV 缓存？

3. 用纯 Python 实现 QK-Norm。给定 64 维查询和键，展示 LayerNorm 前后的点积。为什么深层幅度控制很重要？

4. 阅读 Chameleon 第 2.3 节的训练稳定性内容。描述论文在 34B、没有 QK-Norm 时观察到的具体失败模式。“范数爆炸”的特征是什么？

5. 扩展玩具解码器，根据纯文本提示词生成混合模态回答。在训练数据 60% 先文本、40% 先图像的分布下，测量模型选择先图像与先文本的频率。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 早期融合（Early fusion） | “统一词元” | 从第一步起，图像转换为与变换器共享词表的离散词元 |
| VQ-VAE | “图像分词器” | CNN + ViT + 码本，将图像映射为变换器可以预测的整数索引 |
| 共享词表（Shared vocabulary） | “一本词典” | 覆盖文本 + 图像 + 模态分隔符的统一词元 ID 空间 |
| QK-Norm | “注意力稳定器” | 在查询和键点积前应用 LayerNorm，防止范数爆炸 |
| 混合模态生成（Mixed-modality generation） | “文本 + 图像输出” | 在一次过程中自主生成交错文本和图像词元的推理 |
| 码本大小（Codebook size） | “K 个条目” | VQ-VAE 可量化到的离散向量数量，权衡压缩与保真度 |
| 分词器上限（Tokenizer ceiling） | “重建极限” | 解码 VQ 词元能达到的最佳 PSNR，限制模型图像质量 |

## 延伸阅读（Further Reading）

- [Chameleon 团队：《Chameleon：混合模态早期融合基础模型（Mixed-Modal Early-Fusion Foundation Models）》（arXiv:2405.09818）](https://arxiv.org/abs/2405.09818)
- [Aghajanyan 等人：CM3（arXiv:2201.07520）](https://arxiv.org/abs/2201.07520)
- [Yu 等人：CM3Leon（arXiv:2309.02591）](https://arxiv.org/abs/2309.02591)
- [Zhan 等人：AnyGPT（arXiv:2402.12226）](https://arxiv.org/abs/2402.12226)
- [Adept：Fuyu-8B 博客（adept.ai）](https://www.adept.ai/blog/fuyu-8b)
