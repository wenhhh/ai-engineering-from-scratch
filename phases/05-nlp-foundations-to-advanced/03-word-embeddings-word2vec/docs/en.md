# 词嵌入：从零实现 Word2Vec（Word Embeddings — Word2Vec from Scratch）

> 认识一个词，要看它与谁相伴。用这个想法训练浅层网络，几何结构就会涌现。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 02（词袋与 TF-IDF，BoW + TF-IDF），阶段 3 · 03（从零实现反向传播，Backpropagation from Scratch）
**Time:** ~75 分钟

## 问题（The Problem）

TF-IDF 知道 `dog` 和 `puppy` 是不同的词，却不知道它们含义接近。在 `dog` 上训练的分类器无法泛化到关于 `puppy` 的评论。列出同义词可以暂时弥补，但面对稀有词、领域行话和未曾预料的语言，这个办法会失效。

你需要一种表示，使 `dog` 与 `puppy` 在空间中彼此接近，使 `king - man + woman` 落在 `queen` 附近，使在 `dog` 上训练的模型能不花额外代价就向 `puppy` 迁移部分信号。

Word2Vec 给了我们这样的空间：两层神经网络、万亿词元规模的训练，发表于 2013 年。架构简单得令人意外，其成果却重塑了随后十年的 NLP。

## 概念（The Concept）

**分布假说（Distributional hypothesis）**（Firth，1957）：“认识一个词，要看它与谁相伴。”如果两个词出现在相似上下文中，它们的含义也很可能相似。

Word2Vec 有两种形式，都利用这个想法。

- **跳字模型（Skip-gram）。** 给定中心词，预测周围的词。窗口大小为 2 时，`cat -> (the, sat, on)`。
- **连续词袋（Continuous bag of words，CBOW）。** 给定周围的词，预测中心词。`(the, sat, on) -> cat`。

跳字模型训练较慢，但处理稀有词更好，因此成为默认选择。

网络只有一个隐藏层（Hidden layer），没有非线性。输入是词表上的独热向量（One-hot vector），输出是词表上的 softmax。训练后丢弃输出层，隐藏层权重就是嵌入（Embedding）。

```
one-hot(center) ── W ──▶ 隐藏层 hidden (d-dim) ── W' ──▶ softmax(vocab)
                          ^
                          这里就是嵌入（embedding）
```

诀窍在于：对 100k 个词计算 softmax 的成本高得难以承受。Word2Vec 用**负采样（Negative sampling）**将其转化为二分类任务，预测“这个上下文词是否出现在这个中心词附近”。每个训练词对只采样少量不共现的负例词，而不是对整个词表计算 softmax。

```figure
word-vector-arithmetic
```

## 动手实现（Build It）

### 步骤 1：从语料库生成训练词对（Training pairs from a corpus）

```python
def skipgram_pairs(docs, window=2):
    pairs = []
    for doc in docs:
        for i, center in enumerate(doc):
            for j in range(max(0, i - window), min(len(doc), i + window + 1)):
                if i == j:
                    continue
                pairs.append((center, doc[j]))
    return pairs
```

```python
>>> skipgram_pairs([["the", "cat", "sat", "on", "mat"]], window=2)
[('the', 'cat'), ('the', 'sat'),
 ('cat', 'the'), ('cat', 'sat'), ('cat', 'on'),
 ('sat', 'the'), ('sat', 'cat'), ('sat', 'on'), ('sat', 'mat'),
 ...]
```

窗口内每个（中心词，上下文词）词对都是一个正训练样本。

### 步骤 2：嵌入表（Embedding tables）

使用两个矩阵：`W` 是中心词嵌入表，也就是最终保留的表；`W'` 是上下文词表，通常丢弃，有时与 `W` 取平均。

```python
import numpy as np


def init_embeddings(vocab_size, dim, seed=0):
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(vocab_size, dim))
    W_prime = rng.normal(0, 0.1, size=(vocab_size, dim))
    return W, W_prime
```

用小幅随机值初始化。10k 词表、100 维是实际可用的规模；教学中，50 个词 × 16 维就足以观察几何结构。

### 步骤 3：负采样目标（Negative sampling objective）

对每个正例词对 `(center, context)`，从词表随机采样 `k` 个词作为负例。训练模型，使点积 `W[center] · W'[context]` 在正例上较高，在负例上较低。

