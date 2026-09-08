# 开放权重 VLM 方案：真正重要的因素（Open-Weight VLM Recipes: What Actually Matters）

> 2024–2026 年开放权重 VLM 文献充满消融表。Apple 的 MM1 测试了图像编码器、连接器和数据混合的 13 种组合；Allen AI 的 Molmo 证明详细人工描述优于 GPT-4V 蒸馏；Cambrian-1 进行了 20+ 种编码器比较；Idefics2 明确了五维设计空间；Prismatic VLMs 在受控基准上比较了 27 种训练方案。在众多结果中，少数结论跨论文成立：图像编码器比连接器架构更重要，数据混合比两者更重要，详细人工描述优于蒸馏合成数据。本课解读这些表格，省去你逐一阅读的工作。

**Type:** Learn + lab
**Languages:** Python（标准库，消融表解析器 + 方案选择器）
**Prerequisites:** 阶段 12 · 05（LLaVA 基线）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 说出 VLM 五维设计空间：图像编码器、连接器、LLM、数据混合、分辨率调度。
- 阅读 MM1 / Idefics2 / Cambrian-1 消融表，预测哪个调节项影响给定基准。
- 根据计算预算和任务组合，为新 VLM 选择方案（编码器、连接器、数据、分辨率）。
- 解释相同词元数下，为什么详细人工描述优于 GPT-4V 蒸馏。

## 问题（The Problem）

已有数百个开放权重 VLM。“好”与“最先进”之间的大多数差距并非架构，而是数据、分辨率调度和编码器选择。模型表现不佳时，知道先调哪项，可以避免一次耗费 500 万 GPU 小时的错误。

2023 年这一波模型（LLaVA-1.5、InstructBLIP、MiniGPT-4）使用描述对预训练 + LLaVA-Instruct-150k。作为基线不错，但 MMMU 上限约为 35%。

2024 年这一波模型（MM1、Idefics2、Molmo、Cambrian-1、Prismatic VLMs）进行了穷尽式消融。结果既出人意料，又有实践价值。

## 概念（The Concept）

### 五维设计空间（The five-axis design space）

Idefics2（Laurençon 等人，2024）列出了这些维度：

1. 图像编码器（Image encoder）。CLIP ViT-L/14、SigLIP SO400m/14、DINOv2 ViT-g/14、InternViT-6B。不同编码器的图像块大小、分辨率和预训练目标不同。
2. 连接器（Connector）。MLP（2-4 层）、Q-Former（32 查询 + 交叉注意力）、Perceiver 重采样器（64 查询）、C-Abstractor（卷积 + 双线性池化）。
3. 语言模型（Language model）。Llama-3 8B / 70B、Mistral 7B、Phi-3、Gemma-2、Qwen2.5。LLM 规模是主要参数成本。
4. 训练数据（Training data）。描述对（CC3M、LAION）、交错数据（OBELICS、MMC4）、指令数据（LLaVA-Instruct、ShareGPT4V、PixMo、Cauldron）。
5. 分辨率调度（Resolution schedule）。固定 224/336/448、AnyRes、原生动态分辨率。训练中逐步提高或始终不变。

每个生产 VLM 都在各维度上作出选择。MMMU 分数的大多数差异由维度 1、4、5 解释，而不是连接器选择。

### 维度 1：编码器优于连接器（Axis 1: encoder > connector）

MM1 第 3.2 节表明：从 CLIP ViT-L/14 换为 SigLIP SO400m/14，MMMU 提升 3+ 个百分点；连接器从 MLP 换为 Perceiver 重采样器，提升不到 1 个百分点。Idefics2 复现了结果：SigLIP > CLIP；相同词元数下，Q-Former ≈ MLP ≈ Perceiver。

Cambrian-1 的“Cambrian 视觉编码器对决（Cambrian Vision Encoders Match-Up）”（Tong 等人，2024）在视觉中心基准（CV-Bench）上运行了 20+ 个编码器。榜首混合了 DINOv2 和 SigLIP，CLIP 位居中游，ImageBind 和 ViT-MAE 较低。CLIP ViT-L 与 DINOv2 ViT-g/14 在 CV-Bench 上相差约 5-7 个百分点。

2026 年开放 VLM 的默认编码器是 SigLIP 2 SO400m/14，用于语义与密集特征，有时与 DINOv2 ViT-g/14 特征拼接（Cambrian 的“空间视觉聚合器（Spatial Vision Aggregator）”采用此法）。

