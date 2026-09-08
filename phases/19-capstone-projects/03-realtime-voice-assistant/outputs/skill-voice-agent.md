---
name: voice-agent
description: 构建首次音频输出低于 800ms、支持插话打断与对话中工具使用的实时语音智能体。
version: 1.0.0
phase: 19
lesson: 03
tags: [capstone, voice, webrtc, livekit, pipecat, asr, tts, streaming]
---

给定客户支持、排期或零售助手等领域，部署 WebRTC 语音智能体，使端到端首次音频输出低于 800ms，同时处理插话打断（Barge-in）、工具调用与丢包。

构建计划：

1. 搭建 LiveKit Agents 1.0 房间，网页客户端流式发送麦克风音频。添加 Twilio PSTN 网关以支持电话。
2. 运行流式自动语音识别（ASR）：托管 Deepgram Nova-3，或 g5.xlarge 上的 faster-whisper Whisper-v3-turbo。订阅部分与最终转写。
3. 对 20ms 帧运行 Silero VAD v5。语音结束时，用 LiveKit 轮次检测器给最新部分转写评分；仅当 VAD 静音 >= 500ms 且完成得分 >= 0.6 时确认轮次完成。
4. 流式运行 LLM：GPT-4o-realtime、Gemini 2.5 Flash Live，或级联 Claude Haiku 4.5。在 200ms 内将首个词元交给 TTS。
5. 流式文本转语音（TTS）使用 Cartesia Sonic-2 或 ElevenLabs Flash v3。首个音频块必须在首个 LLM 词元后 200ms 内离开服务器。
6. 插话打断：SPEAKING 或 THINKING 期间 VAD 检测到用户新语音，则取消 TTS，丢弃剩余 LLM 输出，重新启用 ASR，发布 `tts_canceled` 跨度。
7. 工具旁路通道：并发执行函数调用；延迟 > 300ms 时输出确认填充短语，确保音频流不阻塞。
8. 录制 100 次通话，衡量相对留出转写的词错误率（WER）、Hamming VAD 基准误截断率、首次音频输出 p50、NISQA 平均意见分（MOS），以及 3% 丢包下的行为。
9. 用合成通话方在单台 g5.xlarge 压测 50 路并发，报告持续运行时的首次音频输出 p95。

评估标准：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 端到端延迟 | 100 次录制通话的首次音频输出 p50 低于 800ms |
| 20 | 话轮交替质量 | Hamming VAD 基准误截断率低于 3% |
| 20 | 工具使用正确性 | 对话中工具调用返回正确数据而不阻塞音频 |
| 20 | 丢包下的可靠性 | 注入 3% 丢包时的 WER 与话轮交替稳定性 |
| 15 | 评估框架完整性 | 公开配置下可复现的测量 |

直接不予验收的情况：

- 非流式流水线，如批量 ASR、批量 TTS，无法达到延迟目标。
- 任何不能立即取消 TTS 缓冲区的插话策略。延迟取消会造成最糟糕的用户体验退化。
- 同步阻塞 LLM 流的工具调用；它们必须在旁路通道运行。

拒绝规则：

- 没有 VAD 或轮次检测器时拒绝部署。固定超时的话轮交替会产生不可接受的截断率。
- 没有说明由人工评分还是 NISQA 代理估计时，拒绝报告 MOS。
- 没有至少 100 次录制通话并公开追踪时，拒绝报告“p50 延迟低于 X”。

输出：包含 LiveKit 智能体工作器、PSTN 网关配置、100 通话评估框架的仓库，公开 Langfuse 语音仪表板，与一个托管竞品（Retell、Vapi 或直接使用 OpenAI Realtime API）的并列比较，以及说明文档，介绍观察到的三种最大话轮交替问题与对应检测器调参修复。
