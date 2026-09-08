# Transfusion：一个变换器中的自回归文本与扩散图像（Transfusion: Autoregressive Text + Diffusion Image in One Transformer）

> Chameleon 和 Emu3 全面押注离散词元。它们有效，但量化瓶颈可见：图像质量在低于连续空间扩散模型的水平进入平台期。Transfusion（Meta，Zhou 等人，2024 年 8 月）作出相反选择：保持图像连续，完全去掉 VQ-VAE，用两种损失训练一个变换器。文本词元采用下一词元预测，图像块采用流匹配（Flow matching）/扩散损失。两个目标优化同一套权重。Stable Diffusion 3 的底层架构 MMDiT 是其近亲。本课阅读 Transfusion 论点，构建玩具双损失训练器，并追踪让同一变换器执行两种任务的注意力掩码。

**Type:** Build
**Languages:** Python（标准库，MNIST 规模玩具问题上的双损失训练器）
**Prerequisites:** 阶段 12 · 11（Chameleon）、阶段 8（生成式 AI，Generative AI）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 接通在一个骨干网络上运行两种损失的变换器：文本词元的 NTP，以及图像块的扩散均方误差（MSE）。
- 解释为何图像块之间双向注意力、文本词元之间因果注意力，是正确的掩码选择。
- 从计算、质量、代码复杂度比较 Transfusion 式连续图像与扩散损失，以及 Chameleon 式离散图像与 NTP。
- 说出 MMDiT 的贡献：每块使用模态特定权重，在残差流中进行联合注意力。

## 问题（The Problem）

离散与连续图像词元的争论比 LLM 更早。连续表示（原始像素、VAE 潜在表示）保留细节；离散词元（VQ 索引）符合变换器原生词表，却在量化时丢失细节。

Chameleon / Emu3 选择离散：一种损失，一种架构，但图像保真度受分词器质量限制。

扩散模型选择连续：图像质量出色，但与 LLM 是独立模型，需要复杂噪声调度工程，也无法顺畅整合文本生成。

Transfusion 问：能否兼得？保持图像连续，仍只训练一个模型，将两种损失合到同一梯度步骤。

## 概念（The Concept）

### 双损失架构（The two-loss architecture）

单个仅解码器变换器处理的序列包含：

- 文本词元：离散，来自 BPE 词表。
- 图像块：连续的 16x16 像素块，通过线性嵌入投影到隐藏维度，与 ViT 编码器输入相同。
- `<image>` 和 `</image>` 标签，标记连续图像块所在位置。

前向传播执行一次，损失按词元选择两个输出头之一：

- 文本词元：在词表未归一化分数（Logits）头上计算标准交叉熵。
- 图像块：在连续图像块上计算扩散损失，预测每块被加入的噪声。

梯度流过共享变换器主体，两种损失同时改进共享权重。

### 注意力掩码：因果文本与双向图像（Attention mask: causal text + bidirectional image）

文本词元必须保持因果性，不能关注未来文本，否则教师强制（Teacher forcing）会失效。图像块则代表一个快照，应在同一图像区域内彼此双向关注。

掩码如下：

```
M[i, j] = 1 if:
  (i is text and j is text and j <= i)   # causal for text
  OR (i is image and j is image and same_image_block(i, j))   # bidirectional within image
  OR (i is text and j is image and j < i_image_end)   # text attends to previous images
  OR (i is image and j is text and j < i_image_start)   # image attends to preceding text
```

训练与推理时实现为块三角掩码（Block-triangular mask）。

### 变换器内部的扩散损失（Diffusion loss inside the transformer）

扩散损失是标准做法：给图像块加噪声，要求模型预测噪声（或等价地预测干净图像块）。Transfusion 的版本采用流匹配，预测从带噪到干净的速度场（Velocity field）。

训练时：
1. 对每个图像块 x0，随机采样时间步 t。
2. 采样噪声 ε，计算 xt = (1-t) * x0 + t * ε，即流匹配的线性插值。
3. 变换器预测 v_theta(xt, t)；loss = MSE(v_theta(xt, t), ε - x0)。
4. 与同一序列的文本 NTP 损失一起反向传播。

推理时生成方式为：
- 文本词元：标准自回归采样。
- 图像块：以前面的文本词元为条件，执行扩散采样循环，典型为 10-30 步。

### MMDiT：Stable Diffusion 3 的变体（MMDiT: Stable Diffusion 3's variant）

Stable Diffusion 3（Esser 等人，2024 年 3 月）与 Transfusion 前后相近地推出了多模态扩散变换器（Multimodal Diffusion Transformer，MMDiT）。两种架构是近亲。

MMDiT 主要区别：

