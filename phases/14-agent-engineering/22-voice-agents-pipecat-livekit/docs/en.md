# 语音智能体：Pipecat 与 LiveKit（Voice Agents: Pipecat and LiveKit）

> 语音智能体在 2026 年已成为重要的生产类别。Pipecat 提供 Python 帧式流水线（VAD → STT → LLM → TTS → 传输）。LiveKit Agents 通过 WebRTC 将 AI 模型连接到用户。高端技术栈的生产端到端延迟目标为 450–600 毫秒。

**Type:** Learn
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 01（智能体循环），第 14 阶段 · 12（工作流模式）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 描述 Pipecat 的帧式流水线：DOWNSTREAM（源到汇）和 UPSTREAM（控制）。
- 列出典型语音流水线阶段及 Pipecat 支持的传输方式。
- 解释 LiveKit Agents 的两种语音智能体类（MultimodalAgent、VoicePipelineAgent），以及各自的适用情况。
- 概述 2026 年的生产延迟预期及其如何影响架构选择。

## 问题（The Problem）

语音智能体不是给文本循环附加一个 TTS。延迟预算苛刻（约 600 毫秒），音频默认以不完整片段流动，轮次检测本身也是模型，传输方式从电话 SIP 到 WebRTC 不等。你可以构建帧式流水线（Pipecat），也可以依靠平台（LiveKit）。

## 概念（The Concept）

### Pipecat（pipecat-ai/pipecat）（Pipecat）

- Python 帧式流水线框架。
- `Frame` → `FrameProcessor` 链。
- 两个流动方向：
  - **DOWNSTREAM（下游）**：源 → 汇，即音频输入、TTS 输出。
  - **UPSTREAM（上游）**：反馈与控制，包括取消、指标和插话打断（Barge-in）。
- `PipelineTask` 通过事件（`on_pipeline_started`、`on_pipeline_finished`、`on_idle_timeout`）及用于指标、追踪、RTVI 的观察者管理生命周期。

典型流水线：

```
VAD (Silero) → STT → LLM（上下文交替使用 user/assistant）→ TTS → 传输（transport）
```

传输方式：Daily、LiveKit、SmallWebRTCTransport、FastAPI WebSocket、WhatsApp。

Pipecat Flows 增加结构化对话（状态机）。Pipecat Cloud 是托管运行时。

### LiveKit Agents（livekit/agents）（LiveKit Agents）

- 通过 WebRTC 将 AI 模型连接到用户。
- 关键概念：`Agent`、`AgentSession`、`entrypoint`、`AgentServer`。
- 两种语音智能体类：
  - **MultimodalAgent**：通过 OpenAI Realtime 或同类服务直接处理音频。
  - **VoicePipelineAgent**：STT → LLM → TTS 级联，提供文本层面的控制。
- 通过 Transformer 模型进行语义轮次检测（Semantic turn detection）。
- 原生集成 MCP。
- 通过 SIP 接入电话。
- 通过 LiveKit Inference 无需 API 密钥即可使用 50 多个模型，通过插件还可使用 200 多个模型。

### 商业平台（Commercial platforms）

Vapi（优化后的高端技术栈约 450–600 毫秒）和 Retell（180 次测试通话的端到端延迟约 600 毫秒）构建于这些组件之上。希望获得托管语音栈而没有 WebRTC 团队时，可选择平台。

### 模式的失效点（Where this pattern goes wrong）

- **没有处理插话打断（No barge-in handling）。** 用户打断，智能体却继续说。Pipecat 需要 UPSTREAM 取消帧，LiveKit 需要对应机制。
- **忽略 STT 置信度（STT confidence ignored）。** 将低置信度转写当作绝对正确的内容传给 LLM。应按置信度把关或要求确认。
- **TTS 句中截断（TTS mid-sentence cutoff）。** 流水线在话语中途取消时，必须通知 TTS 或切断音频。
- **忽略延迟预算（Latency budget ignored）。** 每个组件增加 50–200 毫秒。交付前应计算整条链的总延迟。

### 2026 年典型延迟（Typical 2026 latencies）

- 语音活动检测（VAD）：20–60 毫秒
- 语音转文本（STT）部分结果：100–250 毫秒
- LLM 首词元：150–400 毫秒
- 文本转语音（TTS）首段音频：100–200 毫秒
- 传输往返时间（RTT）：30–80 毫秒

端到端 450–600 毫秒属于高端水平；800–1200 毫秒很常见；超过 1500 毫秒就会让人觉得系统出了问题。

```figure
voice-pipeline
```

## 动手实现（Build It）

`code/main.py` 是一个帧式实验流水线，包含：

- `Frame` 类型（audio、transcript、text、tts_audio、control）。
- 带 `process(frame)` 的 `Processor` 接口。
- 由脚本化处理器构成的五阶段流水线：VAD → STT → LLM → TTS → 传输。
- 用于演示插话打断的 UPSTREAM 取消帧。

运行：

```
python3 code/main.py
```

追踪展示正常数据流，以及在话语中途停止 TTS 的插话取消过程。

## 实际应用（Use It）

- **Pipecat**：需要完整控制、自定义处理器、以 Python 为主和可插拔提供商。
- **LiveKit Agents**：以 WebRTC 为主的部署和电话接入。
- **Vapi / Retell**：没有 WebRTC 团队时使用托管语音智能体。
- **OpenAI Realtime / Gemini Live**：直接音频输入与输出（MultimodalAgent）。

## 交付成果（Ship It）

`outputs/skill-voice-pipeline.md` 搭建 Pipecat 式语音流水线骨架，包含 VAD + STT + LLM + TTS + 传输，以及插话打断处理。

## 练习（Exercises）

1. 为实验流水线添加指标观察者，统计每个阶段每秒的帧数。延迟积累在哪里？
2. 实现按置信度把关的 STT：低于阈值时请求“可以再说一遍吗？”
3. 添加语义轮次检测：采用简单规则，如果转写以“?”结尾，就结束轮次。
4. 阅读 Pipecat 的传输文档。将标准库传输替换为 SmallWebRTCTransport 配置桩。
5. 对同一查询测量 OpenAI Realtime 与 STT+LLM+TTS 级联。文本层面的控制带来多少延迟成本？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 帧（Frame） | “事件” | 流水线中带类型的数据单元，包括音频、转写、文本和控制 |
| 处理器（Processor） | “流水线阶段” | 具有 process(frame) 的处理程序 |
| DOWNSTREAM | “正向流” | 从源到汇：音频输入，语音输出 |
| UPSTREAM | “反馈流” | 控制：取消、指标、插话打断 |
| VAD | “语音活动检测（Voice activity detection）” | 检测用户何时在说话 |
| 语义轮次检测（Semantic turn detection） | “智能判断轮次结束” | 由模型决定用户是否已说完 |
| MultimodalAgent | “直接音频智能体” | 音频输入、音频输出，中间没有文本 |
| VoicePipelineAgent | “级联智能体” | STT + LLM + TTS，提供文本层面的控制 |

## 延伸阅读（Further Reading）

- [Pipecat 文档](https://docs.pipecat.ai/getting-started/introduction)：帧式流水线、处理器、传输
- [LiveKit Agents 文档](https://docs.livekit.io/agents/)：WebRTC 与语音基本构件
- [Vapi](https://vapi.ai/)：托管语音平台
- [Retell AI](https://www.retellai.com/)：经过延迟基准测试的托管语音平台
