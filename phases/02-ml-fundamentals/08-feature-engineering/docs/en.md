# 特征工程与选择（Feature Engineering & Selection）

> 一个好特征抵得上千个数据点。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 1（机器学习统计学、线性代数），阶段 2 第 1–7 课
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 实现数值变换（标准化、最小最大缩放、对数变换、分箱），解释各自适用场景
- 为类别特征构建独热编码、标签编码和目标编码，识别目标编码中的数据泄漏风险
- 从零构建 TF-IDF 向量化器，解释为什么它在文本分类中优于原始词频计数
- 使用过滤式特征选择（方差阈值、相关性、互信息）降低维度

## 问题（The Problem）

你有一个数据集，选了算法并训练，结果平平。换一个更复杂的算法，仍然平平。花一周调超参数，也只有微小改善。

随后有人将原始数据转换为更好的特征，简单的逻辑回归就击败了你精心调优的梯度提升集成模型。

这种情况经常发生。经典机器学习中，数据表示比算法选择更重要。无论学习器多复杂，使用“面积”和“卧室数”的房价模型，都会优于只使用“原始地址字符串”的模型。算法只能利用你提供的信息。

特征工程（Feature Engineering）将原始数据变成便于模型发现模式的表示。特征选择（Feature Selection）则丢弃只增加噪声、不增加信号的特征。二者结合，是经典机器学习中最能带来收益的工作。

## 概念（The Concept）

### 特征流水线（The Feature Pipeline）

```mermaid
flowchart LR
    A[原始数据] --> B[处理缺失值]
    B --> C[数值变换]
    B --> D[类别编码]
    B --> E[文本特征]
    C --> F[特征交互]
    D --> F
    E --> F
    F --> G[特征选择]
    G --> H[可供模型使用的数据]
```

### 数值特征（Numerical Features）

原始数值很少能直接供模型使用。常见变换包括：

**缩放（Scaling）：**将特征放到相同范围，使基于距离的算法（K-Means、KNN、SVM）平等对待所有特征。最小最大缩放（Min-max Scaling）映射到 [0, 1]；标准化（Standardization，z-score）映射到 mean=0, std=1。

**对数变换（Log Transform）：**压缩右偏分布，如收入、人口、词数，并将乘法关系变为加法关系。

**分箱（Binning）：**将连续值转为类别。特征与目标关系非线性但呈阶梯状时很有用，如年龄分组。

**多项式特征（Polynomial Features）：**创建 x^2, x^3, x1*x2 项，让线性模型捕捉非线性关系，代价是特征增多。

### 类别特征（Categorical Features）

模型需要数值，类别需要编码。

**独热编码（One-hot Encoding）：**为每个类别创建二元列。“color = red/blue/green”变成 is_red、is_blue、is_green 三列。它适合低基数特征，但类别多时会造成维度膨胀。

**标签编码（Label Encoding）：**将每类映射为整数：red=0, blue=1, green=2。这会引入虚假顺序，模型可能认为 green > blue > red。只适合按单个取值划分的树模型。

**目标编码（Target Encoding）：**用各类别的目标变量均值替换该类别。它有效但危险，数据泄漏风险高。必须只在训练数据上计算，再应用于测试数据。

### 文本特征（Text Features）

**计数向量化器（Count Vectorizer）：**统计每个词在文档中出现的次数。“the cat sat on the mat”变为 {the: 2, cat: 1, sat: 1, on: 1, mat: 1}。

**词频–逆文档频率（Term Frequency-Inverse Document Frequency，TF-IDF）：**根据词在文档集合中的独特程度赋权。“the”等常见词权重低，稀有而有区分力的词权重高。

```
TF(word, doc) = count(word in doc) / total words in doc
IDF(word) = log(total docs / docs containing word)
TF-IDF = TF * IDF
```

### 缺失值（Missing Values）

真实数据会有缺口。处理策略包括：

- **删除行**：仅在缺失少且随机时采用
- **均值/中位数插补（Mean/Median Imputation）**：简单，保留分布形状；中位数更能抵抗异常值
- **众数插补（Mode Imputation）**：用于类别特征
- **指示列（Indicator Column）**：插补前添加二元列“was_this_missing”。数据缺失这一事实本身可能携带信息
- **前向/后向填充（Forward/Backward Fill）**：用于时间序列数据

### 特征交互（Feature Interaction）