- 每块的模态特定权重。每个变换器块为文本词元和图像块分别设置 Q、K、V、MLP 权重。注意力联合计算，跨越模态；其他部分均按模态区分。
- 整流流（Rectified flow）训练。一种具体流匹配变体，采样方法明确，数学比 DDPM 简单。
- 规模。MMDiT 是 SD3 的骨干网络，有 2B 和 8B 参数版本；Transfusion 论文扩展到 7B。

两者都趋向同一核心思想：一个变换器在文本上运行 NTP，在连续图像表示上运行扩散。

### 为什么优于 Chameleon 风格（Why this beats Chameleon-style）

连续扩散与离散 NTP 在图像生成上的质量差距可以测量。Transfusion 论文报告：

- 7B 参数时，FID 比同规模 Chameleon 式模型好 3-5 点。
- 无需训练分词器，图像编码器更简单：线性投影到隐藏维度，与 ViT 输入层相同。
- 推理可并行去噪图像块，而自回归图像词元不行。

缺点是 Transfusion 为双损失模型，训练动态更难掌控。损失权重需要调整；NTP 与扩散的调度不匹配，可能导致一个输出头占主导。

### 后续发展（What sits downstream）

Janus-Pro（第 12.15 课）通过解耦理解与生成的视觉编码器来改进 Transfusion 的想法：一个使用 SigLIP，另一个使用 VQ，共享变换器主体。Show-o（第 12.14 课）将扩散换成离散扩散（掩码预测）。Transfusion 之后，统一生成家族迅速分化。

2026 年能输出图像的生产 VLM，包括 Gemini 3 Pro、GPT-5、Claude Opus 4.7 的图像生成路径，几乎肯定采用该家族的某种后继方案。细节属于专有信息。

```figure
cfg-guidance-scale
```

## 实际应用（Use It）

`code/main.py` 在微型类 MNIST 问题上构建玩具 Transfusion：

- 文本描述是描述数字 0-9 的短整数序列。
- 图像是 4x4 字节网格。
- 一对共享权重线性投影充当变换器替身；文本采用 NTP 损失，带噪图像块采用 MSE 损失。
- 训练循环交替计算两种损失，注意力掩码显式给出。
- 生成在一次前向传播中产生文本描述和一张 4x4 图像。

变换器是玩具，真正的交付物是双损失连接方式、注意力掩码构造和推理循环。

## 交付成果（Ship It）

本课交付 `outputs/skill-two-loss-trainer-designer.md`。给定新多模态训练任务（文本 + 图像、文本 + 音频、文本 + 视频），它设计双损失调度：损失权重、掩码形状、共享与模态特定块，并标记实现风险。

## 练习（Exercises）

1. Transfusion 式模型训练数据中 70% 为文本词元，30% 为图像块。图像扩散损失幅度约为文本 NTP 损失的 10 倍。什么损失权重能平衡两者？

2. 为序列 `[T, T, <image>, P, P, P, P, </image>, T]` 实现块三角掩码，将每项标为 0 或 1。

3. MMDiT 具有模态特定 QKV 权重。相对 Transfusion 完全共享的变换器，这增加多少参数？在 7B 参数下值得吗？

4. 生成时，给定文本提示词，模型先运行 NTP 生成 50 词元，遇到 `<image>` 后，对 256 图像块运行 20 个去噪步骤。总共需要多少次前向传播？

5. 阅读 SD3 论文第 3 节。描述整流流，以及它为何比 DDPM 用更少推理步骤收敛。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 双损失训练（Two-loss training） | “NTP + 扩散” | 同一变换器在同一梯度步骤中优化文本词元交叉熵和连续图像块 MSE |
| 流匹配（Flow matching） | “整流流” | 预测从噪声到干净数据速度场的扩散变体，数学比 DDPM 简单 |
| MMDiT | “多模态 DiT” | Stable Diffusion 3 架构：联合注意力、模态特定 MLP 与归一化 |
| 块三角掩码（Block-triangular mask） | “因果文本 + 双向图像” | 文本之间保持因果性、图像区域内部双向的注意力掩码 |
| 连续图像表示（Continuous image representation） | “无 VQ” | 图像块表示为实值向量，而非整数码本索引 |
| 速度预测（Velocity prediction） | “v 参数化” | 网络输出噪声与数据之间的速度场，而非噪声本身 |

## 延伸阅读（Further Reading）

- [Zhou 等人：Transfusion（arXiv:2408.11039）](https://arxiv.org/abs/2408.11039)
- [Esser 等人：Stable Diffusion 3 / MMDiT（arXiv:2403.03206）](https://arxiv.org/abs/2403.03206)
- [Peebles 与 Xie：DiT（arXiv:2212.09748）](https://arxiv.org/abs/2212.09748)
- [Zhao 等人：MonoFormer（arXiv:2409.16280）](https://arxiv.org/abs/2409.16280)
- [Xie 等人：Show-o（arXiv:2408.12528）](https://arxiv.org/abs/2408.12528)
