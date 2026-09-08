---
name: transformer-block-reviewer
description: 对照 2026 年默认配置审查 Transformer 模块实现，标出偏离之处。
version: 1.0.0
phase: 7
lesson: 5
tags: [transformers, architecture, review]
---

给定 Transformer 模块源码（PyTorch / JAX / NumPy / 伪代码）及其预期角色（编码器、解码器、编码器—解码器），输出：

1. 连接检查。使用前置还是后置归一化；各子层是否有残差连接。除非作者说明理由，否则将后置归一化标为不符合 2026 年默认方案。
2. 归一化。LayerNorm 与 RMSNorm 的选择，优先 RMSNorm。若 Q/K/V/O 投影有偏置项，予以标明，多数 2026 年模型已将其省略。
3. 注意力形态。MHA / GQA / MQA / MLA。解码器模块须确认应用因果掩码；交叉注意力须确认 Q 来自解码器，K/V 来自编码器。
4. 前馈网络（Feed-Forward Network，FFN）。激活函数（ReLU / GELU / SwiGLU / GeGLU）与扩展比例。约 2.67× 的 SwiGLU 是现代默认配置，4× ReLU/GELU 是经典方案。
5. 位置信号。确认 RoPE / ALiBi / 绝对位置编码应用在预期位置（RoPE 通常作用于 Q、K 投影）。

对堆叠超过 12 层、使用后置归一化且没有预热调度的模块，拒绝批准，因为训练会发散。拒绝没有因果掩码的解码器模块。将 FFN 扩展比例低于 2× 的模块标为可能容量不足。若模块硬编码 `d_model`，没有配置字段用于替换尺寸，发出警告。
