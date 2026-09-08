# LLaVA 与视觉指令微调（LLaVA and Visual Instruction Tuning）

> LLaVA（2023 年 4 月）是全球被复制最多的多模态架构。它用两层 MLP 取代 BLIP-2 的 Q-Former，用简单的词元拼接取代 Flamingo 的门控交叉注意力，并使用 GPT-4 根据纯文本描述生成的 158k 轮视觉指令数据训练。2023 至 2026 年间构建 VLM 的每位实践者，都构建过某种 LLaVA 变体。LLaVA-1.5 加入 AnyRes，LLaVA-NeXT 提高分辨率，LLaVA-OneVision 在同一方案中统一单图、多图和视频。本课将阅读其训练方案、实现投影器，并解释为何“简单方案胜出”。

**Type:** Build
**Languages:** Python（标准库，投影器 + 指令模板构建器）
**Prerequisites:** 阶段 12 · 02（CLIP）、阶段 11（LLM 工程，LLM Engineering：指令微调）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 构建两层多层感知机（MLP）投影器，将 ViT 图像块嵌入（1024 维）映射到 LLM 嵌入维度（4096 维）。
- 梳理 LLaVA 两阶段方案：（1）在 558k 描述对上对齐投影器；（2）在 GPT-4 生成的 158k 轮数据上进行视觉指令微调（Visual instruction tuning）。
- 构造包含图像词元占位符、系统提示词和用户/助手轮次的 LLaVA 格式提示词。
- 解释为何尽管 Q-Former 在词元预算上占优，社区仍从 Q-Former 转向 MLP。

## 问题（The Problem）

BLIP-2 的 Q-Former（第 12.03 课）将图像压缩为 32 个词元。结构清晰、效率高、基准表现好，但存在两个问题。

首先，Q-Former 可训练，但其损失不是最终任务。阶段 1 训练 ITC+ITM+ITG，阶段 2 训练 LM 损失。查询学习某种中间表示，再由 LLM 解码。瓶颈中会丢失信息。

其次，Q-Former 需要 188M 参数；在 LLaVA 所处的 2023 年规模下，必须与目标 LLM 协同设计。更换 LLM，就要重新训练 Q-Former；更换视觉编码器，也要重新训练。每种组合都是单独的研发项目。

LLaVA 的答案简单得令人意外：取 ViT 的 576 个图像块词元，让每个经过两层 MLP（`1024 → 4096 → 4096`），再将全部 576 个送入 LLM 输入序列。没有瓶颈，没有针对特殊目标的阶段 1 预训练，只用直接的 LM 损失训练 MLP。

数据从哪里来？LLaVA 的第二个洞见是使用纯文本 GPT-4 生成指令数据。将图像的 COCO 描述和边界框（Bounding box）数据输入 GPT-4，要求其生成对话、描述和复杂推理问题。免费获得 158k 轮指令—回答数据，无需人工标注。

结果是一个在 8 个 A100 上运行一天、在 MMMU 上击败 Flamingo 的 VLM，并交付了社区可扩展的开放检查点。到 2023 年末，它已催生 50+ 个分支。

## 概念（The Concept）

### 架构（The architecture）

13B 规模的 LLaVA-1.5：
- 视觉编码器：CLIP ViT-L/14 @ 336（阶段 1 冻结，阶段 2 可选解冻）。
- 投影器（Projector）：采用 GELU 激活的两层 MLP，`1024 → 4096 → 4096`。
- LLM：Vicuna-13B（后来是 Llama-3.1-8B）。

图像 + 文本提示词的前向传播：

```
img -> ViT -> 576 个 1024 维图像块
patches -> MLP -> 576 个 4096 维词元
prompt: system + "<image>" 占位符 + 用户问题
用 576 个投影后的词元替换 <image> 词元
将完整序列输入 LLM
解码响应
```

图像占据 LLM 上下文的 576 个词元。上下文为 2048 时，留给文本 1472 个词元；上下文为 32k 时，这点占用几乎可以忽略。

### 阶段 1：投影器对齐（Stage 1: projector alignment）

冻结 ViT，冻结 LLM，只训练两层 MLP。数据集是 558k 个图像—描述对（LAION-CC-SBU）。损失是在投影后的图像词元条件下，对描述进行语言建模。

批量为 128、单个训练轮次（Epoch），几小时就能完成。投影器学习将 ViT 空间映射到 LLM 空间，没有任务特定监督。

