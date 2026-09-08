# 水印（Watermarking）— SynthID、Stable Signature、C2PA

> 三种技术构成了 2026 年 AI 生成内容的来源追溯体系。SynthID（Google DeepMind）于 2023 年 8 月推出图像水印，2024 年 5 月扩展到文本和视频（Gemini + Veo），2024 年 10 月通过 Responsible GenAI Toolkit 开源文本水印，并于 2025 年 11 月随 Gemini 3 Pro 推出统一的多媒体检测器。文本水印以难以察觉的方式调整下一词元采样概率；图像和视频水印能够经受压缩、裁剪、滤镜和帧率变化。Stable Signature（Fernandez 等，ICCV 2023，arXiv:2303.15435）通过微调潜在扩散解码器，使每个输出都包含固定消息；对于裁剪后仅剩 10% 内容的生成图像，在 FPR<1e-6 时，检出率 >90%。后续论文《Stable Signature 并不稳定》（arXiv:2405.07145，2024 年 5 月）表明，微调可以在保留质量的同时移除水印。C2PA 是采用密码学签名、能够显露篡改的元数据标准（C2PA 2.2 说明文档，2025）。水印与 C2PA 相互补充：元数据可以被剥离，但携带更丰富的来源信息；水印能在转码后保留，但携带的信息较少。

**Type:** Build
**Languages:** Python (stdlib, token-watermark embed + detect)
**Prerequisites:** 阶段 10 · 04（采样（sampling））、阶段 01 · 09（信息论（information theory））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说明词元级水印（Token-Level Watermarking，SynthID-text 风格），以及它能被检测的机制。
- 说明 Stable Signature，以及 2024 年攻破它的移除攻击。
- 陈述 C2PA 的作用，以及它为什么与水印互补。
- 说明关键局限：信号依赖模型、面对改写时的鲁棒性，以及保持语义的攻击（arXiv:2508.20228）。

## 问题（The Problem）

2023–2024 年，深度伪造（Deepfakes）与 AI 生成内容大规模进入政治和消费场景。水印被提出作为技术性的来源信号：在生成时标记内容，之后再检测。2025 年的证据表明，没有水印具有无条件鲁棒性，但与 C2PA 元数据分层配合后，可以提供可用的来源追溯依据。

## 核心概念（The Concept）

### 文本水印（Text Watermarking，SynthID-text 风格）

Kirchenbauer 等人在 2023 年提出、由 Google 投入生产的机制如下：

1. 在每个解码步骤，对前 K 个词元进行哈希，将词表伪随机地划分为“绿色”和“红色”集合。
2. 对绿色集合的 logits 加上 δ，使采样偏向绿色集合。
3. 生成文本中的绿色词元数量会高于随机情况下的预期。

检测时，重新对每个前缀进行哈希，统计生成文本中的绿色词元，并计算 z 分数（Z-Score）。有水印文本的 z 分数 >0，人类文本则 ~0。

其性质包括：
- 读者难以察觉，因为 δ 足够小，质量损失很轻微。
- 掌握词表划分函数即可检测。
- 无法抵抗改写：重写文本会破坏信号。

SynthID-text 于 2024 年 10 月通过 Google 的 Responsible GenAI Toolkit 开源。

### Stable Signature（图像）（Stable Signature — Image）

Fernandez 等人的 ICCV 2023 论文通过微调潜在扩散解码器，使每张生成图像都在潜在表征中嵌入固定二进制消息。检测时，使用神经解码器从潜在表征解码。对于裁剪后仅剩 10% 内容的图像，在 FPR<1e-6 时，检出率 >90%。

2024 年 5 月的《Stable Signature 并不稳定》（arXiv:2405.07145）表明：微调解码器可以在保留图像质量的同时移除水印。生成后的对抗性微调成本很低，因此水印的对抗鲁棒性有限。

### SynthID 统一检测器（2025 年 11 月）（SynthID Unified Detector）

随 Gemini 3 Pro 一起推出的多媒体检测器，通过一个 API 读取文本、图像、音频和视频中的 SynthID 信号，统一了 Google 的来源追溯工具栈。

### C2PA

内容来源与真实性联盟（Coalition for Content Provenance and Authenticity）制定了采用密码学签名、能够显露篡改的元数据标准，见 C2PA 2.2 说明文档（2025）。C2PA 清单（Manifest）记录来源声明，包括谁创建、何时创建以及经历了什么变换，并使用创建者的密钥签名。

