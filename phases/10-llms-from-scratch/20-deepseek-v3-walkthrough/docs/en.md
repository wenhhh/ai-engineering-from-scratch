# DeepSeek-V3 架构详解（DeepSeek-V3 Architecture Walkthrough）

> 阶段 10 第 14 课介绍了每个开放模型都会调整的六项架构设计。DeepSeek-V3（2024 年 12 月，总参数 671B、激活参数 37B）调整了全部六项，又增加四项：多头潜在注意力（Multi-Head Latent Attention，MLA）、无辅助损失负载均衡（Auxiliary-Loss-Free Load Balancing）、多词元预测（Multi-Token Prediction，MTP）以及 DualPipe 训练。本课自上而下阅读 DeepSeek-V3 架构，从公开配置推导各项参数量。学完后，你能解释为何选择 671B/37B 比例，以及在前沿规模下 MLA 与混合专家（Mixture of Experts，MoE）组合为何优于单独使用任一种。

**Type:** Learn
**Languages:** Python (stdlib, parameter calculator)
**Prerequisites:** 阶段 10 · 14（开放模型详解）、阶段 10 · 17（NSA）、阶段 10 · 18（MTP）、阶段 10 · 19（DualPipe）
**Time:** 约 75 分钟

## 学习目标（Learning Objectives）

- 自上而下阅读 DeepSeek-V3 配置，用 GPT-2 的六项架构调整及 DeepSeek 特有的四项新增设计解释各字段。
- 推导总参数量（671B）、激活参数量（37B）及各组成部分的贡献。
- 计算 MLA 在 128k 上下文下的键值缓存（Key-Value Cache，KV Cache）占用，与相同激活参数规模、采用分组查询注意力（Grouped-Query Attention，GQA）的稠密模型比较。
- 陈述四项 DeepSeek 特有创新（MLA、MTP、无辅助损失路由、DualPipe），指出各自针对架构或训练栈的哪一部分。

## 问题（The Problem）

DeepSeek-V3 是首个架构与 Llama 家族有实质差异的前沿开放模型。Llama 3 405B 是“调整了六项设计的 GPT-2”，DeepSeek-V3 则调整了这六项，又加四项。阅读 Llama 3 配置可为阅读 DeepSeek 配置热身，但注意力块形状、路由逻辑、训练目标等深层结构差异很大，值得单独讲解。

学习它的收益是：DeepSeek-V3 开放权重后，改变了开放模型中“前沿能力”的含义。其架构成为许多 2026 年训练任务参照的蓝图。对涉及前沿大语言模型（Large Language Model，LLM）训练或推理的岗位，理解它是基本要求。

## 概念（The Concept）

### 再看不变的核心（The invariant core, again）

DeepSeek-V3 仍是自回归（Autoregressive）模型，仍堆叠解码器块（Decoder Blocks）。每块仍包含注意力、多层感知机（Multilayer Perceptron，MLP）和两次均方根归一化（Root Mean Square Normalization，RMSNorm），MLP 仍使用 SwiGLU，仍采用旋转位置嵌入（Rotary Position Embedding，RoPE）、前置归一化（Pre-Norm）及权重绑定嵌入（Weight-Tied Embeddings）。这些基础与 Llama、Mistral 相同。

### 变化：以 MLA 替代 GQA（The twist: MLA instead of GQA）

阶段 10 · 14 已说明，GQA 让多组 Q 头共享 K 和 V，从而缩小 KV 缓存。MLA 更进一步：将 K 和 V 压缩为共享低秩潜在表示（Low-Rank Latent Representation），维度由 `kv_lora_rank` 指定，再按头即时解压。KV 缓存只保存潜在表示，每层每词元通常为 512 个浮点数，而不是 8 x 128 = 1024 个。

在 128k 上下文下，DeepSeek-V3 使用 MLA：每层每词元一个共享潜在表示 `c^{KV}`，K 和 V 都通过上投影从中导出；这些上投影可吸收到后续矩阵乘法中：

