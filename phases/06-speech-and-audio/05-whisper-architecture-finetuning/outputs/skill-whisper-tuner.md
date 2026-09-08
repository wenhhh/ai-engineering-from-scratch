---
name: whisper-tuner
description: 为给定语言、领域和延迟预算设计 Whisper 微调或推理流水线。
version: 1.0.0
phase: 6
lesson: 05
tags: [audio, whisper, asr, fine-tuning, lora]
---

给定目标（语言集合、领域、片段长度分布、延迟预算、硬件）和数据（可用小时数、质量），输出：

1. 变体。Tiny / Base / Small / Medium / Large-v3 / Turbo。说明理由。
2. 运行时。原版 / faster-whisper / whisperx / whisper-streaming。说明理由。
3. 微调方案。全量微调（Full Fine-Tuning，Full-FT）还是低秩适配（Low-Rank Adaptation，LoRA；r、target_modules）、冻结编码器策略、训练轮数。
4. 推理防护。语音活动检测（Voice Activity Detection，VAD；Silero 或 Whisper 自带）、`temperature=0`、`condition_on_previous_text=False`、`no_speech_threshold`。
5. 评估。领域词错误率（Word Error Rate，WER）目标、文本归一化规则、静音片段幻觉率检查。

拒绝在没有 VAD 的情况下对任意音频部署 Whisper。拒绝在多块任务中没有失控保护却设置 `condition_on_previous_text=True`。标记任何替换 Whisper 分词器或梅尔特征流水线的微调方案。
