# 差分注意力 V2（Differential Attention (V2)）

> Softmax 注意力会为每个不匹配词元分配少量概率。跨越 100k 词元后，噪声累积并淹没信号。差分 Transformer（Differential Transformer，Ye 等，ICLR 2025）用两个 softmax 的差计算注意力，减去共享噪声底。DIFF V2（Microsoft，2026 年 1 月）面向生产栈重写，解码延迟与基线 Transformer 相当，无需自定义内核，兼容 FlashAttention。本课完整梳理 V1 到 V2，并提供可用 Python 标准库运行的差分操作教学实现。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 7 第 02 课（自注意力）、阶段 7 第 15 课（注意力变体）、阶段 10 第 14 课（架构详解）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 准确说明 softmax 注意力为什么存在噪声底（Noise Floor），以及它为什么随上下文长度增长。
- 推导差分注意力公式，解释减法为什么能抵消共享噪声分量，同时保留信号。
- 梳理 V1 到 V2 的差异：哪些更快、更简单、更稳定，以及各改动为何是生产预训练所必需。
- 用纯 Python 从零实现差分注意力，并在合成信号加噪声查询上验证噪声抵消性质。

## 问题（The Problem）

标准 softmax 注意力的一项数学性质，在大规模下会转化为运行难题。对查询 `q`，注意力权重为 `softmax(qK^T / sqrt(d))`。Softmax 永远不能产生精确零值，每个不匹配词元都会获得正概率质量。这些残余概率质量是噪声，随上下文长度增加。在 128k 词元下，即使每个不匹配词元只占 0.001% 概率，127,999 个相加也约占总量的 12%。模型必须学会绕开随上下文增长的噪声底。

实测表现为注意力头干扰：长上下文检索增强生成（RAG）中的幻觉引用，100k 词元检索任务中的中间信息丢失（Lost in the Middle），以及超过 32k 后大海捞针（Needle-in-haystack）基准上的细微准确性下降。差分 Transformer 论文（arXiv:2410.05258，ICLR 2025）测量了差距：相比同规模基线，DIFF Transformer 困惑度更低，长上下文准确性更高，幻觉更少。

DIFF V1 的三个问题使它未能进入前沿预训练流水线：每个解码步骤需载入两次值缓存；要求自定义 CUDA 内核，破坏 FlashAttention 兼容性；逐头 RMSNorm 使 70B 以上规模的长期训练不稳定。DIFF V2（Microsoft unilm 博客，2026 年 1 月 20 日）解决了三者。本课梳理两个版本，构建差分算子，并用教学查询测试噪声抵消。

## 概念（The Concept）

### Softmax 的噪声底（The noise floor of softmax）

对于查询 `q` 与键 `K = [k_1, ..., k_N]`，注意力权重为：

```
w_i = exp(q . k_i / sqrt(d)) / sum_j exp(q . k_j / sqrt(d))
```

没有任何 `w_i` 会为零。如果 `k_i` 与 `q` 完全无关，分数 `q . k_i` 也并非 0，而是在零附近波动，方差为 `||q||^2 / d`。softmax 归一化后，每个无关词元仍对加权和贡献 `O(1/N)`。无关词元总贡献为 `O((N-1)/N) = O(1)`，并不是小量。

模型想要类似硬 top-k 的行为：匹配词元权重高，其他位置接近零。Softmax 太平滑，无法直接做到。

### 差分思想（The differential idea）

将每个头的 Q 与 K 投影拆为两部分：Q = (Q_1, Q_2)，K = (K_1, K_2)。计算两个注意力图（Attention Map）：

```
A_1 = softmax(Q_1 K_1^T / sqrt(d))
A_2 = softmax(Q_2 K_2^T / sqrt(d))
```

输出：

```
DiffAttn = (A_1 - lambda * A_2) V
```

减法抵消两个图共享的噪声分布。如果两个图在 127k 个无关词元上都有近似均匀的权重，随机初始化时正是如此，这些权重就会抵消。信号，即少数真正相关词元上的尖峰权重，只有在两个图中幅度相同时才会抵消；模型训练后不会如此。

`lambda` 是逐头可学习标量，参数化为 `lambda = exp(lambda_q1 dot lambda_k1) - exp(lambda_q2 dot lambda_k2) + lambda_init`。它可以为负，`lambda_init` 默认是 0.8 这样的小正数。

### 为什么类似分头降噪（Why this matches headed noise-canceling）

想象两支有噪声的麦克风录制同一声音，两者都采集说话声与相关背景噪声。将两者相减，共享噪声消失。声音得以保留，因为两个信号在相位或幅度上存在足够差异，阻止完全抵消。逐头 `lambda` 学习的正是这种平衡。

### V1 与 V2 的差异（V1 vs V2: the diff）

V1 保持与基线 Transformer 相同的参数量。为使每个头有两个查询，它将头维度减半，损害头的表达能力，更严重的是每头值缓存也减半。解码每步必须载入值缓存两次，每个 softmax 分支一次。结果是即使参数量相同，解码仍比基线慢。

