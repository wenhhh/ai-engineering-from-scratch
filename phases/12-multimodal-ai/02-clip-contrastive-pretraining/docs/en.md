# CLIP 与对比式视觉语言预训练（CLIP and Contrastive Vision-Language Pretraining）

> OpenAI 的 CLIP（2021）证明了一个足以支撑随后五年发展的想法：只使用带噪声的网页图像—描述对和对比损失（Contrastive loss），就能在同一向量空间中对齐图像编码器与文本编码器。没有监督标签，共 400M 对数据。得到的嵌入空间能进行零样本分类（Zero-shot classification）、图文检索，并作为视觉塔接入每个 2026 年的 VLM。SigLIP 2（2025）用 sigmoid 取代 softmax，以更低成本扩展并超越了 CLIP。本课将梳理从 InfoNCE 到 sigmoid 成对损失的数学原理，并用 Python 标准库实现训练步骤。

**Type:** Build
**Languages:** Python（标准库，InfoNCE + sigmoid 损失实现）
**Prerequisites:** 阶段 12 · 01（ViT 图像块）、阶段 7（变换器，Transformers）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 从互信息（Mutual information）推导 InfoNCE 损失，实现数值稳定的向量化版本。
- 解释为什么 sigmoid 成对损失（SigLIP）可以扩展到 32768+ 的批量大小，而不需要 softmax 所要求的全收集（All-gather）开销。
- 通过构造文本模板（`a photo of a {class}`）并对余弦相似度取 argmax，执行 ImageNet 零样本分类。
- 说出 CLIP / SigLIP 预训练提供的四项调节手段：批量大小、温度、提示词模板、数据质量。

## 问题（The Problem）

CLIP 之前的视觉采用监督学习。收集带标签的数据集（ImageNet：1.2M 张图像、1000 个类别），训练 CNN，然后交付。标签成本高，偏向标注者能够达成一致的内容，而且未经微调就无法迁移到新任务。

网络上的图像—描述数据免费提供了超过十亿对宽松标注的样本。一张金毛寻回犬的图片，替代文字是“我的狗 Max 在公园里”，就携带了监督信号：文本描述了图像。问题是，能否把这变成有用的训练？

CLIP 的答案是把图像—描述对视为匹配任务。给定含 N 张图像和 N 条描述的批次，学习让每张图像在 N-1 个干扰项中匹配自己的描述。监督信号是“这两个事物属于一对，其余 N-1 个不属于”。无需类别标签，无需人工标注，只需对比损失。

得到的嵌入空间能完成超出 CLIP 训练目标的事情。ImageNet 零样本分类之所以有效，是因为“一张猫的照片”的嵌入靠近那些从未明确标注为猫的猫图像。这个设想催生了 2026 年的每个 VLM。

## 概念（The Concept）

### 双编码器（The dual encoder）

CLIP 有两座塔：

- 图像编码器 `f`：ViT 或 ResNet，为每张图像输出一个 D 维向量。
- 文本编码器 `g`：小型变换器，为每条描述输出一个 D 维向量。

两座塔都将输出归一化为单位长度。由于两者范数均为 1，相似度为 `cos(f(x), g(y)) = f(x)^T g(y)`。

对于含 N 个（图像、描述）对的批次，构建形状为 `(N, N)` 的相似度矩阵 `S`：

```
S[i, j] = cos(f(x_i), g(y_j)) / tau
```

其中 `tau` 是可学习的温度（Temperature，CLIP 初始化为 0.07，在对数空间中学习）。

### InfoNCE 损失（InfoNCE loss）

CLIP 对行和列使用对称交叉熵（Cross-entropy）：

```
loss_i2t = CE(S, labels=identity)     # each image's positive is its own caption
loss_t2i = CE(S^T, labels=identity)   # each caption's positive is its own image
loss = (loss_i2t + loss_t2i) / 2
```

这就是 InfoNCE。交叉熵中的 softmax 强制每张图像与自身描述的匹配程度高于批次内的其他所有描述。“负样本”就是批次中的其他全部样本。更大的批次 = 更多负样本 = 更强信号。CLIP 采用 32k 批量训练，规模很重要。

### 温度（Temperature）

