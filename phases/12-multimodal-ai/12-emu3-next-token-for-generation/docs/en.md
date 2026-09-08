# Emu3：用于图像与视频生成的下一词元预测（Emu3: Next-Token Prediction for Image and Video Generation）

> BAAI 的 Emu3（Wang 等人，2024 年 9 月）是本应终结扩散与自回归争论的 2024 年成果。单个 Llama 式仅解码器变换器，在统一的文本 + VQ 图像词元 + 三维 VQ 视频词表上，仅用下一词元预测（Next-token prediction）目标训练，图像生成超过 SDXL，感知超过 LLaVA-1.6。没有 CLIP 损失，没有扩散调度。推理时使用无分类器引导（Classifier-free guidance）提升质量，但核心训练目标是采用教师强制（Teacher forcing）的下一词元预测。成果发表于 Nature。本课阅读 Emu3 的论点，即为何更好的分词器加上规模就足够，并与扩散方法对照。

**Type:** Learn
**Languages:** Python（标准库，3D视频分词器数学 + 自回归采样器框架）
**Prerequisites:** 阶段 12 · 11（Chameleon）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 解释为何 Emu3 的单损失下一词元目标有效，尽管长期以来人们认为图像质量必须依靠扩散。
- 描述三维视频分词器：时空 VQ 码本是什么样子，为什么图像块跨越时间。
- 从训练计算量、推理成本、质量上限比较 Emu3 与 Stable Diffusion XL。
- 说出同一 Emu3 模型的三个角色：Emu3-Gen（图像生成）、Emu3-Chat（感知）、Emu3-Stage2（视频生成）。

## 问题（The Problem）

直到 2024 年，传统观点仍认为图像生成需要扩散。论据是：离散图像词元丢失太多信息，无法重建细节；自回归采样又会在数千词元中累积误差。Stable Diffusion、DALL-E 3、Imagen、Midjourney 都采用某种扩散。Chameleon（第 12.11 课）在小规模上部分反驳了这一点，但质量未达到 SDXL。

Emu3 正面挑战这一论据。其主张是：更好的视觉分词器 + 足够规模 + 下一词元损失 = 超越扩散的图像生成，而且同一模型还能感知。

发表时，这一判断有争议。两年后，开放源码统一生成家族（Emu3、Show-o、Janus-Pro、Transfusion）已成为研究默认路径；生产前沿模型似乎也采用某种变体。

## 概念（The Concept）

### Emu3 分词器（The Emu3 tokenizer）

关键是视觉分词器。Emu3 训练定制 IBQ 类分词器（逆瓶颈量化器，Inverse Bottleneck Quantizer，属于 SBER-MoVQGAN 家族），每词元将分辨率缩减 8x8。512x512 图像变成 64x64 = 4096 词元，码本大小为 32768。

这比 Chameleon 每张 512x512 图像、K=8192 时的 1024 词元更多，但每词元更便宜（更小的码本查找、更简单的编解码器）。关键指标是重建 PSNR 达到 30.5 dB，可与 Stable Diffusion 连续潜在空间的 32 dB 竞争。

视频方面，三维 VQ 分词器将一个时空图像块（4x4x4 像素）编码为一个整数。4s、8 FPS 片段有 32 帧；256x256、空间缩减 4 倍、时间缩减 4 倍时，词元数为 (256/4) * (256/4) * (32/4) = 64 * 64 * 8 = 32,768。

分词器质量决定上限。Emu3 的贡献部分在于“我们训练了非常好的分词器”。

### 单损失训练（Single-loss training）

Emu3 使用一种目标：在跨文本词元、二维图像词元、三维视频词元的共享词表中预测下一词元。训练时乘以模态特定权重以平衡贡献，但损失函数相同。

训练混合以下数据：
- 图像生成：`<text caption> <image> image_tokens </image>`
- 图像感知：`<image> image_tokens </image> <question> text_tokens`
- 视频生成：`<text caption> <video> video_tokens </video>`
- 视频感知：类似。
- 纯文本：标准下一词元预测（NTP）。

模型从数据分布中学习何时输出图像词元、何时输出文本词元。在 `<image>` 标签后预测图像词元，就产生了生成能力。

### 无分类器引导与温度（Classifier-free guidance and temperature）

推理时使用无分类器引导（CFG），自回归图像生成会好很多。Emu3 采用它：生成两次，一次使用完整描述，一次使用空描述，再通过引导权重混合未归一化分数（Logits，典型 3.0-7.0）。这是扩散使用的同一 CFG 技巧，被借用到自回归场景。

温度（Temperature）很重要：太高产生伪影，太低导致模式坍塌。Emu3 推荐感知温度 1.0，图像生成温度 0.8。

### 三个角色，一个模型（Three roles, one model）

Emu3 提供三个功能不同的 API，但底层是一套权重：

- Emu3-Gen：图像生成，输入文本，输出图像词元。
- Emu3-Chat：VQA 和描述，输入图像词元，输出文本。
- Emu3-Stage2：视频生成与视频 VQA，输入文本或视频，输出文本或视频。

没有任务特定输出头，只是提示词模板不同。使用同一检查点。

