# 用于文本的 CNN 与 RNN（CNNs and RNNs for Text）

> 卷积学习 n 元词组，循环保存记忆。两者都被注意力取代，但在受限硬件上仍有价值。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 3 · 11（PyTorch 入门，PyTorch Intro），阶段 5 · 03（词嵌入，Word Embeddings），阶段 4 · 02（从零实现卷积，Convolutions from Scratch）
**Time:** ~75 分钟

## 问题（The Problem）

TF-IDF 和 Word2Vec 生成忽略词序的扁平向量。在它们之上构建的分类器无法区分 `dog bites man` 与 `man bites dog`，但词序有时正是信号所在。

Transformer 出现前，两类架构填补了这一空白。

**文本卷积网络（TextCNN）。** 对词嵌入序列执行一维卷积。宽度为 3 的滤波器是可学习的三元词组检测器，覆盖三个词并输出一个分数。组合不同宽度（2、3、4、5）检测多尺度模式，再通过最大池化（Max-pooling）得到定长表示。结构扁平、可并行、速度快。

**循环网络（Recurrent nets，RNN、LSTM、GRU）。** 每次处理一个词元，维护将信息向前传递的隐藏状态（Hidden state）。按序执行、有记忆、支持灵活输入长度。它们在 2014 至 2017 年主导序列建模，随后注意力（Attention）出现。

本课实现两者，再说明哪些失效促成了注意力机制。

## 概念（The Concept）

**TextCNN**（Kim，2014）。先将词元嵌入，宽度为 `k` 的一维卷积让滤波器在连续 `k` 元嵌入组上滑动，生成特征图（Feature map）。对特征图做全局最大池化，选出最强激活。拼接多种滤波器宽度的池化输出，送入分类头（Classifier head）。

其有效性在于：滤波器就是可学习的 n 元词组。最大池化具有位置不变性（Position invariance），所以“not good”出现在评论开头或中间，都会激活相同特征。三种宽度、每种 100 个滤波器，便得到 300 个学习到的 n 元词组检测器。训练可并行，没有顺序依赖。

**循环神经网络（RNN）。** 每个时间步 `t`，隐藏状态为 `h_t = f(W * x_t + U * h_{t-1} + b)`。跨时间共享 `W`、`U`、`b`。时刻 `T` 的隐藏状态是整个前缀的摘要。分类时，对 `h_1 ... h_T` 做池化，可取最大值、均值或最后状态。

普通 RNN 有梯度消失（Vanishing gradient）问题。**长短期记忆网络（LSTM）**加入门控，决定遗忘什么、存储什么、输出什么，使长序列梯度更稳定。**门控循环单元（GRU）**将 LSTM 简化为两个门，参数更少而表现相近。

**双向 RNN（Bidirectional RNN）**正向运行一个 RNN，反向运行另一个，再拼接隐藏状态。每个词元表示都能看到左右两侧上下文，这对标注任务至关重要。

```figure
rnn-unroll
```

## 动手实现（Build It）

### 步骤 1：用 PyTorch 实现 TextCNN（TextCNN in PyTorch）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class TextCNN(nn.Module):
    def __init__(self, vocab_size, embed_dim, n_classes, filter_widths=(2, 3, 4), n_filters=64, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, n_filters, kernel_size=k)
            for k in filter_widths
        ])
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids).transpose(1, 2)
        pooled = []
        for conv in self.convs:
            c = F.relu(conv(x))
            p = F.max_pool1d(c, c.size(2)).squeeze(2)
            pooled.append(p)
        h = torch.cat(pooled, dim=1)
        return self.fc(self.dropout(h))
```

`transpose(1, 2)` 将 `[batch, seq_len, embed_dim]` 变为 `[batch, embed_dim, seq_len]`，因为 `nn.Conv1d` 将中间轴视为通道。池化输出大小固定，不随输入长度改变。

### 步骤 2：LSTM 分类器（LSTM classifier）

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_classes, bidirectional=True, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=bidirectional)
        factor = 2 if bidirectional else 1
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * factor, n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids)
        out, _ = self.lstm(x)
        pooled = out.max(dim=1).values
        return self.fc(self.dropout(pooled))
```

对整个序列做最大池化，而不是取最后状态。分类任务中，最大池化通常胜过只取最后隐藏状态，因为长序列末尾的信息往往主导最后状态。

### 步骤 3：梯度消失演示与直觉（The vanishing gradient demo）

没有门控的普通 RNN 无法学习长距离依赖。考虑一个玩具任务：预测词元 `A` 是否在序列任意位置出现过。如果 `A` 在位置 1，序列有 100 个词元，损失梯度就必须向后穿过 99 次循环权重乘法。权重小于 1，梯度消失；大于 1，则爆炸。

```python
def vanishing_gradient_sim(seq_len, recurrent_weight=0.9):
    import math
    return math.pow(recurrent_weight, seq_len)


# At weight=0.9 over 100 steps:
#   0.9 ^ 100 ≈ 2.7e-5
# The gradient from step 100 to step 1 is effectively zero.
```

LSTM 通过**细胞状态（Cell state）**解决它：细胞状态贯穿网络，交互主要为加法。遗忘门会乘性缩放它，但梯度仍可沿这条“快速通道”传播。GRU 用更少参数做类似的事。两者都能在 100+ 步序列上稳定训练。

### 步骤 4：为什么仍然不够（Why this still was not enough）

即使用了 LSTM，仍存在三个问题。

