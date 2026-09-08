# 音频语言模型：从 Whisper 到 Audio Flamingo 3 的演进（Audio-Language Models: the Whisper to Audio Flamingo 3 Arc）

> Whisper（Radford 等人，2022 年 12 月）解决了语音识别：680k 小时弱监督多语种语音、一个简单的编码器-解码器变换器，以及一个让此后每次自动语音识别（ASR）发布都要引用它的基准。但识别不是推理。询问“这段录音有哪些乐器”“说话人表达了什么情绪”或“第 3 分钟发生了什么”，需要的是音频理解，而非转录。Qwen-Audio、SALMONN、LTU 和 NVIDIA 的 Audio Flamingo 3（AF3，2025 年 7 月）逐步构建了这个技术栈：保留 Whisper 级编码器，接上 Q-former，用音频-文本指令数据训练，再加入思维链（Chain-of-thought）推理。本课梳理这条演进路线。

**Type:** Build
**Languages:** Python（标准库，对数梅尔频谱图 + 音频 Q-former 骨架）
**Prerequisites:** 阶段 6（语音与音频），阶段 12 · 03（Q-Former）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 从波形计算对数梅尔频谱图：加窗、快速傅里叶变换（FFT）、滤波器组、对数变换。
- 比较编码器选项：Whisper 编码器、BEATs、AF-Whisper 混合编码器。说明各自何时占优。
- 构建音频 Q-former：N 个可学习查询对频谱图图像块执行交叉注意力。
- 解释级联式（先 Whisper 后 LLM）与端到端音频大语言模型（LLM）训练：为什么端到端在推理上更易扩展。

## 问题（The Problem）

Whisper 解决了语音识别。音频版光学字符识别（OCR）已是通用能力。但这种“通用能力”止步于转录。如果模型无法推理它听到的时间、说话人、情绪、音乐结构和环境声音，仅靠转录就无法支撑产品功能。

有三条明显的路线：

1. 级联：Whisper 转录，LLM 对转录文本推理。适用于纯语音场景。不适用于音乐、环境音频、多说话人重叠和情绪。

2. 端到端音频 LLM：音频编码器将音频词元直接输入 LLM，跳过转录。保留声学信息（情绪、说话人、环境）。需要新的训练数据。

3. 混合：音频编码器 + 既能转录又能推理的文本解码器。Qwen-Audio 和 Audio Flamingo 选择这条路线。

## 概念（The Concept）

### 对数梅尔频谱图：输入特征（Log-Mel spectrogram: the input feature）

每个音频编码器都从同一种特征开始：对数梅尔频谱图（Log-Mel spectrogram）。

1. 重采样至 16 kHz。
2. 用 25ms 窗口、10ms 帧移执行短时傅里叶变换。
3. 取 FFT 结果的幅值。
4. 应用梅尔滤波器组（通常为在 0-8000 Hz 对数间隔分布的 80 个滤波器），映射到感知频率。
5. 通过对数压缩（log(1 + x)）处理动态范围。

结果：形状为 (T, 80) 的二维数组，T 为时间帧数。对于帧率为 100 Hz 的 30 秒片段，形状为 (3000, 80)。

### Whisper 编码器（Whisper's encoder）

Whisper 编码器是 12 层 ViT 风格变换器，将对数梅尔频谱图作为时间帧序列处理。输出为每个时间帧一个隐藏状态向量。

对于 ASR，Whisper 解码器是交叉注意力变换器，以编码器输出为条件生成文本词元。这是标准的编码器-解码器结构。

对于音频语言模型（ALM，即音频 LLM），需要将编码器输出作为另一个 LLM 的输入。模式为：冻结 Whisper 编码器，训练 Q-former，LLM 冻结或微调。

### BEATs 与音频专用编码器（BEATs and audio-specific encoders）

Whisper 在以语音为主的数据上训练，因此对音乐和环境音频较弱。

BEATs（Chen 等人，2022）是在 AudioSet 上训练的自监督变换器。相同参数量下，它比 Whisper 更善于捕获音乐和环境声音。

AF-Whisper（Audio Flamingo 3 的混合方案）：拼接 Whisper + BEATs 特征作为音频输入。Whisper 携带语言信号，BEATs 携带声学信号。

### 音频 Q-former（Audio Q-former）

与 BLIP-2 的视觉 Q-former 模式相同。固定数量的可学习查询（通常为 32 或 64）对音频编码器输出帧执行交叉注意力。查询变为供 LLM 使用的音频词元。

训练对齐阶段：只训练 Q-former，在音频-文本对（AudioCaps、Clotho）上使用对比损失与描述生成损失。指令阶段：端到端训练，解冻 LLM，在指令数据上训练。

### 演进：SALMONN、Qwen-Audio、AF3（The arc — SALMONN, Qwen-Audio, AF3）

SALMONN（Tang 等人，2023）：Whisper + BEATs + Q-former + LLaMA。首个具备较强推理能力的开放音频 LLM。MMAU 基准综合分数约为 0.55。

Qwen-Audio（Chu 等人，2023）：架构类似，在更丰富的数据集上训练，针对多轮对话调优。MMAU 约为 0.60。

LTU，即聆听、思考、理解（Listen, Think, Understand，Gong 等人，2023）：使用显式推理数据，侧重音频片段上的思维链。规模更小，但更专注。

