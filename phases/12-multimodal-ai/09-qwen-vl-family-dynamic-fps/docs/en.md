# Qwen-VL 家族与动态帧率视频（Qwen-VL Family and Dynamic-FPS Video）

> Qwen-VL 家族包括 Qwen-VL（2023）、Qwen2-VL（2024）、Qwen2.5-VL（2025）、Qwen3-VL（2025），是 2026 年最具影响力的开放视觉语言模型谱系。每一代都作出一项决定性的架构选择，开放生态的其他成员在十二个月内便跟进：通过 M-RoPE 实现原生动态分辨率、带绝对时间对齐的动态帧率采样、ViT 中的窗口注意力，以及结构化智能体输出格式。到 Qwen3-VL 时，方案已稳定：接收原生宽高比输入的 2D-RoPE-ViT 编码器，通过 MLP 投影器接入大型 Qwen3 语言基座，训练阶段把 OCR、依据关联（Grounding）和智能体行为作为首要目标。本课按时间梳理该家族，帮助你理解每个调节项为何如此设计。

**Type:** Learn
**Languages:** Python（标准库，M-RoPE 编码器 + 动态 FPS 采样器）
**Prerequisites:** 阶段 12 · 06（分块打包，Patch-n'-pack）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 计算 M-RoPE 的三轴旋转（时间、高度、宽度），解释为何三者缺一不可。
- 为视频选择动态帧率（Dynamic FPS）采样策略，推理每秒词元数与事件检测准确率的权衡。
- 按顺序说出 Qwen-VL 的四代升级及各自带来的能力。
- 接入 Qwen2.5-VL 式 JSON 智能体输出格式，从 VLM 回答中解析结构化工具调用。

## 问题（The Problem）

Qwen-VL 于 2023 年 8 月发布，直接回应 LLaVA-1.5 和 BLIP-2。Qwen 团队针对三个缺口：分辨率、视频、结构化输出。

分辨率：LLaVA-1.5 运行在 336x336，适合照片，却无法胜任中文发票或密集电子表格截图。Qwen-VL 的首项创新是 448x448，以及有依据的边界框输出，让模型能够指出对象位置。

视频：Video-LLaMA 堆叠逐帧编码器，再送入 LLM。它适合短片，但不适合时间轴本身就是信号的多分钟视频。Qwen 团队希望用单个编码器理解时间。

结构化输出：LLaVA 输出自由文本，而智能体需要 JSON。Qwen-VL 使用显式 JSON 输出格式训练，包括作为文本的边界框坐标。

Qwen-VL 每一代都扩展这三个方向之一。

## 概念（The Concept）

### Qwen-VL（2023 年 8 月）（Qwen-VL (August 2023)）

第一代使用 OpenCLIP ViT-bigG/14 编码器（2.5B 参数）、兼容 LLama 的 Q-Former（1 步、256 查询）和 Qwen-7B 基座。贡献包括：

- 448x448 分辨率，当时开放 VLM 中的最先进水平。
- 依据关联：使用带显式坐标词元输出的图文对训练。“猫位于 <box>(112, 204), (280, 344)</box>”。
- 从一开始就采用中文 + 英文多语言训练。

当时的基准表现：英语可与 GPT-4V 竞争，中文领先。依据关联监督是真正亮点。

### Qwen2-VL（2024 年 9 月）：M-RoPE 与原生分辨率（Qwen2-VL (September 2024) — M-RoPE and native resolution）

Qwen2-VL 用原生动态分辨率 ViT 编码器取代固定分辨率 + Q-Former 系统。主要变化：

- 原生动态分辨率。ViT 接受 H、W 可被 28 整除的任意图像（图像块 14，空间合并 2 倍）。1120x672 图像（40x24 合并图像块）生成 960 个视觉词元。无需缩放、分块或缩略图。
- M-RoPE（多模态 RoPE）。每个词元携带三维位置 (t, h, w)，而非一维。图像 t=0，视频 t = frame_index。RoPE 按每轴频率旋转查询/键向量，无需位置嵌入表。
- MLP 投影器。去掉 Q-Former，对合并后的图像块词元使用两层 MLP。
- 动态 FPS 视频。默认按 1-2 FPS 采样，但模型接受任意帧数。

