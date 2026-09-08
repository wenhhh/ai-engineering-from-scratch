---
name: deepseek-v3-reader
description: 阅读 DeepSeek 家族配置，逐组件分析架构（Architecture）。
version: 1.0.0
phase: 10
lesson: 20
tags: [deepseek-v3, deepseek-r1, mla, moe, mtp, dualpipe, architecture]
---

给定 DeepSeek 家族模型（V3、R1 或衍生版本）及配置（hidden_size、layers、num_experts、kv_lora_rank 等），逐组件拆解架构，识别其采用的 DeepSeek 特有创新。

产出：

1. 逐字段解读配置。对每个字段说明对应组件及贡献的参数量。格式：`field_name: value → interpretation → parameter contribution`。
2. 参数明细。给出总参数、激活参数及激活比例。分别列出嵌入（Embedding）、各层注意力（Attention）、各层多层感知机（Multilayer Perceptron，MLP）（稠密与专家）、路由器（Router）、多词元预测（Multi-Token Prediction，MTP）模块、语言模型（Language Model，LM）头和均方根归一化（Root Mean Square Normalization，RMSNorm）总量。
3. 目标上下文的键值缓存（Key-Value Cache，KV Cache）。报告 BF16 和 8 位浮点（8-Bit Floating Point，FP8）数值，并与相同上下文和隐藏维度下的 Llama-3 式分组查询注意力（Grouped-Query Attention，GQA）(8/128) 基线比较。
4. 创新核对表。分别确认是否使用多头潜在注意力（Multi-Head Latent Attention，MLA）、MTP、无辅助损失路由（Auxiliary-Loss-Free Routing）、DualPipe，指出配置或论文中的证据位置。
5. 合理性检查。计算特定部署目标（H100 80GB、H200 141GB、MI300X 192GB，单节点或多节点）上的推理内存预算：权重 + KV 缓存 + 激活。报告是否装得下，以及需要何种量化（Quantization）。

必须拒绝的情况：
- 将 DeepSeek-V3 与 GPT 类稠密模型混为一谈的分析。两者架构有实质差异。
- 不指定上下文长度就声称 MLA 比 GQA 更快。短上下文（小于 4k）下两者相近，长上下文才是 MLA 的优势。
- 将 MTP 理解为推测解码（Speculative Decoding）的替代品。它是预训练目标，同时可兼作草稿网络。

拒绝规则：
- 若配置缺少 `kv_lora_rank`、`num_experts` 或 `first_k_dense_layers`，则拒绝：这不是 DeepSeek 家族模型。
- 若用户要求精确匹配公开参数量（精确至 100M），则拒绝，解释公开值包含简化计算器无法精确复现的实现特定结构参数，引导其阅读论文第 2 节附录。
- 若部署目标是消费级 GPU（24GB 或更少），则拒绝，改为推荐量化后的 DeepSeek 家族蒸馏衍生模型（Distilled Derivative）。

输出：一页架构分析，列出字段、参数明细、KV 缓存、创新核对表和部署适配性。以“下一步阅读”段落结尾，根据分析引出的问题，选择推荐 NSA（阶段 10 · 17）、V2 论文的 MLA 消融实验，或 V3 技术报告第 2 节附录。
