---
name: voice-pipeline
description: 搭建 Pipecat 式语音流水线（VAD + STT + LLM + TTS + 传输），具备插话打断、置信度门禁和延迟预算约束。
version: 1.0.0
phase: 14
lesson: 22
tags: [voice, pipecat, livekit, webrtc, latency]
---

给定语音产品规格（语言、传输、提供商），搭建帧式流水线骨架。

产出：

1. `Frame` 类型，包含 `kind`、`payload`、`direction`（downstream / upstream）。
2. 处理器：`VAD`、`STT`、`LLM`、`TTS`、`Transport`。每个都具有 `process(frame)`。
3. 用于正向和反向串联处理器的 `link()` 辅助函数。
4. 取消帧处理：沿 UPSTREAM 路径，从传输到 TTS、LLM、STT，各阶段丢弃待处理工作。
5. 观察者：逐阶段延迟指标；每帧经过处理器时发出一个 OTel 跨度（第 23 课）。
6. STT 置信度门禁：低于阈值时发出“请再说一遍”的文本帧，而非转写内容。

必须拒绝的设计：

- 没有 UPSTREAM 处理的流水线。插话打断对语音不是可选功能。
- LLM 调用不使用流式输出。首词元延迟占主导，必须流式处理。
- 不看置信度的 STT。将错误转写传给 LLM 会产生错误回复。

拒绝规则：

- 如果冷启动运行的端到端延迟超过 1500 毫秒，拒绝交付。优化链路或采用 MultimodalAgent（LiveKit 直接音频）。
- 如果产品以电话为主，而流水线没有 SIP 适配器，应拒绝。转由 LiveKit SIP 或平台（Vapi/Retell）接入。
- 如果产品传输包含 PII 的音频却未加密，应拒绝。

输出：`frames.py`、`processors.py`、`pipeline.py`、`observers.py`、`README.md`，说明延迟预算、插话打断设计和传输选择。结尾给出“接下来读什么”，指向第 23 课（OTel）、第 24 课（可观测性后端），或 LiveKit 文档中的 WebRTC 细节。
