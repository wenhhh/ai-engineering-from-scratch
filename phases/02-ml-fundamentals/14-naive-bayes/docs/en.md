# 朴素贝叶斯（Naive Bayes）

> “朴素”假设是错的，但方法依然有效。这正是它的美妙之处。

**Type:** Build
**Language:** Python
**Prerequisites:** 第 2 阶段，第 01–07 课：分类、贝叶斯定理（Classification, Bayes' Theorem）
**Time:** 约 75 分钟

## 学习目标（Learning Objectives）

- 从零实现带拉普拉斯平滑（Laplace Smoothing）的多项式朴素贝叶斯（Multinomial Naive Bayes），用于文本分类
- 解释朴素独立性假设为何在数学上不成立，却能在实践中产生正确的类别排序
- 比较多项式（Multinomial）、伯努利（Bernoulli）和高斯（Gaussian）朴素贝叶斯变体，为给定特征类型选择合适变体
- 在高维稀疏数据上比较朴素贝叶斯与逻辑回归（Logistic Regression），解释其中的偏差–方差权衡

## 问题（The Problem）

你需要对文本分类：将邮件分为垃圾邮件和正常邮件，将客户评论分为正面和负面，将支持工单分配到不同类别。你有数千个特征，每个词对应一个，但训练数据有限。

大多数分类器在这里会遇到困难。逻辑回归需要足够样本才能可靠估计数千个权重；决策树一次按一个词分裂，容易严重过拟合；在 10,000 维空间中，k 近邻（KNN）没有意义，因为每个点到其他点的距离都差不多。

朴素贝叶斯可以处理。它作出一个数学上错误的假设：给定类别后，各特征彼此独立，但仍能在文本分类中胜过“更聪明”的模型，尤其是在训练集较小时。它只需遍历数据一次即可完成训练，能扩展到数百万特征，还能输出概率估计，尽管独立性假设常使概率校准较差。

理解错误假设为何能带来好预测，会让你学到机器学习的一个根本原理：最佳模型不是最正确的模型，而是对你的数据具有最佳偏差–方差权衡的模型。

## 核心概念（The Concept）

### 贝叶斯定理速览（Bayes' Theorem, Quick Review）

贝叶斯定理将条件概率反转：

```
P(class | features) = P(features | class) * P(class) / P(features)
```

我们需要 `P(class | features)`，即给定文档中的词后，文档属于某个类别的概率。可由以下各项计算：
- `P(features | class)`：在该类别文档中看到这些词的似然（Likelihood）
- `P(class)`：类别的先验概率（Prior），例如总体上垃圾邮件有多常见
- `P(features)`：证据（Evidence），对所有类别相同，因此比较时可以忽略

`P(class | features)` 最高的类别获胜。

### 朴素独立性假设（The Naive Independence Assumption）

精确计算 `P(features | class)` 需要估计所有特征共同出现的联合概率。若词表含 10,000 个词，就要估计覆盖 2^10,000 种可能组合的分布，这是不可能的。

朴素假设是：给定类别后，每个特征都条件独立（Conditionally Independent）。

```
P(w1, w2, ..., wn | class) = P(w1 | class) * P(w2 | class) * ... * P(wn | class)
```

你不再估计一个不可处理的联合分布，而是估计 n 个简单的单特征分布，每个只需要计数。

这个假设显然不对。在任何文档中，“machine”（机器）与“learning”（学习）都不是独立的。但分类器不需要正确的概率估计，而是需要正确排序：哪个类别的概率最高。独立性假设引入系统性误差，但这些误差对所有类别的影响相似，因此排序仍然正确。

### 为什么仍然有效（Why It Still Works）

有三个原因：

1. **排序比校准更重要。**分类只需要排第一的类别正确。即便真实概率为 0.7，而 P(spam) = 0.99999，分类器仍会正确选择垃圾邮件。我们不需要正确概率，只需要正确的胜出者。

2. **高偏差、低方差。**独立性假设是一个强先验，对模型施加强约束，防止过拟合。训练数据有限时，一个稍有偏差但稳定的模型，胜过理论正确却极不稳定的模型。这就是偏差–方差权衡的实际体现。

