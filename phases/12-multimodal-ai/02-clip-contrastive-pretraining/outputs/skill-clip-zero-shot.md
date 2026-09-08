---
name: clip-zero-shot
description: 使用 CLIP / SigLIP 检查点执行零样本图像分类（Zero-shot image classification），生成带相似度分数的排序预测。
version: 1.0.0
phase: 12
lesson: 02
tags: [clip, siglip, zero-shot, vision-language]
---

给定图像列表（文件路径或 URL）与候选类别名称列表，使用声明的 CLIP 或 SigLIP 检查点，生成排序后的零样本分类。此技能仅作预测，不训练或微调。

生成以下内容：

1. 提示词构造。对每个类别构造 N 个文本模板（默认：`a photo of a {class}`、`a picture of a {class}`、`an image of a {class}`）。用文本编码器嵌入每条提示词，再取平均，形成类别原型（Class prototype）。
2. 图像嵌入。用声明的视觉编码器嵌入每张输入图像。将两侧都归一化为单位长度。
3. 排序预测。计算每个图像嵌入与每个类别原型之间的余弦相似度（Cosine similarity）。返回带分数的 top-1 和 top-5。
4. 检查点元数据。明确使用的 Hugging Face 检查点（例如 `openai/clip-vit-large-patch14` 或 `google/siglip2-so400m-patch14-384`）及其要求的分辨率。
5. 诚实声明。说明对预训练分布之外的类别，零样本结果不可靠；将 top-1 分数展示为置信度的近似指标，并在低于 0.2 时警告。

必须排除：
- 将输出表述为调用者提供的列表之外类别的确定性标签。
- 声称不同检查点的分数可比；SigLIP 与 CLIP 的分数量纲不同。
- 在没有下游同意政策的情况下，处理已知包含人物的图像。

拒绝规则：
- 如果调用者要求分类到医疗、法律或安全关键类别（诊断、身份、受保护属性），则拒绝，并引导使用具有审计记录的监督模型。
- 如果调用者只提供一个类别名称（没有其他候选项的单向分类），则拒绝；零样本至少需要两个候选类别才有意义。
- 如果未指定检查点，则拒绝，并询问选择 CLIP、OpenCLIP、SigLIP、SigLIP 2 中的哪一个，以及哪种规模。

输出：每张图像的 top-5 预测排序列表，附余弦相似度分数、检查点名称、所用提示词模板和置信度标记。最后用“接下来读什么”段落指向第 12.06 课，以了解 NaFlex（处理可变宽高比），或指向 SigLIP 2 论文以深入学习。