1. **顺序瓶颈（Sequential bottleneck）。** 在长度 1000 的序列上训练 RNN，需要 1000 个串行前向、反向步骤，无法跨时间并行。
2. **编码器–解码器中的定长上下文向量（Fixed-size context vector）。** 解码器只能看到编码器压缩整个输入后的最终隐藏状态，长输入会丢失细节。第 09 课直接讨论它。
3. **远距离依赖的准确率上限（Distant-dependency accuracy ceiling）。** LSTM 胜过普通 RNN，但跨越 200+ 步传递特定信息仍然困难。

注意力解决了这三个问题，Transformer 完全去除了循环。第 10 课是转折点。

## 实际应用（Use It）

PyTorch 的 `nn.LSTM`、`nn.GRU` 和 `nn.Conv1d` 已可用于生产，训练代码是常规写法。

Hugging Face 提供可作为输入层接入的预训练嵌入：

```python
from transformers import AutoModel

encoder = AutoModel.from_pretrained("bert-base-uncased")
for param in encoder.parameters():
    param.requires_grad = False


class BertCNN(nn.Module):
    def __init__(self, n_classes, filter_widths=(2, 3, 4), n_filters=64):
        super().__init__()
        self.encoder = encoder
        self.convs = nn.ModuleList([nn.Conv1d(768, n_filters, kernel_size=k) for k in filter_widths])
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, input_ids, attention_mask):
        with torch.no_grad():
            out = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        x = out.transpose(1, 2)
        pooled = [F.max_pool1d(F.relu(conv(x)), kernel_size=conv(x).size(2)).squeeze(2) for conv in self.convs]
        return self.fc(torch.cat(pooled, dim=1))
```

适合相应约束时使用的检查清单：

- **边缘或设备端推理（Edge / on-device inference）。** 配合 GloVe 嵌入的 TextCNN 比 Transformer 小 10-100 倍。如果部署目标是手机，就用这套技术栈。
- **流式或在线分类（Streaming / online classification）。** RNN 一次处理一个词元，Transformer 则需要完整序列。对于实时到来的文本，LSTM 仍然胜出。
- **小型基线模型（Tiny models for baselines）。** 在新任务上快速迭代，用 CPU 五分钟训练一个 TextCNN。
- **少数据序列标注（Sequence labeling with limited data）。** 对 1k-10k 条标注句子，BiLSTM-CRF（第 06 课）仍是生产级 NER 架构。

其他情况都交给 Transformer。

## 交付成果（Ship It）

保存为 `outputs/prompt-text-encoder-picker.md`：

```markdown
---
name: text-encoder-picker
description: 根据给定约束选择文本编码器（Text encoder）架构。
phase: 5
lesson: 08
---

根据约束（任务、数据量、延迟预算、部署目标、计算预算），输出：

1. 编码器架构：TextCNN、BiLSTM、BiLSTM-CRF、Transformer 微调，或“预训练 Transformer 作为冻结编码器，加小型输出头”。
2. 嵌入输入：随机初始化、冻结的 GloVe / fastText，或上下文化 Transformer 嵌入。
3. 用 5 行给出训练方案：优化器、学习率、批次大小、训练轮数、正则化。
4. 一个监控信号。对 RNN/CNN 模型，缺少注意力机制意味着会遗漏长距离依赖，应检查各序列长度的准确率。对 Transformer，学习率过高会导致微调崩溃，应检查训练损失。

标注样本少于约 500 个时，在未证明 TextCNN / BiLSTM 基线已进入平台期前，拒绝推荐微调 Transformer。指出边缘部署必须优先决定架构。
```

## 练习（Exercises）

1. **简单。** 在自建的三分类玩具数据集上训练 TextCNN。验证滤波器宽度组合（2、3、4）的平均 F1 优于单一宽度（3）。
2. **中等。** 为 LSTM 分类器实现最大池化、均值池化（Mean-pooling）和最后状态池化（Last-state pooling），在小数据集上比较，记录哪种胜出并推测原因。
3. **困难。** 结合第 06 课与本课，构建 BiLSTM-CRF NER 标注器，在 CoNLL-2003 上训练。与第 06 课的纯 CRF 基线及 BERT 微调比较，报告训练时间、内存和 F1。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 文本卷积网络（TextCNN） | 文本用 CNN | 在词嵌入上组合一维卷积并做全局最大池化，Kim（2014）。 |
| 循环神经网络（RNN） | 循环网络 | 每个时间步更新隐藏状态：`h_t = f(W x_t + U h_{t-1})`。 |
| 长短期记忆网络（LSTM） | 门控 RNN | 加入输入门、遗忘门、输出门及细胞状态，能在长序列上稳定训练。 |
| 门控循环单元（GRU） | 简化 LSTM | 使用两个门而不是三个，准确率相近，参数更少。 |
| 双向（Bidirectional） | 两个方向 | 拼接正向与反向 RNN，每个词元都能看到两侧上下文。 |
| 梯度消失（Vanishing gradient） | 训练信号消失 | 普通 RNN 中反复乘以小于 1 的权重，使早期步骤的梯度接近零。 |

## 延伸阅读（Further Reading）

- [Kim, Y.（2014）：用于句子分类的卷积神经网络（Convolutional Neural Networks for Sentence Classification）](https://arxiv.org/abs/1408.5882)：TextCNN 论文，八页，易读。
- [Hochreiter, S. 与 Schmidhuber, J.（1997）：长短期记忆（Long Short-Term Memory）](https://www.bioinf.jku.at/publications/older/2604.pdf)：LSTM 论文，讲解比预想清楚。
- [Olah, C.（2015）：理解 LSTM 网络（Understanding LSTM Networks）](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)：这些图让 LSTM 变得人人都能理解。
