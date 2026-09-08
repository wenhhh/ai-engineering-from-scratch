# 词袋、TF-IDF 与文本表示（Bag of Words, TF-IDF, and Text Representation）

> 先计数，再思考。到 2026 年，在边界明确的任务上，TF-IDF 仍能胜过嵌入（Embedding）。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 01（文本处理，Text Processing），阶段 2 · 02（从零实现线性回归，Linear Regression from Scratch）
**Time:** ~75 分钟

## 问题（The Problem）

模型需要数字，而你手里是字符串。

每条自然语言处理（NLP）流水线都要回答同一个问题：如何将长度可变的词元流转换为分类器可用的定长向量？这个领域最早采用的答案，也是最朴素的可行方法：统计词数，生成向量。

这种向量承载的生产 NLP 应用比任何嵌入模型都多：垃圾邮件过滤、主题分类、日志异常检测、BM25 之前的搜索排序、早期情感分析，以及学术 NLP 基准测试最初十年的工作。到 2026 年，从业者在范围明确的分类任务上仍会先选它。它速度快、可解释；当任务只关心某个词是否出现时，其效果往往与 400M 参数的嵌入模型难分高下。

本课先从零实现词袋（Bag of Words，BoW），再实现 TF-IDF；接着展示 scikit-learn 如何用三行代码完成相同工作，最后说明哪些失效情况会促使你改用嵌入。

## 概念（The Concept）

**词袋（Bag of Words，BoW）**舍弃顺序。对每篇文档，统计词表中每个词出现的次数。向量长度就是词表大小，位置 `i` 存放词 `i` 的计数。

**词频–逆文档频率（Term Frequency–Inverse Document Frequency，TF-IDF）**重新加权词袋。在每篇文档都出现的词信息量低，应降低权重；在整个语料库中稀有、却在某一篇文档中频繁出现的词携带信号，应提高权重。

```
TF-IDF(w, d) = TF(w, d) * IDF(w)
             = count(w in d) / |d| * log(N / df(w))
```

其中 `TF` 是文档内的词频（Term frequency），`df` 是文档频率（Document frequency，即多少篇文档包含该词），`N` 是文档总数。`log` 使普遍出现的词的权重保持在有限范围。

关键性质：两者都会生成坐标轴可解释的稀疏向量（Sparse vector）。查看训练后分类器的权重，就能知道哪些词把文档推向哪个类别。768 维 BERT 嵌入做不到这一点。

```figure
bow-tfidf
```

## 动手实现（Build It）

### 步骤 1：构建词表（Build the vocabulary）

```python
def build_vocab(docs):
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    return vocab
```

输入：已分词文档的列表，任意词级分词器均可；本课 `code/main.py` 使用一个简化的转小写版本。输出：`{word: index}` 字典。稳定的插入顺序意味着索引 0 对应第一篇文档中最先遇到的词。不同实现约定不同，scikit-learn 按字母顺序排序。

### 步骤 2：词袋（Bag of words）

```python
def bag_of_words(docs, vocab):
    matrix = [[0] * len(vocab) for _ in docs]
    for i, doc in enumerate(docs):
        for token in doc:
            if token in vocab:
                matrix[i][vocab[token]] += 1
    return matrix
```

```python
>>> docs = [["cat", "sat", "on", "mat"], ["cat", "cat", "ran"]]
>>> vocab = build_vocab(docs)
>>> bag_of_words(docs, vocab)
[[1, 1, 1, 1, 0], [2, 0, 0, 0, 1]]
```

行对应文档，列对应词表索引。元素 `[i][j]` 表示“词 `j` 在文档 `i` 中出现的次数”。文档 1 的 `cat` 计数是两次，因为它确实出现了两次；文档 0 的 `ran` 计数为零，因为它没有出现。

### 步骤 3：词频与文档频率（Term frequency and document frequency）

```python
import math


def term_frequency(doc_bow, doc_length):
    return [c / doc_length if doc_length else 0 for c in doc_bow]


def document_frequency(bow_matrix):
    df = [0] * len(bow_matrix[0])
    for row in bow_matrix:
        for j, count in enumerate(row):
            if count > 0:
                df[j] += 1
    return df


def inverse_document_frequency(df, n_docs):
    return [math.log((n_docs + 1) / (d + 1)) + 1 for d in df]
```

这里有两个值得说明的平滑（Smoothing）技巧：`(n+1)/(d+1)` 避免 `log(x/0)`；末尾的 `+1` 保证在所有文档中都出现的词仍有 IDF 1，而不是 0，与 scikit-learn 默认行为一致。其他实现使用原始的 `log(N/df)`。两种都可行，平滑版本更便于使用。