V2 将查询头数翻倍，保持 KV 头不变，从上投影借用参数。头维度与基线相同。相减后，将额外维度投影回较低维度，以匹配基线 Transformer 的 O_W 投影。三件事同时发生：

1. 解码速度与基线相当，键值缓存只载入一次。
2. FlashAttention 无需修改，不用自定义内核。
3. 解码算术强度（Arithmetic Intensity）提高，每从 HBM 载入一字节，执行更多计算。

V2 还移除了 V1 为稳定减法而使用的逐头 RMSNorm。70B 级预训练下，这种 RMSNorm 使后期训练不稳定。V2 用更简单的初始化方案替代，无需额外模块也能保持稳定。

### 适用时机（When to reach for it）

| 工作负载 | 收益 |
|----------|---------|
| 长上下文 RAG（64k 以上） | 更干净的注意力图，更少幻觉引用 |
| 大海捞针基准 | 超过 32k 后准确性明显提升 |
| 多文档问答（Multi-document QA） | 减少跨文档干扰 |
| 8k 代码补全 | 收益很小，不值得修改架构 |
| 短对话（< 4k） | 与基线基本无法区分 |

价值随上下文长度增长。4k 词元时，噪声底足够小，标准注意力就很好；128k 时，它就会带来损害。

### 与 2026 年其他设计的组合（How it stacks with other 2026 knobs）

| 特性 | 是否兼容 DIFF V2？ |
|---------|------------------------|
| GQA | 是，V2 增加 Q 头而非 KV 头 |
| MLA（DeepSeek） | 原理上可以，但尚无将两者结合的公开论文 |
| MoE | 是，注意力独立于 MLP 块 |
| RoPE | 是，无变化 |
| YaRN / 长上下文缩放 | 是，正是 DIFF 最有帮助的场景 |
| FlashAttention | V2 兼容，V1 不兼容 |
| 推测解码（Speculative Decoding） | 是，注意力变化对推测解码循环不可见 |

```figure
differential-attention
```

## 动手实现（Build It）

`code/main.py` 用纯 Python 实现差分注意力。教学查询具有已知的信号加噪声结构，便于直接测量噪声抵消比。

### 第 1 步：标准 softmax 注意力（Step 1: standard softmax attention）

使用标准库矩阵操作：列表嵌套列表、手写矩阵乘法，以及减去最大值保证数值稳定性的 softmax。

```python
def softmax(row):
    m = max(row)
    exps = [math.exp(x - m) for x in row]
    s = sum(exps)
    return [e / s for e in exps]
```

### 第 2 步：将 Q、K 拆为两半（Step 2: split Q, K into two halves）

V1 方式是头维度减半；V2 方式是保持头维度、头数翻倍。教学实现为清晰起见采用 V1，数学完全相同，只是维度管理不同。

### 第 3 步：两个 softmax 分支再相减（Step 3: two softmax branches + subtraction）

```python
A1 = [softmax([dot(q1, k) / scale for k in K1]) for q1 in Q1]
A2 = [softmax([dot(q2, k) / scale for k in K2]) for q2 in Q2]
diff_weights = [[a1 - lam * a2 for a1, a2 in zip(r1, r2)] for r1, r2 in zip(A1, A2)]
out = [[sum(w * v[j] for w, v in zip(row, V)) for j in range(d_v)] for row in diff_weights]
```

注意：输出权重可以为负。这没有问题，值缓存仍能处理带符号贡献，后续 V 投影会吸收符号。

### 第 4 步：测量噪声抵消（Step 4: noise cancellation measurement）

构建长度为 1024 的合成序列，将信号词元放在已知位置，其余填充噪声。分别计算信号位置上的标准 softmax 注意力权重与差分注意力权重，测量两者信噪比（Signal-to-noise Ratio，SNR）。根据训练使两个分支产生差异的程度，DIFF 注意力可稳定获得 3-10 倍信噪比。

### 第 5 步：V1 与 V2 参数核算（Step 5: V1 vs V2 parameter accounting）

给定配置（hidden=4096、heads=32、d_head=128），打印：

- 基线 Transformer：Q、K、V 大小均为 `hidden * hidden`，MLP 为 4 * hidden。
- DIFF V1：Q、K 大小均为 `hidden * hidden`，V 为 `hidden * hidden`，不变；内部头维度减半，增加逐头 `lambda` 参数，规模 O(heads * d_head)。
- DIFF V2：Q 大小为 `2 * hidden * hidden`，K 为 `hidden * hidden`，V 为 `hidden * hidden`。额外维度在 O_W 前投影回低维，增加相同的 `lambda` 参数。

教学实现测量并打印 V2 的额外参数成本，每个注意力块约增加 `hidden * hidden`。

## 实际应用（Use It）

