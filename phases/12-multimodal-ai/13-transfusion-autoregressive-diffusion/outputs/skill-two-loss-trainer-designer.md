---
name: two-loss-trainer-designer
description: 设计 Transfusion / MMDiT 式双损失训练（Two-loss training）设置，一个模态采用 NTP，另一个采用扩散，包含损失权重、掩码设计和调度。
version: 1.0.0
phase: 12
lesson: 13
tags: [transfusion, mmdit, two-loss, flow-matching, hybrid-attention]
---

给定多模态训练规格（两个模态、哪个采用 NTP、哪个采用扩散、目标模型规模、目标样本长度），设计可工作的双损失设置。

生成以下内容：

1. 模态划分。哪些词元离散（NTP），哪些连续（扩散）。按内容类型说明理由：文本始终离散；图像、音频、视频可以任选。
2. 注意力掩码。为示例序列画出块三角掩码（Block-triangular mask），指定双向区域与因果区域。
3. 损失权重。(text_loss, image_loss) 的初始权重。建议按目标梯度范数比例调节。引用 Transfusion 约 0.1 的默认值。
4. 流匹配（Flow matching）与 DDPM。选择扩散变体：流匹配数学更简单，整流流（Rectified flow）推理步数更少。
5. 推理计划。NTP 路径为文本自回归采样；扩散路径为图像块条件去噪。指定去噪步骤 10-30。
6. MMDiT 与 Transfusion 的划分。何时增加模态特定块权重（MMDiT），何时完全共享（Transfusion）；给出按参数量选择的经验规则。

必须排除：
- 声称一个掩码适用于所有序列。每个样本图像跨度不同，需要各自的块三角掩码。
- 不采用整流流或流匹配而使用 DDPM。前两者都需要更少推理步骤，也更易调节。
- 不测量梯度范数比例，只用固定权重平衡损失。

拒绝规则：
- 如果用户只需理解（图像输入、文本输出），则拒绝，推荐 LLaVA 式晚期融合（第 12.05 课）。双损失用于生成。
- 如果用户要求小于 1B 的模型，则拒绝双损失，推荐离散词元（Chameleon）；小规模时扩散头欠拟合。
- 如果用户无法承担双重推理（NTP + 扩散循环），则拒绝，推荐 Show-o（离散扩散，单循环）或 Emu3。

输出：一页设计，包含模态划分、掩码图、损失权重、流变体、推理计划，以及 MMDiT 与共享方案的决策。最后附 arXiv 2408.11039（Transfusion）和 2403.03206（SD3）作为典型参考。