### 基准（Benchmarks）

根据 Emu3 论文（2024 年 9 月）：

- 图像生成：MJHQ-30K FID 超过 SDXL（5.4 对 5.6），GenEval 总体（0.54 对 0.55，统计上持平），Deep-Eval 综合指标相当。
- 图像感知：VQAv2 超过 LLaVA-1.6（75.1 对 72.4），MMMU 大致持平。
- 视频生成：4 秒片段在 FVD 上可与 Sora 时期公开测试的模型竞争。

这些数字并非处处领先，Emu3 在不同项目上各有得失；但“下一词元预测就是全部所需”的主张，在各模态上都有可辩护依据。

### 计算成本（Compute cost）

Emu3 用 7B 参数模型，在约 3000 亿多模态词元上训练。GPU 小时大致可比 Llama-2-7B 预训练（A100 级硬件上的 2k-4k GPU 年）。Stable Diffusion 3 等扩散模型训练预算相近，但需要独立文本编码器和更复杂流水线。

推理时，Emu3 每图慢于 SDXL：4096 个图像词元、30 tok/s，生成一张 512x512 图像约需 2 分钟，而 SDXL 为 2-5 秒。推测解码（Speculative decoding）和 KV 缓存优化能缩小、却无法消除差距。自回归图像生成计算密集，这是持续存在的权衡。

### 重要性（Why it matters）

Emu3 的深层贡献在概念上。如果下一词元预测可以扩展到与扩散匹敌的图像生成，那么统一模型路径，即一种损失、一个骨干网络、任意模态，就是可行的。未来模型无需独立文本编码器、独立扩散调度器、独立 VAE。一个变换器，每模态一个分词器，再扩展规模。

Show-o、Janus-Pro 和 InternVL-U 都在延续或挑战这一论点。直到 2025 年，中国实验室（BAAI、DeepSeek）在这个方向的发表比美国实验室更积极。

```figure
l5-emu3-next-token
```

## 实际应用（Use It）

`code/main.py` 构建两个玩具组件：

- 二维与三维 VQ 分词器数量计算器：给定 (resolution, patch, clip_length, FPS)，计算图像与视频词元数。
- 带无分类器引导、按温度采样的自回归图像词元采样器。

CFG 实现遵循 Emu3 方案，用引导权重混合有条件与无条件的未归一化分数。

## 交付成果（Ship It）

本课交付 `outputs/skill-token-gen-cost-analyzer.md`。给定生成产品规格（图像或视频、目标分辨率、质量等级、延迟预算），它计算词元数、推理成本，并选择 Emu3 家族或扩散。

## 练习（Exercises）

1. Emu3 在 8x8 缩减下，每张 512x512 图像生成 4096 词元。计算 1024x1024 和 2048x2048 的对应值。推理延迟会怎样变化？

2. 阅读 Emu3 第 3.3 节的视频分词器内容。描述三维 VQ 图像块形状，以及为什么是 4x4x4，而非 8x8x1。

3. 无分类器引导权重 5.0 与 3.0 有何视觉差异？追踪 `code/main.py` 中的数学过程。

4. 计算 Emu3-7B 在 300B 词元上的训练浮点运算量，与 Stable Diffusion 3 比较。哪个训练更贵？

5. Emu3 在 FID 上超过 SDXL，但 VQAv2 不如专用 VLM。解释为何统一损失方法在不同基准上相较专用模型表现出不同优势。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 下一词元预测（Next-token prediction） | “NTP” | 标准自回归损失：给定 token[0..i] 预测 token[i+1]；分词后适用于每种模态 |
| IBQ 分词器（IBQ tokenizer） | “逆瓶颈量化器” | 一类码本更大（32768+）、重建优于 Chameleon 的 VQ-VAE |
| 三维 VQ（3D VQ） | “时空量化器” | 按时间、行、列索引的码本；一个词元覆盖 4x4x4 像素立方体 |
| 无分类器引导（Classifier-free guidance） | “CFG” | 用 gamma 权重混合有条件与无条件的未归一化分数，提升推理图像质量 |
| 统一词表（Unified vocabulary） | “共享词元” | 文本 + 图像 + 视频都来自同一整数空间，模型预测接下来任意模态的词元 |
| MJHQ-30K | “图像生成基准” | 包含 30k 提示词的 Midjourney 质量基准，Emu3 在此报告 FID |

## 延伸阅读（Further Reading）

- [Wang 等人：《Emu3：下一词元预测就是全部所需（Next-Token Prediction is All You Need）》（arXiv:2409.18869）](https://arxiv.org/abs/2409.18869)
- [Sun 等人：《Emu：多模态生成式预训练（Generative Pretraining in Multimodality）》（arXiv:2307.05222）](https://arxiv.org/abs/2307.05222)
- [Liu 等人：LWM（arXiv:2402.08268）](https://arxiv.org/abs/2402.08268)
- [Yu 等人：MAGVIT-v2（arXiv:2310.05737）](https://arxiv.org/abs/2310.05737)
- [Tian 等人：VAR（arXiv:2404.02905）](https://arxiv.org/abs/2404.02905)