有时关系存在于组合中。单独的“身高”和“体重”不如“BMI = weight / height^2”有预测力。特征交互会成倍扩大特征空间，因此应利用领域知识选择合适的组合。

### 特征选择（Feature Selection）

特征并非越多越好。无关特征增加噪声和训练时间，还可能引发过拟合。

**过滤式方法（Filter Methods，建模前）：**
- 相关性（Correlation）：移除彼此高度相关的冗余特征
- 互信息（Mutual Information）：衡量获知某特征后，目标不确定性减少多少
- 方差阈值（Variance Threshold）：移除几乎不变的特征

**包裹式方法（Wrapper Methods，基于模型）：**
- L1 正则化（Lasso）：将无关特征的权重压到恰好为零
- 递归特征消除（Recursive Feature Elimination）：训练、移除最不重要特征，再重复

**为什么选择很重要：**只有 10 个好特征的模型，通常优于同时有 10 个好特征和 90 个噪声特征的模型。噪声特征让模型有机会过拟合训练数据中不能泛化的模式。

```figure
feature-scaling
```

## 动手实现（Build It）

### 第 1 步：从零实现数值变换（Numerical transforms from scratch）

```python
import math


def min_max_scale(values):
    min_val = min(values)
    max_val = max(values)
    if max_val == min_val:
        return [0.0] * len(values)
    return [(v - min_val) / (max_val - min_val) for v in values]


def standardize(values):
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    std = math.sqrt(variance) if variance > 0 else 1.0
    return [(v - mean) / std for v in values]


def log_transform(values):
    return [math.log(v + 1) for v in values]


def bin_values(values, n_bins=5):
    min_val = min(values)
    max_val = max(values)
    bin_width = (max_val - min_val) / n_bins
    if bin_width == 0:
        return [0] * len(values)
    result = []
    for v in values:
        bin_idx = int((v - min_val) / bin_width)
        bin_idx = min(bin_idx, n_bins - 1)
        result.append(bin_idx)
    return result


def polynomial_features(row, degree=2):
    n = len(row)
    result = list(row)
    if degree >= 2:
        for i in range(n):
            result.append(row[i] ** 2)
        for i in range(n):
            for j in range(i + 1, n):
                result.append(row[i] * row[j])
    return result
```

### 第 2 步：从零实现类别编码（Categorical encoding from scratch）

```python
def one_hot_encode(values):
    categories = sorted(set(values))
    cat_to_idx = {cat: i for i, cat in enumerate(categories)}
    n_cats = len(categories)

    encoded = []
    for v in values:
        row = [0] * n_cats
        row[cat_to_idx[v]] = 1
        encoded.append(row)

    return encoded, categories


def label_encode(values):
    categories = sorted(set(values))
    cat_to_int = {cat: i for i, cat in enumerate(categories)}
    return [cat_to_int[v] for v in values], cat_to_int


def target_encode(feature_values, target_values, smoothing=10):
    global_mean = sum(target_values) / len(target_values)

    category_stats = {}
    for feat, target in zip(feature_values, target_values):
        if feat not in category_stats:
            category_stats[feat] = {"sum": 0.0, "count": 0}
        category_stats[feat]["sum"] += target
        category_stats[feat]["count"] += 1

    encoding = {}
    for cat, stats in category_stats.items():
        cat_mean = stats["sum"] / stats["count"]
        weight = stats["count"] / (stats["count"] + smoothing)
        encoding[cat] = weight * cat_mean + (1 - weight) * global_mean

    return [encoding[v] for v in feature_values], encoding
```

### 第 3 步：从零实现文本特征（Text features from scratch）

```python
def count_vectorize(documents):
    vocab = {}
    idx = 0
    for doc in documents:
        for word in doc.lower().split():
            if word not in vocab:
                vocab[word] = idx
                idx += 1

    vectors = []
    for doc in documents:
        vec = [0] * len(vocab)
        for word in doc.lower().split():
            vec[vocab[word]] += 1
        vectors.append(vec)

    return vectors, vocab


def tfidf(documents):
    n_docs = len(documents)

    vocab = {}
    idx = 0
    for doc in documents:
        for word in doc.lower().split():
            if word not in vocab:
                vocab[word] = idx
                idx += 1

    doc_freq = {}
    for doc in documents:
        seen = set()
        for word in doc.lower().split():
            if word not in seen:
                doc_freq[word] = doc_freq.get(word, 0) + 1
                seen.add(word)

    vectors = []
    for doc in documents:
        words = doc.lower().split()
        word_count = len(words)
        tf_map = {}
        for word in words:
            tf_map[word] = tf_map.get(word, 0) + 1

        vec = [0.0] * len(vocab)
        for word, count in tf_map.items():
            tf = count / word_count
            idf = math.log(n_docs / doc_freq[word])
            vec[vocab[word]] = tf * idf
        vectors.append(vec)

    return vectors, vocab
```

