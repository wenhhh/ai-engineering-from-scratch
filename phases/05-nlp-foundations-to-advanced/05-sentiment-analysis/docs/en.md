# 情感分析（Sentiment Analysis）

> 经典的 NLP 任务。传统文本分类需要掌握的大部分知识，都能在这里看到。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 02（词袋与 TF-IDF，BoW + TF-IDF），阶段 2 · 14（朴素贝叶斯，Naive Bayes）
**Time:** ~75 分钟

## 问题（The Problem）

“The food was not great.”（食物不怎么样。）这是正面还是负面？

情感判断听起来简单：评论者说喜欢或不喜欢某样东西，给句子标个标签即可。它之所以成为经典 NLP 任务，是因为每种看似简单的情况背后都藏着难例。否定会翻转含义，反讽也会使其反转。“Not bad at all”虽有两个带负面意味的词，整体却是正面的。表情符号携带的信号可能比周围文字还多。领域词汇也很重要：音乐评论中的 `tight` 与时尚评论中的 `tight` 就不同。

情感分析是传统 NLP 的实践实验场。理解每个朴素基线（Baseline）为什么会以特定方式失效，就能理解为何要发明更强的模型。本课从零实现朴素贝叶斯基线，加入逻辑回归（Logistic regression），并指出哪些陷阱使生产情感分析成为需要按合规标准处理的问题。

## 概念（The Concept）

传统情感分析分两步。

1. **表示（Represent）。** 把文本转换为特征向量，使用词袋（BoW）、TF-IDF 或 n 元词组（n-gram）。
2. **分类（Classify）。** 在标注样本上拟合线性模型，例如朴素贝叶斯、逻辑回归或支持向量机（SVM）。

朴素贝叶斯是最简单的可行模型。它假设给定标签后，每个特征相互独立；从计数估计 `P(word | positive)` 与 `P(word | negative)`，推理时将概率相乘。这个“朴素”的独立性假设明显不符合现实，结果却出奇地好。原因在于：面对稀疏文本特征和中等规模数据，分类器更关心每个词倾向哪一类，而不是倾向程度到底多大。

逻辑回归修正了独立性假设。它为每个特征学习权重，包括负权重。`not good` 作为二元词组特征会得到负权重。对于从未标注过的二元词组，朴素贝叶斯做不到这一点。

```figure
sentiment-logits
```

## 动手实现（Build It）

### 步骤 1：真实的迷你数据集（A real mini-dataset）

```python
POSITIVE = [
    "absolutely loved this movie",
    "beautiful cinematography and a great story",
    "one of the best films of the year",
    "brilliant acting from the lead",
    "heartwarming and funny",
]

NEGATIVE = [
    "boring and far too long",
    "not worth your time",
    "the plot made no sense",
    "terrible acting, awful script",
    "i want my two hours back",
]
```

这里刻意用小数据。实际工作使用数万个样本，如 IMDb、SST-2、Yelp polarity，数学原理完全相同。

### 步骤 2：从零实现多项式朴素贝叶斯（Multinomial Naive Bayes from scratch）

```python
import math
from collections import Counter


def train_nb(docs_by_class, vocab, alpha=1.0):
    class_priors = {}
    class_word_probs = {}
    total_docs = sum(len(d) for d in docs_by_class.values())

    for cls, docs in docs_by_class.items():
        class_priors[cls] = len(docs) / total_docs
        counts = Counter()
        for doc in docs:
            for token in doc:
                counts[token] += 1
        total = sum(counts.values()) + alpha * len(vocab)
        class_word_probs[cls] = {
            w: (counts[w] + alpha) / total for w in vocab
        }
    return class_priors, class_word_probs


def predict_nb(doc, class_priors, class_word_probs):
    scores = {}
    for cls in class_priors:
        s = math.log(class_priors[cls])
        for token in doc:
            if token in class_word_probs[cls]:
                s += math.log(class_word_probs[cls][token])
        scores[cls] = s
    return max(scores, key=scores.get)
```

加性平滑（Additive smoothing）在 alpha=1.0 时就是拉普拉斯平滑（Laplace smoothing）。没有它，某类别中未见过的词概率为零，取对数就会出问题。实践中常用 `alpha=0.01`，教学默认使用 `alpha=1.0`。

### 步骤 3：从零实现逻辑回归（Logistic regression from scratch）

