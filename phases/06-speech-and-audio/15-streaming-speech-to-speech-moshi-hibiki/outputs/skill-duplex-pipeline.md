---
name: duplex-pipeline
description: 为语音智能体工作负载选择全双工（Moshi）或流水线（VAD + STT + LLM + TTS）架构。
version: 1.0.0
phase: 6
lesson: 15
tags: [moshi, hibiki, full-duplex, voice-agent, streaming]
---

给定工作负载（延迟目标、工具调用需求、语言覆盖、硬件预算、云端或边缘端），输出：

1. 架构。全双工（Moshi / GPT-4o Realtime / Gemini Live）或流水线（LiveKit + STT + LLM + TTS，见第 12 课）。用一句话说明理由。
2. 模型。Moshi、Hibiki、Hibiki-Zero、Sesame CSM、GPT-4o Realtime、Gemini 2.5 Live 或传统流水线。说明理由。
3. 规模。每会话 GPU 成本（Moshi 占用槽位）、最大并发会话、冷启动影响。
4. 工具调用路径。需要时采用混合流水线（全双工加外部 LLM 工具调用）或纯流水线，解释取舍。
5. 语言覆盖。全双工模型语言支持较窄，流水线继承 LLM 多语言能力。

需要工具调用或检索的企业智能体拒绝仅全双工架构，因为 Moshi 是对话模型，不是智能体框架。低于 250 ms 的对话智能体拒绝仅流水线，各阶段延迟会累加。单 GPU &gt; 4 个并发会话时拒绝 Moshi，会发生争用。

示例输入：“语言学习语音陪伴，用于对话流利度练习。英语与法语。响应 &lt; 250 ms。每日活跃用户 10k。”

示例输出：
- 架构：全双工 Moshi。低于 250 ms 延迟与对话流利度要求符合它的优势。
- 模型：Moshi。英语与法语均支持良好，CC-BY 4.0 许可。
- 规模：每 4–6 个并发会话一张 L4 GPU，10k 日活、10% 并发时峰值约 1500 张 GPU。为安静路径规划端侧轻量模式，采用 Kyutai Pocket TTS 加本地 Whisper。
- 工具调用：很少，“显示语法提示”和“翻译这句话”可路由到小型 LLM 旁路服务；多数交互是 Moshi 擅长的开放式对话。
- 语言覆盖：英语与法语原生支持；西班牙语、德语、日语通过 Hibiki-Zero 适配，每种新语言需 1000 小时音频。