Audio Flamingo 3（Goel 等人，2025 年 7 月）：当前开放模型最佳水平。8B LLM 骨干网络（Qwen2 7B）、Whisper-large 编码器拼接 BEATs、64 查询 Q-former，在 1M+ 音频-文本指令对上训练。MMAU 为 0.72，在部分子任务上匹敌专有前沿模型。

AF3 还引入了音频按需思维链：模型可以选择在最终答案前输出思考词元（“让我先识别乐器：……”）。开启思考后，复杂推理任务准确率提高 3-5 分。

### 级联与端到端（Cascaded vs end-to-end）

级联流水线：

1. Whisper 将音频转录为文本。
2. LLM 对文本推理。

对于“总结这个播客”完全适用。但不适用于：
- “这首歌是什么情绪？”情绪存在于声音中，而非文字中。
- “谁在说话，Alice 还是 Bob？”需要说话人识别。
- “爆炸发生在第几秒？”文本丢失了时间定位信息。
- “这是真实音频还是生成音频？”深度伪造检测需要声学特征。

端到端保留声学信号。Qwen-Audio 和 AF3 原生处理音乐、环境和情绪。

### 2026 年生产配方（2026 production recipe）

对于新的音频理解产品：

- 若目标是转录，不涉及音乐和情绪推断，使用级联。
- 若涉及音乐、情绪、多说话人或复杂音频推理，使用 AF3 / Qwen-Audio 系列。

级联更便宜、更简单。端到端能力更强。

### MMAU：音频推理基准（MMAU — the audio reasoning benchmark）

MMAU（大规模多模态音频理解，Massive Multimodal Audio Understanding）是 2024-2025 年的音频推理基准：

- 10,000 个音频-文本问答对，覆盖语音、音乐和环境声音。
- 覆盖分类、时间推理、因果推理和开放式问答。
- 测试级联流水线系统性遗漏的内容。

开放模型最佳水平（AF3）为 0.72；专有前沿模型约为 0.78（Gemini 2.5 Pro、Claude Opus 4.7）。差距小于 VideoMME 的开放与闭源差距，说明音频 LLM 正在成熟。

```figure
audio-text-ctc
```

## 动手使用（Use It）

`code/main.py`：

- 用标准库实现对数梅尔频谱图计算：加窗、朴素离散傅里叶变换（DFT）、梅尔滤波器组。
- 音频 Q-former 骨架：给定编码器输出帧，计算 Q、K、V、注意力，并输出 N 个词元。
- 在简化任务上比较级联与端到端。

## 交付成果（Ship It）

本课产出 `outputs/skill-audio-llm-pipeline-picker.md`。给定音频任务（转录、音乐标注、情绪推断、多说话人分离、环境分类），它会选择级联、端到端 AF3 或混合方案。

## 练习（Exercises）

1. 计算 30 秒片段在 16kHz、25ms 窗口、10ms 帧移、80 个梅尔频带下的对数梅尔频谱图维度。改为 48kHz 后如何变化？

2. 为什么 Whisper 在音乐上表现较弱？BEATs 捕获了哪些 Whisper 没有捕获的音频特征？

3. 音频 Q-former 使用 64 个查询和 32 个查询相比：任务复杂到什么程度时，64 个才值得？32 个在哪些任务上节省计算？

4. 阅读 AF3 第 4 节关于按需思考的内容。提出三个最能受益于思维链的音频任务。

5. 使用 AF3 的输出实现最小说话人分离流水线。如何标示说话人变化？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 对数梅尔频谱图（Log-Mel spectrogram） | “梅尔特征” | 经过梅尔滤波器组后，包含对数幅值的二维（时间、频率）数组 |
| 音频 Q-former（Audio Q-former） | “音频 Perceiver” | 将音频编码器输出转换为送入 LLM 的定长查询的交叉注意力瓶颈 |
| 级联（Cascaded） | “先 ASR 后 LLM” | Whisper 转录、文本 LLM 推理的流水线；丢失声学信息 |
| 端到端（End-to-end） | “音频 LLM” | 音频特征通过 Q-former 直接进入 LLM；保留声学信号 |
| BEATs | “AudioSet 音频编码器” | 在 AudioSet 上训练的自监督学习（SSL）变换器；擅长音乐和环境声音 |
| MMAU | “音频推理基准” | 覆盖语音、音乐、环境的 10k 问答对；2024 年评估标准 |
| 按需思考（On-demand thinking） | “音频思维链（CoT）” | 模型可选择在最终答案前输出推理词元，将准确率提高 3-5 分 |

## 延伸阅读（Further Reading）

- [Radford 等人：Whisper（arXiv:2212.04356）](https://arxiv.org/abs/2212.04356)
- [Chu 等人：Qwen-Audio（arXiv:2311.07919）](https://arxiv.org/abs/2311.07919)
- [Goel 等人：Audio Flamingo 3（arXiv:2507.08128）](https://arxiv.org/abs/2507.08128)
- [Tang 等人：SALMONN（arXiv:2310.13289）](https://arxiv.org/abs/2310.13289)
- [Gong 等人：LTU（arXiv:2305.10790）](https://arxiv.org/abs/2305.10790)