3. **特征冗余会抵消。**相关特征提供冗余证据，分类器会重复计数，但对正确类别也会重复计数。如果“machine”和“learning”总是一起出现，两者都为“tech”（科技）类别提供证据。朴素贝叶斯（NB）计算了两次，但也是为正确类别计算两次。

还有第四个实践原因：朴素贝叶斯极快。训练只需遍历一次数据统计频率，预测只是矩阵乘法，几秒就能在一百万篇文档上训练完成。这样的速度让你比使用慢模型时迭代更快，能尝试更多特征集、运行更多实验。

### 逐步推导数学过程（The Math Step by Step）

来看一个具体例子。假设有两个类别：垃圾邮件 spam 和正常邮件 not-spam。词表有三个词：“free”（免费）、“money”（钱）、“meeting”（会议）。

训练数据：
- 垃圾邮件提及“free”80 次、“money”60 次、“meeting”10 次，共 150 个词
- 正常邮件提及“free”5 次、“money”10 次、“meeting”100 次，共 115 个词
- 40% 的邮件是垃圾邮件，60% 是正常邮件

采用拉普拉斯平滑，alpha=1：

```
P(free | spam)    = (80 + 1) / (150 + 3) = 81/153 = 0.529
P(money | spam)   = (60 + 1) / (150 + 3) = 61/153 = 0.399
P(meeting | spam) = (10 + 1) / (150 + 3) = 11/153 = 0.072

P(free | not-spam)    = (5 + 1) / (115 + 3) = 6/118 = 0.051
P(money | not-spam)   = (10 + 1) / (115 + 3) = 11/118 = 0.093
P(meeting | not-spam) = (100 + 1) / (115 + 3) = 101/118 = 0.856
```

新邮件包含“free”2 次、“money”1 次、“meeting”0 次。

```
log P(spam | email) = log(0.4) + 2*log(0.529) + 1*log(0.399) + 0*log(0.072)
                    = -0.916 + 2*(-0.637) + (-0.919) + 0
                    = -3.109

log P(not-spam | email) = log(0.6) + 2*log(0.051) + 1*log(0.093) + 0*log(0.856)
                        = -0.511 + 2*(-2.976) + (-2.375) + 0
                        = -8.838
```

垃圾邮件以大幅优势胜出。“free”出现两次是支持垃圾邮件的强证据。注意，“meeting”没有出现，对两个对数和的贡献均为零，即 0 * log(P)。在多项式朴素贝叶斯中，未出现的词没有影响；显式建模词语缺席的是伯努利朴素贝叶斯。

### 三种变体（Three Variants）

朴素贝叶斯有三种形式，各自对 `P(feature | class)` 的建模方式不同。

#### 多项式朴素贝叶斯（Multinomial Naive Bayes）

将每个特征建模为计数，最适合以词频或 TF-IDF 值为特征的文本数据。

```
P(word_i | class) = (count of word_i in class + alpha) / (total words in class + alpha * vocab_size)
```

`alpha` 是拉普拉斯平滑参数，下文会解释。这种变体是文本分类的主力。

#### 高斯朴素贝叶斯（Gaussian Naive Bayes）

将每个特征建模为正态分布，最适合连续特征。

```
P(x_i | class) = (1 / sqrt(2 * pi * var)) * exp(-(x_i - mean)^2 / (2 * var))
```

每个类别的每个特征都有自己的均值和方差。如果特征在各类别内确实呈钟形分布，效果会很好。

#### 伯努利朴素贝叶斯（Bernoulli Naive Bayes）

将每个特征建模为二元值，表示出现或缺席，最适合短文本或二元特征向量。

```
P(word_i | class) = (docs in class containing word_i + alpha) / (total docs in class + 2 * alpha)
```

不同于多项式变体，伯努利变体明确考虑一个词未出现所带来的惩罚。如果“free”通常出现在垃圾邮件中，却没有出现在这封邮件中，伯努利模型会把它视为反对垃圾邮件的证据。

### 各变体的适用时机（When to Use Each Variant）

