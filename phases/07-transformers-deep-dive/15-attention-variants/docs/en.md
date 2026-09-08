# 注意力变体：滑动窗口、稀疏与差分（Attention Variants — Sliding Window, Sparse, Differential）

> 完整注意力像一个圆，每个词元看到所有词元，内存为此付费。四种变体改变圆的形状，收回一半成本。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 7 · 02（自注意力），阶段 7 · 03（多头注意力），阶段 7 · 12（KV 缓存 / Flash Attention）
**Time:** ~60 分钟

## 问题（The Problem）

完整注意力相对于序列长度的内存成本为 `O(N²)`，计算成本为 `O(N²)`。128K 上下文的 Llama 3 70B 每层有 160 亿注意力条目，再乘以 80 层。Flash Attention（第 12 课）隐藏 `O(N²)` 激活内存，却不改变算术成本，每个词元仍关注其他所有词元。

三类变体改变注意力矩阵本身的拓扑：

1. **滑动窗口注意力（Sliding Window Attention，SWA）。** 每词元只关注固定邻域，而非完整前缀。内存与计算降为 `O(N · W)`，其中 `W` 是窗口。用于 Gemma 2/3、Mistral 7B 前几层、Phi-3-Long。
2. **稀疏/分块注意力（Sparse / block attention）。** 只给选定的 `(i, j)` 对打分，其余强制零权重。用于 Longformer、BigBird、OpenAI 稀疏 Transformer。
3. **差分注意力（Differential attention）。** 用独立 Q/K 投影计算两张注意力图，再相减。消除把权重泄漏到前几个词元的“注意力汇聚点”。Microsoft 的 DIFF Transformer（2024）。

这些方法可以共存。2026 年前沿模型常混合使用：多数层 SWA-1024，每第五层是全局完整注意力，少数差分头清理检索。Gemma 3 的 SWA 与全局层 5:1 比例是当前教科书式默认方案。

## 概念（The Concept）

### 滑动窗口注意力（Sliding Window Attention (SWA)）

位置 `i` 的查询只关注 `[i - W, i]`（因果 SWA）或 `[i - W/2, i + W/2]`（双向）。窗口外词元在分数矩阵中设为 `-inf`。

```
完整因果：             滑动窗口（W=4）：
位置 0-7               位置 0-7，W=4
    0 1 2 3 4 5 6 7        0 1 2 3 4 5 6 7
0 | x                0 |  x
1 | x x              1 |  x x
2 | x x x            2 |  x x x
3 | x x x x          3 |  x x x x
4 | x x x x x        4 |    x x x x
5 | x x x x x x      5 |      x x x x
6 | x x x x x x x    6 |        x x x x
7 | x x x x x x x x  7 |          x x x x
```

当 `N = 8192`、`W = 1024` 时，分数矩阵期望有 1024 × 8192 个非零行，缩减 8 倍。

**SWA 缩小 KV 缓存。** 每层只需保留最后 `W` 个词元的 K、V。对于类 Gemma-3 配置（1024 窗口、128K 上下文），KV 缓存缩小 128 倍。

**质量代价。** 纯 SWA Transformer 难以处理长距离检索。解决办法是交错 SWA 与完整注意力层。Gemma 3 用 5:1 的 SWA:全局比例。Mistral 7B 使用因果 SWA 堆叠，信息经重叠窗口“向前流动”：每层将有效感受野扩展 `W`，经过 `L` 层后可关注之前 `L × W` 个词元。

### 稀疏/分块注意力（Sparse / Block Attention）

预先选择 `N × N` 稀疏模式。三种典型形态：

- **局部与跨步（OpenAI 稀疏 Transformer）。** 关注最后 `W` 个词元，再关注更早部分每隔 `stride` 个的词元，以 `O(N · sqrt(N))` 计算同时捕捉局部与长距离关系。
- **Longformer / BigBird。** 局部窗口、小组全局词元（如 `[CLS]`，关注所有位置且被所有位置关注）与随机稀疏连接。实测相同质量下上下文可达 2 倍。
- **原生稀疏注意力（Native Sparse Attention，DeepSeek，2025）。** 学习 `(Q, K)` 的哪些块重要，在内核层跳过零块，兼容 FlashAttention。

稀疏注意力的关键在内核工程。数学简单，只需遮蔽分数矩阵；收益来自从不把零元素加载进 SRAM。FlashAttention-3 与 2026 年 FlexAttention API 使自定义稀疏模式成为 PyTorch 的一等能力。

