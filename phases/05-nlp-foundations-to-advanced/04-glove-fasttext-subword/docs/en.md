# GloVe、FastText 与子词嵌入（GloVe, FastText, and Subword Embeddings）

> Word2Vec 为每个词训练一个嵌入；GloVe 分解共现矩阵；FastText 嵌入词的组成片段；BPE 则连接到 Transformer。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 03（从零实现 Word2Vec，Word2Vec from Scratch）
**Time:** ~45 分钟

## 问题（The Problem）

Word2Vec 留下了两个未解决的问题。

首先，有一条并行研究路线直接分解共现矩阵（Co-occurrence matrix），例如 LSA、HAL，而不是在线执行跳字模型（Skip-gram）更新。Word2Vec 的迭代方式本质上更好吗？还是两种方法处理计数的差异造成了这种表象？**GloVe** 给出了答案：为矩阵分解选择合适的损失，就能匹敌甚至胜过 Word2Vec，训练成本还更低。

其次，这两种方法都无法处理未见过的词：`Zoomer-approved`、`dogecoin`、上周刚创造的专有名词，以及稀有词根的各种屈折变化形式。**FastText** 通过嵌入字符 n 元组（Character n-gram）解决这个问题：词是其组成部分之和，其中包括语素（Morpheme），因此词表外（Out-of-vocabulary，OOV）词也能获得合理的向量。

第三，Transformer 出现后，问题再次改变。词级词表的规模大约止步于一百万条，而真实语言远比这更开放。**字节对编码（Byte-pair encoding，BPE）**及其近亲通过学习覆盖一切的高频子词单元词表解决了这个问题。所有现代大语言模型（LLM）使用的现代分词器都是子词分词器。

本课依次介绍三者，再解释何时该选择哪一种。

## 概念（The Concept）

**GloVe（Global Vectors，全局向量）。** 构建词与词的共现矩阵 `X`，其中 `X[i][j]` 表示词 `j` 在词 `i` 的上下文中出现的频率。训练向量，使 `v_i · v_j + b_i + b_j ≈ log(X[i][j])`。对损失加权，避免高频词对主导结果。就这么简单。

**FastText。** 一个词是其字符 n 元组与整个词自身之和。`where` 变为 `<wh, whe, her, ere, re>, <where>`。词向量是这些组成向量之和，按 Word2Vec 的方式训练。好处是未见过的词（`whereupon`）也能由已知 n 元组组合出来。

**字节对编码（Byte-Pair Encoding，BPE）。** 从单个字节或字符构成的词表开始，统计语料库中的每一对相邻单元，将最高频的一对合并为新词元，重复 `k` 轮。结果是包含 `k + 256` 个词元的词表：高频序列（`ing`、`tion`、`the`）成为单个词元，稀有词拆成已知片段。每个句子都能被分词。

```figure
n5-subword-merge
```

## 动手实现（Build It）

### GloVe：分解共现矩阵（Factorize the co-occurrence matrix）

```python
import numpy as np
from collections import Counter


def build_cooccurrence(docs, window=5):
    pair_counts = Counter()
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    for doc in docs:
        indexed = [vocab[t] for t in doc]
        for i, center in enumerate(indexed):
            for j in range(max(0, i - window), min(len(indexed), i + window + 1)):
                if i != j:
                    distance = abs(i - j)
                    pair_counts[(center, indexed[j])] += 1.0 / distance
    return vocab, pair_counts


def glove_train(vocab, pair_counts, dim=16, epochs=100, lr=0.05, x_max=100, alpha=0.75, seed=0):
    n = len(vocab)
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(n, dim))
    W_tilde = rng.normal(0, 0.1, size=(n, dim))
    b = np.zeros(n)
    b_tilde = np.zeros(n)

    for epoch in range(epochs):
        for (i, j), x_ij in pair_counts.items():
            weight = (x_ij / x_max) ** alpha if x_ij < x_max else 1.0
            diff = W[i] @ W_tilde[j] + b[i] + b_tilde[j] - np.log(x_ij)
            coef = weight * diff

            grad_W_i = coef * W_tilde[j]
            grad_W_tilde_j = coef * W[i]
            W[i] -= lr * grad_W_i
            W_tilde[j] -= lr * grad_W_tilde_j
            b[i] -= lr * coef
            b_tilde[j] -= lr * coef

    return W + W_tilde
```

