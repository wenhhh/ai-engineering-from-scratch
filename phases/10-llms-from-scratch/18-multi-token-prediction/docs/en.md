# 多词元预测（Multi-Token Prediction，MTP）

> 从 GPT-2 到 Llama 3，自回归大语言模型（Autoregressive Large Language Model，LLM）都在每个位置只训练一个损失：预测下一个词元（Token）。DeepSeek-V3 在每个位置增加第二个损失，预测再下一个词元。在 671B 模型之上增加的 14B 参数，通过梯度流（Gradient Flow）将知识蒸馏回主模型；训练好的 MTP 头在推理时又被用作推测解码（Speculative Decoding）的草稿生成器，接受率超过 80%，由此获得 1.8 倍生成吞吐量。本课实现 DeepSeek 技术报告中的顺序 MTP 模块，计算损失及共享头的参数布局，并解释为何 MTP 能保持因果链，而 Gloeckle 等人最初的并行 MTP 不能。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 10 · 04（预训练迷你 GPT）、阶段 10 · 15（推测解码）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 陈述 MTP 训练目标，推导各预测深度的联合损失（Joint Loss）。
- 解释 Gloeckle 等人的并行 MTP 头（2024）与 DeepSeek-V3 顺序 MTP 模块的区别，以及顺序设计为何保持因果链。
- 计算预训练中增加 MTP 模块的参数和内存开销。
- 从零实现一个 MTP 模块：共享嵌入（Shared Embedding）、各深度的 Transformer 块、投影（Projection）及共享输出头（Shared Output Head）。

## 问题（The Problem）

下一词元预测（Next-Token Prediction）是 LLM 的标准训练目标。每个隐藏状态（Hidden State）只接受一种监督：预测紧随其后的词元。这种信号弱得出人意料。序列的大部分信息跨越多个词元，包括结构、连贯性、事实性和算术过程。模型必须在数万亿词元上积累单词元信号，才能学会这些内容。

MTP 提出的问题是：如果监督每个隐藏状态同时预测多个未来词元，会怎样？Gloeckle 等人（Meta，2024）证明这样做有效。他们在骨干网络（Backbone）上放置多个独立输出头，各自预测不同偏移位置。设计简单且并行，但各头读取同一隐藏状态，没有逐层细化；预测之间也没有因果依赖链，因此不能用于推测解码。

DeepSeek-V3（2024 年 12 月）将 MTP 重新设计为顺序模块，在每个预测深度保持因果链。模型根据 `h_i^(0)` 预测 `t+1`，再将 `h_i^(0)` 与 `E(t+1)` 嵌入结合成新的隐藏状态 `h_i^(1)`，据此预测 `t+2`，依此类推。每个深度都有自己的小型 Transformer 块。共享嵌入和输出头控制了参数开销。在 DeepSeek-V3 的规模下，671B 主模型权重之外的 MTP 模块共增加 14B 参数。这 2% 的开销既提供更密集的训练信号，又提供现成的推理草稿生成器。

本课从零构建一个 MTP 模块和 D 深度损失。数学表达简洁，实现约 150 行。

## 概念（The Concept）

### 顺序 MTP 的构造方法（The sequential MTP recipe）

DeepSeek-V3 在主模型之上增加 `D` 个 MTP 模块。每个模块 `k`（其中 `k = 1..D`）预测深度 `k` 的词元，即给定截至位置 `i` 的前缀，预测 `t_{i+k}`。

模块 `k` 包含：

- 带有独立注意力（Attention）和多层感知机（Multilayer Perceptron，MLP）的 Transformer 块 `T_k`。
- 投影矩阵（Projection Matrix）`M_k`，将上一深度的隐藏状态与下一深度真实词元的嵌入结合。
- 与主模型相同的共享嵌入 `E`。
- 与主模型相同的共享输出头 `Out`。

训练时，对于截至位置 `i` 的前缀，各深度的隐藏状态为：

