# Show-o 与离散扩散统一模型（Show-o and Discrete-Diffusion Unified Models）

> Transfusion 混合连续与离散表示。Show-o（Xie 等人，2024 年 8 月）走另一条路：文本词元采用因果下一词元预测，图像词元采用 MaskGIT 式掩码离散扩散（Masked discrete diffusion）。两者位于同一变换器内，使用混合注意力掩码。结果是在一个骨干网络、每模态一个分词器、一种损失形式（将下一词元扩展为掩码预测）下，统一 VQA、文生图、图像修补和混合模态生成。本课梳理 Show-o 设计，解释为何掩码离散扩散可以并行、少步生成图像，并与 Transfusion、Emu3 对照。

**Type:** Learn
**Languages:** Python（标准库，掩码离散扩散采样器）
**Prerequisites:** 阶段 12 · 13（Transfusion）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 解释掩码离散扩散：均匀遮蔽词元，再要求变换器恢复它们的调度。
- 从速度与质量比较并行图像解码（Show-o、MaskGIT）和自回归图像解码（Chameleon、Emu3）。
- 说出 Show-o 用同一检查点处理的三项任务：文生图（T2I）、VQA、图像修补。
- 选择掩码调度（余弦、线性、截断），推理其对样本质量的影响。

## 问题（The Problem）

Transfusion 双损失训练有效，但动态更难处理：连续扩散损失与离散 NTP 损失的数值尺度不同。平衡损失权重需要超参数搜索。架构有效，却复杂。

Show-o 的答案是像 Chameleon 一样保持两种模态离散，但用掩码离散扩散并行生成图像，而非顺序生成。训练目标变成单一掩码词元预测，自然推广下一词元预测。

## 概念（The Concept）

### 掩码离散扩散（Masked discrete diffusion，MaskGIT）

Chang 等人（2022）原始 MaskGIT 技巧很简洁。从完全遮蔽的图像开始，每个词元都是特殊 `<MASK>` ID。每步并行预测所有遮蔽词元，保留置信度最高的 top-K 预测，其余重新遮蔽。约 8-16 次迭代后，所有词元填满。每步解除遮蔽的数量需要调节，余弦调度效果好。

训练简单：从 [0, 1] 均匀采样遮蔽比例，应用到图像 VQ 词元上，训练变换器恢复被遮蔽部分。这正是 BERT 对文本所做的事，扩展到了图像生成。

### Show-o：一个变换器，混合掩码（Show-o: one transformer, hybrid mask）

Show-o 将 MaskGIT 放入因果语言模型变换器。注意力掩码为：

- 文本词元：因果，标准 LLM 方式。
- 图像词元：同图像区域内完全双向，让遮蔽词元在预测时看到其他所有图像词元。
- 文本与图像之间：文本关注前置图像，图像关注前置文本。

训练交替进行：
1. 文本序列上的标准 NTP。
2. T2I 样本：文本 → 图像，遮蔽图像词元，采用掩码词元预测损失。
3. VQA 样本：图像 → 文本，遮蔽文本词元，实际上就是 NTP。

统一损失是 `<MASK>` 词元上的交叉熵，同时覆盖文本 NTP（只“遮蔽”最后一个词元）和图像掩码扩散（随机子集被遮蔽）。

### 并行采样（Parallel sampling）

Show-o 约 16 步生成一张图像，而不是约 1000 步（逐词元自回归）或约 20 步（扩散）。每步并行预测全部遮蔽词元，确定置信度最高的 top-K，然后重复。

比较：
- Chameleon / Emu3：对词元自回归，需要 N_tokens 次前向传播，每图通常 1024-4096 次。
- Transfusion：连续扩散，约 20 步，每步一次完整变换器前向传播。
- Show-o：掩码离散扩散，约 16 步，每步一次完整变换器前向传播。

同等规模下，Show-o 快于 Chameleon，步数大致接近 Transfusion，但每步成本更低（离散词表未归一化分数相对连续 MSE 损失）。

### 同一检查点中的任务（Tasks in one checkpoint）

Show-o 推理支持四项任务，由提示词格式选择：

- 文本生成：标准自回归文本输出。
- VQA：输入图像，输出文本。
- T2I：输入文本，通过掩码离散扩散输出图像。
- 图像修补（Inpainting）：输入部分词元被遮蔽的图像，填补缺失部分。

图像修补能力自然来自掩码预测训练。遮蔽 VQ 词元网格的一块区域，输入其余部分及文本提示词，预测被遮蔽词元。

