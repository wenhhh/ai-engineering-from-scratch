# 视频语言模型：时间词元与定位（Video-Language Models: Temporal Tokens and Grounding）

> 视频不是一叠照片。5 秒片段包含因果顺序、动作动词和事件时刻，图像模型无法表达这些内容。Video-LLaMA（Zhang 等人，2023 年 6 月）推出了首个具备视听落地能力的开放视频大语言模型（LLM）。VideoChat 和 Video-LLaVA 扩展了这种模式。到 2025 年，Qwen2.5-VL 的 TMRoPE 缩小了与前沿专有模型的差距。各系统以不同方式处理时间词元：每片段一个 Q-former、逐帧拼接池化、逐词元 TMRoPE。本课解读这些模式，构建均匀与动态帧采样器，并在时间定位任务上评估。

**Type:** Build
**Languages:** Python（标准库，帧采样器 + 时间定位评估器）
**Prerequisites:** 阶段 12 · 08（LLaVA-OneVision）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 解释为什么时间位置编码可以独立于视觉编码器影响视频视觉语言模型（VLM）的性能。
- 从每秒词元数与定位准确率的角度，比较均匀、动态帧率和事件驱动帧采样。
- 描述每片段 Q-former（Video-LLaMA）、逐帧池化（Video-LLaVA）和逐词元 M-RoPE（Qwen2.5-VL）的设计。
- 列出四个视频基准：VideoMME、TempCompass、EgoSchema、Video-MMMU。

## 问题（The Problem）

30 FPS 的 1 分钟视频有 1800 帧。按每帧 196 个视觉词元计算（224 分辨率的 ViT-B），共有 352k 词元，超过 2024 年任何 LLM 的上下文长度。

有三种缩减策略：

1. 对帧降采样（根据内容选择 1-8 FPS）。
2. 对每帧图像块词元进行强池化（3x3 或 4x4 双线性池化）。
3. 通过 Q-former 压缩，将 16 帧片段作为输入，输出 64 个词元。

每种权衡都不同。降采样损失时间细节，池化损失空间细节。Q-former 会略微损失两者，但节省词元。

时间位置编码是另一个维度：模型如何知道第 5 帧在第 6 帧之前？选项包括简单的一维时间旋转位置编码（RoPE，Video-LLaMA）、学习式时间嵌入（Video-LLaVA）和 TMRoPE（Qwen2.5-VL，完整三维）。

## 概念（The Concept）

### Video-LLaMA：每片段 Q-former + 音频分支（Video-LLaMA: Q-former per clip + audio branch）

Video-LLaMA（2023）是首个开放视频 LLM。架构如下：

- 以 2 FPS 采样 16 帧片段（即 8 秒）。
- 逐帧 ViT 特征 -> 在全部 16 帧上执行交叉注意力的视频 Q-former -> 32 个可学习查询 -> LLM。
- 并行音频分支：波形 -> ImageBind 音频编码器 -> 音频 Q-former -> 32 个查询 -> LLM。

优势：视听联合推理。弱点：片段长度固定，不支持任意时间定位。

### VideoChat 与 Video-LLaVA（VideoChat and Video-LLaVA）

VideoChat 保留了 Video-LLaMA 的思路，但去掉音频并简化了架构。Video-LLaVA（Lin 等人，2023）在图像和视频帧上训练同一个视觉编码器（“先对齐，再投影”），得到统一表示。两者都采用冻结 CLIP 编码器 + 多层感知机（MLP）+ LLM。

两者都无法处理长视频，都是 8-16 帧系统。

### Qwen2.5-VL 与 TMRoPE（Qwen2.5-VL and TMRoPE）

Qwen2.5-VL 引入了 TMRoPE，即时间-模态旋转位置嵌入（Temporal-Modality Rotary Position Embedding）。每个图像块词元携带 (t, h, w) 位置，其中 t 是实际时间戳（不是帧索引）。

与简单时间嵌入的关键区别：

- 使用绝对时间，而非索引。模型看到的是“在 4.2 秒”，不是“在第 15 帧”。
- 按词元旋转，而非按片段。每个视觉词元根据自己的时间戳独立旋转。
- 兼容动态帧率。如果这里按 2 FPS、那里按 4 FPS 采样，TMRoPE 原生支持这种不均匀间隔。

TMRoPE 支持“猫在第几秒跳起来？”这类查询。模型可以输出“在 4.2 秒”。Video-LLaMA 只能说“在片段开头”。

### 帧采样策略（Frame sampling strategies）

均匀采样：在整个时长内均匀采样 N 帧。简单，但会丢失运动峰值。

动态帧率（Dynamic FPS）：根据运动强度自适应采样。光流或帧差选择高运动片段，进行更密集的采样。Qwen2.5-VL 使用这种方式训练。

事件驱动：运行轻量检测器，在动作发生处增加采样。VideoAgent 使用该方式。