| 变体 | 特征类型 | 最适合 | 示例 |
|---------|-------------|----------|---------|
| 多项式（Multinomial） | 计数或频率 | 文本分类、词袋（Bag-of-Words） | 垃圾邮件、主题分类 |
| 高斯（Gaussian） | 连续值 | 特征近似正态的表格数据 | 鸢尾花分类、传感器数据 |
| 伯努利（Bernoulli） | 二元值（0/1） | 短文本、二元特征向量 | 垃圾短信、出现与否特征 |

### 拉普拉斯平滑（Laplace Smoothing）

如果一个词出现在测试数据中，却从未出现在某个类别的训练数据中，会发生什么？

不平滑时，`P(word | class) = 0/N = 0`。乘积中一个零就会让 `P(class | features) = 0`，无论其他证据有多强。单个未见词会摧毁整个预测，即使有大量证据支持该类别。

拉普拉斯平滑为每个特征计数增加一个小计数 `alpha`，通常为 1：

```
P(word_i | class) = (count(word_i, class) + alpha) / (total_words_in_class + alpha * vocab_size)
```

alpha=1 时，每个词至少有一个很小的概率。测试邮件中出现“discombobulate”（使困惑）不再让垃圾邮件概率归零。平滑具有贝叶斯解释：它等价于给词分布施加均匀狄利克雷先验（Uniform Dirichlet Prior）。

更大的 alpha 表示更强平滑，分布更均匀；更小的 alpha 表示模型更信任数据。Alpha 是需要调节的超参数。

alpha 的影响：

| Alpha | 影响 | 适用情况 |
|-------|--------|-------------|
| 0.001 | 几乎不平滑，信任数据 | 训练集很大，预计没有未见特征 |
| 0.1 | 轻度平滑 | 大训练集 |
| 1.0 | 标准拉普拉斯平滑 | 默认起点 |
| 10.0 | 强平滑，使分布平坦 | 训练集很小，预计有很多未见特征 |

### 对数空间计算（Log-Space Computation）

将数百个小于 1 的概率相乘，会造成浮点下溢（Floating-Point Underflow）。真实值虽是很小的正数，浮点乘积却会变成零。

解决办法是在对数空间工作，将概率相乘改为对数相加：

```
log P(class | x1, x2, ..., xn) = log P(class) + sum_i log P(xi | class)
```

这样预测就变成点积：

```
log_scores = X @ log_feature_probs.T + log_class_priors
prediction = argmax(log_scores)
```

矩阵乘法正是朴素贝叶斯预测如此快的原因：它与单层线性模型执行相同操作。

### 朴素贝叶斯与逻辑回归（Naive Bayes vs Logistic Regression）

两者都是用于文本的线性分类器，区别在于建模对象。

| 方面 | 朴素贝叶斯（Naive Bayes） | 逻辑回归（Logistic Regression） |
|--------|------------|-------------------|
| 类型 | 生成式，建模 P(X\|Y) | 判别式，建模 P(Y\|X) |
| 训练 | 统计频率 | 优化损失函数 |
| 小数据 | 更好，强先验有帮助 | 更差，数据不足以估计权重 |
| 大数据 | 更差，错误假设造成损害 | 更好，边界灵活 |
| 特征 | 假设独立 | 处理相关性 |
| 速度 | 单次遍历，很快 | 迭代优化 |
| 校准 | 概率较差 | 概率较好 |

经验法则：从朴素贝叶斯开始。如果数据足够且 NB 性能进入平台期，就改用逻辑回归。

### 分类流水线（Classification Pipeline）

```mermaid
flowchart LR
    A[原始文本] --> B[分词]
    B --> C[构建词表]
    C --> D[统计词频]
    D --> E[应用平滑]
    E --> F[计算对数概率]
    F --> G[预测：给定词语后取类别概率最大值]

    style A fill:#f9f,stroke:#333
    style G fill:#9f9,stroke:#333
```

实践中，我们在对数空间计算以避免浮点下溢。不把许多小概率相乘，而是将它们的对数相加：

```
log P(class | features) = log P(class) + sum_i log P(feature_i | class)
```

```figure
naive-bayes
```

## 动手实现（Build It）

`code/naive_bayes.py` 中的代码从零实现 MultinomialNB 和 GaussianNB。

### 多项式朴素贝叶斯（MultinomialNB）

从零实现的步骤：