```
h_i^(0) = 主模型骨干（Main Model Backbone）在位置 i 的状态
h_i^(k) = T_k( M_k * concat(RMSNorm(h_i^(k-1)), RMSNorm(E(t_{i+k}))) )   for k >= 1
```

各深度的预测为：

```
logits_{i+k} = Out(h_i^(k-1))   for k = 1..D
```

各深度损失是相对于真实值（Ground Truth）`t_{i+k}` 的交叉熵（Cross-Entropy）：

```
L_k = CE(logits_{i+k}, t_{i+k})
```

跨深度的联合损失为：

```
L_MTP = (lambda / D) * sum_{k=1..D} L_k
```

`lambda` 是较小的权重系数。DeepSeek-V3 在训练前 10% 使用 0.3，之后使用 0.1。总训练损失为 `L_main + L_MTP`。

### 为什么采用顺序而非并行（Why sequential, not parallel）

Gloeckle 最初的并行 MTP 有 D 个输出头，每个头都直接作用于 `h_i^(0)`，从同一骨干隐藏状态预测 `t_{i+k}`。这样可以正常训练，但预测之间不互为条件。不能利用 `head_1` 的输出来帮助 `head_2`，因为它们并行运行。

DeepSeek-V3 的顺序设计从 `h_i^(k-1)` 和真实下一词元嵌入 `E(t_{i+k})` 构造 `h_i^(k)`。这保持了因果链：深度 `k+1` 的模块预测 `t_{i+k+1}` 时，能看到 `t_{i+k}` 的内容。这在结构上与自回归解码器读取自身输出相同，因此 MTP 模块可直接作为推测解码的草稿生成器。

推理时，将 `h_i^(k-1)` 和草稿词元 `t_{i+k}` 输入模块 `k+1`，得到 `t_{i+k+1}` 的预测，再重复此过程。这正是 EAGLE 式草稿生成，只是将训练好的 MTP 模块作为草稿网络。DeepSeek-V3 报告首个 MTP 模块的接受率（Acceptance Rate）超过 80%，加速约 1.8 倍。

### 参数核算（Parameter accounting）

对于隐藏维度为 `h`、词表大小为 `V` 的模型：

- 主模型：数十亿参数，加上大小为 `V * h` 的输出头。
- 共享输出头：复用主模型的头，不增加参数。
- 共享嵌入：复用主模型的嵌入，不增加参数。
- 每个 MTP 模块：
  - 投影 `M_k`：`(2h) * h = 2h^2`。
  - Transformer 块 `T_k`：注意力（多头注意力（Multi-Head Attention，MHA）为 `4h^2`）加 MLP（比例为 8/3 的 SwiGLU 通常为 `8h^2`），每块约 `12h^2`。

每模块额外参数合计 `~14h^2`。对于 DeepSeek-V3 的 `h = 7168`，D = 1 模块的理论参数量为 `~14 * 7168^2 = ~720M`。DeepSeek-V3 报告的是 14B，差异主要来自 MTP 模块中的专家层也采用混合专家（Mixture of Experts，MoE）。

### 推测解码的收益（The speculative-decoding payoff）

预训练期间，MTP 模块使训练慢约 10%，因为需要更多前向计算和额外损失。收益有两方面：

1. 更密集的训练信号。每个隐藏状态获得 D+1 个监督目标。DeepSeek-V3 消融实验（Ablation）在 MMLU、GSM8K、MATH、HumanEval 上均测得几个百分点的稳定提升。

2. 推理时免费获得推测解码草稿网络。MTP 模块已被训练为预测后续几个词元，改作草稿网络后接受率超过 80%。在此水平下，N=3 或 N=5 的推测解码可获得 1.8 倍吞吐量。10% 的训练时间成本在首次推理时就能得到回报。

### 与 EAGLE 的关系（Relation to EAGLE）

EAGLE 在预训练结束后单独训练小型草稿模型，MTP 则将草稿训练融入预训练。两者通过不同流程获得相近的接受率：

