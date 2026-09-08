---
name: asr-picker
description: 为给定部署目标选择自动语音识别模型、解码策略、分块和语言模型融合方案。
version: 1.0.0
phase: 6
lesson: 04
tags: [audio, asr, speech-recognition]
---

给定部署目标（语言列表、领域、延迟预算、硬件、离线或流式、音频时长），输出：

1. 模型。Whisper-large-v3-turbo / Parakeet-TDT / Canary-Flash / wav2vec 2.0 / Moonshine。用一句话说明原因。
2. 解码。贪心 / 束宽 / 温度回退 / 语言模型（Language Model，LM）融合权重。结合质量预算说明理由。
3. 分块与语音活动检测（Voice Activity Detection，VAD）。块长、步幅，以及使用 Silero-VAD 还是 Whisper 自带的检测进行门控。
4. 语言策略。强制指定语言还是自动语言识别（Language Identification，LID）；如何处理跨语言帧。
5. 评估方案。领域测试集上的词错误率（Word Error Rate，WER）、逐说话人覆盖情况、静音片段上的幻觉率。

拒绝没有 VAD 门控的长音频 Whisper 部署，因为静音容易触发幻觉。拒绝报告未经文本归一化（小写、去标点）的 WER。标记任何没有语言模型却将束宽设为 >16 的方案，仅在空白词元上扩大搜索束没有帮助。
