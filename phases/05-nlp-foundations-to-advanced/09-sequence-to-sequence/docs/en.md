# 序列到序列模型（Sequence-to-Sequence Models）

> 两个 RNN 尝试充当翻译器。它们遇到的瓶颈，正是注意力机制出现的原因。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 08（用于文本的 CNN 与 RNN，CNNs + RNNs for Text），阶段 3 · 11（PyTorch 入门，PyTorch Intro）
**Time:** ~75 分钟

## 问题（The Problem）

分类把变长序列映射为单个标签，翻译则把变长序列映射为另一个变长序列。输入与输出使用不同词表，可能属于不同语言，长度也不保证相同。

序列到序列（Sequence-to-sequence，seq2seq）架构（Sutskever、Vinyals、Le，2014）用刻意简单的方案解决了它：两个 RNN，一个读取源句并生成定长上下文向量，另一个读取该向量，逐词元生成目标句。就是第 08 课写过的代码，只是组合方式不同。

有两个理由值得研究它。第一，上下文向量瓶颈是 NLP 中最有教学价值的失效案例，能解释注意力和 Transformer 为什么擅长那些事情。第二，训练方案中的教师强制（Teacher forcing）、计划采样（Scheduled sampling），以及推理时的束搜索（Beam search），仍适用于包括 LLM 在内的现代生成系统。

## 概念（The Concept）

**编码器（Encoder）。** 读取源句的 RNN，其最终隐藏状态就是**上下文向量（Context vector）**，即整个输入的定长摘要。理论上，除了源文本的原始形式，信息应当毫无损失。

**解码器（Decoder）。** 用上下文向量初始化的另一个 RNN。每一步以之前生成的词元为输入，输出目标词表上的分布，用采样或 argmax 选择下一个词元，再反馈为输入。重复直到生成 `<EOS>` 或达到最大长度。

**训练（Training）：** 每个解码步骤计算交叉熵损失（Cross-entropy loss），沿序列求和，然后对两个网络做标准的时间反向传播（Backpropagation through time）。

**教师强制（Teacher forcing）。** 训练时，解码器在步骤 `t` 的输入是位置 `t-1` 的*真实*词元，而不是自己的上一条预测。这使训练稳定；否则早期错误会级联传播，模型无法学会。推理时只能用模型自己的预测，因此训练与推理之间始终存在分布差距，称为**暴露偏差（Exposure bias）**。

**瓶颈（The bottleneck）。** 编码器从源文本学到的一切，都必须压进一个上下文向量。长句丢失细节，稀有词变模糊，词序调整（chat noir 与 black cat）只能靠记忆，而非计算。

注意力（第 10 课）让解码器查看编码器的*每个*隐藏状态，而不只是最后一个，由此解决这个问题。核心就这么简单。

```figure
lstm-gates
```

## 动手实现（Build It）

### 步骤 1：编码器（An encoder）

```python
import torch
import torch.nn as nn


class Encoder(nn.Module):
    def __init__(self, src_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(src_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)

    def forward(self, src):
        e = self.embed(src)
        outputs, hidden = self.gru(e)
        return outputs, hidden
```

`outputs` 形状为 `[batch, seq_len, hidden_dim]`，每个输入位置一个隐藏状态。`hidden` 形状为 `[1, batch, hidden_dim]`，对应最后一步。第 08 课说“分类时对输出做池化”，这里则保留最后隐藏状态作为上下文向量，忽略逐步输出。

### 步骤 2：解码器（A decoder）

```python
class Decoder(nn.Module):
    def __init__(self, tgt_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(tgt_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, tgt_vocab_size)

    def forward(self, token, hidden):
        e = self.embed(token)
        out, hidden = self.gru(e, hidden)
        logits = self.fc(out)
        return logits, hidden
```

解码器每次调用推进一步。输入是一批单词元及当前隐藏状态，输出是下一个词元的词表 logits 和更新后的隐藏状态。

### 步骤 3：带教师强制的训练循环（Training loop with teacher forcing）

```python
def train_batch(encoder, decoder, src, tgt, bos_id, optimizer, teacher_forcing_ratio=0.9):
    optimizer.zero_grad()
    _, hidden = encoder(src)
    batch_size, tgt_len = tgt.shape
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    loss = 0.0
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)

    for t in range(tgt_len):
        logits, hidden = decoder(input_token, hidden)
        step_loss = loss_fn(logits.squeeze(1), tgt[:, t])
        loss += step_loss
        use_teacher = torch.rand(1).item() < teacher_forcing_ratio
        if use_teacher:
            input_token = tgt[:, t].unsqueeze(1)
        else:
            input_token = logits.argmax(dim=-1)

    loss.backward()
    optimizer.step()
    return loss.item() / tgt_len
```

两个参数值得说明。`ignore_index=0` 跳过填充词元的损失；`teacher_forcing_ratio` 是每步用真实词元而非模型预测的概率。从 1.0，即完全教师强制开始，训练中逐渐退火至约 0.5，以缩小暴露偏差。

### 步骤 4：贪心推理循环（Inference loop, greedy）

```python
@torch.no_grad()
def greedy_decode(encoder, decoder, src, bos_id, eos_id, max_len=50):
    _, hidden = encoder(src)
    batch_size = src.shape[0]
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    output_ids = []
    for _ in range(max_len):
        logits, hidden = decoder(input_token, hidden)
        next_token = logits.argmax(dim=-1)
        output_ids.append(next_token)
        input_token = next_token
        if (next_token == eos_id).all():
            break
    return torch.cat(output_ids, dim=1)
```

贪心解码（Greedy decoding）每步选择概率最高的词元，但可能偏离方向：一旦选定就无法收回。**束搜索（Beam search）**保留前 `k` 个部分序列，到最后再选择得分最高的完整序列。常用束宽为 3-5。

