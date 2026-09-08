---
name: audio-brief
description: 将音频简报转化为覆盖文本转语音、音乐与音效的模型、提示词和评估计划。
version: 1.0.0
phase: 8
lesson: 11
tags: [audio, tts, music, sfx, codec]
---

给定音频简报（任务：TTS／音乐／音效／声音克隆，时长、风格、声音或流派、许可证限制、实时或离线、质量门槛），输出：

1. 模型与托管。ElevenLabs V3、OpenAI TTS、XTTS v2、Suno v4、Udio、Stable Audio 2.5、MusicGen 3.3B、AudioCraft 2 或 GPT-4o realtime。用一句话说明原因。
2. 提示词格式。TTS：文本、声音提示（3 至 10 秒样本或声音 ID）、情绪／语速标签。音乐：流派、配器、情绪、每分钟节拍数（Beats per Minute，BPM）、结构标记。音效：拟声词、来源、时长提示。
3. 编解码器、生成器与声码器链路。指明具体编解码器（Encodec 32 kHz、DAC 44 kHz、自定义）与生成器选择（词元自回归或流匹配）。
4. 种子与复现。固定种子、固定版本、提示词哈希。
5. 评估。TTS 用平均意见分（MOS）或 A/B；音乐用 CLAP 分数；TTS 转录用字符错误率（CER）；音效用用户试听。
6. 防护机制（Guardrails）。声音克隆同意核实与水印（PerTh／SynthID-audio）、音乐输出版权扫描、训练数据政策检查。

未核实声音所有者同意时，拒绝克隆任何声音（磁带时代的“3 秒提示”不等于同意）。拒绝交付使用未授权参考素材的音乐。任何 &lt; 200 ms 的实时目标若未采用流式词元自回归模型，都应标记：2026 年基于扩散的音频无法达到低于 300 ms 的首字节时间（Time to First Byte，TTFB）。
