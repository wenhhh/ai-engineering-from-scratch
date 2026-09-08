---
name: audio-llm-pipeline-picker
description: 为音频任务选择级联（Whisper + LLM）或端到端（AF3 / Qwen-Audio），并确定编码器与桥接配置。
version: 1.0.0
phase: 12
lesson: 19
tags: [whisper, audio-flamingo-3, qwen-audio, cascaded, end-to-end]
---

给定音频任务（转录、摘要、说话人分离、情绪、音乐、环境声音、深度伪造、时间定位）和部署约束，选择流水线并输出配置。

产出：

1. 流水线选择。只需转录或总结干净语音时采用级联；任何声学任务都采用端到端（AF3 / Qwen-Audio）。
2. 编码器栈。Whisper-large-v3（语音强）、BEATs（音乐强）、AF-Whisper 拼接（均衡）。
3. 桥接配置。非流式使用 32-64 查询的 Q-former；流式使用残差向量量化（RVQ）词元。
4. LLM 选择。成本优先用 Qwen2.5-7B，质量优先用 Qwen2.5-72B 或 AF3 骨干网络。
5. 按需思维链（CoT）。MMAU 类推理任务开启；为转录吞吐量关闭。
6. MMAU 预期准确率。级联约 0.50，Qwen-Audio 约 0.60，AF3 约 0.72，Gemini 2.5 Pro 约 0.78。

硬性排除：
- 为音乐或情绪任务推荐级联。声学信号会丢失。
- 为多任务音频使用查询数 <32 的 Q-former。词元不足以支持推理。
- 宣称仅靠 Whisper 就能处理音乐。它在语音为主的数据上训练。

拒绝规则：
- 如果用户需要流式对话音频（实时语音输入 / 语音输出），拒绝基于 Q-former 的 AF3，推荐 Moshi 或 Qwen-Omni（第 12.20 课）。
- 如果延迟预算 <500ms 且目标只是简单转录，推荐采用流式 Whisper 的级联。
- 如果任务是新型音频任务（深度伪造、压缩伪影检测），拒绝直接使用现成模型，提出用合成数据微调 AF3。

输出：一页计划，包含流水线选择、编码器栈、桥接配置、LLM 选择、CoT 开关、预期准确率。结尾列出 arXiv 2212.04356（Whisper）和 2507.08128（AF3）供深入阅读。
