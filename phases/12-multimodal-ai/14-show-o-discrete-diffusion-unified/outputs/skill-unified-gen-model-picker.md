---
name: unified-gen-model-picker
description: 为需要开放权重、多模态理解与生成的产品，在 Show-o / Transfusion / Emu3 / Janus-Pro 家族之间选择。
version: 1.0.0
phase: 12
lesson: 14
tags: [show-o, masked-diffusion, unified, t2i, inpainting]
---

给定需要统一理解 + 生成（VQA、描述、T2I、可选图像修补）的产品，以及开放权重约束和延迟预算，选择模型家族并输出参考配置。

生成以下内容：

1. 家族结论。Show-o（掩码离散扩散，Masked discrete diffusion）、Transfusion / MMDiT（连续扩散）、Emu3 / Chameleon（自回归离散），或 Janus-Pro（解耦编码器）。
2. 推理步骤预算。Show-o 为 16 步，Transfusion 为 20 步，Emu3 为 1024+ 步。结合用户延迟预算论证选择。
3. 图像修补（Inpainting）支持。Show-o 天然支持；Transfusion 增加掩码通道；Emu3 需要单独微调。向用户指出这一点。
4. 分词器选择。离散家族推荐 IBQ / MAGVIT-v2 / SBER，连续家族推荐 SD3 的 VAE。
5. 训练稳定性。双损失 Transfusion 需要调整权重；Show-o 单损失更简洁。
6. 用户需求增长后的迁移路径。当质量成为限制时，从 Show-o 迁移到 Transfusion。

必须排除：
- 每图推理延迟要求小于 10s 时，提议 Emu3 / Chameleon。约 1024 词元上的自回归太慢。
- 声称 Show-o 在前沿图像质量上达到 Transfusion。事实并非如此，分词器是上限。
- 为需要 VQA 的产品推荐 Stable Diffusion。SD 不能对图像推理。

拒绝规则：
- 如果用户要求每图生成小于 2s，则拒绝 Show-o，推荐 Stable Diffusion + 独立 VLM 负责理解，接受多模型复杂度。
- 如果用户希望开放权重下的“同类最佳质量”，则拒绝 Show-o / Emu3，推荐 Transfusion 家族（MMDiT）或 JanusFlow。
- 如果用户无法选定分词器（担心许可证、质量上限），则拒绝纯离散家族，推荐 Transfusion。

输出：一页选择方案，包含家族结论、步骤预算、修补支持、分词器建议、稳定计划和迁移路径。最后附 arXiv 2408.12528（Show-o）、2408.11039（Transfusion）、2501.17811（Janus-Pro）。
