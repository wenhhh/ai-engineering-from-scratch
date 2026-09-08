---
name: tts-designer
description: 根据语言、风格和延迟目标，选择文本转语音模型、声音、文本归一化范围及评估方案。
version: 1.0.0
phase: 6
lesson: 07
tags: [audio, tts, speech-synthesis]
---

给定目标（语言、声音风格、延迟预算、CPU 或 GPU、许可约束）和内容（领域、词表外词密度、标点丰富程度），输出：

1. 模型。Kokoro / XTTS v2 / F5-TTS / VITS / StyleTTS 2 / 商业 API。用一句话说明理由。
2. 文本前端。归一化范围（数字、日期、URL）、音素转换器（espeak-ng 或 g2p-en）、词表外词（Out-of-Vocabulary，OOV）回退方案。
3. 声音。预设名称或参考片段规格（秒数、噪声底、口音匹配）。
4. 质量目标。目标 UTMOS、通过 Whisper 计算的字符错误率（Character Error Rate，CER），以及克隆时的说话人嵌入余弦相似度（Speaker Embedding Cosine Similarity，SECS）。
5. 评估方案。20 条语句的测试集，覆盖数字、同形异音词、专有名词与长句。

拒绝没有文本归一化器的生产 TTS。拒绝没有用户同意和水印的声音克隆。标记任何要求 Kokoro 说英语以外语言的部署。