截至 2026 年 4 月，DIFF V2 尚未出现在所有生产推理服务器中，但 vLLM 与 SGLang 正在集成。同时，这种模式已出现在：

- Microsoft 内部长上下文生产模型。
- 多项面向 256k 以上上下文的开放模型训练研究复现。
- 在交替层组合 DIFF 注意力与滑动窗口注意力的混合架构。

2026 年适合采用的情况：

- 从零训练新模型，目标有效上下文超过 64k。从一开始就加入差分注意力，之后重训成本很高。
- 微调长上下文模型，且评估失败主要来自中间信息丢失。在 Q 投影上进行低秩适配（Low-Rank Adaptation，LoRA），可以近似 DIFF 结构。

不适合采用的情况：

- 正在部署长上下文性能稳定的预训练稠密模型。对已有权重，重训成本通常无法收回。
- 上下文始终低于 16k，噪声底可忽略。

## 交付成果（Ship It）

本课产出 `outputs/skill-diff-attention-integrator.md`。给定模型架构、目标上下文长度、幻觉画像和训练预算，它生成将差分注意力加入新预训练或 LoRA 微调的集成方案。

## 练习（Exercises）

1. 运行 `code/main.py`。验证合成查询上差分注意力报告的信噪比高于标准 softmax 注意力。改变噪声幅度，展示标准注意力变得不可用的交叉点。

2. 对 7B 级模型（hidden=4096、heads=32、d_head=128、32 层），计算基线到 DIFF V1、基线到 DIFF V2 的参数量差值，展示哪些组件增加参数，哪些保持不变。

3. 阅读 DIFF V1 论文（arXiv:2410.05258）第 3 节与 DIFF V2 Hugging Face 博客第 2 节。用两句话解释 V1 的逐头 RMSNorm 为何必要，以及 V2 为何能够移除它而不导致训练发散。

4. 实现消融实验（Ablation）：使用 `lambda = 0`（纯第一个 softmax）与 `lambda = 1`（完整相减）计算差分注意力。在合成查询上扫描并测量信噪比变化，找出使信噪比最大的 `lambda`。

5. 将教学实现扩展为 GQA + DIFF V2，选用 8 个 KV 头和 32 个 Q 头。展示键值缓存大小与同样 (8, 32) 配置的基线 GQA 模型一致。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 差分注意力（Differential Attention） | “两个 softmax 相减” | 将 Q、K 各拆成两半，计算两个 softmax 图，从第一个中减去经 lambda 缩放的第二个，再乘 V |
| 噪声底（Noise Floor） | “softmax 非零尾部” | softmax 为每个无关词元分配 O(1/N) 权重，在长上下文中总和为 O(1) |
| lambda | “相减缩放量” | 逐头可学习标量，参数化为 `exp(lq1.lk1) - exp(lq2.lk2) + lambda_init`，可为负 |
| DIFF V1 | “ICLR 2025 版本” | 原始差分 Transformer，为保持参数量而将头维度减半，需要自定义内核，解码较慢 |
| DIFF V2 | “2026 年 1 月修正版” | Q 头翻倍、KV 头不变，解码速度与基线相当，兼容 FlashAttention |
| 逐头 RMSNorm（Per-head RMSNorm） | “V1 稳定器” | V1 在相减后应用的额外归一化，V2 为防止训练后期不稳定而移除 |
| 信噪比（Signal-to-noise Ratio） | “多少注意力被浪费” | 真实信号位置权重与无关位置平均权重之比 |
| 中间信息丢失（Lost in the Middle） | “长上下文故障模式” | 长上下文中间文档的检索准确性下降的经验现象，DIFF 可缓解 |
| 算术强度（Arithmetic Intensity） | “每载入字节的 FLOPs” | V2 通过每次 KV 载入处理双倍查询，提高解码算术强度，对内存受限解码很重要 |

## 延伸阅读（Further Reading）

- [Ye 等：《差分 Transformer》（arXiv:2410.05258，ICLR 2025）](https://arxiv.org/abs/2410.05258)：原始论文，包含噪声抵消理论和长上下文消融实验
- [Microsoft unilm：《差分 Transformer V2》（Hugging Face 博客，2026 年 1 月）](https://huggingface.co/blog/microsoft/diff-attn-v2)：生产栈重写，解码与基线相当，兼容 FlashAttention
- [《理解差分 Transformer 如何释放预训练自注意力》（arXiv:2505.16333）](https://arxiv.org/abs/2505.16333)：分析减法为何能恢复预训练注意力结构的理论研究
- [《共享 DIFF Transformer》（arXiv:2501.17900）](https://arxiv.org/html/2501.17900)：参数共享变体
- [Vaswani 等：《注意力就是你所需要的一切》（arXiv:1706.03762）](https://arxiv.org/abs/1706.03762)：DIFF 所基于的 Transformer 基线
- [Liu 等：《迷失在中间》（arXiv:2307.03172）](https://arxiv.org/abs/2307.03172)：DIFF 注意力针对的长上下文基准
