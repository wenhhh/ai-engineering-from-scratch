---
name: transformer-review
description: 对照阶段 7 前 13 课，审查从零实现的 Transformer。
version: 1.0.0
phase: 7
lesson: 14
tags: [transformers, review, capstone]
---

给定从零实现 Transformer 的代码库（PyTorch / JAX），对照 2026 年默认方案审查，标出缺失或错误部分：

1. 注意力。存在因果掩码，按 `sqrt(d_head)` 缩放，多头拆分有效，可用时使用 Flash Attention。d_model ≥ 1024 时提及 GQA。
2. 位置编码。RoPE（2026 年优先）或可学习绝对位置（小模型可接受）。将正弦编码标为历史方案。
3. 模块连接。前置而非后置归一化，RMSNorm 而非 LayerNorm，SwiGLU FFN 而非 ReLU/GELU。每子层外围都有残差。线性层省略偏置，这是现代默认方案。
4. 训练。AdamW（或 2026 年后的 Muon）、带线性预热的余弦学习率调度、1.0 梯度裁剪、bf16 自动类型转换。词元嵌入与 lm_head 绑定权重。
5. 损失。每位置计算错位一个词元的交叉熵。存在填充时将其屏蔽。固定间隔记录训练与验证损失。

出现下列任何情况就拒绝批准：无明确理由的后置归一化、2026 年生产代码无理由使用 LayerNorm、解码器自注意力缺少因果掩码、小语言模型未绑定嵌入。标明：没有验证集划分、没有梯度裁剪、学习率 > 1e-3 却没有预热、block_size 超过位置嵌入范围却没有备用方案。建议端到端运行 `python code/main.py`，检查 nano 配置在 tinyshakespeare 上最终验证损失低于 2.5。