有两个关键部分值得说明。加权函数 `f(x) = (x/x_max)^alpha` 降低极高频词对（如 `(the, and)`）的权重，避免它们主导损失。最终嵌入是 `W`（中心词）与 `W_tilde`（上下文）两张表之和。将两者相加是已发表的技巧，往往优于只使用其中一张表。

### FastText：感知子词的嵌入（Subword-aware embeddings）

```python
def char_ngrams(word, n_min=3, n_max=6):
    wrapped = f"<{word}>"
    grams = {wrapped}
    for n in range(n_min, n_max + 1):
        for i in range(len(wrapped) - n + 1):
            grams.add(wrapped[i:i + n])
    return grams
```

```python
>>> char_ngrams("where")
{'<where>', '<wh', 'whe', 'her', 'ere', 're>', '<whe', 'wher', 'here', 'ere>', '<wher', 'where', 'here>'}
```

每个词由其 n 元组集合表示，通常长度为 3 至 6 个字符。词嵌入是这些 n 元组嵌入之和。进行跳字模型训练时，用它替换 Word2Vec 原来的单个向量。

```python
def fasttext_vector(word, ngram_table):
    grams = char_ngrams(word)
    vecs = [ngram_table[g] for g in grams if g in ngram_table]
    if not vecs:
        return None
    return np.sum(vecs, axis=0)
```

对于未见过的词，只要其中一部分 n 元组已知，仍能生成向量。`whereupon` 与 `where` 共享 `<wh`、`her`、`ere` 和 `<where`，所以两者在空间中相近。

### BPE：学习子词词表（Learned subword vocabulary）

```python
def learn_bpe(corpus, k_merges):
    vocab = Counter()
    for word, freq in corpus.items():
        tokens = tuple(word) + ("</w>",)
        vocab[tokens] = freq

    merges = []
    for _ in range(k_merges):
        pair_freq = Counter()
        for tokens, freq in vocab.items():
            for a, b in zip(tokens, tokens[1:]):
                pair_freq[(a, b)] += freq
        if not pair_freq:
            break
        best = pair_freq.most_common(1)[0][0]
        merges.append(best)

        new_vocab = Counter()
        for tokens, freq in vocab.items():
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == best:
                    new_tokens.append(tokens[i] + tokens[i + 1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            new_vocab[tuple(new_tokens)] = freq
        vocab = new_vocab
    return merges


def apply_bpe(word, merges):
    tokens = list(word) + ["</w>"]
    for a, b in merges:
        new_tokens = []
        i = 0
        while i < len(tokens):
            if i + 1 < len(tokens) and tokens[i] == a and tokens[i + 1] == b:
                new_tokens.append(a + b)
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens
    return tokens
```

```python
>>> corpus = Counter({"low": 5, "lower": 2, "newest": 6, "widest": 3})
>>> merges = learn_bpe(corpus, k_merges=10)
>>> apply_bpe("lowest", merges)
['low', 'est</w>']
```

第一轮合并最高频的相邻单元对。迭代足够多次后，高频子串（`low`、`est`、`tion`）会成为单个词元，稀有词则被清晰地拆开。

实际 GPT / BERT / T5 分词器学习 30k-100k 次合并。结果是任意文本都能被转换为长度有界的已知 ID 序列，不再出现词表外词。

## 实际应用（Use It）

实践中，你很少自己训练这些模型，而是加载预训练检查点（Checkpoint）。

```python
import fasttext.util
fasttext.util.download_model("en", if_exists="ignore")
ft = fasttext.load_model("cc.en.300.bin")
print(ft.get_word_vector("whereupon").shape)
print(ft.get_word_vector("zoomerapproved").shape)
```