### 差分注意力（Differential Attention (DIFF Transformer, 2024)）

普通注意力有“注意力汇聚点”（Attention Sink）问题：softmax 强制每行和为 1，不想特别关注任何内容的词元会把权重倒到第一个或前几个词元上，抢占本应分配给真实内容的容量。

差分注意力通过计算**两张**注意力图并相减解决它：

```
A1 = softmax(Q1 K1^T / √d)
A2 = softmax(Q2 K2^T / √d)
DiffAttn = (A1 - λ · A2) V
```

其中 `λ` 是可学习标量，通常 0.5–0.8。A1 捕捉真实内容权重，A2 捕捉汇聚点。相减消除汇聚点，将权重重新分给相关词元。

Microsoft 2024 年报告：困惑度降低 5–10%，相同训练长度下有效上下文长 1.5–2 倍，大海捞针检索更准确。

### 变体比较（Variant Comparison）

| 变体 | 计算量 | KV 缓存 | 相较完整注意力的质量 | 生产用途 |
|---------|---------|----------|-----------------|----------------|
| 完整注意力 | O(N²) | 每层 O(N) | 基线 | 各模型默认层 |
| SWA（窗口 1024） | O(N·W) | 每层 O(W) | 困惑度 -0.1，配合全局层效果好 | Gemma 2/3, Phi-3-Long |
| 局部与跨步稀疏 | O(N·√N) | 混合 | 类似 SWA | OpenAI 稀疏 Transformer、Longformer |
| BigBird（局部、全局、随机） | 近似 O(N) | 混合 | 2× 上下文时匹敌完整注意力 | 早期长上下文 BERT |
| 原生稀疏（DeepSeek-V3.2） | O(N · active fraction) | O(N) | 困惑度差距在 0.05 以内 | DeepSeek-V3.2，2025 |
| 差分 | O(2·N²) | O(2N) | 困惑度 -5% 至 -10% | DIFF Transformer、2026 年早期模型 |

```figure
gqa-kv-sharing
```

## 动手实现（Build It）

参见 `code/main.py`。实现因果掩码比较器，在玩具序列上并排展示完整、SWA、局部与跨步、差分注意力。

### 第 1 步：完整因果掩码基线（Step 1: full causal mask (baseline)）

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

第 07 课基线，下三角，对角线上方权重为零。

### 第 2 步：滑动窗口因果掩码（Step 2: sliding window causal mask）

```python
def swa_mask(n, window):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
    return M
```

只有一个参数 `window`。`window >= n` 时恢复完整因果注意力；`window = 1` 时每词元只关注自身。

### 第 3 步：局部与跨步稀疏掩码（Step 3: local + strided sparse mask）

```python
def strided_mask(n, window, stride):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
        for j in range(0, i + 1, stride):
            M[i][j] = 0.0
    return M
```

稠密局部窗口，加上向前直到序列起点每隔 `stride` 的词元。随层数增加，感受野以对数步数增长。

### 第 4 步：差分注意力（Step 4: differential attention）

```python
def diff_attention(Q1, K1, Q2, K2, V, lam):
    A1 = softmax_causal(Q1 @ K1.T / sqrt_d)
    A2 = softmax_causal(Q2 @ K2.T / sqrt_d)
    return (A1 - lam * A2) @ V
```

两次注意力计算，按可学习混合系数相减。代码比较单注意力与差分注意力的汇聚点热力图，观察汇聚点消退。

### 第 5 步：KV 缓存大小（Step 5: KV cache sizes）

在 `N = 131072` 时打印各变体每层缓存。SWA 与稀疏变体减少 10–100 倍，差分则翻倍。要清楚自己支付的内存成本。

## 实际应用（Use It）

2026 年生产模式：

```python
from transformers import AutoModelForCausalLM
# Gemma 3 mixes SWA (window=1024) and global layers at 5:1.
model = AutoModelForCausalLM.from_pretrained("google/gemma-3-27b-it")
# print(model.config.sliding_window, model.config.layer_types)
```

PyTorch 2.5+ 的 FlexAttention 接收掩码函数：

```python
from torch.nn.attention.flex_attention import flex_attention, create_block_mask

def swa_pattern(b, h, q_idx, kv_idx):
    return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)

mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)
```

它编译为自定义 Triton 内核。常见模式速度距 FlashAttention-3 不超过 10%，掩码函数则是 Python 可调用对象。

**各方案的选择时机：**