### 维度 2：连接器设计差别不大（Axis 2: connector design is a wash）

MM1、Idefics2、Prismatic 和 MM-Interleaved 都得到相同结论：固定视觉词元数时，连接器架构几乎不影响结果。同一词元预算下，对均值池化图像块使用两层 MLP，与 32 查询 Q-Former 的性能差距不超过 1 个百分点。

真正重要的是词元数。更多视觉词元 = 更多 LLM 计算 = 在一定范围内更好的表现，随后收益递减。每图 64 词元对 OCR 太少；576-1024 是多数开放 VLM 的最佳区间；2048+ 只对文档和图表有帮助。

Q-Former 与 MLP 的比较是成本问题，而非质量问题：无论图像分辨率如何，Q-Former 将词元限制为 32-64；MLP 输出全部图像块词元。高分辨率输入下，Q-Former 节省 LLM 上下文；低分辨率下，差异可视为噪声。

### 维度 3：LLM 规模决定上限（Axis 3: LLM size sets the ceiling）

在每篇 VLM 论文中，将 LLM 从 7B 翻倍至 13B，都稳定带来 MMMU 2-4 个百分点提升。到 70B 时，大多数基准趋于饱和。VLM 多模态推理的上限就是 LLM 文本推理的上限；视觉编码器只能供给信息，不能替它推理。

这就是 Qwen2.5-VL-72B 和 Claude Opus 4.7 在 MMMU-Pro 与 ScreenSpot-Pro 上表现突出的原因：语言模型很大。7B VLM 无法通过巧妙连接器设计替代 70B VLM。

### 维度 4：数据，详细人工描述优于蒸馏（Axis 4: data — detailed human captions beat distillation）

Molmo + PixMo（Deitke 等人，2024）是人人都应阅读的 2024 年成果。Allen AI 让人工标注者用 1-3 分钟的密集语音描述图像，再转为文本，得到 712K 张带密集描述的图像。训练数据完全不使用 GPT-4V 蒸馏。

Molmo-72B 在全部 11 个基准上击败 Llama-3.2-90B-Vision。差异来自描述质量，而非架构。每张图像的详细人工描述包含的信息是简短网页描述的 5-10 倍；在 GPT-4V 蒸馏产生幻觉的地方，人工描述仍有事实依据。

ShareGPT4V（Chen 等人，2023）和 Cauldron（Idefics2）也遵循这一思路，混合人工与 GPT-4V 描述。趋势明确：面向 2026 年前沿，描述密度 > 描述数量 > 蒸馏便利性。

### 维度 5：分辨率及其调度（Axis 5: resolution and its schedule）

Idefics2 消融结果：384 -> 448 提升 1-2 个百分点；通过图像拆分（AnyRes）从 448 -> 980，在 OCR 基准上再提升 3-5 个百分点。固定分辨率训练在中等准确率处进入平台期；逐步提高分辨率（从 224 开始，以 448 或原生分辨率结束）训练更快，最终表现更高。

Cambrian-1 研究了分辨率与词元的权衡：固定计算量下，可以选择更低分辨率的更多词元，或更高分辨率的更少词元。OCR 中高分辨率胜出；一般场景理解中，低分辨率加更多词元胜出。

2026 年生产方案：阶段 1 在固定 384 分辨率训练；阶段 2 针对 OCR 密集任务使用最高 1280 的动态分辨率。

### Prismatic 受控比较（The Prismatic controlled comparison）

Prismatic VLMs（Karamcheti 等人，2024）控制了所有维度。相同的 13B LLM、指令数据和评估，每次只改变一个维度。结果：

- 每图视觉词元数解释约 60% 的方差。
- 编码器选择解释约 20%。
- 连接器架构解释约 5%。
- 其他所有因素（数据混合、调度器、学习率）解释剩余约 15%。

这只是粗略分解，但它是文献中对“应先消融什么”最清晰的回答。

### 2026 年的选择方案（A picker for 2026）

根据证据，2026 年新项目的默认开放 VLM 方案为：