`tau` 控制 softmax 的尖锐程度。低 tau → 分布尖锐，产生难负样本挖掘（Hard negative mining）效果。高 tau → 分布平缓，所有样本都贡献信号。CLIP 学习 log(1/tau)，并进行截断以防坍塌。SigLIP 2 固定初始 tau，转而使用可学习偏置。

### 为什么 sigmoid 扩展得更好（Why sigmoid scales better，SigLIP）

Softmax 需要同步完整的相似度矩阵。在分布式训练中，必须将每个嵌入全收集到每个副本，然后计算 softmax。通信量相对于进程总数（World size）呈二次增长。

SigLIP 用逐元素 sigmoid 取代 softmax：对于每一对 `(i, j)`，损失对应于“它们是否为匹配对”的二分类。对角线是正类标签，其他全部为负类。损失为：

```
L = -1/N sum over (i, j) [ y_ij log sigmoid(S[i,j]) + (1-y_ij) log sigmoid(-S[i,j]) ]
```

若 `i == j`，则 `y_ij = 1`，否则为 0。每对样本的损失相互独立。无需全收集，每个 GPU 计算本地块并求和。SigLIP 2 可以低成本扩展到 32k-512k 批量，而 CLIP 需要按比例增加通信。

### 零样本分类（Zero-shot classification）

给定 N 个类别名称，为每类构造一个文本模板：

```
"一张{class}的照片"
```

用文本编码器嵌入每个模板，用图像编码器嵌入图像。余弦相似度的 argmax = 预测类别。无需针对目标类别训练。

提示词模板很重要。CLIP 原始论文对每个类别使用 80 个模板（普通、艺术、照片、绘画等），并对嵌入取平均，使 ImageNet 表现提升 3 个百分点。现代用法通常选择一两个模板。

### 线性探测与微调（Linear probes and finetuning）

零样本是基线。线性探测（Linear probe，即在冻结的 CLIP 特征之上为目标类别训练一个线性层）在域内任务上优于零样本。全量微调在域内优于线性探测，但可能损害零样本迁移。三种方式对应三种权衡。

### SigLIP 2：NaFlex 与密集特征（SigLIP 2: NaFlex and dense features）

SigLIP 2（2025）新增：
- NaFlex：单个模型处理可变宽高比和分辨率。
- 更好的分割和深度估计密集特征，面向在 VLM 中作为冻结骨干网络的用途。
- 多语言：使用 100+ 种语言训练，而 CLIP 仅使用英语。
- 参数规模达到 1B，而 CLIP 最高为 400M。

在 2026 年开放 VLM 中，SigLIP 2 SO400m/14 是默认视觉塔。当特定的 LAION-2B 训练分布符合查询模式时，CLIP 仍是纯图文检索的默认选择。

### ALIGN、BASIC、OpenCLIP、EVA-CLIP（ALIGN, BASIC, OpenCLIP, EVA-CLIP）

ALIGN（Google，2021）：与 CLIP 相同的思路，规模为 1.8B 对数据，90% 带噪声，证明噪声数据可以扩展。OpenCLIP（LAION）：在 LAION-400M / 2B 上开放复现 CLIP，提供多个规模，是首选开放检查点。EVA-CLIP：从掩码图像建模初始化，是 VLM 的强大骨干网络。BASIC：Google 的 CLIP+ALIGN 混合方案。它们属于同一家族，区别在于数据和调优。

### 零样本上限（The zero-shot ceiling）

CLIP 类模型的 ImageNet 零样本表现上限约为 76%（CLIP-G、OpenCLIP-G）。要进一步提升，需要大得多的数据（SigLIP 2 达到 80%+）或架构变化（监督输出头、更多参数）。该基准正在饱和；真正的价值是供下游 VLM 使用的嵌入空间。

```figure
multimodal-fusion
```

## 实际应用（Use It）

`code/main.py` 实现：

1. 玩具双编码器（基于哈希的图像特征、文本字符特征），让你不用 numpy 就能观察 InfoNCE 的形态。
2. 纯 Python InfoNCE 损失（通过 log-sum-exp 保证数值稳定）。
3. 用于对比的 sigmoid 成对损失。
4. 零样本分类流程：计算与一组文本提示词的余弦相似度，通过 argmax 得到预测。

运行它并观察损失曲线。绝对数值来自玩具示例，但曲线形态与真实 CLIP 训练器的输出一致。

