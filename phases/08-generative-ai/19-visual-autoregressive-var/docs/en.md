# 视觉自回归建模：下一尺度预测（Visual Autoregressive Modeling (VAR): Next-Scale Prediction）

> 扩散模型沿时间迭代采样（去噪步骤）。VAR 沿尺度迭代采样：预测 1x1 词元，再预测 2x2、4x4，直到最终分辨率，各尺度以前一尺度为条件。2024 年论文显示，VAR 在图像生成中符合 GPT 式缩放定律，并在相同计算预算下胜过 DiT。本课构建其核心机制。

**Type:** Build
**Languages:** Python (with PyTorch)
**Prerequisites:** 阶段 7 第 03 课（多头注意力），阶段 8 第 06 课（DDPM）
**Time:** ~90 分钟

## 问题（The Problem）

自回归（Autoregressive，AR）生成主导语言建模，因为其扩展可预测：更多计算、更多参数、更低困惑度、更好输出。2024 年前图像生成有两次主要 AR 尝试：PixelRNN／PixelCNN（逐像素），以及 DALL-E 1／Parti／MuseGAN（在 VQ-VAE 编码上逐词元）。

两者都受生成顺序困扰。像素和词元排列成二维网格，AR 模型却必须按一维光栅顺序访问。早期角落像素不知道图像最终会成什么样。生成质量随规模提升的表现不如文本上的 GPT，相同计算量下从未达到扩散质量。

视觉自回归（Visual Autoregressive，VAR）通过改变生成对象解决顺序问题。它不逐个空间位置预测图像词元，而以递增分辨率预测整张图像。第 1 步：预测 1x1 词元（整图“摘要”）；第 2 步：预测 2x2 词元网格（粗特征）；第 3 步：预测 4x4 网格；第 K 步：预测最终 (H/8)x(W/8) 网格。

每个尺度关注此前所有尺度（按“尺度顺序”因果），自身尺度内部并行。顺序问题消失：尺度 k 的整张图像只需一次 Transformer 前向传播。

## 概念（The Concept）

### VQ-VAE 多尺度分词器（VQ-VAE Multi-Scale Tokenizer）

VAR 需要**多尺度离散分词器（Multi-scale Discrete Tokenizer）**。对图像 x，它产生分辨率逐步提高的词元网格序列：

```text
x -> 编码器（encoder） -> 潜变量 f
f -> 在此分辨率分词： 1x1: 词元网格 z_1 形状为 (1, 1)
f -> 在此分辨率分词： 2x2: 词元网格 z_2 形状为 (2, 2)
...
f -> 在此分辨率分词： (H/p)x(W/p): 词元网格 z_K 形状为 (H/p, W/p)
```

各 z_k 使用同一码本（典型大小 4096 至 16384）。各尺度分词并不独立，训练要求各尺度残差求和可重建 f：

```text
f ≈ upsample(embed(z_1), target_size) + ... + upsample(embed(z_K), target_size)
```

这是**残差向量量化（Residual Vector Quantization，Residual VQ）**变体。尺度 k 捕获尺度 1..k-1 遗漏的内容。解码器接收所有尺度嵌入之和并产生图像。

多尺度 VQ 分词器只训练一次（类似 VQGAN），然后冻结。全部生成工作由上层自回归模型完成。

### 下一尺度预测（Next-Scale Prediction）

生成模型是 Transformer，它看到此前所有尺度的词元，预测下一尺度词元。

输入序列结构：
```text
[START, z_1 tokens, z_2 tokens, z_3 tokens, ..., z_K tokens]
```

位置嵌入同时编码尺度索引与尺度内空间位置。注意力按尺度顺序因果：尺度 k、位置 (i, j) 的词元可以关注尺度 1..k 的所有词元，以及按某种尺度内顺序排在前面的同尺度词元（VAR 使用固定位置注意力，无尺度内因果性，同尺度所有位置并行预测）。

训练损失：每个尺度 k，给定此前所有尺度词元，预测 z_k。对离散 VQ 编码使用交叉熵损失。结构与 GPT 相同，只是“序列”现在具有尺度结构。

### 生成（Generation）

推理时：
```text
生成 z_1 = 从以下分布采样： p(z_1)                    # 1 个词元
生成 z_2 = 从以下分布采样： p(z_2 | z_1)              # 并行生成 4 个词元
生成 z_3 = 从以下分布采样： p(z_3 | z_1, z_2)         # 并行生成 16 个词元
...
解码：f = 对尺度 1..K 嵌入并上采样后求和
image = VAE_decoder(f)
```

K = 10 个尺度时，生成需要 10 次 Transformer 前向传播。每次并行产生整个尺度，没有尺度内逐词元自回归。256x256 图像约需 10 次传播，而 DiT 要 28 至 50 次。

### 下一尺度为何优于下一词元（Why Next-Scale Wins Over Next-Token）

三个结构优势：
1. **由粗到细符合自然图像统计。** 人类视觉感知与图像数据集都有尺度相关规律：低频结构稳定可预测，高频细节依赖低频内容。下一尺度预测利用此规律。
2. **尺度内并行生成。** 不同于 GPT 式词元自回归，VAR 一步产生某尺度全部词元。有效生成长度按对数尺度而非线性增长。
3. **没有生成顺序偏差。** 尺度 k 词元能看到全部尺度 k-1；没有“左侧”或“上方”偏差迫使早期词元在后续上下文出现前做出决定。

### 缩放定律（Scaling Law）