| 维度 | EAGLE-3 | MTP (DeepSeek-V3) |
|-----------|---------|------------------|
| 训练时机 | 预训练之后 | 预训练期间 |
| 是否兼容现有权重 | 是 | 否（需要重新训练） |
| 草稿参数 | 1–2 层 Transformer | 1 个 Transformer 块 + 投影 |
| 接受率 | 0.88–0.92 | 深度 1 时超过 0.80 |
| 加速之外的收益 | 仅推测解码 | 更密集的训练信号 + 加速 |

```figure
multi-token-predict
```

## 动手实现（Build It）

`code/main.py` 端到端构建单个 MTP 模块，包括共享嵌入、投影、Transformer 块和共享输出头。随后在短合成序列上计算各深度的交叉熵损失，并按组件打印参数量。玩具示例使用 32 个词元的词表，便于阅读数值。

### 步骤 1：共享嵌入表（Step 1: shared embedding table）

主模型及每个深度的所有 MTP 模块都使用同一个 `vocab_size x hidden` 表。不是第二份副本，而是同一个张量（Tensor）。

### 步骤 2：各深度的组合（Step 2: the per-depth combination）

```python
def combine(prev_hidden, next_token_embed, M_k):
    # concat along feature dim, then project down to hidden
    concat = rms_norm(prev_hidden) + rms_norm(next_token_embed)  # vector addition stand-in
    projected = matvec(M_k, concat)
    return projected
```

真正的 DeepSeek-V3 将两个经过均方根归一化（Root Mean Square Normalization，RMSNorm）的向量拼接成 `[2h]`，再用 `h x 2h` 矩阵投影。为简化仅使用标准库的实现，玩具版本采用向量相加。

### 步骤 3：深度 k 的 Transformer 块（Step 3: the transformer block at depth k）

自注意力（Self-Attention）加 MLP。玩具版本使用单层线性注意力块和 SwiGLU MLP，无需 numpy，也能看清结构。

### 步骤 4：共享输出头（Step 4: the shared output head）

复用主模型的输出投影，得到覆盖整个词表的未归一化分数（Logits）。

### 步骤 5：各深度损失（Step 5: per-depth loss）

计算 softmax(logits) 相对于偏移 `k` 处真实词元的交叉熵，再用 `lambda / D` 缩放系数汇总各深度损失。

### 步骤 6：参数核算（Step 6: parameter accounting）

打印总参数量、共享部分（嵌入、输出头）的参数量，以及各模块的额外参数量。显示 MTP 额外参数与主模型规模之比。

## 使用方法（Use It）

DeepSeek-V3（2024 年 12 月）和 DeepSeek-R1 系列已集成 MTP。推理方面：

- DeepSeek 自有服务栈可直接将 MTP 模块用作推测解码器。
- 截至 2026 年 4 月，vLLM 和 SGLang 提供 DeepSeek-V3 MTP 的集成路径。
- AMD 的 ROCm SGLang 教程给出具体的 MTP 推测解码配置，在 V3 检查点（Checkpoint）上实测加速 1.8 倍。

何时在新的预训练任务中使用 MTP：

- 你控制完整预训练流水线（Pipeline），希望获得更密集的训练信号。
- 你确定将大规模提供模型服务，希望免费获得推测解码能力。
- 隐藏维度至少为 4096。在 1B 规模上，开销的负面影响大于收益。

何时不使用：

- 微调已有的预训练稠密模型（Dense Model）：MTP 模块尚未训练。
- 希望获得干净对照基线的研究模型：MTP 会改变架构。

## 交付成果（Ship It）

本课产出 `outputs/skill-mtp-planner.md`。给定预训练任务规格（模型规模、数据、算力），它会返回 MTP 集成方案：深度数 D、`lambda` 调度、内存开销，以及推理时推测解码的连接方式。

## 练习（Exercises）

1. 运行 `code/main.py`。展示各深度损失随合成信号增强而单调下降。将合成数据改为固定模式，验证深度 1 和深度 2 的损失都收敛。