在 Transformer 时代，BPE 式子词分词可这样使用：

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
print(tok.tokenize("unbelievably tokenized"))
```

```
['un', 'bel', 'iev', 'ably', 'Ġtoken', 'ized']
```

`Ġ` 前缀标记词边界，这是 GPT-2 的约定。现代分词器都属于 BPE 变体、WordPiece（BERT）或 SentencePiece（T5、LLaMA）。

### 何时选择哪一种（When to pick which）

| 场景 | 选择 |
|-----------|------|
| 需要预训练通用词向量，不要求容忍词表外词 | GloVe 300d |
| 需要预训练通用词向量，必须处理拼写错误、新造词或形态丰富的语言 | FastText |
| 任何要输入 Transformer 的内容，无论训练还是推理 | 使用模型配套分词器，绝不替换。 |
| 从零训练自己的语言模型 | 先在语料库上训练 BPE 或 SentencePiece 分词器 |
| 使用线性模型的生产文本分类 | 仍然选择 TF-IDF，见第 02 课。 |

## 交付成果（Ship It）

保存为 `outputs/skill-embeddings-picker.md`：

```markdown
---
name: tokenizer-picker
description: 为新的语言模型或文本流水线选择分词（Tokenization）方法。
version: 1.0.0
phase: 5
lesson: 04
tags: [nlp, tokenization, embeddings]
---

根据任务和数据集描述，输出：

1. 分词策略（词级、BPE、WordPiece、SentencePiece、字节级），用一句话说明原因。
2. 目标词表大小，例如纯英语语言模型为 32k，多语言为 64k-100k。
3. 库调用及精确的训练命令，给出库名并列出参数。
4. 一个可复现性陷阱。分词器与模型不匹配是最常见的静默生产缺陷，应指出哪一对必须配套使用。

用户微调（Fine-tuning）预训练 LLM 时，拒绝推荐训练自定义分词器。拒绝为任何面向生产推理的模型推荐词级分词。指出非英语或多书写系统语料库需要带字节回退（Byte fallback）的 SentencePiece。
```

## 练习（Exercises）

1. **简单。** 运行 `char_ngrams("playing")` 和 `char_ngrams("played")`，计算两个 n 元组集合的 Jaccard 重叠度。你应看到大量共享片段（`pla`、`lay`、`play`），这正是 FastText 能在不同形态变体之间有效迁移的原因。
2. **中等。** 扩展 `learn_bpe` 以跟踪词表增长。绘制每个语料字符对应的词元数随合并次数变化的曲线。你应看到开始时压缩很快，之后逐渐趋近每个词元约 2-3 个字符。
3. **困难。** 在 Shakespeare 全集上训练一个合并 1k 次的 BPE。比较常用词与稀有专有名词的分词，测量前后平均每词词元数，写下令你意外的发现。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 共现矩阵（Co-occurrence matrix） | 词与词的频率表 | `X[i][j]` = 词 `j` 在词 `i` 周围窗口内出现的频率。 |
| 子词（Subword） | 词的一部分 | 字符 n 元组（FastText），或学习得到的词元（BPE/WordPiece/SentencePiece）。 |
| 字节对编码（BPE） | 字节对编码 | 迭代合并最高频的相邻单元对，直到词表达到目标大小。 |
| 词表外（OOV） | 不在词表中 | 模型从未见过的词。Word2Vec/GloVe 无法处理，FastText 和 BPE 可以。 |
| 字节级 BPE（Byte-level BPE） | 在原始字节上执行 BPE | GPT-2 的方案。词表从 256 个字节开始，因此不会有词表外输入。 |

## 延伸阅读（Further Reading）

- [Pennington、Socher、Manning（2014）：GloVe，用于词表示的全局向量（Global Vectors for Word Representation）](https://nlp.stanford.edu/pubs/glove.pdf)：GloVe 论文，共七页，至今仍是损失函数的最佳推导。
- [Bojanowski 等（2017）：用子词信息丰富词向量（Enriching Word Vectors with Subword Information）](https://arxiv.org/abs/1607.04606)：FastText 论文。
- [Sennrich、Haddow、Birch（2016）：使用子词单元进行稀有词神经机器翻译（Neural Machine Translation of Rare Words with Subword Units）](https://arxiv.org/abs/1508.07909)：将 BPE 引入现代 NLP 的论文。
- [Hugging Face 分词器概览（Tokenizer summary）](https://huggingface.co/docs/transformers/tokenizer_summary)：BPE、WordPiece 和 SentencePiece 在实际应用中的区别。