它与水印互补：
- 元数据可以被剥离，而水印不容易被剥离。
- 元数据内容丰富，可以包含完整来源链；水印则携带比特。
- C2PA 依赖平台采用；水印会自动嵌入。

Google 在 Search、Ads 和“About this image”中同时集成两者。

### 局限（Limitations）

- **依赖特定模型（Model-Specific）。** SynthID 为启用 SynthID 的模型生成内容添加水印。没有启用 SynthID 的模型所生成内容不会有这种水印，因此“没有 SynthID 信号”不是内容真实的证明。
- **改写（Paraphrase）。** 文本水印无法在保持语义的改写后保留。
- **变换攻击（Transformation Attacks）。** arXiv:2508.20228（2025）展示了保持语义的攻击，能够破坏文本水印和许多图像水印。
- **微调移除（Fine-Tune Removal）。** 根据《Stable Signature 并不稳定》，生成后的微调可以移除嵌入水印。

### 欧盟《人工智能法案》第 50 条（EU AI Act Article 50）

AI 生成内容标记的《透明度守则》（Transparency Code）于 2025 年 12 月发布首稿，2026 年 3 月发布第二稿；根据[欧盟委员会状态页面](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)，预计于 2026 年 6 月定稿。截至 2026 年 4 月，该守则仍是草案，时间表可能变化。这是要求采取上述技术措施的监管层。深度伪造内容必须标记。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 22–23 课讨论模型输出什么，包括私人数据和来源信号。第 27 课讨论训练数据治理。第 24 课讨论要求采取这些技术措施的监管框架。

```figure
an-watermark-greenlist
```

## 动手使用（Use It）

`code/main.py` 构建了一个玩具文本水印。词元是整数 0..N-1；带水印的采样偏向哈希定义的绿色集合。检测器计算绿色词元的 z 分数。你可以观察 1000 词元生成文本上的检测情况，查看改写如何破坏信号，并测量人类文本上的误报率。

## 交付成果（Ship It）

本课产出 `outputs/skill-provenance-audit.md`。给定声称可追溯来源的内容部署，它会审计水印机制（如有）、C2PA 签名链（如有）、两者各自的对抗鲁棒性，以及各模态的覆盖情况。

## 练习（Exercises）

1. 运行 `code/main.py`。报告带水印的 1000 词元生成文本与人类撰写文本的 z 分数，并确定 95% 置信阈值下的误报率。

2. 实现一种改写攻击，将 30% 的词元替换为同义词，然后重新测量 z 分数。

3. 阅读 Kirchenbauer 等人 2023 年论文第 6 节中关于鲁棒性的内容。为什么改写会使文本水印失效，而图像水印能经受裁剪？

4. 设计一个采用 SynthID-text + C2PA 元数据的部署。描述消费者看到的来源链，并分别指出每个组件的一种失效模式。

5. 2024 年《Stable Signature 并不稳定》的结果表明，微调会移除图像水印。设计一种限制该攻击的部署控制措施，例如要求对微调检查点进行签名发布。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| SynthID | “Google 的水印” | 跨模态来源信号，覆盖文本、图像、音频和视频 |
| 词元水印（Token Watermark） | “Kirchenbauer 式” | 通过有偏采样嵌入的文本水印，可用绿色词元 z 分数检测 |
| Stable Signature | “图像水印” | 通过微调解码器嵌入的水印，发表于 ICCV 2023 |
| C2PA | “元数据标准” | 采用密码学签名、能够显露篡改的来源元数据 |
| 改写鲁棒性（Paraphrase Robustness） | “换种说法会不会破坏它” | 文本水印的一项性质，目前仍有限 |
| 微调移除（Fine-Tune Removal） | “对抗性去水印” | 通过微调解码器移除图像水印的攻击 |
| 跨模态检测器（Cross-Modal Detector） | “统一 SynthID” | 2025 年 11 月推出的跨模态统一 API |

## 延伸阅读（Further Reading）

- [Kirchenbauer 等 —《大语言模型的水印》（ICML 2023，arXiv:2301.10226）](https://arxiv.org/abs/2301.10226) — 词元水印机制
- [Fernandez 等 — Stable Signature（ICCV 2023，arXiv:2303.15435）](https://arxiv.org/abs/2303.15435) — 图像水印论文
- [《Stable Signature 并不稳定》（arXiv:2405.07145）](https://arxiv.org/abs/2405.07145) — 移除攻击
- [Google DeepMind — SynthID](https://deepmind.google/models/synthid/) — 跨模态水印
- [C2PA 2.2 说明文档（2025）](https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) — 元数据标准