```
kv_cache = num_layers * kv_lora_rank * max_seq_len * bytes_per_element
         = 61 * 512 * 131072 * 2
         = 7.6 GB
```

假设采用 GQA 基线（Llama 3 70B 的形状，8 个 KV 头、头维度 128），其成本为：

```
kv_cache = 2 * 61 * 8 * 128 * 131072 * 2
         = 30.5 GB
```

在 128k 上下文下，MLA 缓存大小是 Llama-3-70B 式 GQA 的四分之一。

代价是 MLA 每次注意力计算、每个头都多一步解压。额外计算相对节省的带宽较小，对长上下文推理而言净收益为正。

### 路由：无辅助损失负载均衡（The routing: auxiliary-loss-free load balancing）

MoE 路由器（Router）决定每个词元由得分最高的 k 个专家处理。朴素路由器会把过多工作集中于少数专家，让其他专家空闲。标准修复是增加惩罚负载不均衡的辅助损失项（Auxiliary Loss）。这有效，但会略微降低主任务表现。

DeepSeek-V3 引入无辅助损失方案：在路由器的未归一化分数（Logits）中加入各专家偏置项（Bias），训练时按简单规则调整：专家 `e` 过载则降低 `bias_e`，负载不足则提高。无需额外损失项，训练目标保持简洁，专家负载保持均衡。

对主损失的影响：未测出影响。对 MoE 架构的影响：更简洁，无需调节辅助损失超参数（Hyperparameter）。

### MTP：更密集的训练与免费草稿（The MTP: denser training + free draft）

阶段 10 · 18 已说明，DeepSeek-V3 增加 D=1 个 MTP 模块，预测后方两个位置的词元。推理时，训练好的模块改作推测解码（Speculative Decoding）草稿网络，接受率超过 80%；训练时，每个隐藏状态获得 D+1 = 2 个监督目标，信号更密集。

参数：671B 主模型之外增加 14B，开销为 2.1%。

### 训练：DualPipe（The training: DualPipe）

阶段 10 · 19 已说明，DualPipe 是双向流水线，将前向和反向工作块与跨节点全互连通信（All-to-All Communication）重叠。在 DeepSeek-V3 的 2,048 块 H800 规模下，它收回了约 245k GPU 小时，否则这些时间会被 1F1B 的流水线气泡消耗。

### 逐字段阅读配置（The config, field by field）

以下是简化的 DeepSeek-V3 配置：

```
hidden_size: 7168
intermediate_size: 18432   （稠密 MLP 隐藏维度，用于前几层）
moe_intermediate_size: 2048 （专家 MLP 隐藏维度）
num_hidden_layers: 61
first_k_dense_layers: 3    （前 3 层使用稠密 MLP）
num_attention_heads: 128
num_key_value_heads: 128   （MLA 下形式上等于 num_heads，但
                           真正的压缩由 kv_lora_rank 决定）
kv_lora_rank: 512          （MLA 潜在维度）
num_experts: 256            （每块 MoE 专家数）
num_experts_per_tok: 8      （前 8 路由）
shared_experts: 1           （每块始终启用的共享专家）
max_position_embeddings: 163840
rope_theta: 10000.0
vocab_size: 129280
mtp_module: 1               （深度 1 的一个 MTP 模块）
```

逐项解析：

- `hidden_size=7168`：嵌入维度。
- `num_hidden_layers=61`：总块深度。
- `first_k_dense_layers=3`：前 3 块使用隐藏维度 18432 的稠密 MLP，其余 58 块使用 MoE。
- `num_attention_heads=128`：128 个查询头（Query Heads）。
- `kv_lora_rank=512`：K 和 V 压缩到此潜在维度，再按头解压。
- `num_experts=256, num_experts_per_tok=8`：每个 MoE 块有 256 个专家，路由选择前 8 个。
- `shared_experts=1`：256 个路由专家之外，另有一个始终启用的专家处理每个词元。可将其视为“稠密保底层”，确保每个词元获得可靠贡献。
- `moe_intermediate_size=2048`：每个专家的 MLP 隐藏维度。因为专家有 256 个，所以单专家维度小于稠密 MLP。

