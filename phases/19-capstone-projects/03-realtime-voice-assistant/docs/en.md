# 综合实践 03：实时语音助手，从 ASR 到 LLM 再到 TTS（Capstone 03 — Real-Time Voice Assistant）

> 交互自然的语音智能体应有低于 800ms 的端到端延迟，知道你何时说完，支持插话打断（Barge-in），还能调用工具而不阻塞。Retell、Vapi、LiveKit Agents 和 Pipecat 在 2026 年都达到这一水平。它们采用相同结构：流式自动语音识别（Automatic Speech Recognition，ASR）、轮次检测器、流式大语言模型（LLM）和流式文本转语音（Text-to-Speech，TTS），通过 WebRTC 连接，每一跳都有严格延迟预算。构建一个，测量词错误率（Word Error Rate，WER）、平均意见分（Mean Opinion Score，MOS）和误截断率，并在丢包下运行。

**Type:** Capstone
**Languages:** Python (agent + pipeline), TypeScript (web client)
**Prerequisites:** 阶段 6（语音与音频）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 13（工具）、阶段 14（智能体）、阶段 17（基础设施）
**涉及阶段（Phases exercised）：** P6 · P7 · P11 · P13 · P14 · P17
**Time:** 30 小时

## 问题（Problem）

语音是 2025–2026 年发展最快的 AI 用户体验类别，技术门槛每季度都在下降。OpenAI Realtime API、Gemini 2.5 Live、Cartesia Sonic-2、ElevenLabs Flash v3、LiveKit Agents 1.0 和 Pipecat 0.0.70，都让低于 800ms 的首次音频输出触手可及。标准不只是延迟，更是交互表现：不打断用户，不被意外截断，能从句中打断恢复，在对话中调用工具而不阻塞音频，并适应抖动的移动网络。

串接三个 REST 调用无法做到。架构必须端到端流水线式流处理。动手实现后，失效模式会显现：为电话音频调校的 VAD 被背景电视触发，轮次检测器等待永远不来的标点，TTS 输出前缓冲 400ms。本综合实践要求在负载下逐一修复，并发布延迟与质量报告。

## 概念（Concept）

流水线有五个流式阶段：**音频输入（Audio In）**，来自浏览器或公共交换电话网络（Public Switched Telephone Network，PSTN）的 WebRTC；**ASR**，Deepgram Nova-3 或 faster-whisper 流式输出部分转写；**轮次检测（Turn Detection）**，语音活动检测（Voice Activity Detection，VAD）配合读取部分转写、寻找结束线索的小型轮次检测模型；**LLM**，判定轮次完成后立即流式输出词元；**TTS**，在首个 LLM 词元后约 200ms 内输出流式音频。

有三个贯穿全链路的问题。**插话打断：** 智能体说话时用户开始说话，TTS 取消，ASR 立即接管。**工具使用：** 对话中的天气、日历等函数调用必须在旁路通道运行，不阻塞音频；延迟超过 300ms 时，智能体先输出确认短语，如“稍等……”。**背压（Backpressure）：** 丢包时暂存部分转写，VAD 提高语音门限，智能体避免在尚未确认的消息上抢话。

验收标准是量化的：在 15 dB 信噪比（Signal-to-Noise Ratio，SNR）的 Hamming VAD 基准上，WER 低于 8%；100 次实测通话的首次音频输出 p50 低于 800ms；误截断率低于 3%；TTS MOS 高于 4.2；单台 g5.xlarge 支持 50 路并发。这些数值就是交付结果。

## 架构（Architecture）

```
浏览器 / Twilio PSTN
        |
        v
   WebRTC / SIP 边缘接入
        |
        v
  LiveKit Agents 1.0（或 Pipecat 0.0.70）
        |
   +----+--------------+--------------+-----------------+
   |                   |              |                 |
   v                   v              v                 v
  ASR              VAD v5         轮次检测器        旁路通道
（Deepgram        （Silero）        （LiveKit）       工具
 Nova-3 /          语音门控         基于部分转写     （天气、
 Whisper-v3）      每 20ms          计算结束得分       日历）
   |                   |              |
   +--------+----------+--------------+
            v
        LLM（流式）
     GPT-4o-realtime / Gemini 2.5 Flash /
     级联 Claude Haiku 4.5
            |
            v
        流式 TTS
     Cartesia Sonic-2 / ElevenLabs Flash v3
            |
            v
     音频返回通话方
            |
            v
   OpenTelemetry 语音追踪 -> Langfuse
```

## 技术栈（Stack）

- 传输：LiveKit Agents 1.0（WebRTC）加 Twilio PSTN 网关；Pipecat 0.0.70 作为替代框架
- ASR：Deepgram Nova-3，流式且首个部分转写低于 300ms；或自托管 faster-whisper Whisper-v3-turbo
- VAD：Silero VAD v5 加 LiveKit 轮次检测器，后者是读取部分转写的小型 Transformer
- LLM：紧密集成使用 OpenAI GPT-4o-realtime，也可用 Gemini 2.5 Flash Live，或级联 Claude Haiku 4.5，流式补全文本并使用独立音频路径
- TTS：首字节延迟最低的 Cartesia Sonic-2、ElevenLabs Flash v3，或自托管开源 Orpheus
- 工具：FastMCP 旁路通道，处理天气、日历、预订；工具超过 300ms 时智能体预先输出填充短语
- 可观测性：OpenTelemetry 语音跨度、支持音频回放的 Langfuse 语音追踪
- 部署：单台 g5.xlarge，24GB 显存，自托管 Whisper + Orpheus；最低延迟使用托管 API

```figure
ce-voice-latency
```

## 动手实现（Build It）