### 步骤 4：TF-IDF（TF-IDF）

```python
def tfidf(bow_matrix):
    n_docs = len(bow_matrix)
    df = document_frequency(bow_matrix)
    idf = inverse_document_frequency(df, n_docs)
    out = []
    for row in bow_matrix:
        length = sum(row)
        tf = term_frequency(row, length)
        out.append([tf_j * idf_j for tf_j, idf_j in zip(tf, idf)])
    return out
```

```python
>>> docs = [
...     ["the", "cat", "sat"],
...     ["the", "dog", "sat"],
...     ["the", "cat", "ran"],
... ]
>>> vocab = build_vocab(docs)
>>> bow = bag_of_words(docs, vocab)
>>> tfidf(bow)
```

三篇文档，词表含五个词（`the`、`cat`、`sat`、`dog`、`ran`）。`the` 在三篇中都出现，因此 IDF 低；`dog` 只在一篇中出现，因此 IDF 高。向量是稀疏的（大多数元素较小），有区分力的词会凸显出来。

### 步骤 5：逐行 L2 归一化（L2-normalize rows）

```python
def l2_normalize(matrix):
    out = []
    for row in matrix:
        norm = math.sqrt(sum(x * x for x in row))
        out.append([x / norm if norm else 0 for x in row])
    return out
```

不做归一化（Normalization）时，较长文档的向量更大，会主导相似度分数。L2 归一化将每篇文档放到单位超球面上，此时行之间的余弦相似度（Cosine similarity）就是点积。

## 实际应用（Use It）

scikit-learn 提供生产级实现。

```python
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

docs = ["the cat sat on the mat", "the dog sat on the mat", "the cat ran"]

bow_vectorizer = CountVectorizer()
bow = bow_vectorizer.fit_transform(docs)
print(bow_vectorizer.get_feature_names_out())
print(bow.toarray())

tfidf_vectorizer = TfidfVectorizer()
tfidf = tfidf_vectorizer.fit_transform(docs)
print(tfidf.toarray().round(3))
```

`CountVectorizer` 一次调用完成分词、词表构建和词袋表示。`TfidfVectorizer` 额外加入 IDF 加权和 L2 归一化。两者都返回稀疏矩阵。对于 100k 篇文档，稠密版本无法装入内存；在分类器明确要求稠密数据前，一直保留稀疏表示。

对结果影响显著的参数：

| 参数 | 作用 |
|-----|--------|
| `ngram_range=(1, 2)` | 包含二元词组（Bigram），通常能改善分类效果。 |
| `min_df=2` | 丢弃出现在少于 2 篇文档中的词，在噪声数据上缩减词表。 |
| `max_df=0.95` | 丢弃出现在超过 95% 文档中的词，无须硬编码列表即可近似移除停用词。 |
| `stop_words="english"` | 使用 scikit-learn 内置停用词列表。是否使用取决于任务，情感分析*不应*移除否定词。 |
| `sublinear_tf=True` | 用 `1 + log(tf)` 代替原始 `tf`，适合某个词在单篇文档中反复出现的情况。 |

### TF-IDF 仍然胜出的场景，截至 2026 年（When TF-IDF still wins）

- 垃圾邮件检测、主题标注和日志异常标记。重要的是词是否出现，而不是细微语义差别。
- 小数据场景（几百个标注样本）。TF-IDF 加逻辑回归（Logistic regression）没有预训练成本。
- 任何重视延迟的场景。TF-IDF 加线性模型可在微秒内回答，通过 Transformer 为文档生成嵌入则需要 10-100ms。
- 必须解释预测结果的系统。查看分类器系数，正向权重最高的词就是预测原因。

### TF-IDF 何时失效（When TF-IDF fails）

一种失效是对语义视而不见。考虑下面两篇文档：

- “The movie was not good at all.”（这部电影一点也不好。）
- “The movie was excellent.”（这部电影非常出色。）

一条是负面评论，一条是正面评论。它们的 TF-IDF 重叠部分恰好是 `{the, movie, was}`。词袋分类器必须记住：`good` 附近出现 `not` 会翻转标签。数据足够时它能学到这一点，但始终不如理解句法的模型处理得自然。

另一种失效是推理时出现词表外词（Out-of-vocabulary word，OOV）。在 IMDb 评论上训练的词袋模型，如果训练时从未见过 `Zoomer-approved`，就不知道如何处理。子词嵌入（第 04 课）可以应对，TF-IDF 不行。

### 混合方案：TF-IDF 加权嵌入（TF-IDF weighted embeddings）

2026 年面向中等数据规模分类的实用默认方案：将 TF-IDF 权重用作词嵌入上的注意力（Attention）。