### 第 4 步：从零实现缺失值插补（Missing value imputation from scratch）

```python
def impute_mean(values):
    present = [v for v in values if v is not None]
    if not present:
        return [0.0] * len(values), 0.0
    mean = sum(present) / len(present)
    return [v if v is not None else mean for v in values], mean


def impute_median(values):
    present = sorted(v for v in values if v is not None)
    if not present:
        return [0.0] * len(values), 0.0
    n = len(present)
    if n % 2 == 0:
        median = (present[n // 2 - 1] + present[n // 2]) / 2
    else:
        median = present[n // 2]
    return [v if v is not None else median for v in values], median


def impute_mode(values):
    present = [v for v in values if v is not None]
    if not present:
        return values, None
    counts = {}
    for v in present:
        counts[v] = counts.get(v, 0) + 1
    mode = max(counts, key=counts.get)
    return [v if v is not None else mode for v in values], mode


def add_missing_indicator(values):
    return [0 if v is not None else 1 for v in values]
```

### 第 5 步：从零实现特征选择（Feature selection from scratch）

```python
def correlation(x, y):
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    cov = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y)) / n
    std_x = math.sqrt(sum((xi - mean_x) ** 2 for xi in x) / n)
    std_y = math.sqrt(sum((yi - mean_y) ** 2 for yi in y) / n)
    if std_x == 0 or std_y == 0:
        return 0.0
    return cov / (std_x * std_y)


def mutual_information(feature, target, n_bins=10):
    feat_min = min(feature)
    feat_max = max(feature)
    bin_width = (feat_max - feat_min) / n_bins if feat_max != feat_min else 1.0
    feat_binned = [
        min(int((f - feat_min) / bin_width), n_bins - 1) for f in feature
    ]

    n = len(feature)
    target_classes = sorted(set(target))

    feat_bins = sorted(set(feat_binned))
    p_feat = {}
    for b in feat_bins:
        p_feat[b] = feat_binned.count(b) / n

    p_target = {}
    for t in target_classes:
        p_target[t] = target.count(t) / n

    mi = 0.0
    for b in feat_bins:
        for t in target_classes:
            joint_count = sum(
                1 for fb, tv in zip(feat_binned, target) if fb == b and tv == t
            )
            p_joint = joint_count / n
            if p_joint > 0:
                mi += p_joint * math.log(p_joint / (p_feat[b] * p_target[t]))

    return mi


def variance_threshold(features, threshold=0.01):
    n_features = len(features[0])
    n_samples = len(features)
    selected = []

    for j in range(n_features):
        col = [features[i][j] for i in range(n_samples)]
        mean = sum(col) / n_samples
        var = sum((v - mean) ** 2 for v in col) / n_samples
        if var >= threshold:
            selected.append(j)

    return selected


def remove_correlated(features, threshold=0.9):
    n_features = len(features[0])
    n_samples = len(features)

    to_remove = set()
    for i in range(n_features):
        if i in to_remove:
            continue
        col_i = [features[r][i] for r in range(n_samples)]
        for j in range(i + 1, n_features):
            if j in to_remove:
                continue
            col_j = [features[r][j] for r in range(n_samples)]
            corr = abs(correlation(col_i, col_j))
            if corr >= threshold:
                to_remove.add(j)

    return [i for i in range(n_features) if i not in to_remove]
```

### 第 6 步：完整流水线与演示（Full pipeline and demo）