### 参数核算（Parameter accounting）

完整计算位于 `code/main.py`，主要结果如下：

- 嵌入：`vocab * hidden = 129280 * 7168 = ~0.93B`。
- 前 3 个稠密块：MLA 注意力（每块约 144M）+ 稠密 MLP（每块约 260M）+ 归一化，总计约 1.2B。
- 58 个 MoE 块：MLA 注意力（约 144M）+ 每块 256 个专家（每个 30M）+ 1 个共享专家（30M）+ 归一化。包含全部专家时每块约 7.95B，58 块共 461B。
- MTP 模块：14B。

总计：核心架构约 476B + 14B MTP；公开的 671B 数值则还计入额外结构参数（偏置张量、专家特有组件、共享专家缩放等）。计算器复现的数值与公开值相差 3–5%，差异来自 DeepSeek 报告第 2 节附录所述的细粒度核算。

每次前向的激活参数：

- 注意力：每层 144M * 61 = 8.8B，所有层都执行。
- 激活 MLP：前 3 层为稠密（3 * 260M = 780M）；58 个 MoE 层各激活 8 个路由专家 + 1 个共享专家，加路由开销。每层激活 MLP 约 260M。合计：3 * 260M + 58 * 260M = ~15.9B。
- 嵌入 + 归一化：1.2B。
- 激活总量：核心约 26B + 14B MTP（训练时执行，推理不一定执行）≈ 37B。

### 671B / 37B 比例（The 671B / 37B ratio）

稀疏比为 18 倍，激活参数占总参数 5.5%。DeepSeek-V3 是已开放权重的前沿 MoE 模型中最稀疏的。Mixtral 8x7B 的比例为 13/47（28%），稠密得多；Llama 4 Maverick 的 17B/400B（4.25%）与之相近。DeepSeek 的判断是：前沿规模下，更多专家、更低激活比例能带来更高的单位激活浮点运算（Floating-Point Operation，FLOP）质量。

### DeepSeek-V3 的定位（Where DeepSeek-V3 sits）

| 模型 | 总参数 | 激活参数 | 比例 | 注意力 | 创新设计 |
|-------|------|-------|-------|-----------|-------------|
| Llama 3 70B | 70B | 70B | 100% | GQA 64/8 | 无 |
| Llama 4 Maverick | 400B | 17B | 4.25% | GQA | 无 |
| Mixtral 8x22B | 141B | 39B | 27% | GQA | 无 |
| DeepSeek V3 | 671B | 37B | 5.5% | MLA 512 | MLA + MTP + 无辅助损失 + DualPipe |
| Qwen 2.5 72B | 72B | 72B | 100% | GQA 64/8 | YaRN 扩展 |

### 后续：R1、V4（The follow-on: R1, V4）

DeepSeek-R1（2025）是在 V3 骨干上进行推理能力训练的产物。R1 使用相同架构，变化的是后训练方法（在可验证任务上进行大规模强化学习（Reinforcement Learning，RL）），而非预训练架构。

DeepSeek-V4（如果发布）预计保留 MLA + MoE + MTP，并增加 DeepSeek 稀疏注意力（DeepSeek Sparse Attention，DSA），即阶段 10 · 17 原生稀疏注意力（Native Sparse Attention，NSA）的后继。沿革保持稳定：架构创新逐步累积，每个版本增加新的调整。

```figure
moe-routing
```

## 使用方法（Use It）

`code/main.py` 是针对 DeepSeek-V3 形状的参数计算器。运行后将输出与论文数值比较，再尝试假想变体：256 与 512 个专家、前 8 与前 16 路由、MLA 秩 512 与 1024。

重点观察：

- 总参数量与公开 671B 的对比。
- 激活参数量与公开 37B 的对比。
- 128k 上下文下 MLA 与 GQA 的 KV 缓存比较。
- 逐层明细，了解参数预算实际花在哪里。