1. **WebRTC 会话。** 搭建 LiveKit 房间和流式发送麦克风音频的网页客户端。服务端接入加入房间的智能体工作器。

2. **流式 ASR。** 将 20ms PCM 帧输入 Deepgram Nova-3，或 GPU 上的 faster-whisper。订阅部分与最终转写，记录每次部分转写延迟。

3. **VAD 与轮次检测器。** 对帧流运行 Silero VAD v5。发生语音结束事件后，对最新部分转写触发 LiveKit 轮次检测器。只有 VAD 判定静音 500ms 且结束得分 > 0.6，才确认“轮次完成”。

4. **LLM 流。** 轮次完成后，将当前对话与最终转写送入 LLM 调用，流式输出词元。首个词元到达时交给 TTS。

5. **TTS 流。** Cartesia Sonic-2 流式返回音频块。首块必须在首个 LLM 词元后 200ms 内离开服务器。音频块发到 LiveKit 房间，客户端通过 WebRTC 抖动缓冲区播放。

6. **插话打断。** TTS 播放时 VAD 检测到用户新语音，立即取消 TTS 流，丢弃剩余 LLM 输出，重新启用 ASR。发布 `tts_canceled` 跨度。

7. **工具旁路通道。** 将天气和日历注册为函数调用工具。调用时并发执行；若 300ms 内未完成，让 LLM 输出“稍等，我查一下”作为填充短语，工具返回后继续。

8. **评估框架。** 录制 100 次通话。计算相对留出转写的 WER、误截断率（用户说到句中时 TTS 被取消）、首次音频输出 p50、TTS MOS（人工或 NISQA），以及抖动丢包测试，丢弃 3% 数据包。

9. **负载测试。** 用合成通话方在单台 g5.xlarge 驱动 50 路并发，衡量持续运行时的首次音频输出 p95。

## 实际应用（Use It）

```
caller: "what is the weather in tokyo tomorrow"
[asr  ] partial @280ms: "what is the"
[asr  ] partial @540ms: "what is the weather"
[turn ] completion score 0.82 at @820ms; commit
[llm  ] first token @960ms
[tool ] weather.tokyo tomorrow -> 68/52 partly cloudy @1140ms
[tts  ] first audio-out @1040ms: "Tokyo tomorrow will be partly cloudy..."
turn latency: 1040ms user-stop -> audio-out
```

## 交付成果（Ship It）

交付物为 `outputs/skill-voice-agent.md`。给定客户支持、排期或自助终端等领域，它搭建 LiveKit 智能体，将 ASR/VAD/LLM/TTS 流水线调至量化标准。评分标准：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 端到端延迟 | 100 次录制通话的首次音频输出 p50 低于 800ms |
| 20 | 话轮交替质量 | Hamming VAD 基准上的误截断率低于 3% |
| 20 | 工具使用正确性 | 对话中工具调用返回正确数据而不阻塞音频 |
| 20 | 丢包下的可靠性 | 注入 3% 丢包时的 WER 与话轮交替稳定性 |
| 15 | 评估框架完整性 | 公开配置下可复现的测量 |
| **100** | | |

## 练习（Exercises）

1. 将 Deepgram Nova-3 换为 g5.xlarge 上的 faster-whisper v3 turbo。衡量延迟与 WER 差距，识别哪些地方的 CPU/GPU 选择有影响。

2. 添加打断仲裁策略：工具调用期间用户插话，智能体应怎么做？比较立即取消、完成工具后停止、下一轮排队三种策略。

3. 做对抗性轮次检测测试，让用户在句中长时间停顿。调整 VAD 静音阈值和轮次完成得分阈值，在不超过 900ms 的前提下尽量降低误截断。

4. 通过 Twilio 将同一智能体部署到 PSTN。比较 PSTN 与 WebRTC 的首次音频输出，解释抖动缓冲区和编解码器差异。

5. 为日语、西班牙语等非英语语言添加语音活动检测。比较 Silero VAD v5 与语言专用微调版本的误触发率。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 轮次检测（Turn Detection） | “话语结束” | 根据 VAD 静音和部分转写，判断用户是否说完的分类器 |
| 插话打断（Barge-in） | “中断处理” | VAD 检测到新用户语音时，取消播放中的 TTS |
| 首次音频输出（First-audio-out） | “延迟” | 从用户停止说话到首个音频包离开服务器的时间 |
| 语音活动检测（VAD） | “语音门控” | 将音频帧分类为语音或静音的模型；Silero VAD v5 是 2026 年默认选择 |
| 抖动缓冲区（Jitter Buffer） | “音频平滑” | 客户端短暂保存数据包以吸收网络波动的缓冲区 |
| 填充短语（Filler） | “确认词元” | 工具缓慢时，智能体为避免静默而说出的短语 |
| 平均意见分（MOS） | “平均主观评分” | 感知语音质量评分，NISQA 是自动代理指标 |

## 延伸阅读（Further Reading）

- [LiveKit Agents 1.0](https://github.com/livekit/agents)：WebRTC 智能体参考框架
- [Pipecat](https://github.com/pipecat-ai/pipecat)：以 Python 为主的流式智能体替代框架
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)：集成语音模型参考
- [Deepgram Nova-3 文档](https://developers.deepgram.com/docs)：流式 ASR 参考
- [Silero VAD v5](https://github.com/snakers4/silero-vad)：VAD 参考模型
- [Cartesia Sonic-2](https://docs.cartesia.ai)：低延迟 TTS 参考
- [Retell AI 架构](https://docs.retellai.com)：生产级语音智能体架构
- [Vapi.ai 生产技术栈](https://docs.vapi.ai)：另一种生产参考