2. 计算稠密 70B 模型（隐藏维度 8192、80 层）增加 D=1 个 MTP 模块的参数开销，与 DeepSeek-V3 报告的 14B 比较。解释后者为何更高：MTP Transformer 块继承了相同的 MoE 结构，增大了每模块参数量。

3. 在玩具版本中实现 D=2：添加第二个 MTP 模块，接收 h^(1) 并预测 `t_{i+2}`。验证联合损失和参数核算与 DeepSeek 论文公式 19–21 一致。

4. 将玩具版本改为并行 MTP（Gloeckle 式）：在主隐藏状态之上添加 D 个输出头，各自预测不同偏移位置。在相同合成信号上比较各深度损失。顺序版本由于以中间预测为条件，在 k > 1 时应有更低的深度 k 损失。

5. 将训练好的 MTP 模块用作 EAGLE 式草稿网络：推理时调用模块 k 提议 `t_{i+k}`。在留出序列（Held-Out Sequence）上，对照主模型预测测量草稿词元接受率。如果玩具版本达到 50% 以上，就复现了 MTP 可作草稿网络的经验特性。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| MTP 模块（MTP Module） | “额外损失块” | 小型 Transformer 块加投影，预测主模型前方 `k` 个位置的词元 |
| 预测深度（Prediction Depth） | “哪个偏移” | 整数 `k`；模块 `k` 从截至位置 `i` 的前缀预测 `t_{i+k}` |
| 并行 MTP（Parallel MTP） | “Gloeckle 式” | D 个独立头读取同一骨干隐藏状态，没有条件依赖链 |
| 顺序 MTP（Sequential MTP） | “DeepSeek-V3 式” | 每个模块以上一深度隐藏状态及下一词元嵌入为条件，保持因果链 |
| 共享输出头（Shared Output Head） | “复用主输出头” | MTP 模块调用主模型的语言模型（Language Model，LM）头，不另建输出投影 |
| 共享嵌入（Shared Embedding） | “复用主嵌入表” | 各处使用同一词表嵌入表，不重复参数 |
| 投影矩阵 M_k（Projection Matrix M_k） | “合并隐藏状态与下一词元” | `h x 2h` 线性层，将上一隐藏状态与目标词元嵌入合并为下一深度的输入 |
| 联合损失 L_MTP（Joint Loss L_MTP） | “额外损失取平均” | 各深度交叉熵损失的算术平均，再乘 `lambda` |
| 深度 1 接受率（Acceptance Rate at Depth 1） | “MTP 草稿多常正确” | D=1 模块的最高分预测与主模型最高分预测一致的比例；DeepSeek-V3 超过 80% |
| Lambda 加权（Lambda Weighting） | “额外损失的重要性” | 各深度缩放系数；DeepSeek-V3 在训练开始时为 0.3，之后为 0.1 |

## 延伸阅读（Further Reading）

- [DeepSeek-AI：DeepSeek-V3 技术报告（arXiv:2412.19437）](https://arxiv.org/abs/2412.19437)：完整的顺序 MTP 说明（第 2.2 节），包含联合损失公式及推理 1.8 倍加速。
- [Gloeckle 等人：通过多词元预测构建更好、更快的大语言模型（arXiv:2404.19737）](https://arxiv.org/abs/2404.19737)：DeepSeek 设计所改进的并行 MTP 基线。
- [Hugging Face 上的 DeepSeek-V3 模型卡（Model Card）](https://huggingface.co/deepseek-ai/DeepSeek-V3)：总计 685B（671B 主模型 + 14B MTP）及部署说明。
- [Leviathan 等人：通过推测解码实现 Transformer 快速推理（arXiv:2211.17192）](https://arxiv.org/abs/2211.17192)：MTP 所接入的推测解码框架。
- [Li 等人：EAGLE-3（arXiv:2503.01840）](https://arxiv.org/abs/2503.01840)：EAGLE 的 2025 年草稿架构，与 MTP 对应竞争。