```python
import numpy as np


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_lr(X, y, epochs=500, lr=0.05, l2=0.01):
    n_features = X.shape[1]
    w = np.zeros(n_features)
    b = 0.0
    for _ in range(epochs):
        logits = X @ w + b
        preds = sigmoid(logits)
        err = preds - y
        grad_w = X.T @ err / len(y) + l2 * w
        grad_b = err.mean()
        w -= lr * grad_w
        b -= lr * grad_b
    return w, b


def predict_lr(X, w, b):
    return (sigmoid(X @ w + b) >= 0.5).astype(int)
```

L2 正则化（L2 regularization）在这里很重要。文本特征稀疏，不加 L2，模型就会记住训练样本。从 `0.01` 开始调参。

### 步骤 4：处理否定这一失效情况（Handling negation）

考虑“not good”和“not bad”。词袋分类器看到的是 `{not, good}` 与 `{not, bad}`，会依据训练中哪一组出现更多来学习。二元词组分类器看到 `not_good` 和 `not_bad`，把它们作为不同特征学习，通常这样就够了。

如果没有二元词组，有一种更粗糙但有效的办法：**否定作用域标记（Negation scoping）**。在否定词后的词元前加 `NOT_`，直到下一个标点为止。

```python
NEGATION_WORDS = {"not", "no", "never", "nor", "none", "nothing", "neither"}
NEGATION_TERMINATORS = {".", "!", "?", ",", ";"}


def apply_negation(tokens):
    out = []
    negate = False
    for token in tokens:
        if token in NEGATION_TERMINATORS:
            negate = False
            out.append(token)
            continue
        if token in NEGATION_WORDS:
            negate = True
            out.append(token)
            continue
        out.append(f"NOT_{token}" if negate else token)
    return out
```

```python
>>> apply_negation(["not", "good", "at", "all", ".", "but", "funny"])
['not', 'NOT_good', 'NOT_at', 'NOT_all', '.', 'but', 'funny']
```

现在 `good` 与 `NOT_good` 是不同特征，分类器可以给它们方向相反的权重。三行预处理代码，就能在情感基准测试上带来可测量的准确率提升。

### 步骤 5：重要的评估指标（Evaluation metrics that matter）

类别不平衡时，只看准确率会产生误导。真实情感语料通常有 70-80% 正面样本或 70-80% 负面样本；始终预测多数类的分类器可获 80% 准确率，却毫无价值。以下各项都要报告：

- **每类精确率与召回率（Per-class precision and recall）。** 每类一组，取宏平均（Macro-average）可得到兼顾类别平衡的单一数值。
- **宏平均 F1（Macro-F1，不平衡数据的主要指标）。** 各类别 F1 分数的等权平均。类别不平衡时，用它代替准确率。
- **加权 F1（Weighted-F1，备选指标）。** 与宏平均类似，但按类别频率加权。当不平衡本身有业务意义时，与宏平均 F1 一起报告。
- **混淆矩阵（Confusion matrix）。** 报告原始计数。在信任任何标量指标前都应检查它，它能揭示模型混淆了哪两个类别。
- **每类错误样本（Per-class error samples）。** 每类抽取 5 个错误预测并阅读。没有什么能替代阅读真实错误。

对于严重不平衡的数据（比例超过 95-5），报告 **ROC 曲线下面积（AUROC）**和**精确率–召回率曲线下面积（AUPRC）**，而不是准确率。AUPRC 对少数类更敏感，而少数类通常正是你关心的，如垃圾邮件、欺诈、稀有情感。

**应避免的常见错误。** 在不平衡数据上报告微平均 F1（Micro-F1）而非宏平均 F1，会因多数类主导而得到看似很高的分数。宏平均 F1 迫使你看到少数类表现。

```python
def evaluate(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1}
```

## 实际应用（Use It）

