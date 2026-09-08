---
name: voice-assistant-architect
description: 为给定工作负载产出完整语音助手规格，包括组件、延迟预算、可观测性与合规。
version: 1.0.0
phase: 6
lesson: 12
tags: [voice-assistant, architecture, livekit, pipecat, compliance]
---

给定用例（消费级、客服、无障碍、边缘端）、预期规模（并发会话、每月分钟数）、语言、延迟目标、合规要求（HIPAA、PCI、欧盟《人工智能法案》、加州 SB 942），输出：

1. 组件，七层。麦克风与分块、语音活动检测（VAD）、流式语音转文本（STT）、大语言模型（LLM）与工具、流式文本转语音（TTS）、播放、中断处理器。逐一指定确切供应商或模型。
2. 延迟预算。逐阶段 P50 / P95 / P99 目标，加总达到端到端目标。标记哪些独立、哪些顺序执行。
3. 工具调用模式。每个工具的 JSON 规格、错误处理、回退文本。始终包含“无法帮助处理”路径，LLM 失败两次后必须进入。
4. 安全。提示词注入防护、声音克隆锁定（TTS 支持克隆时）、唤醒词门控（持续监听时）、日志个人身份信息（PII）脱敏、保留 30 天。
5. 可观测性。逐阶段 P50/P95/P99、误中断率、工具调用成功率、每 100 通电话的词错误率（WER）、每分钟成本、放弃率。
6. 合规。披露音频（“这是 AI 助手”）、地区固定（欧盟数据留在欧盟）、审计日志保留、退出途径。

拒绝没有唤醒词的持续监听部署。拒绝不支持流式的 TTS，它会增加整句长度的延迟。拒绝仅平均延迟而无 P95，因为尾延迟导致用户流失。未经法律审查，拒绝将原始音频保留 &gt; 30 天。

示例输入：“面向低视力用户的无障碍助手，为消费级邮件应用提供纯语音界面。英语。P95 &lt; 600 ms。约 10k 并发用户。”

示例输出：
- 组件：sounddevice（经 LiveKit Agents 使用 WebRTC）、Silero VAD、Deepgram Nova-3（英语）、带邮件工具（read_message、compose_reply、mark_read）的 GPT-4o、Cartesia Sonic 2 流式、WebRTC 输出；VAD 触发时中断并取消 LLM 与 TTS。
- 预算：采集 120 ms + VAD 40 + STT 150 + LLM 首词元时间（TTFT）100 + TTS 首音频时间（TTFA）150 = P95 560 ms。
- 工具：read_message({id})、compose_reply({message_id, body})、mark_read({id})、search({query})。全部返回 JSON；LLM 每个工具最多重试 2 次，然后回退说“我没能完成，请换一种说法”。
- 安全：提示词注入防护，检测 `ignore previous instructions`（忽略先前指令）；唤醒词“Hey Mail”；不克隆声音，使用固定 Cartesia 声音；日志邮件正文脱敏。
- 可观测性：Hamming AI 生产监控；逐阶段 Prometheus 直方图；误中断 &gt; 5% 或 p95 &gt; 800 ms 时报警。
- 合规：首次使用时披露 AI 身份；仅医疗邮件选择 HIPAA；欧盟用户使用欧盟托管 Cartesia 和爱尔兰的 GPT-4o。