```python
def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_pair(W, W_prime, center_idx, context_idx, negative_indices, lr):
    v_c = W[center_idx]
    u_pos = W_prime[context_idx]
    u_negs = W_prime[negative_indices]

    pos_score = sigmoid(v_c @ u_pos)
    neg_scores = sigmoid(u_negs @ v_c)

    grad_center = (pos_score - 1) * u_pos
    for i, u in enumerate(u_negs):
        grad_center += neg_scores[i] * u

    W[context_idx] = W[context_idx]
    W_prime[context_idx] -= lr * (pos_score - 1) * v_c
    for i, neg_idx in enumerate(negative_indices):
        W_prime[neg_idx] -= lr * neg_scores[i] * v_c
    W[center_idx] -= lr * grad_center
```

关键公式是：正例词对的逻辑损失（Logistic loss，期望 sigmoid 接近 1），加上负例词对的逻辑损失（期望 sigmoid 接近 0）。梯度流向两张表。完整推导见原始论文；想记牢，就用纸笔亲自推一遍。

### 步骤 4：在玩具语料库上训练（Train on a toy corpus）

```python
def train(docs, dim=16, window=2, k_neg=5, epochs=100, lr=0.05, seed=0):
    vocab = build_vocab(docs)
    vocab_size = len(vocab)
    rng = np.random.default_rng(seed)
    W, W_prime = init_embeddings(vocab_size, dim, seed=seed)
    pairs = skipgram_pairs(docs, window=window)

    for epoch in range(epochs):
        rng.shuffle(pairs)
        for center, context in pairs:
            c_idx = vocab[center]
            ctx_idx = vocab[context]
            negs = rng.integers(0, vocab_size, size=k_neg)
            negs = [n for n in negs if n != ctx_idx and n != c_idx]
            train_pair(W, W_prime, c_idx, ctx_idx, negs, lr)
    return vocab, W
```

在大型语料库上训练足够多轮后，共享上下文的词会有相似的中心词嵌入。在玩具语料上，这种效果不明显；在数十亿词元上则十分明显。

### 步骤 5：类比技巧（The analogy trick）

```python
def nearest(vocab, W, target_vec, topk=5, exclude=None):
    exclude = exclude or set()
    inv_vocab = {i: w for w, i in vocab.items()}
    norms = np.linalg.norm(W, axis=1, keepdims=True) + 1e-9
    W_norm = W / norms
    target = target_vec / (np.linalg.norm(target_vec) + 1e-9)
    sims = W_norm @ target
    order = np.argsort(-sims)
    out = []
    for i in order:
        if i in exclude:
            continue
        out.append((inv_vocab[i], float(sims[i])))
        if len(out) == topk:
            break
    return out


def analogy(vocab, W, a, b, c, topk=5):
    v = W[vocab[b]] - W[vocab[a]] + W[vocab[c]]
    return nearest(vocab, W, v, topk=topk, exclude={vocab[a], vocab[b], vocab[c]})
```

在预训练的 300d Google News 向量上：

```python
>>> analogy(vocab, W, "man", "king", "woman")
[('queen', 0.71), ('monarch', 0.62), ('princess', 0.59), ...]
```

`king - man + woman = queen`。这不是因为模型知道王室是什么，而是因为向量 `(king - man)` 捕捉了类似“王室”的属性，加到 `woman` 上便落到王室女性对应的区域附近。

## 实际应用（Use It）

从零编写 Word2Vec 是为了教学；生产 NLP 使用 `gensim`。

```python
from gensim.models import Word2Vec

sentences = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "ran", "across", "the", "room"],
]

model = Word2Vec(
    sentences,
    vector_size=100,
    window=5,
    min_count=1,
    sg=1,
    negative=5,
    workers=4,
    epochs=30,
)

print(model.wv["cat"])
print(model.wv.most_similar("cat", topn=3))
```

实际工作中，你几乎不会自己训练 Word2Vec，而是下载预训练向量。

- **GloVe**：Stanford 提出的共现矩阵分解（Co-occurrence-matrix factorization）方法，提供 50d、100d、200d、300d 检查点，通用覆盖较好。第 04 课专门介绍 GloVe。
- **fastText**：Facebook 对 Word2Vec 的扩展，为字符 n 元组（Character n-gram）生成嵌入，通过组合子词处理词表外词。见第 04 课。
- **Google News 上的预训练 Word2Vec**：300d，3M 词表，发表于 2013 年，至今仍每天有人下载。

### 2026 年 Word2Vec 仍然胜出的场景（When Word2Vec still wins in 2026）

- 轻量领域专用检索。在笔记本电脑上用医学摘要训练一小时，就能获得通用模型无法捕捉的专用向量。
- 类比式特征工程（Analogy-style feature engineering）。`gender_vector = mean(man - woman pairs)`。从其他词中减去它，可得到性别中立的轴。公平性研究仍在使用这种方法。
- 可解释性（Interpretability）。100d 足够小，可以用主成分分析（PCA）或 t-SNE 绘图，实际看到簇的形成。
- 任何必须在无 GPU 的设备端运行推理的场景。Word2Vec 查找只需读取一行。