scikit-learn 用六行代码就能正确完成。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words=None)),
    ("clf", LogisticRegression(C=1.0, max_iter=1000)),
])
pipe.fit(X_train, y_train)
print(pipe.score(X_test, y_test))
```

注意三点：`stop_words=None` 保留否定词；`ngram_range=(1, 2)` 加入二元词组，使 `not_good` 成为特征；`sublinear_tf=True` 抑制重复词。这三个开关，正是 SST-2 上准确率 75% 的基线与 85% 的基线之间的区别。

### 何时使用 Transformer（When to reach for a transformer）

- 反讽检测（Sarcasm detection）。传统模型在这里会失效，没有例外。
- 文档中途情感发生转变的长评论。
- 基于方面的情感分析（Aspect-based sentiment）。“Camera was great but battery was terrible.”（相机很好，但电池很差。）你需要将情感归属到具体方面，只能使用 Transformer 或结构化输出模型。
- 非英语、低资源语言（Low-resource language）。多语言 BERT 可直接提供零样本（Zero-shot）基线。

如果需要上述任一能力，直接跳到阶段 7（Transformer 深入解析）。否则，TF-IDF 加二元词组、否定处理，再配朴素贝叶斯或逻辑回归，就是你的 2026 年生产基线。

### 再谈可复现性陷阱（The reproducibility trap）

重新训练情感模型是常规操作，重新评估却不是。论文准确率使用特定数据划分、特定预处理和特定分词器。如果比较新模型与基线时不用完全相同的流水线，差值就会误导你。务必在自己的流水线上重新运行基线，而不是直接引用论文数字。

## 交付成果（Ship It）

保存为 `outputs/prompt-sentiment-baseline.md`：

```markdown
---
name: sentiment-baseline
description: 为新数据集设计情感分析（Sentiment analysis）基线。
phase: 5
lesson: 05
---

根据数据集描述（领域、语言、规模、标签粒度、延迟预算），输出：

1. 特征提取方案：指定分词器、n 元词组范围、停用词策略（通常保留）、否定处理（作用域前缀或二元词组）。
2. 分类器：基线用朴素贝叶斯，生产用逻辑回归；只有领域需要反讽、方面分析或跨语言能力时才用 Transformer。
3. 评估计划：报告精确率、召回率、F1、混淆矩阵和每类错误样本，而不只是标量。
4. 部署后应监控的一种失效情况。领域漂移（Domain drift）和反讽是最主要的两种。

拒绝为情感任务推荐移除停用词。类别不平衡（如 90% 正面）时，拒绝只报告准确率。指出子词丰富的语言需要 FastText 或 Transformer 嵌入，而不是词级 TF-IDF。
```

## 练习（Exercises）

1. **简单。** 在 scikit-learn 流水线中将 `apply_negation` 加为预处理步骤，在小型情感数据集上测量 F1 变化。
2. **中等。** 实现类别加权逻辑回归（Class-weighted logistic regression）：给 scikit-learn 传入 `class_weight="balanced"`，或自行推导梯度。在合成的 90-10 类别不平衡数据上测量影响。
3. **困难。** 在情感模型残差上训练第二个分类器，构建反讽检测器。记录实验设置。当准确率低于随机水平时警告读者：二分类反讽任务的随机水平约为 50%，多数初次尝试都落在这个水平。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 极性（Polarity） | 正面或负面 | 二元标签，有时扩展为中性或更细粒度标签，如五星评分。 |
| 基于方面的情感分析（Aspect-based sentiment） | 每个方面的极性 | 将情感归属到文本提及的具体实体或属性。 |
| 否定作用域标记（Negation scoping） | 翻转附近词元 | 给“not”之后的词元加 `NOT_` 前缀，直到标点。 |
| 拉普拉斯平滑（Laplace smoothing） | 计数加 1 | 防止朴素贝叶斯出现零概率特征。 |
| L2 正则化（L2 regularization） | 缩小权重 | 在损失中加入 `lambda * sum(w^2)`，对稀疏文本特征至关重要。 |

## 延伸阅读（Further Reading）

- [Pang 与 Lee（2008）：观点挖掘与情感分析（Opinion Mining and Sentiment Analysis）](https://www.cs.cornell.edu/home/llee/opinion-mining-sentiment-analysis-survey.html)：奠基性综述，篇幅长，但前四节已覆盖传统方法的全部内容。
- [Wang 与 Manning（2012）：基线与二元词组，简单而有效的情感和主题分类（Baselines and Bigrams: Simple, Good Sentiment and Topic Classification）](https://aclanthology.org/P12-2018/)：展示二元词组加朴素贝叶斯在短文本上难以超越的论文。
- [scikit-learn 文本特征提取文档](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction)：`CountVectorizer`、`TfidfVectorizer` 及各调节参数的参考。
