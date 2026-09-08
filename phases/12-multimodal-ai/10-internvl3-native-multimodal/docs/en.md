# InternVL3：原生多模态预训练（InternVL3: Native Multimodal Pretraining）

> InternVL3 之前，每个开放 VLM 都遵循同样的三步方案：取一个在数万亿文本词元上训练过的文本 LLM，接上视觉编码器，再微调连接部分。这种做法有效，但会产生对齐债务（Alignment debt）：文本 LLM 已将全部预训练预算用在纯文本上，并不原生理解视觉词元。事后添加视觉时，LLM 必须重新学习如何把视觉输入与文本推理关联起来，同时不遗忘文本能力。InternVL3（Zhu 等人，2025 年 4 月）拒绝事后适配方法：一次预训练，从第一步起交错使用文本和多模态数据。结果是在开放的 78B 参数规模下，MMMU-Pro 达到 Gemini 2.5 Pro 水平。本课阅读原生预训练的论证，以及采用它后发生的变化。

**Type:** Learn
**Languages:** Python（标准库，训练语料混合器）
**Prerequisites:** 阶段 12 · 05、阶段 12 · 07（方案）
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 解释事后 VLM 训练为何积累对齐债务，引用三种可测症状：灾难性遗忘、回答漂移、视觉文本不一致。
- 描述 InternVL3 原生预训练语料混合，以及文本 : 交错 : 描述比例的重要性。
- 比较可变视觉位置编码（V2PE）与 Qwen2-VL 的 M-RoPE。
- 说出视觉分辨率路由器（Visual Resolution Router，ViR）与视觉语言解耦（Decoupled Vision-Language，DvD）部署优化。

## 问题（The Problem）

事后 VLM 训练是默认方案。LLaVA、BLIP-2、Qwen-VL、Idefics 都取一个已预训练的 LLM（Llama、Vicuna、Qwen、Mistral），再添加视觉。典型训练阶段如下：

1. 冻结 LLM + 冻结视觉编码器 + 可训练投影器，在描述对上训练以对齐嵌入。
2. 解冻 LLM，在指令数据（LLaVA-Instruct、ShareGPT4V）上训练。
3. 可选任务特定微调。

会出现三种对齐债务症状：

- 灾难性遗忘（Catastrophic forgetting）。事后 VLM 遗忘纯文本技能。GSM8K 分数下降 5-10 个百分点，Hellaswag 分数下降，纯文本智能体退化。
- 回答漂移（Answer drift）。同一个视觉问题稍微改变措辞，就得到不同答案。视觉编码器与 LLM 的连接弱于 LLM 自身词元之间的绑定。
- 视觉文本不一致（Visual-text inconsistency）。VLM 能正确描述图像，随后回答问题却与自己的描述矛盾。视觉词元不像文本那样参与 LLM 内部一致性检查。

这些症状有充分记录。MM1.5 第 4 节进行了量化，LLaVA-OneVision 消融也有所暗示。原生预训练是答案。

## 概念（The Concept）

### 原生多模态预训练（Native multimodal pretraining）

InternVL3 从零开始训练，语料从第一步就是原生多模态。混合比例为：

- 40% 纯文本数据（FineWeb、Proof-Pile-2 等）
- 35% 交错图文数据（OBELICS、MMC4 风格）
- 20% 配对图像—描述数据
- 5% 视频—文本数据

视觉词元、文本词元和跨模态交互从第一个梯度步骤起就参与同一损失。没有对齐预训练，没有投影器冻结阶段，也没有需要恢复的灾难性遗忘。

基础模型采用单阶段训练，之后进行指令微调，但基础模型已将视觉词元视为一等输入并能理解。

### V2PE：可变视觉位置编码（V2PE (variable visual position encoding)）

Qwen2-VL 的 M-RoPE 使用固定轴分配。InternVL3 引入 V2PE：位置编码按模态类型（文本、图像、视频）变化，并具有可学习缩放。实践中：

- 文本词元使用一维位置（文本索引）。
- 图像块使用二维位置（行、列）。
- 视频帧使用三维位置（时间、行、列）。

三者共享同一个 RoPE 频率基数，但各区段的隐藏维度分配是可学习参数，而非固定划分。预训练中可以自由权衡时间与空间频率分辨率。

V2PE 的消融声明是：相同计算量下，视频基准比 M-RoPE 高 1-2 个百分点。不是革命，但更简洁。

### 视觉分辨率路由器（Visual Resolution Router，ViR）

这是一项部署优化。并非所有图像都需要全分辨率编码。一张只有一个对象、细节少的照片，若按原生 1280px 编码，会浪费词元。ViR 是一个小分类器，在编码前预测回答问题所需的最低分辨率。

路由分三档：低分辨率（256 词元）、中等（576）、高分辨率（2048+）。生产流量中 60% 的查询使用低或中档已足够。净效果是在同等质量下，吞吐量达到 2-3 倍。

### 视觉语言解耦部署（Decoupled Vision-Language deployment，DvD）

服务大型 VLM 时，视觉编码器每张图像运行一次，LLM 则为每个输出词元自回归运行。两部分瓶颈不同：视觉是卷积与注意力的 GPU 内存带宽，LLM 是 KV 缓存。DvD 将它们分到不同 GPU，以流式方式交接。