1. **fit(X, y)**：对每个类别统计各特征频率，加入拉普拉斯平滑，计算对数概率，保存类别先验，即类别频率的对数。

2. **predict_log_proba(X)**：对每个样本，为所有类别计算 log P(class) 加上各项 log P(feature_i | class) 之和。这是矩阵乘法：X @ log_probs.T + log_priors。

3. **predict(X)**：返回对数概率最高的类别。

```python
class MultinomialNB:
    def __init__(self, alpha=1.0):
        self.alpha = alpha

    def fit(self, X, y):
        classes = np.unique(y)
        n_classes = len(classes)
        n_features = X.shape[1]

        self.classes_ = classes
        self.class_log_prior_ = np.zeros(n_classes)
        self.feature_log_prob_ = np.zeros((n_classes, n_features))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.class_log_prior_[i] = np.log(X_c.shape[0] / X.shape[0])
            counts = X_c.sum(axis=0) + self.alpha
            self.feature_log_prob_[i] = np.log(counts / counts.sum())

        return self
```

关键认识是：拟合完成后，预测只是矩阵乘法加偏置。这就是朴素贝叶斯快的原因。

### 高斯朴素贝叶斯（GaussianNB）

对连续特征，估计每个类别、每个特征的均值和方差：

```python
class GaussianNB:
    def __init__(self):
        pass

    def fit(self, X, y):
        classes = np.unique(y)
        self.classes_ = classes
        self.means_ = np.zeros((len(classes), X.shape[1]))
        self.vars_ = np.zeros((len(classes), X.shape[1]))
        self.priors_ = np.zeros(len(classes))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.means_[i] = X_c.mean(axis=0)
            self.vars_[i] = X_c.var(axis=0) + 1e-9
            self.priors_[i] = X_c.shape[0] / X.shape[0]

        return self
```

预测使用各特征的高斯概率密度函数（Gaussian PDF），再跨特征相乘，在对数空间中则相加。

### 演示：文本分类（Demo: Text Classification）

代码生成模拟两类文章的合成词袋数据：科技文章与体育文章。每类都有不同的词频分布，MultinomialNB 使用词计数分类。

合成数据的构造如下：创建 200 个“词”，即特征列。第 0–39 个词在科技文章中高频、体育文章中低频；第 80–119 个词在体育文章中高频、科技文章中低频；第 40–79 个词在两类中均为中等频率。这样模拟了真实情况：一些词是强类别指示，另一些只是噪声。

### 演示：连续特征（Demo: Continuous Features）

代码生成类似 Iris 的数据，包含 3 个类别、4 个特征和高斯簇。GaussianNB 使用每类的均值和方差分类。每类具有不同中心（均值向量）和离散程度（方差），模拟不同类别的测量值存在系统性差异的真实数据。

代码还演示：
- **平滑比较：**使用不同 alpha 训练 MultinomialNB，展示平滑强度对准确率的影响。
- **训练规模实验：**当训练数据从 20 增加到 1600 个样本时，NB 准确率如何改善。即使样本很少，NB 也能达到不错的准确率，这是它的主要优势。
- **混淆矩阵（Confusion Matrix）：**通过各类别的精确率、召回率和 F1 得分展示 NB 在哪里犯错。

### 预测速度（Prediction Speed）

朴素贝叶斯预测是矩阵乘法。对于 n 个样本、d 个特征和 k 个类别：
- MultinomialNB：一次矩阵乘法 (n x d) @ (d x k) = O(n * d * k)
- GaussianNB：n * k 次高斯 PDF 计算，每次覆盖 d 个特征 = O(n * d * k)

两者对每个维度都是线性复杂度。相比之下，KNN 需要计算到所有训练点的距离，使用 RBF 核的 SVM 需要对所有支持向量计算核函数。NB 在预测时快几个数量级。

## 实际应用（Use It）

使用 sklearn，两种变体都可以一行创建：

```python
from sklearn.naive_bayes import GaussianNB, MultinomialNB

gnb = GaussianNB()
gnb.fit(X_train, y_train)
print(f"GaussianNB accuracy: {gnb.score(X_test, y_test):.3f}")

mnb = MultinomialNB(alpha=1.0)
mnb.fit(X_train_counts, y_train)
print(f"MultinomialNB accuracy: {mnb.score(X_test_counts, y_test):.3f}")
```