- **纯完整注意力：** 上下文约 16K 以内的所有层，或检索质量至关重要时。
- **SWA 与全局混合：** 长上下文（>32K），训练与推理受内存限制。2026 年 32K 以上的默认方案。
- **稀疏分块注意力：** 自定义内核、自定义模式，用于检索、音频等专门负载。
- **差分注意力：** 注意力汇聚点污染造成损害的负载，例如长上下文 RAG、大海捞针。

## 交付成果（Ship It）

参见 `outputs/skill-attention-variant-picker.md`。该技能根据目标上下文长度、检索需求及训练/推理计算概况，为新模型选择注意力拓扑。

## 练习（Exercises）

1. **简单。** 运行 `code/main.py`。验证 `window=4` 的 SWA 将每行最后 4 个词元之外全部置零；验证 `window=n` 与完整因果注意力逐比特相同。
2. **中等。** 在第 07 课综合实践基础上实现 `window=1024` 的因果 SWA，在 tinyshakespeare 上训练 1,000 步。相较完整注意力，验证损失退化多少？峰值内存降低多少？
3. **困难。** 在综合实践模型中实现 Gemma-3 式 5:1 层混合，即 5 层 SWA、1 层全局。在相同参数下，与纯 SWA 和纯全局基线比较损失、内存与生成质量。
4. **困难。** 实现每头具有可学习 `λ` 的差分注意力。在合成检索任务上训练（1 条目标信息、2,000 条干扰信息），测量相较同参数单注意力基线的检索准确率。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 滑动窗口注意力（SWA） | “局部注意力” | 每查询关注最近 `W` 个词元，KV 缓存缩为 `O(W)`。 |
| 有效感受野（Effective receptive field） | “模型能回看多远” | 窗口 `W`、`L` 层的 SWA 堆叠最多覆盖 `L × W` 个词元。 |
| Longformer / BigBird | “局部、全局、随机” | 带少量始终参与注意力的全局词元的稀疏模式，是早期长上下文方案。 |
| 原生稀疏注意力（Native Sparse Attention） | “DeepSeek 的内核技巧” | 学习块级稀疏性，在内核层跳过零块并保持质量。 |
| 差分注意力（Differential attention） | “两张图，一张用来相减” | DIFF Transformer 从第一张图减去可学习 `λ` 乘第二张图，消除注意力汇聚点。 |
| 注意力汇聚点（Attention sink） | “权重流到词元 0” | Softmax 归一化强制行和为 1，无信息查询将权重倒向位置 0。 |
| FlexAttention | “用 Python 写掩码” | PyTorch 2.5+ API，将任意掩码函数编译为 FlashAttention 式内核。 |
| 层类型混合（Layer type mix） | “SWA 与全局 5:1” | 堆叠中交错稀疏与完整注意力，以更低内存保持质量。 |

## 延伸阅读（Further Reading）

- [Beltagy、Peters、Cohan（2020）：Longformer：长文档 Transformer（Longformer: The Long-Document Transformer）](https://arxiv.org/abs/2004.05150)：滑动窗口与全局词元的典型论文。
- [Zaheer 等（2020）：Big Bird：面向更长序列的 Transformer（Big Bird: Transformers for Longer Sequences）](https://arxiv.org/abs/2007.14062)：局部、全局、随机。
- [Child 等（2019）：用稀疏 Transformer 生成长序列（Generating Long Sequences with Sparse Transformers）](https://arxiv.org/abs/1904.10509)：OpenAI 的局部与跨步模式。
- [Gemma Team（2024）：Gemma 2：在实用规模改进开放语言模型（Gemma 2: Improving Open Language Models at a Practical Size）](https://arxiv.org/abs/2408.00118)：1:1 SWA:全局混合。
- [Gemma Team（2025）：Gemma 3 技术报告（Gemma 3 technical report）](https://arxiv.org/abs/2503.19786)：窗口 1024 的 5:1 混合，现已成为教科书式默认方案。
- [Ye 等（2024）：差分 Transformer（Differential Transformer）](https://arxiv.org/abs/2410.05258)：DIFF Transformer 论文。
- [Yuan 等（2025）：原生稀疏注意力（Native Sparse Attention）](https://arxiv.org/abs/2502.11089)：DeepSeek-V3.2 的可学习稀疏注意力。
- [PyTorch：FlexAttention 博客与文档](https://pytorch.org/blog/flexattention/)：实际应用中可调用掩码模式的 API 参考。