```python
import random


def make_housing_data(n=200, seed=42):
    random.seed(seed)
    data = []
    for _ in range(n):
        sqft = random.uniform(500, 5000)
        bedrooms = random.choice([1, 2, 3, 4, 5])
        age = random.uniform(0, 50)
        neighborhood = random.choice(["downtown", "suburbs", "rural"])
        has_pool = random.choice([True, False])

        sqft_with_missing = sqft if random.random() > 0.05 else None
        age_with_missing = age if random.random() > 0.08 else None

        price = (
            50 * sqft
            + 20000 * bedrooms
            - 1000 * age
            + (50000 if neighborhood == "downtown" else 10000 if neighborhood == "suburbs" else 0)
            + (15000 if has_pool else 0)
            + random.gauss(0, 20000)
        )

        data.append({
            "sqft": sqft_with_missing,
            "bedrooms": bedrooms,
            "age": age_with_missing,
            "neighborhood": neighborhood,
            "has_pool": has_pool,
            "price": price,
        })
    return data


if __name__ == "__main__":
    data = make_housing_data(200)

    print("=== Raw Data Sample ===")
    for row in data[:3]:
        print(f"  {row}")

    sqft_raw = [d["sqft"] for d in data]
    age_raw = [d["age"] for d in data]
    prices = [d["price"] for d in data]

    print("\n=== Missing Value Handling ===")
    sqft_missing = sum(1 for v in sqft_raw if v is None)
    age_missing = sum(1 for v in age_raw if v is None)
    print(f"  sqft missing: {sqft_missing}/{len(sqft_raw)}")
    print(f"  age missing: {age_missing}/{len(age_raw)}")

    sqft_indicator = add_missing_indicator(sqft_raw)
    age_indicator = add_missing_indicator(age_raw)
    sqft_imputed, sqft_fill = impute_median(sqft_raw)
    age_imputed, age_fill = impute_mean(age_raw)
    print(f"  sqft filled with median: {sqft_fill:.0f}")
    print(f"  age filled with mean: {age_fill:.1f}")

    print("\n=== Numerical Transforms ===")
    sqft_scaled = standardize(sqft_imputed)
    age_scaled = min_max_scale(age_imputed)
    sqft_log = log_transform(sqft_imputed)
    age_binned = bin_values(age_imputed, n_bins=5)
    print(f"  sqft standardized: mean={sum(sqft_scaled)/len(sqft_scaled):.4f}, std={math.sqrt(sum(v**2 for v in sqft_scaled)/len(sqft_scaled)):.4f}")
    print(f"  age min-max: [{min(age_scaled):.2f}, {max(age_scaled):.2f}]")
    print(f"  age bins: {sorted(set(age_binned))}")

    print("\n=== Categorical Encoding ===")
    neighborhoods = [d["neighborhood"] for d in data]

    ohe, ohe_cats = one_hot_encode(neighborhoods)
    print(f"  One-hot categories: {ohe_cats}")
    print(f"  Sample encoding: {neighborhoods[0]} -> {ohe[0]}")

    le, le_map = label_encode(neighborhoods)
    print(f"  Label encoding map: {le_map}")

    te, te_map = target_encode(neighborhoods, prices, smoothing=10)
    print(f"  Target encoding: {({k: round(v) for k, v in te_map.items()})}")

    print("\n=== Text Features ===")
    descriptions = [
        "large modern house with pool",
        "small cozy cottage near downtown",
        "spacious family home with large yard",
        "modern apartment downtown with view",
        "rustic cabin in rural area",
    ]
    cv, cv_vocab = count_vectorize(descriptions)
    print(f"  Vocabulary size: {len(cv_vocab)}")
    print(f"  Doc 0 non-zero features: {sum(1 for v in cv[0] if v > 0)}")

    tf, tf_vocab = tfidf(descriptions)
    print(f"  TF-IDF vocabulary size: {len(tf_vocab)}")
    top_words = sorted(tf_vocab.keys(), key=lambda w: tf[0][tf_vocab[w]], reverse=True)[:3]
    print(f"  Doc 0 top TF-IDF words: {top_words}")

    print("\n=== Polynomial Features ===")
    sample_row = [sqft_scaled[0], age_scaled[0]]
    poly = polynomial_features(sample_row, degree=2)
    print(f"  Input: {[round(v, 4) for v in sample_row]}")
    print(f"  Polynomial: {[round(v, 4) for v in poly]}")
    print(f"  Features: [x1, x2, x1^2, x2^2, x1*x2]")

    print("\n=== Feature Selection ===")
    feature_matrix = [
        [sqft_scaled[i], age_scaled[i], float(sqft_indicator[i]), float(age_indicator[i])]
        + ohe[i]
        for i in range(len(data))
    ]

    print(f"  Total features: {len(feature_matrix[0])}")

    surviving_var = variance_threshold(feature_matrix, threshold=0.01)
    print(f"  After variance threshold (0.01): {len(surviving_var)} features kept")

    surviving_corr = remove_correlated(feature_matrix, threshold=0.9)
    print(f"  After correlation filter (0.9): {len(surviving_corr)} features kept")

    binary_prices = [1 if p > sum(prices) / len(prices) else 0 for p in prices]
    print("\n  Mutual information with target:")
    feature_names = ["sqft", "age", "sqft_missing", "age_missing"] + [f"neigh_{c}" for c in ohe_cats]
    for j in range(len(feature_matrix[0])):
        col = [feature_matrix[i][j] for i in range(len(feature_matrix))]
        mi = mutual_information(col, binary_prices, n_bins=10)
        print(f"    {feature_names[j]}: MI={mi:.4f}")

    print("\n  Correlation with price:")
    for j in range(len(feature_matrix[0])):
        col = [feature_matrix[i][j] for i in range(len(feature_matrix))]
        corr = correlation(col, prices)
        print(f"    {feature_names[j]}: r={corr:.4f}")
```

