---
name: asr-configurator
description: 为新语音流水线选择 ASR 模型（Whisper 变体 / Moonshine / faster-whisper）与解码参数。
version: 1.0.0
phase: 7
lesson: 10
tags: [transformers, whisper, asr, speech]
---

给定语音任务（转录、翻译、流式、设备端）、语言、音频特征（噪声、口音、时长）及延迟/质量目标，输出：

1. 模型选择。从 faster-whisper large-v3-turbo（生产默认）、whisper large-v3（最高质量、多语言）、whisper medium（中档）、Moonshine base（边缘端）、distil-whisper（英语快 2 倍）中选择。用一句话说明理由。
2. 量化。int8_float16（CPU 默认）、float16（GPU 默认）、fp32（研究）。标明显存影响。
3. 解码。束宽（通常 5，流式为 1）、温度回退调度、对数概率阈值、无语音阈值、语音活动检测（VAD）门控开关。
4. 分块。30 秒固定窗口，或流式分块（通常 10 秒、重叠 2 秒）与基于 VAD 的分段。记录重叠部分的后续合并策略。
5. 后处理。时间戳对齐（WhisperX 强制对齐）、标点恢复、说话人分离（pyannote）。标明任务需要哪些。

拒绝为生产推荐原版 OpenAI Whisper 参考实现，因为 `faster-whisper` 输出相同却快 4 倍。除非有书面理由，没有 VAD 就拒绝交付流式 ASR。输入可能包含多人时，标明任何单说话人假设。