### 步骤 5：演示瓶颈（The bottleneck, demonstrated）

在玩具复制任务上训练模型：源为 `[a, b, c, d, e]`，目标也是 `[a, b, c, d, e]`。逐渐增加序列长度，观察准确率。

```
seq_len=5   复制准确率: 98%
seq_len=10  复制准确率: 91%
seq_len=20  复制准确率: 62%
seq_len=40  复制准确率: 23%
```

单个 GRU 隐藏状态无法无损记住 40 个词元的输入。信息存在于编码器的每一步，但解码器只看到最后状态。注意力直接解决这一点。

## 实际应用（Use It）

PyTorch 提供基于 `nn.Transformer` 和 `nn.LSTM` 的 seq2seq 模板。Hugging Face 的 `transformers` 库提供在数十亿词元上训练的完整编码器–解码器模型，如 BART、T5、mBART、NLLB。

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("facebook/bart-base")
model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-base")

src = tok("Translate this to French: Hello, how are you?", return_tensors="pt")
out = model.generate(**src, max_new_tokens=50, num_beams=4)
print(tok.decode(out[0], skip_special_tokens=True))
```

现代编码器–解码器用 Transformer 取代 RNN。高层结构，即编码器、解码器、逐词元生成，与 2014 年 seq2seq 论文相同；不同的是各模块内部机制。

### 何时仍使用基于 RNN 的 seq2seq（When to still reach for RNN-based seq2seq）

新项目几乎不会选它，具体例外包括：

- 在有界内存中逐词元消费输入的流式翻译。
- Transformer 内存成本无法承受的设备端文本生成。
- 教学。理解编码器–解码器瓶颈，是理解 Transformer 为何胜出的最快路径。

### 暴露偏差及其缓解办法（Exposure bias and its mitigations）

- **计划采样（Scheduled sampling）。** 训练中逐渐降低教师强制比例，让模型学会从自己的错误中恢复。
- **最小风险训练（Minimum risk training）。** 基于句级 BLEU 分数而非词元级交叉熵训练，更接近实际目标。
- **强化学习微调（Reinforcement learning fine-tuning）。** 用指标奖励序列生成器，现代 LLM 的人类反馈强化学习（RLHF）会使用它。

三种方法也都适用于基于 Transformer 的生成。

## 交付成果（Ship It）

保存为 `outputs/prompt-seq2seq-design.md`：

```markdown
---
name: seq2seq-design
description: 为给定任务设计序列到序列（Sequence-to-sequence）流水线。
phase: 5
lesson: 09
---

根据任务（翻译、摘要、释义改写、问题改写），输出：

1. 架构：默认使用预训练 Transformer 编码器–解码器（BART、T5、mBART、NLLB），仅在特定约束下选 RNN seq2seq。
2. 起始检查点：给出名称（`facebook/bart-base`、`google/flan-t5-base`、`facebook/nllb-200-distilled-600M`），与任务和语言覆盖匹配。
3. 解码策略：确定性输出用贪心，质量优先用束搜索（束宽 4-5），多样性优先用带温度的采样，用一句话解释。
4. 交付前应验证的一种失效情况：暴露偏差表现为较长输出的生成漂移，抽取 20 个长度位于第 90 百分位的输出，人工检查。

平行样本不足一百万时，拒绝推荐从零训练 seq2seq。对使用贪心解码生成用户可见内容的流水线，指出其脆弱性，因为贪心会重复、陷入循环。
```

## 练习（Exercises）

1. **简单。** 实现玩具复制任务，在目标等于源的输入输出对上训练 GRU seq2seq，测量长度 5、10、20 时的准确率，复现瓶颈。
2. **中等。** 添加束宽为 3 的束搜索解码。在小型平行语料上测量 BLEU，与贪心比较。记录束搜索在哪些位置胜出，通常是最后几个词元，以及哪里没有差别。
3. **困难。** 在 10k 对释义改写数据上微调 `facebook/bart-base`。对留出输入，比较微调模型与基础模型束宽为 4 的输出，报告 BLEU，并选 10 个定性示例。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 编码器（Encoder） | 输入 RNN | 读取源，生成逐步隐藏状态及最终上下文向量。 |
| 解码器（Decoder） | 输出 RNN | 从上下文向量初始化，逐个生成目标词元。 |
| 上下文向量（Context vector） | 摘要 | 编码器最终隐藏状态，大小固定，正是注意力解决的瓶颈。 |
| 教师强制（Teacher forcing） | 使用真实词元 | 训练时输入真实的前一词元，使学习稳定。 |
| 暴露偏差（Exposure bias） | 训练与测试差距 | 用真实词元训练的模型从未练习如何从自身错误中恢复。 |
| 束搜索（Beam search） | 更好的解码 | 每步保留前 k 个部分序列，而非贪心地直接选定。 |

## 延伸阅读（Further Reading）

- [Sutskever、Vinyals、Le（2014）：使用神经网络进行序列到序列学习（Sequence to Sequence Learning with Neural Networks）](https://arxiv.org/abs/1409.3215)：seq2seq 原始论文，共四页。
- [Cho 等（2014）：使用 RNN 编码器–解码器学习短语表示以进行统计机器翻译（Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation）](https://arxiv.org/abs/1406.1078)：引入 GRU 与编码器–解码器框架。
- [Bahdanau、Cho、Bengio（2014）：联合学习对齐与翻译的神经机器翻译（Neural Machine Translation by Jointly Learning to Align and Translate）](https://arxiv.org/abs/1409.0473)：注意力论文，本课后马上阅读。
- [PyTorch 从零实现 NLP 教程（NLP from Scratch）](https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html)：可构建的 seq2seq 加注意力代码。