```python
def tfidf_weighted_embedding(doc, tfidf_scores, embedding_table, dim):
    vec = [0.0] * dim
    total_weight = 0.0
    for token in doc:
        if token not in embedding_table or token not in tfidf_scores:
            continue
        weight = tfidf_scores[token]
        emb = embedding_table[token]
        for i in range(dim):
            vec[i] += weight * emb[i]
        total_weight += weight
    if total_weight == 0:
        return vec
    return [v / total_weight for v in vec]
```

嵌入提供语义能力，TF-IDF 突出稀有词。分类器在池化（Pooling）后的向量上训练。对于标注样本少于约 50k 的情感、主题和意图分类，这比单独使用其中任一种方法效果更好。

## 交付成果（Ship It）

保存为 `outputs/prompt-vectorization-picker.md`：

```markdown
---
name: vectorization-picker
description: 根据文本分类任务，推荐词袋（BoW）、TF-IDF、嵌入（Embedding）或混合方案。
phase: 5
lesson: 02
---

你负责推荐文本向量化（Text vectorization）策略。根据任务描述，输出：

1. 表示方式（词袋、TF-IDF、Transformer 嵌入或混合方案），用一句话解释原因。
2. 具体向量化器配置。给出库名，列出参数（`ngram_range`、`min_df`、`max_df`、`sublinear_tf`、`stop_words`）。
3. 交付前应测试的一种失效情况。

用户标注样本少于 500 个时，拒绝推荐嵌入，除非用户提供了 TF-IDF 基线在语义上失效的证据。拒绝为情感分析移除停用词（否定词携带信号）。指出类别不平衡（Class imbalance）不能仅靠更换向量化器解决。

输入示例：“将 30k 条客户支持工单分成 12 类。大多数工单有 2-3 句话。仅英语。审计日志需要可解释性。”

输出示例：

- 表示方式：TF-IDF。30k 个样本不算少，可解释性要求排除了稠密嵌入。
- 配置：`TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_df=0.95, sublinear_tf=True, stop_words=None)`。保留停用词，因为类别关键词有时正是停用词（“not working”与“working”）。
- 待测失效情况：确认 `min_df=3` 不会丢弃稀有类别的关键词。运行 `get_feature_names_out`，按类别筛选后人工检查。
```

## 练习（Exercises）

1. **简单。** 在 L2 归一化后的 TF-IDF 输出上实现 `cosine_similarity(doc_vec_a, doc_vec_b)`。验证相同文档得分为 1.0，词表完全不相交的文档得分为 0.0。
2. **中等。** 为 `bag_of_words` 添加 `n-gram` 支持。参数 `n` 生成 `n` 元词组的计数。测试对 `["the", "cat", "sat"]` 使用 `n=2` 时，能得到 `["the cat", "cat sat"]` 的二元词组计数。
3. **困难。** 使用 GloVe 100d 向量（下载一次并缓存）实现上述 TF-IDF 加权嵌入混合方案。在 20 Newsgroups 数据集上，将分类准确率与纯 TF-IDF、纯均值池化嵌入比较，报告各方法在哪些场景胜出。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 词袋（BoW） | 词频向量 | 一篇文档中词表各词的计数，舍弃顺序。 |
| 词频（TF） | 词出现频率 | 词在文档中的计数，可选择按文档长度归一化。 |
| 文档频率（DF） | 文档出现频率 | 至少包含该词一次的文档数量。 |
| 逆文档频率（IDF） | 文档频率的逆向度量 | 平滑后的 `log(N / df)`，降低到处都出现的词的权重。 |
| 稀疏向量（Sparse vector） | 大多为零 | 词表通常含 10k-100k 个词；其中大多数不会出现在任意一篇给定文档中。 |
| 余弦相似度（Cosine similarity） | 向量夹角 | L2 归一化向量的点积，1 表示相同，0 表示正交。 |

## 延伸阅读（Further Reading）

- [scikit-learn：文本特征提取（Feature extraction from text）](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction)：权威 API 参考，附各参数说明。
- [Salton, G. 与 Buckley, C.（1988）：自动文本检索中的词项加权方法（Term-weighting approaches in automatic text retrieval）](https://www.sciencedirect.com/science/article/pii/0306457388900210)：让 TF-IDF 在随后十年成为默认选择的论文。
- [为什么 TF-IDF 仍能胜过嵌入（Why TF-IDF Still Beats Embeddings），Ashfaque Thonikkadavan，Medium](https://medium.com/@cmtwskb/why-tf-idf-still-beats-embeddings-ad85c123e1b2)：从 2026 年视角解释老方法何时胜出及其原因。
