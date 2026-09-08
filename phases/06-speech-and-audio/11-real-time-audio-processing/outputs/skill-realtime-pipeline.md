---
name: realtime-voice-pipeline
description: 根据目标端到端延迟选择传输、语音活动检测、流式语音转文本、大语言模型、流式文本转语音及编排方案。
version: 1.0.0
phase: 6
lesson: 11
tags: [voice-agent, livekit, pipecat, silero, streaming, latency]
---

给定目标（延迟 P50/P95、语言、通道、离线或云端、通话量），输出：

1. 传输。WebRTC（LiveKit / Daily）、WebSocket、SIP 中继（Twilio / Telnyx）。结合抖动容忍度与用例说明理由。
2. 语音活动检测（Voice Activity Detection，VAD）与轮次切换。Silero VAD（开放，真正率 TPR 99.5%）、Cobra（商业）、LiveKit turn-detector。给出阈值、最短语音时长、静音延续时间。
3. 流式语音转文本（Speech-to-Text，STT）。Parakeet TDT（最快开放方案）、Kyutai STT（含刷新技巧）、Deepgram Nova-3（API，约 150 ms）、Whisper-streaming。说明理由。
4. 大语言模型（Large Language Model，LLM）与流式处理。在启动 TTS 前确定首 20 个词元。模型、流式配置与提示词注入防护。
5. 流式文本转语音（Text-to-Speech，TTS）。Kokoro-82M（首音频时间 TTFA 约 100 ms）、Orpheus、Cartesia Sonic、ElevenLabs Turbo。声音包或第 8 课的克隆防护。
6. 编排。LiveKit Agents、Pipecat、Vapi、Retell、自定义 Rust。结合团队技能与规模说明理由。
7. 可观测性。逐阶段 P50/P95/P99 直方图、误中断率、掉线率、通话样本上的词错误率（WER）。

拒绝先缓冲整句话再做 STT 的部署。拒绝不支持流式的 TTS。拒绝仅用平均延迟评估，必须提供 P95。每月 &gt; 100k 分钟时，若未与自建方案比较成本，拒绝使用托管平台（Vapi / Retell）。

示例输入：“车险报价语音智能体。P95 &lt; 500 ms。美国英语。每周 50k 分钟。合规：接近 HIPAA 要求，日志中不能有个人身份信息。”

示例输出：
- 传输：LiveKit Agents 加 Twilio SIP。已有呼叫中心规模验证，可选择 HIPAA 模式。
- VAD：Silero VAD，阈值 0.45，最短语音 220 ms，静音延续 400 ms，叠加 LiveKit turn-detector。
- STT：Deepgram Nova-3 English（P95 约 150 ms）；需要本地审计时回退至 Parakeet-TDT。
- LLM：通过 OpenAI Realtime API 流式使用 GPT-4o，用后置过滤器防提示词注入，将首 20 个词元确定后送至 TTS。
- TTS：Cartesia Sonic 2（TTFA 约 150 ms，不使用声音克隆，采用预定义声音）。
- 编排：LiveKit Agents。生产可观测性使用 Hamming AI。
- 日志：持久化前用正则表达式加命名实体识别（Named Entity Recognition，NER）去除银行卡安全码（CVV）、社会安全号码（SSN）和出生日期（DOB）。保留 30 天。