### 掩码调度（Masking schedule）

每步解除多少词元的遮蔽会影响质量。Show-o 推荐余弦：

```
mask_ratio(t) = cos(pi * t / (2 * T))   # t = 0..T
```

第 0 步全部遮蔽，比例为 1.0；第 T 步无任何遮蔽。余弦将分布质量集中在预测最有信息量的中间比例。线性调度也有效，但更快进入平台期。

### Show-o2

Show-o2（2025 年后续版本，arXiv 2506.15564）扩展 Show-o：更大 LLM 基座、更好分词器、改进掩码调度。架构模式相同。

### Show-o 的位置（Where Show-o sits）

2026 年的分类如下：

- 离散词元 + NTP：Chameleon、Emu3。简单，但推理慢。
- 离散词元 + 掩码扩散：Show-o、MaskGIT、LlamaGen、Muse。并行采样，仍受分词器有损性限制。
- 连续 + 扩散：Transfusion、MMDiT、DiT。质量最高，训练更复杂。
- VLM 中的连续表示 + 流匹配：JanusFlow、InternVL-U。最新路线。

按任务选择：需要一个开放模型以合理速度完成 T2I + 修补 + VQA，选 Show-o；质量至上且能承担双损失连接复杂度，选 Transfusion。

```figure
masked-diffusion-unmask
```

## 实际应用（Use It）

`code/main.py` 模拟 Show-o 采样：

- 一个包含 16 个 VQ 词元的玩具网格。
- 一个模拟“变换器”，根据提示词和当前未遮蔽词元预测未归一化分数（Logits）。
- 按余弦调度执行 8 步并行掩码采样。
- 打印中间状态（遮蔽模式演变）和最终词元。

运行它，观察遮蔽如何逐步消失。

## 交付成果（Ship It）

本课交付 `outputs/skill-unified-gen-model-picker.md`。给定需要同时理解（VQA、描述）与生成（T2I、修补），且要求开放权重的产品，它在 Show-o 家族、Transfusion/MMDiT 家族、Emu3 / Chameleon 家族之间选择，并给出具体权衡。

## 练习（Exercises）

1. 掩码离散扩散约 16 步采样。为什么不是 1 步？第 0 步解除全部遮蔽会出什么问题？

2. 掩码扩散天然支持修补。提出一个真实或假设产品用途，使 Show-o 修补比专用模型更有优势。

3. 余弦与线性调度：追踪 T=8 时每步未遮蔽词元数。哪个更均衡？

4. 一张 512x512 Show-o 图像包含 1024 词元。词表 K=16384 时，模型输出 1024 * log2(16384) = 14,336 位数据（约 1.75 KiB）。Stable Diffusion 输出 512*512*24 = 6,291,456 位原始像素（约 768 KiB）。压缩率是多少，换来了什么质量？

5. 阅读 LlamaGen（arXiv:2406.06525）。LlamaGen 的类别条件自回归图像模型与 Show-o 掩码方法有何不同？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 掩码离散扩散（Masked discrete diffusion） | “MaskGIT 风格” | 训练时预测被遮蔽词元，推理时迭代解除最有置信度预测的遮蔽 |
| 余弦调度（Cosine schedule） | “解除遮蔽调度” | 遮蔽比例随推理步骤衰减，将置信度增长集中在中间范围 |
| 并行解码（Parallel decoding） | “一次所有词元” | 每步用一次前向传播预测整个被遮蔽词元序列，再确定 top-K |
| 混合注意力（Hybrid attention） | “因果 + 双向” | 文本词元之间因果、图像区域内部双向的掩码 |
| 图像修补（Inpainting） | “填补生成” | 以部分词元被遮蔽的图像为条件，预测缺失词元，天然来自训练目标 |
| 确定速率（Commitment rate） | “每步 top-K” | 每次迭代声明为“完成”的词元数量，控制推理成本与质量权衡 |

## 延伸阅读（Further Reading）

- [Xie 等人：Show-o（arXiv:2408.12528）](https://arxiv.org/abs/2408.12528)
- [Show-o2（arXiv:2506.15564）](https://arxiv.org/abs/2506.15564)
- [Chang 等人：MaskGIT（arXiv:2202.04200）](https://arxiv.org/abs/2202.04200)
- [Sun 等人：LlamaGen（arXiv:2406.06525）](https://arxiv.org/abs/2406.06525)
- [Chang 等人：Muse（arXiv:2301.00704）](https://arxiv.org/abs/2301.00704)