## 实际应用（Use It）

使用 scikit-learn，可以将这些变换组合为流水线：

```python
from sklearn.preprocessing import StandardScaler, OneHotEncoder, PolynomialFeatures
from sklearn.impute import SimpleImputer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import mutual_info_classif, VarianceThreshold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

numeric_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

categorical_pipe = Pipeline([
    ("encoder", OneHotEncoder(sparse_output=False)),
])

preprocessor = ColumnTransformer([
    ("num", numeric_pipe, ["sqft", "age"]),
    ("cat", categorical_pipe, ["neighborhood"]),
])
```

从零实现的版本准确展示每个变换内部发生了什么。库版本增加边界情况处理、稀疏矩阵支持和流水线组合，但数学原理相同。

## 交付成果（Ship It）

本课产出：
- `outputs/prompt-feature-engineer.md`：从原始数据系统开展特征工程的提示词

## 练习（Exercises）

1. 在数值变换中加入稳健缩放（Robust Scaling），用中位数和四分位距代替均值与标准差。在含极端异常值的数据上与标准缩放比较。
2. 实现留一法目标编码（Leave-one-out Target Encoding）：为每行计算目标均值时，排除该行自身的目标值。展示它如何相对于朴素目标编码减少过拟合。
3. 构建结合方差阈值、相关性过滤和互信息排序的自动特征选择流水线。应用于房屋数据集，用简单线性回归比较全部特征与筛选后特征的模型性能。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 特征工程（Feature Engineering） | “创建新列” | 将原始数据转换成向模型揭示模式的表示 |
| 标准化（Standardization） | “让它正常” | 减去均值并除以标准差，使特征 mean=0 且 std=1 |
| 独热编码（One-hot Encoding） | “创建哑变量” | 每个类别创建一个二元列，每行恰好有一列为 1 |
| 目标编码（Target Encoding） | “用答案编码” | 将各类别替换为该类别的目标均值，并用平滑防止过拟合 |
| TF-IDF | “高级词频计数” | 词频乘以逆文档频率，根据词在语料库中的区分力赋权 |
| 插补（Imputation） | “填空” | 用估计值替换缺失值，如均值、中位数、众数或模型预测值 |
| 特征选择（Feature Selection） | “丢掉坏列” | 移除增加噪声或冗余的特征，只保留携带目标信号的特征 |
| 互信息（Mutual Information） | “一件事能告诉你多少关于另一件事的信息” | 衡量观察变量 X 后，变量 Y 的不确定性减少多少 |
| 数据泄漏（Data Leakage） | “无意中作弊” | 训练时使用预测时不可获得的信息，产生虚假乐观的结果 |

## 延伸阅读（Further Reading）

- [特征工程与选择（Feature Engineering and Selection，Max Kuhn 与 Kjell Johnson）](http://www.feat.engineering/)：全面介绍特征工程的免费在线书籍
- [scikit-learn 预处理指南（Preprocessing Guide）](https://scikit-learn.org/stable/modules/preprocessing.html)：各种标准变换的实用参考
- [正确进行目标编码（Target Encoding Done Right，Micci-Barreca，2001）](https://dl.acm.org/doi/10.1145/507533.507538)：带平滑的目标编码原始论文