### Word2Vec 的失效场景（Where Word2Vec fails）

一词多义（Polysemy）是障碍。`bank` 只有一个向量，`river bank` 和 `financial bank` 共用它。`table` 的电子表格与家具含义也共用一个向量。下游分类器无法仅凭该向量区分词义。

上下文嵌入（Contextual embedding），包括 ELMo、BERT 以及后来的各种 Transformer，通过根据周围上下文为词的每次出现生成不同向量解决了这个问题。从 Word2Vec 到 BERT 的跃迁，正是从静态到上下文化。阶段 7 介绍 Transformer 这一部分。

另一个失效点是词表外（Out-of-vocabulary，OOV）问题。如果训练数据没有 `Zoomer-approved`，Word2Vec 就从未见过它，也没有回退办法。fastText 用子词组合解决这一问题（第 04 课）。

## 交付成果（Ship It）

保存为 `outputs/skill-embedding-probe.md`：

```markdown
---
name: embedding-probe
description: 检查 word2vec 模型，执行类比（Analogy）、查找邻居并诊断质量。
version: 1.0.0
phase: 5
lesson: 03
tags: [nlp, embeddings, debugging]
---

你探查训练好的词嵌入，验证它们能否正常工作。给定 `gensim.models.KeyedVectors` 对象和词表，执行：

1. 三项经典类比测试：`king : man :: queen : woman`、`paris : france :: tokyo : japan`、`walking : walked :: swimming : ?`。报告排名第 1 的结果及其余弦值。
2. 对用户提供的领域专用词执行五项最近邻（Nearest-neighbor）测试，打印前 5 个邻居及其余弦值。
3. 一项对称性检查：在浮点精度范围内满足 `similarity(a, b) == similarity(b, a)`。
4. 一项退化检查：若任意嵌入的范数（Norm）低于 0.01 或高于 100，说明模型有训练缺陷，应标记出来。

拒绝仅凭类比准确率就判定模型良好。类比基准可以被针对性优化，且不能迁移到下游任务。建议结合内在评估（Intrinsic evaluation）与下游评估（Downstream evaluation）。
```

## 练习（Exercises）

1. **简单。** 在微型语料库（20 个关于猫狗的句子）上运行训练循环。200 轮后，验证 `nearest(vocab, W, W[vocab["cat"]])` 返回的前 3 名中包含 `dog`；否则增加训练轮数或词表大小。
2. **中等。** 添加高频词下采样（Subsampling）：频率高于 `10^-5` 的词，以与其频率成比例的概率从训练词对中丢弃。测量这对稀有词相似度的影响。
3. **困难。** 在 20 Newsgroups 语料库上训练模型，计算两个偏差轴：`he - she` 和 `doctor - nurse`。将职业词投影到这两个轴上，报告哪些职业的偏差差距最大。这类探查正是公平性研究人员使用的方法。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 词嵌入（Word embedding） | 用向量表示词 | 从上下文学习的稠密低维表示，通常为 100-300 维。 |
| 跳字模型（Skip-gram） | Word2Vec 技巧 | 根据中心词预测上下文词，比 CBOW 慢，但更适合稀有词。 |
| 负采样（Negative sampling） | 训练捷径 | 用针对 `k` 个随机词的二分类替代整个词表上的 softmax。 |
| 静态嵌入（Static embedding） | 每个词一个向量 | 无论上下文如何都使用同一个向量，无法处理一词多义。 |
| 上下文嵌入（Contextual embedding） | 对上下文敏感的向量 | 根据周围的词，为每次出现生成不同向量；Transformer 生成的就是这种表示。 |
| 词表外（OOV） | 不在词表中 | 训练中未见过的词，Word2Vec 无法为其生成向量。 |

## 延伸阅读（Further Reading）

- [Mikolov 等（2013）：词与短语的分布式表示及其组合性（Distributed Representations of Words and Phrases and their Compositionality）](https://arxiv.org/abs/1310.4546)：负采样论文，篇幅短，易于阅读。
- [Rong, X.（2014）：word2vec 参数学习详解（word2vec Parameter Learning Explained）](https://arxiv.org/abs/1411.2738)：如果原论文的数学内容难读，这里提供最清楚的梯度推导。
- [gensim Word2Vec 教程](https://radimrehurek.com/gensim/models/word2vec.html)：实际有效的生产训练设置。