使用 sklearn 进行文本分类：

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("vectorizer", CountVectorizer()),
    ("classifier", MultinomialNB(alpha=1.0)),
])

text_clf.fit(train_texts, train_labels)
accuracy = text_clf.score(test_texts, test_labels)
```

`naive_bayes.py` 中的代码在相同数据上比较从零实现与 sklearn，以验证正确性。

### TF-IDF 与朴素贝叶斯（TF-IDF with Naive Bayes）

原始词计数给每个词的每次出现赋予相同权重。但“the”“is”等常见词在每个类别中都频繁出现，不携带信息。词频–逆文档频率（Term Frequency - Inverse Document Frequency，TF-IDF）降低常见词权重，提高罕见且有区分力的词的权重。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("classifier", MultinomialNB(alpha=0.1)),
])
```

TF-IDF 值非负，因此适用于 MultinomialNB。TF-IDF + MultinomialNB 是文本分类最强的基线之一，在训练样本少于 10,000 的数据集上常常击败更复杂模型。

### 用于短文本的伯努利朴素贝叶斯（BernoulliNB for Short Text）

对于推文、短信和聊天消息等短文本，BernoulliNB 可能优于 MultinomialNB。短文本中的词计数很低，MultinomialNB 依赖的频率信息因此噪声较大。BernoulliNB 只关心是否出现，对短文本更可靠。

```python
from sklearn.naive_bayes import BernoulliNB
from sklearn.feature_extraction.text import CountVectorizer

text_clf = Pipeline([
    ("vectorizer", CountVectorizer(binary=True)),
    ("classifier", BernoulliNB(alpha=1.0)),
])
```

CountVectorizer 的 `binary=True` 标志将所有计数转换为 0/1。不设置它，BernoulliNB 仍然可运行，但看到的是并非为其设计的计数数据。

### 校准朴素贝叶斯概率（Calibrating NB Probabilities）

NB 的概率校准较差。当 NB 给出 P(spam) = 0.95 时，真实概率可能只有 0.7。如果需要可靠概率估计，例如设置阈值或与其他模型组合，可以使用 sklearn 的 CalibratedClassifierCV：

```python
from sklearn.calibration import CalibratedClassifierCV

calibrated_nb = CalibratedClassifierCV(MultinomialNB(), cv=5, method="sigmoid")
calibrated_nb.fit(X_train, y_train)
proba = calibrated_nb.predict_proba(X_test)
```

它通过交叉验证在 NB 的原始得分之上拟合逻辑回归，得到的概率更接近真实类别频率。

### 常见陷阱（Common Gotchas）

1. **负特征值。**MultinomialNB 要求特征非负。如果存在负值，例如某些设置下的 TF-IDF 或标准化特征，应改用 GaussianNB，或平移特征使其为正。

2. **零方差特征。**GaussianNB 要除以方差。如果某个特征在某类中方差为零，即所有值相同，概率计算就会失效。代码给所有方差加入小平滑项 1e-9 来防止这一问题。

3. **类别不平衡。**如果 99% 的邮件都是正常邮件，先验 P(not-spam) = 0.99 会强到压倒似然证据。可以手动设置类别先验，或使用 sklearn 的 class_prior 参数。

4. **特征缩放。**MultinomialNB 基于计数，不需要缩放；GaussianNB 估计逐特征统计量，也不需要缩放。相较于对特征尺度敏感的逻辑回归和 SVM，这是优势。

## 交付成果（Ship It）

本课产出：
- `outputs/skill-naive-bayes-chooser.md`：选择合适 NB 变体的决策技能
- `code/naive_bayes.py`：从零实现 MultinomialNB 与 GaussianNB，并与 sklearn 比较

### 朴素贝叶斯何时失效（When Naive Bayes Fails）

当独立性假设导致错误排序，而不仅是错误概率时，NB 就会失效。情况包括：

1. **强特征交互。**如果类别取决于两个特征的组合，而非任何单个特征，例如异或（XOR）模式，NB 就会完全漏掉。单个特征不提供证据，NB 又无法非线性组合它们。