关键帧 + 上下文：在镜头边界及其相邻若干帧采样。用于电影类内容。

### 逐帧池化（Pooling per frame）

以 1 FPS、每帧 576 个词元计算，5 分钟片段有 172,800 个词元。Qwen2.5-VL-72B 的 128k 上下文可以处理，但成本高。

3x3 双线性池化将每帧缩减至 64 个词元 -> 5 分钟共 19,200 个词元。这是多数任务的合适折中点。

对于空间细节较不重要的智能体工作流，可使用更强的池化（6x6 -> 每帧 16 个词元）。

### 四个视频基准（The four video benchmarks）

- VideoMME：全面的视频理解，覆盖短、中、长视频。
- TempCompass：细粒度时间推理，“之前” / “之后”问题。
- EgoSchema：长时域第一人称视频。
- Video-MMMU：多模态、多学科视频问题。

完整的视频 VLM 评估应覆盖四者。它们强调不同维度：TempCompass 专注顺序，EgoSchema 专注 3+ 分钟推理，VideoMME 跨越多种时长。

### 定位输出格式（Grounding output formats）

时间定位的输出格式：

- 自由文本：“猫在大约第 4 秒跳起来。”易于解析，但不精确。
- 结构化 JSON：`{"event": "jump", "start": 4.1, "end": 4.3}`。Qwen2.5-VL 针对此格式训练。
- 基于词元：特殊的 `<time>4.1</time>` 词元与答案交错。这是 Qwen2.5-VL 的内部格式。

基于词元的格式对下游使用最准确。Qwen2.5-VL 的 JSON 输出格式可以直接解析。

### 2026 年最佳实践（2026 best practice）

对于 2026 年的视频 VLM：

- 编码器：带 M-RoPE 或 TMRoPE 的 SigLIP 2（Qwen2.5-VL）。
- 帧采样：动态帧率（根据运动选择 1-4），设置最大帧数上限。
- 逐帧池化：3x3 双线性。
- 输出：包含时间和事件字段的结构化 JSON。
- 基准：通用任务用 VideoMME + TempCompass；长时域用 EgoSchema。

```figure
video-temporal-patches
```

## 动手使用（Use It）

`code/main.py` 包含：

- 均匀与动态帧率采样器。
- 简化的时间定位评估器：给定发生在时间 T 的“真实标注”事件和模型输出，在容差范围内评估准确率。
- 对比 Video-LLaMA（16 帧，Q-former）、Video-LLaVA（8 帧，MLP）、Qwen2.5-VL（动态帧率 + TMRoPE）。

## 交付成果（Ship It）

本课产出 `outputs/skill-video-vlm-frame-planner.md`。给定视频任务（监控、动作识别、时间定位、摘要），它会选择帧采样器、池化因子、输出格式和预期准确率档位。

## 练习（Exercises）

1. 对于 3 分钟烹饪演示，选择均匀还是动态帧率采样。用词元数量论证。

2. TMRoPE 具体增加了哪些简单时间嵌入表无法提供的能力？

3. 编写 VLM 可以学习输出的时间定位 JSON 模式。包含错误情况。

4. 阅读 Video-LLaVA 第 3 节“投影前对齐”。为什么它优于分别训练图像编码器和视频编码器？

5. 根据 VideoMME 排行榜，截至 2026 年，最强开放模型与最强专有模型之间的差距是多少？其中有多少归因于时间编码，而非基础 LLM 规模？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 时间定位（Temporal grounding） | “带时间定位的答案” | VLM 输出事件发生的具体时间戳范围 |
| TMRoPE | “时间-多模态 RoPE” | 带绝对时间戳的三维旋转位置编码，由 Qwen2.5-VL 使用 |
| 动态帧率（Dynamic FPS） | “运动感知采样” | 高运动片段采更多帧，静态片段采更少帧 |
| 帧池化（Frame pooling） | “逐帧空间压缩” | 在进入 LLM 前，通过双线性插值减少每帧图像块 |
| 视频 Q-former（Video Q-former） | “片段压缩器” | 将 N 帧映射为 K 个可学习查询的交叉注意力瓶颈 |
| VideoMME | “视频基准” | 全面的短、中、长视频基准，包含 2500+ 个样本 |

## 延伸阅读（Further Reading）

- [Zhang 等人：Video-LLaMA（arXiv:2306.02858）](https://arxiv.org/abs/2306.02858)
- [Li 等人：VideoChat（arXiv:2305.06355）](https://arxiv.org/abs/2305.06355)
- [Lin 等人：Video-LLaVA（arXiv:2311.10122）](https://arxiv.org/abs/2311.10122)
- [Qwen 团队：Qwen2.5-VL（arXiv:2502.13923）](https://arxiv.org/abs/2502.13923)
- [Lin 等人：VILA-1.5（arXiv:2312.07533）](https://arxiv.org/abs/2312.07533)