## 交付成果（Ship It）

本课产出 `outputs/skill-deepseek-v3-reader.md`。给定 DeepSeek 家族模型（V3、R1 或未来变体），它会逐组件解析架构，说明各配置字段，按组件推导参数量，并识别模型采用了四项 DeepSeek 特有创新中的哪些。

## 练习（Exercises）

1. 运行 `code/main.py`。将计算器估计的总参数量与公开 671B 比较，找出差异来源。论文第 2 节给出完整分项。

2. 将配置的 MLA 秩从 512 改为 256，计算 128k 上下文下的 KV 缓存大小。减少了多少百分比？每个头的表达能力付出什么代价？

3. 比较 DeepSeek-V3 的（256 个专家、前 8 路由）与假想的（512 个专家、前 8 路由）。总参数增长，激活参数不变。额外专家容量在理论上带来什么收益，推理时有什么成本？

4. 阅读 DeepSeek-V3 技术报告（arXiv:2412.19437）第 2.1 节的 MLA 内容。用三句话解释为何 K、V 解压矩阵可“吸收”到后续矩阵乘法中，提高推理效率。

5. DeepSeek-V3 的多数操作使用 8 位浮点（8-Bit Floating Point，FP8）训练。计算保存 671B 权重时，FP8 相比 BF16 节省的内存。这与 14.8T 词元训练预算有何关系？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 多头潜在注意力（Multi-Head Latent Attention，MLA） | “多头潜在注意力” | 将 K、V 压缩为共享低秩潜在表示（kv_lora_rank，通常 512），按头即时解压；KV 缓存只存潜在表示 |
| kv_lora_rank | “MLA 压缩维度” | K、V 共享潜在表示的大小，DeepSeek-V3 使用 512 |
| 前 k 个稠密层（First k Dense Layers） | “早期层保持稠密” | MoE 模型前几层跳过路由器，使用稠密 MLP 以保持稳定 |
| num_experts_per_tok | “前 k 路由” | 每词元激活的路由专家数，DeepSeek-V3 使用 8 |
| 共享专家（Shared Experts） | “始终启用的专家” | 不论路由结果都处理每个词元的专家，DeepSeek-V3 使用 1 个 |
| 无辅助损失路由（Auxiliary-Loss-Free Routing） | “偏置调整负载均衡” | 训练时调整各专家偏置，平衡负载，无需增加损失项 |
| MTP 模块（MTP Module） | “额外预测头” | 根据 h^(1) 和 E(t+1) 预测 t+2 的 Transformer 块，提供更密集训练信号及免费草稿网络 |
| DualPipe | “双向流水线” | 将前向/反向计算与跨节点全互连重叠的训练调度 |
| 激活参数比例（Active Parameter Ratio） | “稀疏度” | active_params / total_params；DeepSeek-V3 为 5.5% |
| FP8 训练（FP8 Training） | “8 位训练” | 存储及许多计算使用 FP8，相比 BF16 内存约减半，付出少量质量代价 |

## 延伸阅读（Further Reading）

- [DeepSeek-AI：DeepSeek-V3 技术报告（arXiv:2412.19437）](https://arxiv.org/abs/2412.19437)：完整架构、训练及结果文档。
- [Hugging Face 上的 DeepSeek-V3 模型卡（Model Card）](https://huggingface.co/deepseek-ai/DeepSeek-V3)：配置文件及部署说明。
- [DeepSeek-V2 论文（arXiv:2405.04434）](https://arxiv.org/abs/2405.04434)：引入 MLA 的前代模型。
- [DeepSeek-R1 论文（arXiv:2501.12948）](https://arxiv.org/abs/2501.12948)：在 V3 架构上训练推理能力的后继。
- [原生稀疏注意力（arXiv:2502.11089）](https://arxiv.org/abs/2502.11089)：DeepSeek 家族注意力的未来方向。
- [DualPipe 仓库](https://github.com/deepseek-ai/DualPipe)：训练调度参考实现。
