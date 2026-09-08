---
name: vad-tuner
description: 为语音智能体选择语音活动检测模型、阈值、静音延续、预录缓冲和轮次检测策略。
version: 1.0.0
phase: 6
lesson: 14
tags: [vad, silero, cobra, turn-detection, flush-trick]
---

给定工作负载（消费级、呼叫中心、边缘端、无障碍；噪声特征；语言组合；延迟），输出：

1. 语音活动检测（Voice Activity Detection，VAD）。Silero VAD（默认）、Cobra（商业准确率）、pyannote 分段（说话人分离级）、WebRTC VAD（旧方案或微型设备）。用一句话说明理由。
2. 参数。阈值 0.3–0.5、最短语音 200–300 ms、静音延续 400–800 ms、预录缓冲 250–500 ms。
3. 语义轮次检测。是否启用 LiveKit turn-detector 或自定义 MLP，结合预期用户说话模式说明原因。
4. 刷新技巧。是否启用，取决于 STT 是否支持，如 Kyutai / Deepgram。给出预期节省延迟。
5. 防护。拒绝短于最小时长的语音；始终保留预录；限制每用户覆盖静音延续的上限；VAD 服务不可用时故障放行，将全部输入视为语音。

拒绝生产使用纯能量 VAD，误触发太多。拒绝零静音延续，会打断用户。已有专用 Silero 时拒绝基于 Whisper 的 VAD，它更慢且更不准。

示例输入：“航班改签呼叫中心交互式语音应答（Interactive Voice Response，IVR）。机场嘈杂背景。英语与西班牙语。轮次检测 &lt; 500 ms。”

示例输出：
- VAD：Cobra（商业），利用其抗噪优势。成本过高时回退到 Silero。
- 参数：阈值 0.4（机场噪声底高）；最短语音 300 ms；静音延续 600 ms（用户在 IVR 中常停下来读航班号）；预录 400 ms。
- 语义轮次：启用 LiveKit turn-detector，句中停顿常见，如“我需要改航班……改到明天”。
- 刷新技巧：在 Deepgram streaming 上启用，预期轮次结束延迟从 400 ms 降至 150 ms。
- 防护：Cobra/Deepgram 不可达时故障放行；审计记录每次 VAD 触发事件，供调优使用。
