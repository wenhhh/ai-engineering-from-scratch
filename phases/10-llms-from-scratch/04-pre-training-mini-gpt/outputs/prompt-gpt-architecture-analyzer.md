---
name: prompt-gpt-architecture-analyzer
description: 分析任意 GPT 风格 Transformer 模型的架构选择
version: 1.0.0
phase: 10
lesson: 4
tags: [gpt, transformer, architecture, attention, kv-cache, scaling, pre-training]
---

# GPT 架构分析器（GPT Architecture Analyzer）

根据技术报告、模型卡（Model card）或训练日志评估 GPT 风格模型时，使用此框架拆解架构，识别设计权衡。

## 分析规程（Analysis Protocol）

### 1. 参数分配明细（Parameter Allocation Breakdown）

计算每个组件的精确参数量：

- **词元嵌入（Token embeddings）**：vocab_size x embed_dim
- **位置嵌入（Position embeddings）**：max_seq_len x embed_dim
- **每块注意力（Attention）**：4 x embed_dim x embed_dim，分别对应 Q、K、V 和输出投影
- **每块前馈网络（Feed-Forward Network，FFN）**：2 x embed_dim x ff_dim + embed_dim + ff_dim，两个线性层及偏置
- **每块层归一化（LayerNorm）**：4 x embed_dim，两次归一化，每次都有缩放与偏置
- **最终层归一化**：2 x embed_dim
- **输出头（Output head）**：vocab_size x embed_dim；若与词元嵌入绑定权重，则为 0

如果任一组件超过总参数的 40%，标出该情况。小模型以嵌入矩阵为主，大模型以注意力和前馈网络为主。

### 2. 注意力设计分析（Attention Design Analysis）

评估注意力配置：

- **头维度（Head dimension）**：embed_dim / num_heads。标准值为 64（GPT-2）或 128（Llama 3）。低于 32 会限制每个头的表达能力，高于 128 则会浪费计算而收益很小。
- **每层头数**：头越多，注意力模式越多样，但键值缓存（Key-Value Cache，KV Cache）占用内存也越多。
- **分组查询注意力（Grouped Query Attention，GQA）**：模型是否在多个 Q 头之间共享 K/V 头？Llama 3 使用 GQA，32 个 Q 头对应 8 个 KV 头，使 KV 缓存缩小 4 倍。
- **上下文长度（Context length）**：位置嵌入的最大长度。旋转位置嵌入（Rotary Position Embedding，RoPE）允许外推到训练长度以外，绝对位置嵌入不允许。

### 3. 内存预算（Memory Budget）

在模型最大上下文长度下进行推理（Inference）时：

- **权重，16 位浮点数（16-bit Floating Point，FP16）**：total_params x 2 bytes
- **KV 缓存（FP16）**：2 x num_layers x num_kv_heads x head_dim x max_seq_len x 2 bytes
- **激活（Activations）**：batch_size x seq_len x embed_dim x 2 bytes x num_layers，近似值

如果 KV 缓存超过权重内存，标出该情况。这会发生在 128K+ 的长上下文模型中，表明模型解码阶段受内存限制。

### 4. 计算概况（Compute Profile）

- **预填充（Prefill）每词元 FLOPS**：约为 2 x total_params，前向传播中每个参数参与一次矩阵乘法
- **解码（Decode）每词元 FLOPS**：与预填充相同，但只处理单个词元
- **预填充瓶颈**：计算受限，取决于 GPU TFLOPS
- **解码瓶颈**：内存受限，取决于 GPU 内存带宽
- **算术强度（Arithmetic intensity）**：每访问一个内存字节执行的 FLOPS，低于 100 表示内存受限

### 5. 缩放决策（Scaling Decisions）

依据已知缩放定律（Scaling laws）评估：

- **Chinchilla 最优配置**：给定计算预算 C，最优模型规模 N 与词元数 D 满足 N ~ D，即大致同比例扩展。7B 模型需要约 140B 词元。
- **Llama 3 超额训练**：Meta 用 15T 词元训练 Llama 3 8B，是 Chinchilla 最优值的 100 倍。用更多数据超额训练小模型，可以改善每词元推理成本。
- **宽度与深度**：相同参数量下，更深的模型，即层更多，通常比更宽的模型，即 embed_dim 更大，具有更高样本效率。

## 警示信号（Red Flags）

- **前馈网络比例不是 4 倍**：标准为 ff_dim = 4 x embed_dim。Llama 配合 SwiGLU 使用 8/3 x embed_dim。偏离应有理由。
- **没有权重绑定（Weight tying）**：除非 vocab_size 相对 embed_dim 很大，否则输出头应与词元嵌入共享权重。
- **超过 13B 却没有 GQA**：超过 13B 的模型若没有分组查询注意力，KV 缓存会过大。
- **长上下文没有 RoPE**：绝对位置嵌入不能外推到训练长度之外。目标为 32K+ 上下文的模型应使用旋转嵌入。
- **相对模型规模，学习率过高**：更大的模型需要更低峰值学习率。GPT-2 Small 使用 6e-4，Llama 3 405B 使用 8e-5。

## 输出格式（Output Format）

1. **参数表**：逐组件列出参数量及百分比
2. **内存预算**：最大上下文长度下的权重、KV 缓存和激活内存
3. **计算概况**：A100/H100 上预填充与解码的吞吐量估算
4. **设计评估**：模型哪些设计合理，哪些不符合常规
5. **缩放结论**：模型规模是否与训练数据匹配