### 阶段 2：视觉指令微调（Stage 2: visual instruction tuning）

解冻投影器（仍可训练）。解冻 LLM（通常全量，有时使用 LoRA）。使用 158k 轮视觉指令数据训练。

诀窍在于指令数据。Liu 等人通过以下方式生成：
1. 取一张 COCO 图像。
2. 提取文本描述（5 条人工描述 + 边界框列表）。
3. 用三个提示词模板发送给 GPT-4：
   - 对话：“生成一段用户与助手围绕这张图像进行的来回对话。”
   - 详细描述：“对图像作出丰富、详细的描述。”
   - 复杂推理：“提出一个需要对图像进行推理的问题，然后回答它。”
4. 将 GPT-4 输出解析为（指令、回答）对。

整个过程不直接接触图像，只使用文本描述。GPT-4 会产生看似合理的图像内容幻觉（Hallucination）。虽然有噪声，但确实有效：158k 轮足以激发对话能力。

### 为什么社区复制了这种方案（Why the community copied this）

- 无需调节阶段 1 特有的损失，全程使用 LM 损失。
- 投影器训练只需几小时，而非几天。
- 只需重新训练投影器，就能替换 LLM（LLaVA-Llama2、LLaVA-Mistral、LLaVA-Llama3）。
- 视觉指令数据流水线使用 GPT-4，为新领域重新生成数据的成本低。

### LLaVA-1.5 与 LLaVA-NeXT（LLaVA-1.5 and LLaVA-NeXT）

LLaVA-1.5（2023 年 10 月）新增：
- 将学术任务数据（VQA、OKVQA、RefCOCO）混入指令微调。
- 更好的系统提示词。
- 上下文从 2048 → 32k。

LLaVA-NeXT（2024 年 1 月）新增：
- AnyRes：将高分辨率图像切成由 336x336 裁剪块组成的 2x2 或 1x3 网格，再加一张全局低分辨率缩略图。每块变成 576 词元，每张图像总计约 2880 个视觉词元。OCR 和图表任务表现跃升。
- 混合 ShareGPT4V（高质量 GPT-4V 描述）的更好指令数据。
- 更强基础 LLM（Mistral-7B、Yi-34B）。

### LLaVA-OneVision

第 12.08 课将深入讨论 OneVision。简要来说，它使用相同投影器，但通过课程式训练（Curriculum）让单个模型覆盖单图、多图和视频，共享视觉词元预算。

### 与 Q-Former 比较（The comparison to Q-Former）

| | Q-Former（BLIP-2） | MLP（LLaVA） |
|---|---|---|
| 每张图像的视觉词元 | 32 | 576（基础）或 2880（AnyRes） |
| 可训练参数 | 188M + LM | 40M + LM |
| 阶段 1 损失 | ITC+ITM+ITG | 仅 LM |
| LLM 替换 | 需要重新训练 | 最少量重新训练即可替换 |
| 多图像 | 不便 | 自然支持（拼接） |
| 视频 | 不便 | 自然支持（逐帧拼接） |
| 词元预算 | 小 | 大 |

MLP 胜在简单和词元灵活性，Q-Former 胜在词元预算。到 2023 年末，词元预算已不再是主要约束（LLM 上下文扩展到 32k-128k+），简单性占据主导。

### 提示词格式（The prompt format）

```
一个好奇的人类与人工智能助手之间的对话。助手会对人类的问题给出有帮助、详细且礼貌的回答。USER: <image> 详细描述这张图像。ASSISTANT: 图像展示了……
```

`<image>` 是占位词元。分词前，将其替换为 576 个视觉词元（AnyRes 时为 2880 个）。分词器看到的序列比训练时稍长，但 LLM 能处理这种新输入，因为阶段 1 已教会它。

### 参数经济性（Parameter economy）

LLaVA-1.5-7B 参数明细：
- CLIP ViT-L/14 @ 336：303M（阶段 1 冻结，阶段 2 常解冻）。
- 投影器（2 个线性层）：约 22M 可训练参数。
- Llama-7B：7B。
- 总计：7.3B 参数。阶段 2 可训练部分：完整 7B + 22M 投影器。

阶段 2 训练成本：8xA100 上约 20 小时。这是关键数字：一天、一个节点、可复现。这就是 LLaVA 广泛传播的原因。