结果：Qwen2-VL-7B 在若干多模态基准上达到 GPT-4o 水平，并在 DocVQA 上超过它（94.5 对 88.4）。架构变化是决定性举措。

### Qwen2.5-VL（2025 年 2 月）：动态 FPS + 绝对时间（Qwen2.5-VL (February 2025) — dynamic FPS + absolute time）

Qwen2.5-VL 的主要转变在视频。动态 FPS 不只是“需要时采样更多帧”，论文明确了：

- 绝对时间词元（Absolute time token）。用真实时间戳取代位置索引（帧 0、1、2……）。“在 0:04，猫跳起来。”模型看到 `<time>0.04</time>` 词元与帧词元交错出现。
- 动态 FPS。缓慢画面使用 1 FPS，动作使用 4+ FPS。由用户或训练者选择，M-RoPE 随之适配。
- ViT 窗口注意力（Window attention）。空间注意力限制在窗口内（块内局部），以提高吞吐量；每隔几层执行全局注意力。
- 显式 JSON 输出格式。使用工具调用数据训练：“{\"tool\": \"click\", \"coords\": [380, 220]}”。开箱即可用于智能体。
- MRoPE-v2 缩放。位置随最大输入尺寸缩放，使 10 分钟视频不会超出频率范围。

基准方面：Qwen2.5-VL-72B 在多数视频基准上超过 GPT-4o，在文档上达到 Gemini 2.0 水平，并创下开放模型 GUI 依据关联最佳水平（ScreenSpot 准确率 84%，GPT-4o 为 38%）。

### Qwen3-VL（2025 年 11 月）（Qwen3-VL (November 2025)）

Qwen3-VL 是以整合而非重构为主的增量升级：更大的 LLM 骨干网络（Qwen3-72B）、扩大的训练数据、更好的 OCR，以及 Qwen3“思考模式”带来的更强推理。ViT 与 M-RoPE 保留。论文重点是数据和训练改进，而非架构。

该谱系的结论是：到 2025 年，Qwen-VL 架构已稳定。后续代际扩展计算和数据，而不改变原语。

### M-RoPE 的数学形式（M-RoPE mathematically）

经典 RoPE 使用成对坐标，按位置 `m` 旋转维度为 `d` 的查询 `q`：

```
q_rot[2i]   = q[2i]   * cos(m * theta_i) - q[2i+1] * sin(m * theta_i)
q_rot[2i+1] = q[2i]   * sin(m * theta_i) + q[2i+1] * cos(m * theta_i)
theta_i     = 10000^(-2i/d)
```

M-RoPE 将隐藏维度分成三个区段。假设 `d = 96`，时间、高度、宽度各分配 32 维。每个区段按自身轴的位置旋转。位置 (t=5, h=10, w=20) 的图像块，三个区段分别应用 `R_t(5)`、`R_h(10)`、`R_w(20)` 旋转。

文本词元使用 `t = text_index, h = 0, w = 0`（或某种归一化选择）保持兼容；视频帧使用 `t = frame_time, h = row, w = col`；单张图像使用 `t = 0`。

优势是同一种位置编码无需分支代码或不同位置表，就能处理文本、图像和视频。

### 动态 FPS 采样逻辑（Dynamic-FPS sampling logic）

给定时长为 `T` 秒的视频，以及目标词元预算 `B`：

1. 计算可承担的最大 FPS：`fps_max = B / (T * tokens_per_frame)`。
2. 从 `{1, 2, 4, 8}` 选择满足 `fps <= fps_max` 的目标 FPS。
3. 若运动较多（光流启发式或用户显式要求），选择更高 FPS；运动较少则选择更低值。
4. 以选定 FPS 均匀采样，在帧间插入 `<time>t</time>` 词元。

Qwen2.5-VL 在训练中隐式学习这种逻辑；推理时用户通过 `fps` 参数控制。60 秒动作片段，4 FPS，每帧 81 词元 = 19440 词元，32k 上下文可以容纳。

### 结构化智能体输出（Structured agent output）

Qwen2.5-VL 的智能体训练明确针对结构化工具调用：

```
{
  "tool": "mouse_click",
  "coords": [1024, 512],
  "button": "left",
  "modifier": null
}
```

解析是确定性的：对模型输出执行 JSON.parse。相比之下，自由文本“点击 (1024, 512)”需要正则表达式和歧义处理。该转变使 Qwen2.5-VL 的 ScreenSpot 分数从 Qwen2-VL 的 55% 跃升到 84%。

```figure
mm-mrope-axes
```

## 实际应用（Use It）

`code/main.py` 实现：

- 为混合文本、图像块和视频帧的打包序列计算 M-RoPE 位置。
- 动态 FPS 采样器：给定 (duration, budget, motion_level)，选择 FPS 并输出帧时间戳。
- 玩具 Qwen2.5-VL JSON 输出解析器，处理带坐标字段的工具调用回答。

运行它，再把 5 分钟视频的固定 FPS 换成动态 FPS，体会差异。

## 交付成果（Ship It）

本课交付 `outputs/skill-qwen-vl-pipeline-designer.md`。给定视频任务（监控、智能体、动作识别、无障碍），它输出 Qwen2.5-VL 配置（帧预算、FPS 策略、窗口注意力标志、智能体输出模式）和延迟估算。每次为视频产品部署 Qwen-VL 家族模型时使用。

## 练习（Exercises）

1. 对位置 (t=3, h=5, w=7) 的图像块，使用隐藏维度 48（每区段 16，基础 theta 为 10000）计算 M-RoPE 旋转。给出每区段前三对坐标的旋转角度。

2. 10 分钟安防摄像头录像在 1 FPS 下生成多少帧？384 分辨率、3 倍池化时，总计多少词元？Qwen2.5-VL 默认 32k 上下文能容纳吗？

3. 为 30 秒网球回合、30 秒食谱演示、30 秒 UI 智能体录像选择 FPS。根据动态 FPS 逻辑分别说明理由。

4. Qwen2.5-VL 完全去掉 Q-Former。为什么简单 MLP 在 2025 年有效，而在 2023 年不行？提示：数据规模和编码器质量。

5. 将三份 Qwen2.5-VL JSON 工具调用输出解析为 Python 字典。JSON 格式错误时会在哪里失败？Qwen 实践指南推荐什么恢复策略？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| M-RoPE | “多模态 RoPE” | 三维旋转位置嵌入，在隐藏维度中划分时间、高度、宽度区段 |
| 动态 FPS（Dynamic FPS） | “智能采样” | 根据运动、时长和词元预算逐视频选择帧采样率 |
| 绝对时间词元（Absolute time token） | “时间戳词元” | 在序列中交错插入 `<time>t</time>`，让模型看到实际秒数，而非帧索引 |
| 窗口注意力（Window attention） | “局部注意力” | 将空间自注意力限制在小窗口以提速，定期加入全局注意力 |
| 结构化智能体输出（Structured agent output） | “JSON 模式” | 通过训练数据监督，让 VLM 输出包含坐标和工具名的可解析 JSON |
| min_pixels / max_pixels | “分辨率边界” | Qwen2.5-VL 逐请求控制参数，限制总像素数，从而限制词元数 |
| 依据关联（Grounding） | “指出它” | 将边界框坐标作为文本词元输出，从 Qwen-VL v1 起使用 |

## 延伸阅读（Further Reading）

- [Bai 等人：Qwen-VL（arXiv:2308.12966）](https://arxiv.org/abs/2308.12966)
- [Wang 等人：Qwen2-VL（arXiv:2409.12191）](https://arxiv.org/abs/2409.12191)
- [Qwen 团队：《Qwen2.5-VL 技术报告（Technical Report）》（arXiv:2502.13923）](https://arxiv.org/abs/2502.13923)
- [Qwen 团队：Qwen3-VL（arXiv:2511.21631）](https://arxiv.org/abs/2511.21631)
- [Zhu 等人：InternVL3（arXiv:2504.10479）](https://arxiv.org/abs/2504.10479)
