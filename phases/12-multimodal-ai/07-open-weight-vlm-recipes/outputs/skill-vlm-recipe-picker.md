---
name: vlm-recipe-picker
description: 选择开放权重 VLM 方案（编码器、连接器、LLM、数据混合、分辨率调度），为每项选择提供消融表（Ablation table）引用。
version: 1.0.0
phase: 12
lesson: 07
tags: [vlm, mm1, idefics2, molmo, cambrian, prismatic, ablation]
---

给定任务组合（OCR、图表、UI 智能体、推理、依据关联）、计算预算（LLM 参数、训练 GPU 小时或推理延迟目标）以及部署约束（边缘、云端、设备端），输出带引用的完整开放权重 VLM 方案。

生成以下内容：

1. 编码器选择。默认 SigLIP 2 SO400m/14；任务包含依据关联（Grounding）/分割时，与 DINOv2 ViT-g/14 拼接；引用 MM1 表 3 和 Cambrian-1 视觉编码器对决。
2. 连接器选择。默认两层 MLP，词元受限时改用 32 查询 Q-Former；引用 Prismatic VLMs 中差异小于 1 个百分点的连接器消融。
3. LLM 选择。根据预算：小于 10B 选 Qwen2.5-7B，大于 30B 选 Llama-3.1-70B 或 Qwen2.5-72B。指出超过 70B 后的 MMMU 平台期。
4. 数据混合。默认 PixMo + ShareGPT4V + Cauldron；引用 Molmo 的详细人工描述结果（相同词元数下，MMMU 比蒸馏高 2-3 个百分点）。
5. 分辨率调度。默认动态 256-1280，阶段 1 采用固定 384 的对齐预训练；引用 Idefics2 分辨率消融（AnyRes 使 DocVQA 提高 3-5 个百分点）和 Qwen2.5-VL 动态 M-RoPE。
6. 训练阶段。阶段 1 仅投影器，阶段 2 全量微调，阶段 3 任务特定微调。

必须排除：
- 推荐 CLIP ViT-L/14 为默认编码器，却不指出新项目应改用 SigLIP 2。
- 将 Q-Former 推荐为相较 MLP 的质量提升手段。它调节的是词元预算，而非质量。
- 在存在人工描述替代数据时，提议以合成 GPT-4V 描述作为主要训练数据。引用 Molmo。
- 声称连接器架构解释了实际由词元数导致的差异。

拒绝规则：
- 如果用户希望用 1-3B VLM 处理推理密集任务，则拒绝，并推荐更大的 LLM；推理上限由 LLM 决定。
- 如果用户无法承担详细人工描述数据，明确指出预期 2-3 个 MMMU 百分点的上限差距，并提供尽力而为的蒸馏备用方案。
- 如果任务组合包含 4K+ 文档图像，且部署冻结编码器，则拒绝 AnyRes，并推荐 Qwen2.5-VL 这样的原生分辨率 M-RoPE 编码器。

输出：一页方案卡，包含逐维度选择、消融引用（arXiv ID）、训练阶段计划和预期基准范围。最后给出接下来要读的三篇消融论文：arXiv 2403.09611（MM1）、2405.02246（Idefics2）、2409.17146（Molmo）。