```figure
mm-llava-projector
```

## 实际应用（Use It）

`code/main.py` 实现：

1. 纯 Python 两层 MLP 投影器（玩具规模维度为 16 → 32 → 32）。
2. 提示词构建流水线：系统提示词 + 将 `<image>` 替换为 N 个投影词元 + 用户轮次 + 助手生成占位符。
3. 可视化 576 词元视觉块在 LLM 上下文中的占用（占 2k / 32k / 128k 上下文的百分比）。

## 交付成果（Ship It）

本课交付 `outputs/skill-llava-vibes-eval.md`。给定 LLaVA 家族检查点，它执行包含 10 条提示词的直观评估（Vibes-eval）：3 条描述、3 条 VQA、2 条推理、2 条拒绝，并报告便于人类阅读的评分表。这不是基准测试，而是确认投影器与 LLM 良好连接的冒烟测试（Smoke test）。

## 练习（Exercises）

1. 计算 `1024 → 4096 → 4096` 两层 MLP 投影器的可训练参数量。包含 GELU 和偏置时，它占 LLaVA-13B 的比例是多少？

2. 构造一个“拒绝”场景的 LLaVA 提示词：图像包含私人个体。写出预期助手回答。为什么 LLaVA 应在零样本情况下拒绝，又需要什么训练数据强化这种拒绝？

3. 阅读 LLaVA-NeXT 博客的 AnyRes 部分。计算 1344x672 图像在 AnyRes 下的视觉词元数，与 336x336 时的基础 576 词元比较。

4. LLaVA 阶段 1 投影器使用描述上的 LM 损失训练。如果跳过阶段 1，直接进入阶段 2（视觉指令微调），会怎样？引用 Prismatic VLMs 消融实验（arXiv:2402.07865）回答。

5. LLaVA-Instruct-150k 使用 GPT-4 与 COCO 描述生成指令。针对新领域（医疗 X 光、卫星图像），描述生成领域指令的四步数据流水线。每一步可能出什么问题？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|----------------|------------------------|
| 投影器（Projector） | “MLP 桥接器” | 采用 GELU 的两层 MLP，将 ViT 维度映射为 LLM 维度 |
| 图像词元（Image token） | “<image> 占位符” | 推理前被 N 个投影视觉词元替换的提示词标记 |
| 视觉指令微调（Visual instruction tuning） | “LLaVA 阶段 2” | 使用 GPT-4 生成的（图像、指令、回答）三元组训练 |
| 阶段 1 对齐（Stage 1 alignment） | “投影器预训练” | 冻结 ViT 和 LLM，使用描述上的 LM 损失训练投影器 |
| AnyRes | “多裁剪分块” | 将高分辨率图像切成瓦片网格，并拼接每块的视觉词元 |
| LLaVA-Instruct | “GPT-4 生成” | 使用 COCO 描述 + GPT-4 合成的 158k 个指令—回答对 |
| 视觉编码器冻结（Vision encoder freeze） | “锁定骨干网络” | CLIP 权重在阶段 1 不更新，有时阶段 2 也不更新 |
| ShareGPT4V | “更好的描述” | GPT-4V 生成的 1M 条密集描述，用于更高质量对齐 |
| 视觉问答（VQA） | “Visual question answering” | 回答关于图像的自由形式问题的任务 |
| Prismatic VLMs | “设计空间论文” | Karamcheti 2024 年的消融实验，系统测试投影器和数据选择 |

## 延伸阅读（Further Reading）

- [Liu 等人：《视觉指令微调（Visual Instruction Tuning）》（arXiv:2304.08485）](https://arxiv.org/abs/2304.08485)：LLaVA 论文。
- [Liu 等人：《通过视觉指令微调改进基线（Improved Baselines with Visual Instruction Tuning）》（arXiv:2310.03744）](https://arxiv.org/abs/2310.03744)：LLaVA-1.5。
- [Chen 等人：ShareGPT4V（arXiv:2311.12793）](https://arxiv.org/abs/2311.12793)：密集描述数据集。
- [Karamcheti 等人：Prismatic VLMs（arXiv:2402.07865）](https://arxiv.org/abs/2402.07865)：设计空间消融。
- [Li 等人：LLaVA-OneVision（arXiv:2408.03326）](https://arxiv.org/abs/2408.03326)：统一单图、多图、视频。