- 编码器：带 NaFlex 的原生分辨率 SigLIP 2 SO400m/14；若需要分割/依据关联（Grounding），与 DINOv2 ViT-g/14 拼接以获取密集特征。
- 连接器：作用于图像块词元的两层 MLP。除非词元受限，否则跳过 Q-Former。
- LLM：Qwen2.5 / Llama-3.1 / Gemma 2，按目标延迟选择；重成本选 7B，重质量选 70B。
- 数据：PixMo + ShareGPT4V + Cauldron，再补充任务特定指令数据。
- 分辨率：动态（长边最少 256、最多 1280 像素）。
- 调度：阶段 1 对齐（仅投影器），阶段 2 全量微调，阶段 3 任务特定微调。

每项默认选择，都能追溯到本课末尾所引论文中的实测消融。

```figure
l5-vlm-recipe-knobs
```

## 实际应用（Use It）

`code/main.py` 是消融表解析器与方案选择器。它编码了 MM1 和 Idefics2 消融表的精简版本，让你查询：

- “给定预算 X 和任务 Y，哪种方案胜出？”
- “在 7B Llama 上将 SigLIP 换成 CLIP，预期 MMMU 差异是多少？”
- “要得到置信度为 80% 的答案，应先消融哪个维度？”

输出是带预期基准差异的方案排序列表，以及“先消融什么”的建议。

## 交付成果（Ship It）

本课交付 `outputs/skill-vlm-recipe-picker.md`。给定目标任务组合、计算预算和延迟目标，它输出完整方案（编码器、连接器、LLM、数据混合、分辨率调度），并为每项选择引用相应消融依据。避免工程师每次启动新 VLM 项目都重新摸索 Idefics2 消融表。

## 练习（Exercises）

1. 阅读 MM1 第 3.2 节。固定 2B LLM、预算为 50M 图像时，哪个编码器胜出？换成 13B LLM 后答案会反转吗？为什么？

2. Cambrian-1 发现，拼接 DINOv2 + SigLIP 在视觉中心基准上优于单独使用任一个，但在 MMMU 上不增加信号。预测哪些基准提升，哪些保持不变。

3. 目标是基于 2B LLM 的移动 UI 智能体。选择编码器、连接器、分辨率和数据混合。用具体消融表论证每项选择。

4. Molmo 提供 4B 和 72B 模型。4B 能与闭源 7B VLM 竞争，72B 在 11/11 个基准上击败 Llama-3.2-90B-Vision。这对 LLM 规模平台期假设有何启示？

5. 设计一个消融表，在 7B VLM 上将数据混合质量与编码器质量的影响分离。最少需要几次训练？提出四种维度设置。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|-----------------|------------------------|
| 消融（Ablation） | “调整一个旋钮” | 多次训练仅在设计空间的一个维度上不同，其他所有因素保持不变 |
| 连接器（Connector） | “桥接器” / “投影器” | 将视觉编码器输出映射到 LLM 词元空间的可训练模块（MLP、Q-Former、Perceiver） |
| 详细人工描述（Detailed human caption） | “密集描述” | 多句人工撰写的描述（通常 80-300 词元），比网页替代文字更丰富 |
| 蒸馏（Distillation） | “GPT-4V 描述” | 由更强专有 VLM 生成的训练数据；方便，但容易继承幻觉 |
| AnyRes / 动态分辨率（dynamic res） | “高分辨率路径” | 通过分块或 M-RoPE 输入大于编码器原生分辨率的图像 |
| 分辨率渐增（Resolution ramp） | “课程式训练” | 从低分辨率开始并逐渐提高的训练调度，加快对齐学习 |
| 视觉中心基准（Vision-centric bench） | “CV-Bench / BLINK” | 强调细粒度视觉感知，而非语言密集推理的评估 |
| PixMo | “Molmo 的数据” | Allen AI 的 712K 张密集描述图像数据集；将人工语音转录为密集描述 |

## 延伸阅读（Further Reading）

- [McKinzie 等人：MM1（arXiv:2403.09611）](https://arxiv.org/abs/2403.09611)
- [Laurençon 等人：Idefics2 /《构建 VLM 时的重要因素（What matters building VLMs）》（arXiv:2405.02246）](https://arxiv.org/abs/2405.02246)
- [Deitke 等人：Molmo 与 PixMo（arXiv:2409.17146）](https://arxiv.org/abs/2409.17146)
- [Tong 等人：Cambrian-1（arXiv:2406.16860）](https://arxiv.org/abs/2406.16860)
- [Karamcheti 等人：Prismatic VLMs（arXiv:2402.07865）](https://arxiv.org/abs/2402.07865)