对 8B + 400M 编码器的模型，DvD 的单节点吞吐量约为同置部署的两倍。

### 单阶段与多阶段质量（Single-stage vs multi-stage quality）

InternVL3 的主要基准声明：78B 参数时达到 Gemini 2.5 Pro 的 MMMU-Pro 水平；38B 时达到 GPT-4o；8B 时领跑开放 8B 榜单。全部使用单阶段预训练 + 指令微调方案。

对齐债务假设可以测量：每获得单位视觉基准提升，InternVL3-8B 损失的文本基准分数（MMLU、GSM8K）少于 Qwen2.5-VL-7B。模型更通用，因为训练是一体的，而非分成两部分。

### InternVL3.5 与 InternVL-U（InternVL3.5 and InternVL-U）

InternVL3.5（2025 年 8 月）扩展这一方案。相同原生预训练方法，更多数据、更多参数。MMMU 改进属于增量。

InternVL-U（2026）加入统一生成：在相同骨干网络之上通过 MMDiT 输出头生成图像。“U”代表“理解 + 生成（Understanding + generation）”，追求 Transfusion 式统一模型（第 12.13 课）。同一原生预训练骨干网络支持理解头与生成头。

### 原生预训练的权衡（Trade-offs of native pretraining）

原生预训练并非没有代价：

- 计算。从零训练新 VLM 的成本与训练文本 LLM 相同，需要数百万 GPU 小时。事后适配复用既有 LLM 权重，节省大部分成本。
- 数据。大规模交错图文语料稀缺。OBELICS 有 141M 文档，MMC4 有 571M，纯文本则已达到 15T 词元。多模态预训练数据稀缺是硬约束。
- 基础 LLM 复用。原生预训练放弃了以后直接替换新 LLM 的选项。事后方式只需重新训练适配器，就能将 Llama-3.1 换成 Llama-4。

InternVL3 的判断是：对齐债务比失去复用的代价更大。基准支持该主张。但生产成本阻止后来的实验室低成本复现。事后 VLM 会继续存在，因为对多数项目它仍更便宜。

```figure
l5-native-pretrain
```

## 实际应用（Use It）

`code/main.py` 是训练语料混合器和 ViR 路由模拟器。它会：

- 接收目标语料比例（文本%、交错%、描述%、视频%），计算每种模态的预期步骤数。
- 对一批查询模拟 ViR 路由（分布：50% 低细节、30% 中等、20% 高细节），报告平均词元数。
- 根据编码器与 LLM 浮点运算量报告 DvD 吞吐量估算。
- 并排比较事后与原生预训练的参数、计算、数据及预期对齐债务症状。

## 交付成果（Ship It）

本课交付 `outputs/skill-native-vs-posthoc-auditor.md`。给定拟议 VLM 训练计划，它审计应选择原生还是事后方式，标记对齐债务风险，并推荐语料比例。为新开放 VLM 项目确定规模、选择训练策略时使用。

## 练习（Exercises）

1. 估算 InternVL3-8B（原生预训练）与 LLaVA-OneVision-7B（事后适配）的计算量差异。GPU 小时比大约是多少？什么解释了差距？

2. InternVL3 报告 40% 文本 / 35% 交错 / 20% 描述 / 5% 视频。若目标任务以视频为主，提出新比例，并论证为何基础模型仍需要大量文本与描述数据。

3. 阅读 MM1.5 第 4 节关于遗忘的内容。说出事后训练退化最大的具体基准，退化幅度是多少？

4. ViR 将 60% 流量路由到低分辨率编码。哪些查询会被误路由，即需要高分辨率却送到低分辨率？提出三种路由失败模式。

5. DvD 将视觉与 LLM 分到不同 GPU。什么流量模式下，DvD 会降低而非提高吞吐量？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 原生多模态预训练（Native multimodal pretraining） | “一起从零训练” | 文本 + 图像 + 视频词元从第 1 步起参与损失，而非事后添加 |
| 对齐债务（Alignment debt） | “事后代价” | 向冻结 LLM 添加视觉导致的、可测量的文本技能与回答一致性退化 |
| V2PE | “可变视觉位置编码” | 按模态学习位置编码分配，是 InternVL3 对 M-RoPE 的后继方案 |
| ViR | “分辨率路由器” | 编码前逐查询选择最低所需分辨率的小分类器，节省推理词元 |
| DvD | “解耦部署” | 视觉编码器在一个 GPU，LLM 在另一个，通过流交接；大型 VLM 吞吐量翻倍 |
| InternVL-U | “统一理解 + 生成” | 2026 年后续模型，为原生预训练骨干网络增加图像生成头 |
| 交错语料（Interleaved corpus） | “OBELICS / MMC4” | 按自然阅读顺序包含文本和图像的文档，是原生预训练原料 |

## 延伸阅读（Further Reading）

- [Chen 等人：InternVL 1（arXiv:2312.14238）](https://arxiv.org/abs/2312.14238)
- [Zhu 等人：InternVL3（arXiv:2504.10479）](https://arxiv.org/abs/2504.10479)
- [InternVL3.5（arXiv:2508.18265）](https://arxiv.org/abs/2508.18265)
- [InternVL-U（arXiv:2603.09877）](https://arxiv.org/abs/2603.09877)
- [Zhang 等人：MM1.5（arXiv:2409.20566）](https://arxiv.org/abs/2409.20566)