2. **高度相关且证据相反的特征。**如果特征 A 表示“垃圾邮件”，特征 B 表示“正常邮件”，但 A 与 B 完全相关，现实中总是一致，NB 就会在本无冲突的地方看到冲突证据。

3. **非常大的训练集。**数据足够时，逻辑回归等判别模型可以学到真实决策边界，胜过 NB。在小数据上有帮助的独立性假设，此时反而限制了模型。

实践中，这些失效模式在文本分类中很少见。文本特征多、单个特征弱，独立性假设造成的误差往往互相抵消。对于只有少量强相关特征的表格数据，应优先考虑逻辑回归或树模型。

## 练习（Exercises）

1. **平滑实验。**在文本数据上使用 alpha 为 0.01、0.1、1.0、10.0 和 100.0 训练 MultinomialNB。绘制准确率随 alpha 变化的曲线，性能在哪里达到峰值？为什么很大的 alpha 有害？

2. **特征独立性检验。**选一个真实文本数据集，挑两个明显相关的词，例如“machine”和“learning”。计算 P(word1 | class) * P(word2 | class)，与 P(word1 AND word2 | class) 比较。独立性假设错得有多大？是否影响分类准确率？

3. **伯努利实现。**扩展代码，加入 BernoulliNB 类。将词袋转换为二元形式，表示出现或缺席，在文本数据上与 MultinomialNB 比较准确率。伯努利何时获胜？

4. **NB 与逻辑回归。**在文本数据上训练两者，从 100 个训练样本逐步增至 10,000。绘制两者准确率随训练集规模变化的曲线，逻辑回归从何时开始超过朴素贝叶斯？

5. **垃圾邮件过滤器。**构建完整分类器：对原始邮件文本分词、构建词表、创建词袋特征、训练 MultinomialNB，使用精确率和召回率评估，而不仅是准确率。为什么？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 朴素贝叶斯（Naive Bayes） | “简单概率分类器” | 在给定类别后特征条件独立的假设下，应用贝叶斯定理的分类器 |
| 条件独立（Conditional Independence） | “特征互不影响” | P(A, B \| C) = P(A \| C) * P(B \| C)：已知 C 后，知道 B 不会提供关于 A 的新信息 |
| 拉普拉斯平滑（Laplace Smoothing） | “加一平滑” | 给每个特征添加小计数，防止零概率主导预测 |
| 先验（Prior） | “看到数据前的信念” | P(class)：观测任何特征之前各类别的概率 |
| 似然（Likelihood） | “数据有多吻合” | P(features \| class)：已知类别时观测到这些特征的概率 |
| 后验（Posterior） | “看到数据后的信念” | P(class \| features)：观测特征后更新的类别概率 |
| 生成模型（Generative Model） | “建模数据如何生成” | 学习 P(X \| Y) 和 P(Y)，再用贝叶斯定理得到 P(Y \| X) 的模型 |
| 判别模型（Discriminative Model） | “建模决策边界” | 直接学习 P(Y \| X)，不建模 X 如何生成的模型 |
| 对数概率（Log Probability） | “避免下溢” | 使用 log P 而非 P，防止许多小数乘积在浮点表示中变为零 |

## 延伸阅读（Further Reading）

- [scikit-learn 朴素贝叶斯文档（Naive Bayes Docs）](https://scikit-learn.org/stable/modules/naive_bayes.html)：三种变体及数学细节
- [McCallum 与 Nigam：朴素贝叶斯文本分类事件模型比较（A Comparison of Event Models for Naive Bayes Text Classification，1998）](https://www.cs.cmu.edu/~knigam/papers/multinomial-aaaiws98.pdf)：多项式与伯努利文本模型的经典比较
- [Rennie 等：应对朴素贝叶斯文本分类器的不良假设（Tackling the Poor Assumptions of Naive Bayes Text Classifiers，2003）](https://people.csail.mit.edu/jrennie/papers/icml03-nb.pdf)：针对文本的 NB 改进
- [Ng 与 Jordan：论判别式与生成式分类器（On Discriminative vs. Generative Classifiers，2001）](https://ai.stanford.edu/~ang/papers/nips01-discriminativegenerative.pdf)：证明 NB 在较少数据下比逻辑回归收敛更快
