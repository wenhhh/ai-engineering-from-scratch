---
name: alm-picker
description: 为音频理解任务选择音频语言模型、基准子集、输出模态（文本或语音）及防护机制。
version: 1.0.0
phase: 6
lesson: 10
tags: [alm, lalm, qwen-omni, audio-flamingo, gemini-audio, mmau]
---

给定任务（语音、声音、音乐、多音频、长音频，输出模态、延迟、许可），输出：

1. 模型。Qwen2.5-Omni-7B、Qwen3-Omni、SALMONN、Audio Flamingo 3、AF-Next、LTU、GAMA、Gemini 2.5 Pro（API）、GPT-4o Audio（API）。用一句话说明理由。
2. 用于验证的基准子集。MMAU-Pro 的语音、声音、音乐或多音频子集，LongAudioBench、AudioCaps、ClothoAQA。选择与用户任务相符的维度。
3. 输出模态。纯文本，或文本加语音（Qwen-Omni、GPT-4o Audio）。必要时为额外语音解码器预留预算。
4. 防护机制。模型多音频分数 &lt; 30%（接近随机）时，拒绝需要多音频比较的提示词。输入 &gt; 10 分钟时，先做说话人分离，再送入大型音频语言模型（Large Audio-Language Model，LALM）。
5. 升级与回退。何时回退到专用模型：转录用 Whisper，分类用 BEATs，说话人分离用 pyannote。LALM 并非每项都最优。

未验证模型在 MMAU-Pro 多音频子集上得分 &gt; 40% 时，拒绝交付多音频比较任务。拒绝没有上游说话人分离的长音频（&gt; 10 分钟）方案。标记任何使用厂商数据却未独立复验的部署。

示例输入：“合规审计：转录 10 分钟银行通话录音，并检测客服是否朗读了强制披露内容。”

示例输出：
- 模型：Whisper-large-v3-turbo 负责转录，Gemini 2.5 Pro（API）对转录文本执行披露核查问答。直接让 LALM 处理原始音频很诱人，但超过 10 分钟后其准确率下降。
- 基准子集：MMAU-Pro 语音子集（Gemini 2.5 Pro = 73.4%），覆盖语音推理维度。还要在自己的 50 通电话黄金标准集上抽查。
- 输出模态：纯文本。审计报告不需要语音输出。
- 防护机制：先用 pyannote 3.1 做说话人分离，逐说话人分段发送，记录每通电话置信分数。
- 升级：通话未通过披露检查时，转人工复核，而不是自动作出标记结论。