Tian 等证明 VAR 在 ImageNet 上的 FID 遵循幂律缩放曲线，类似 GPT 的困惑度。参数或计算量翻倍，误差会可靠地减半。它是首个像语言模型一样清晰展现这种缩放行为的图像生成模型。因此 VAR 的规模表现可根据计算量预测，而无需逐架构经验猜测。

### 与扩散的关系（Relationship to Diffusion）

VAR 与扩散有相同的数据压缩思路：都把生成拆成更容易的子问题序列。

- 扩散：逐步加噪，学习撤销一步。
- VAR：逐步增加分辨率，学习预测下一尺度。

它们沿问题的不同轴推进，都产生可计算条件分布。实证上 VAR 推理更快（传播次数更少、尺度内全并行），在类别条件 ImageNet 上匹敌或胜过 DiT。文本条件 VAR（VARclip、HART）是活跃研究方向。

```figure
gx-var-next-scale
```

## 动手实现（Build It）

在 `code/main.py` 中你将：
1. 在合成“图像”数据（二维高斯环）上构建微型**多尺度 VQ 分词器**。
2. 训练 **VAR 式 Transformer**，执行词元的下一尺度预测。
3. 调用 Transformer 四次（四个尺度）并解码完成采样。
4. 验证尺度顺序训练使生成在尺度内部并行。

这是玩具实现。重点是看到尺度结构注意力掩码和尺度内并行生成真正工作。

## 交付成果（Ship It）

本课产生 `outputs/skill-var-tokenizer-designer.md`，用于设计多尺度分词器：尺度数、尺度比例、码本大小、残差共享、解码器架构。

## 练习（Exercises）

1. **尺度数消融（Scale Count Ablation）。** 用 4、6、8、10 个尺度训练 VAR，测量重建质量与自回归传播次数的关系。更多尺度意味着更细残差、更好质量，但传播更多。

2. **码本大小（Codebook Size）。** 训练码本大小为 512、4096、16384 的分词器。更大码本重建更好，却更难预测。找出收益转折点。

3. **尺度内并行检查（Parallel-within-scale Check）。** 对训练好的 VAR 显式测量注意力模式。尺度 k 内，模型是否关注跨尺度位置而非尺度内位置？验证掩码实现。

4. **VAR 与 DiT 缩放（VAR vs DiT Scaling）。** 在相同 ImageNet 类别条件任务上，以匹配参数预算（如 33M、130M、458M）训练 VAR 与 DiT。绘制 FID 与计算量关系。VAR 应在每种规模领先 DiT，在小规模复现论文结果。

5. **文本条件（Text Conditioning）。** 扩展 VAR，通过自适应层归一化（Adaptive Layer Normalization，adaLN）接收文本嵌入（CLIP 池化）作为额外条件。这是 HART 方案。文本对齐采样的 FID 提高多少？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| VAR | “视觉自回归” | 在 VQ 词元网格金字塔上通过下一尺度预测生成图像 |
| 下一尺度预测（Next-scale Prediction） | “先粗后细” | 模型以此前所有尺度为条件，在递增分辨率尺度上预测词元 |
| 多尺度 VQ 分词器（Multi-scale VQ Tokenizer） | “残差 VQ” | 产生 K 个递增分辨率词元网格的 VQ-VAE，解码器对所有尺度求和 |
| 尺度 k（Scale k） | “金字塔第 k 层” | K 个分辨率层之一，从 k=1 的 1x1 到 k=K 的 (H/p)x(W/p) |
| 尺度内并行（Parallel-within-scale） | “每尺度一次前向传播” | 尺度 k 全部词元在一次 Transformer 传播中预测，而非自回归 |
| 跨尺度因果（Causal-across-scales） | “尺度顺序注意力” | 尺度 k 词元可关注尺度 1..k 的全部内容，不能关注 k+1..K |
| 残差 VQ（Residual VQ） | “相加式分词” | 每尺度词元编码低尺度遗留残差，解码器对所有尺度嵌入求和 |
| VAR 缩放定律（VAR Scaling Law） | “图像 GPT 缩放” | FID 随计算量遵循可预测幂律，类似语言模型困惑度 |
| HART | “混合 VAR 与文本” | 文本条件 VAR 变体，将 MaskGIT 式迭代解码与 VAR 尺度结构结合 |
| 尺度位置嵌入（Scale Position Embedding） | “(scale, row, col) 三元组” | 位置编码同时携带尺度索引与尺度内空间坐标 |

## 延伸阅读（Further Reading）

- [Tian 等，2024：视觉自回归建模：通过下一尺度预测实现可扩展图像生成（Visual Autoregressive Modeling: Scalable Image Generation via Next-Scale Prediction）](https://arxiv.org/abs/2404.02905)：VAR 论文，权威参考
- [Peebles 与 Xie，2022：使用 Transformer 的可扩展扩散模型（Scalable Diffusion Models with Transformers）](https://arxiv.org/abs/2212.09748)：DiT，扩散对比基线
- [Esser 等，2021：驯服 Transformer 以合成高分辨率图像（Taming Transformers for High-Resolution Image Synthesis）](https://arxiv.org/abs/2012.09841)：VQGAN，VAR 多尺度分词器扩展的分词器家族
- [van den Oord 等，2017：神经离散表示学习（Neural Discrete Representation Learning）](https://arxiv.org/abs/1711.00937)：VQ-VAE，离散图像分词基础
- [Tang 等，2024：HART：使用混合自回归 Transformer 高效生成视觉内容（HART: Efficient Visual Generation with Hybrid Autoregressive Transformer）](https://arxiv.org/abs/2410.10812)：文本条件 VAR