## 交付成果（Ship It）

本课交付 `outputs/skill-clip-zero-shot.md`。给定一组图像（通过路径）和目标类别列表，它使用 CLIP 模板构造文本提示词，用声明的检查点（例如 `openai/clip-vit-large-patch14`）嵌入两侧，并返回带相似度分数的 top-1 / top-5 预测。该技能拒绝对提示词列表之外的类别作出判断。

## 练习（Exercises）

1. 手算一个含 4 对样本的批次的 InfoNCE。构建 4x4 相似度矩阵，计算 softmax，取出对角线，计算交叉熵。用手算结果验证 Python 实现。

2. SigLIP 除温度外还使用偏置参数 `b`：`S'[i,j] = S[i,j]/tau + b`。当批次类别严重不平衡（每行负样本远多于正样本）时，`b` 起什么作用？阅读 SigLIP 第 3 节（arXiv:2303.15343）。

3. 构建猫狗零样本分类器。尝试两个提示词模板：`a photo of a {class}` 和 `a picture of a {class}`。在 100 张测试图像上测量准确率。模板集成是否优于单模板？

4. 计算 512 个 GPU、批量 32k 时 softmax InfoNCE 与 sigmoid 成对损失的通信成本。哪种按 O(N) 扩展，哪种按 O(N^2) 扩展？引用 SigLIP 第 4 节。

5. 阅读 OpenCLIP 缩放定律论文（arXiv:2212.07143，Cherti 等人）。根据图表复现其数据缩放结论：固定模型规模时，ImageNet 零样本准确率与训练数据规模之间是什么对数线性关系？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 准确含义 |
|------|----------------|------------------------|
| InfoNCE | “对比损失” | 对批次相似度矩阵计算交叉熵；每项的正样本是其配对项，其余全部是负样本 |
| Sigmoid 损失（Sigmoid loss） | “SigLIP 损失” | 逐对二元交叉熵；无需 softmax 或全收集，在分布式训练中可低成本扩展 |
| 温度（Temperature） | “tau” | 在 softmax/sigmoid 前缩放未归一化分数（Logits）的标量；控制分布的尖锐程度 |
| 零样本（Zero-shot） | “无需微调的分类” | 使用文本提示词构建类别嵌入，按余弦相似度分类；不对目标类别训练 |
| 提示词模板（Prompt template） | “一张……的照片” | 包围类别名称的文本框架；影响零样本准确率 1-5 个百分点 |
| 双编码器（Dual encoder） | “双塔” | 一个图像编码器 + 一个文本编码器，输出位于共享 D 维空间 |
| 难负样本（Hard negative） | “难以区分的干扰项” | 与正样本足够相似、模型必须努力才能分开的负样本 |
| 线性探测（Linear probe） | “冻结 + 一层” | 只在冻结特征之上训练线性分类器；衡量特征质量 |
| NaFlex | “原生灵活分辨率” | SigLIP 2 不经缩放就接收任意宽高比和分辨率图像的能力 |
| 温度缩放（Temperature scaling） | “对数参数化的 tau” | CLIP 将 `log(1/tau)` 参数化以改善梯度行为；通过截断防止坍塌到接近零的 tau |

## 延伸阅读（Further Reading）

- [Radford 等人：《从自然语言监督中学习可迁移的视觉模型（Learning Transferable Visual Models From Natural Language Supervision）》（arXiv:2103.00020）](https://arxiv.org/abs/2103.00020)：CLIP 论文。
- [Zhai 等人：《语言图像预训练的 Sigmoid 损失（Sigmoid Loss for Language Image Pre-Training）》（arXiv:2303.15343）](https://arxiv.org/abs/2303.15343)：SigLIP。
- [Tschannen 等人：SigLIP 2（arXiv:2502.14786）](https://arxiv.org/abs/2502.14786)：多语言 + NaFlex。
- [Jia 等人：ALIGN（arXiv:2102.05918）](https://arxiv.org/abs/2102.05918)：利用带噪声的网络数据扩展。
- [Cherti 等人：《对比式语言图像学习的可复现缩放定律（Reproducible scaling laws for contrastive language-image learning）》（arXiv:2212.07143）](https://arxiv.org/abs/2212.07143)：OpenCLIP 缩放定律。
