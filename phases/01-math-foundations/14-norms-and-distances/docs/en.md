# 范数与距离（Norms and Distances）

> 距离函数定义了“相似”的含义。选错它，下游的一切都会出问题。

**Type:** Build
**Language:** Python
**Prerequisites:** 阶段 1，第 01 课（线性代数直觉，Linear Algebra Intuition）、第 02 课（向量、矩阵与运算，Vectors, Matrices & Operations）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 从零实现 L1、L2、余弦、马氏、杰卡德和编辑距离函数
- 为给定的机器学习（Machine Learning，ML）任务选择合适的距离度量，并解释其他方案为何不适用
- 将 L1、L2 范数与 LASSO、岭正则化及其几何约束区域联系起来
- 演示同一个数据集在不同度量下如何产生不同的最近邻

## 问题（The Problem）

你有两个向量，可能是词嵌入（Word Embedding）、用户画像，也可能是像素数组。你需要知道：它们有多接近？

答案完全取决于你选择的距离函数。两个数据点在一种度量下可能互为最近邻，在另一种度量下却相距很远。K 近邻（K-Nearest Neighbors，KNN）分类器、推荐引擎、向量数据库、聚类算法、损失函数，都依赖这个选择。选错了，模型就会优化错误的目标。

不存在通用的最佳距离。L2 适用于空间数据；余弦相似度（Cosine Similarity）在自然语言处理（Natural Language Processing，NLP）中占主导地位；杰卡德（Jaccard）处理集合；编辑距离（Edit Distance）处理字符串；马氏距离（Mahalanobis Distance）考虑相关性；瓦瑟斯坦距离（Wasserstein Distance）搬运概率质量。每一种都表达了对“相似”含义的不同假设。

本课从零构建各种主要距离函数，展示它们各自适用的场景，并演示同一数据如何因度量不同而产生完全不同的最近邻。

## 核心概念（The Concept）

### 范数：衡量向量大小（Norms: measuring vector magnitude）

范数（Norm）衡量向量的“大小”。两个向量之间的每个距离函数都可以写成其差的范数：d(a, b) = ||a - b||。因此，理解范数就是理解距离。

### L1 范数与曼哈顿距离（L1 Norm (Manhattan distance)）

L1 范数将所有分量的绝对值相加。

```text
||x||_1 = |x_1| + |x_2| + ... + |x_n|
```

它称为曼哈顿距离（Manhattan Distance），因为它衡量的是在城市网格上只能沿坐标轴行走时的路程，不能走对角线。

```text
点 A = (1, 1)
点 B = (4, 5)

L1 距离 = |4-1| + |5-1| = 3 + 4 = 7

在网格上，你向东走 3 个街区，再向北走 4 个街区。
```

何时使用 L1：
- 高维稀疏数据（文本特征、独热编码，One-Hot Encoding）
- 需要对异常值具有鲁棒性时（单个巨大差异不会主导结果）
- 特征选择问题（L1 正则化促进稀疏性）

与 L1 正则化（Lasso）的联系：在损失函数中加入 ||w||_1，惩罚权重绝对值之和。这会将小权重推到恰好为零，实现自动特征选择。L1 惩罚在权重空间中形成菱形约束区域，菱形顶点位于某些权重为零的坐标轴上。

与损失函数的联系：平均绝对误差（Mean Absolute Error，MAE）是预测值与目标值之间 L1 距离的平均值。它对所有误差施加线性惩罚，因此相比均方误差（Mean Squared Error，MSE），对异常值更具鲁棒性。

### L2 范数与欧氏距离（L2 Norm (Euclidean distance)）

L2 范数对应直线距离，即分量平方和的平方根。

```text
||x||_2 = sqrt(x_1^2 + x_2^2 + ... + x_n^2)
```

这就是几何课上学过的距离，是勾股定理在 n 维空间中的推广。

```text
点 A = (1, 1)
点 B = (4, 5)

L2 距离 = sqrt((4-1)^2 + (5-1)^2) = sqrt(9 + 16) = sqrt(25) = 5.0

沿直线斜穿网格。
```

何时使用 L2：
- 低维到中维的连续数据
- 特征尺度可比较时
- 物理距离（空间数据、传感器读数）
- 像素级图像相似性

与 L2 正则化（岭正则化，Ridge）的联系：在损失函数中加入 ||w||_2^2，会惩罚大权重。与 L1 不同，它不会将权重推到零，而是按比例将所有权重向零收缩。L2 惩罚形成圆形约束区域，坐标轴上没有顶点。权重会变小，但很少恰好为零。

与损失函数的联系：均方误差（MSE）是 L2 距离平方的平均值。平方使大误差受到比小误差更重的惩罚。

```text
MAE（L1 损失）: |y - y_hat|         线性惩罚。对异常值鲁棒。
MSE（L2 损失）: (y - y_hat)^2       二次惩罚。对异常值敏感。
```

### Lp 范数：通用范数族（Lp Norms: the general family）

L1 与 L2 是 Lp 范数的特例：

```text
||x||_p = (|x_1|^p + |x_2|^p + ... + |x_n|^p)^(1/p)
```

不同 p 值产生不同形状的“单位球（Unit Ball）”（与原点距离为 1 的所有点构成的集合）：

```text
p=1:    菱形              （顶点位于坐标轴上）
p=2:    圆/球             （通常的圆球）
p=3:    超椭圆            （圆角正方形）
p=inf:  正方形/超立方体   （平直边沿着坐标轴）
```

### L 无穷范数与切比雪夫距离（L-infinity Norm (Chebyshev distance)）

当 p 趋向无穷时，Lp 范数收敛到最大的分量绝对值。

```text
||x||_inf = max(|x_1|, |x_2|, ..., |x_n|)
```

两点之间的距离由差异最大的单个维度决定，其余维度都被忽略。

```text
点 A = (1, 1)
点 B = (4, 5)

L-inf 距离 = max(|4-1|, |5-1|) = max(3, 4) = 4
```

何时使用 L 无穷范数：
- 关心任意单个维度上的最坏偏差时
- 棋盘游戏（国际象棋的王按 L 无穷距离移动：任意方向走一步的代价都是 1）
- 制造公差（每个维度都必须符合规格）

### 余弦相似度与余弦距离（Cosine Similarity and Cosine Distance）

余弦相似度衡量两个向量之间的夹角，忽略它们的大小。

```text
cos_sim(a, b) = (a . b) / (||a||_2 * ||b||_2)
```

其范围从 -1（方向相反）到 +1（方向相同）。垂直向量的余弦相似度为 0。

余弦距离（Cosine Distance）将其转换为距离：cosine_distance = 1 - cosine_similarity。范围从 0（方向相同）到 2（方向相反）。

```text
a = (1, 0)    b = (1, 1)

cos_sim = (1*1 + 0*1) / (1 * sqrt(2)) = 1/sqrt(2) = 0.707
cos_dist = 1 - 0.707 = 0.293
```

为什么余弦相似度在自然语言处理与嵌入中占主导地位：对文本而言，文档长度不应影响相似性。一篇关于猫的文档即使是另一篇同主题文档的两倍长，也应该仍然“相似”。余弦相似度忽略大小（长度），只关心方向。词分布相同但长度不同的两篇文档指向同一方向，余弦相似度为 1.0。

何时使用余弦相似度：
- 文本相似性（词频-逆文档频率（Term Frequency–Inverse Document Frequency，TF-IDF）向量、词嵌入、句子嵌入）
- 任何大小是噪声、方向是信号的领域
- 推荐系统（用户偏好向量）
- 嵌入搜索（向量数据库几乎总是使用余弦或点积）

### 点积相似度与余弦相似度对比（Dot Product Similarity vs Cosine Similarity）

两个向量的点积（Dot Product）为：

```text
a . b = a_1*b_1 + a_2*b_2 + ... + a_n*b_n
      = ||a|| * ||b|| * cos(angle)
```

余弦相似度就是用两个向量的大小对点积进行归一化。当两个向量都已单位归一化（大小 = 1）时，点积与余弦相似度完全相同。

```text
如果 ||a|| = 1 且 ||b|| = 1：
    a . b = cos(angle between a and b)
```

两者何时不同：点积包含大小信息。向量越大，点积分数越高。这在希望“热门”项目排名更高的检索系统中很重要，向量大小充当了隐式的质量或重要性信号。

```text
a = (3, 0)    b = (1, 0)    c = (0, 1)

dot(a, b) = 3     dot(a, c) = 0
cos(a, b) = 1.0   cos(a, c) = 0.0

两者对方向的判断一致，但点积还反映大小。
```

实践中：
- 只需要方向相似性时使用余弦相似度
- 大小携带有意义的信息时使用点积
- 许多向量数据库（Pinecone、Weaviate、Qdrant）允许你在两者之间选择
- 如果嵌入已进行 L2 归一化，选哪一种都一样

### 马氏距离（Mahalanobis Distance）

欧氏距离（Euclidean Distance）平等对待所有维度。但如果特征存在相关性或尺度不同，L2 会产生误导性结果。

马氏距离考虑数据的协方差（Covariance）结构。

```text
d_M(x, y) = sqrt((x - y)^T * S^(-1) * (x - y))
```

其中 S 为数据的协方差矩阵。

直观来说，马氏距离先对数据去相关并归一化，即白化（Whitening），再在变换后的空间中计算 L2 距离。如果 S 是单位矩阵（特征不相关且方差为 1），马氏距离就退化为欧氏距离。

```text
例如：身高与体重相关。
身高 6'2"、体重 180 磅的人并不异常。
身高 5'0"、体重 180 磅的人则异常。

欧氏距离可能认为两者离均值一样远。
马氏距离会正确地将第二个人识别为异常值，
因为它考虑了身高与体重的相关性。
```

何时使用马氏距离：
- 异常值检测（与均值的马氏距离很大的点就是异常值）
- 特征尺度不同且存在相关性的分类问题
- 有足够数据估计可靠协方差矩阵时
- 制造业质量控制（多变量过程监测）

### 杰卡德相似度：用于集合（Jaccard Similarity (for sets)）

杰卡德相似度（Jaccard Similarity）衡量两个集合的重叠程度。

```text
J(A, B) = |A intersect B| / |A union B|
```

其范围从 0（没有重叠）到 1（集合相同）。杰卡德距离 = 1 - 杰卡德相似度。

```text
A = {cat, dog, fish}
B = {cat, bird, fish, snake}

交集 = {cat, fish}         大小 = 2
并集 = {cat, dog, fish, bird, snake}  大小 = 5

杰卡德相似度 = 2/5 = 0.4
杰卡德距离 = 0.6
```

何时使用杰卡德相似度：
- 比较标签、类别或特征集合
- 基于词是否出现而非频率衡量文档相似性
- 近重复检测（用最小哈希（MinHash）近似杰卡德相似度）
- 比较二元特征向量（存在/不存在的数据）
- 评估分割模型（交并比（Intersection over Union，IoU）= 杰卡德相似度）

### 编辑距离与莱文斯坦距离（Edit Distance (Levenshtein Distance)）

编辑距离统计将一个字符串变成另一个字符串所需的最少单字符操作次数。操作包括插入、删除或替换。

```text
"kitten" -> "sitting"

kitten -> sitten  （替换 k -> s）
sitten -> sittin  （替换 e -> i）
sittin -> sitting （插入 g）

编辑距离 = 3
```

使用动态规划（Dynamic Programming）计算。填充一个矩阵，其中元素 (i, j) 是字符串 A 的前 i 个字符与字符串 B 的前 j 个字符之间的编辑距离。

```text
        ""  s  i  t  t  i  n  g
    ""   0  1  2  3  4  5  6  7
    k    1  1  2  3  4  5  6  7
    i    2  2  1  2  3  4  5  6
    t    3  3  2  1  2  3  4  5
    t    4  4  3  2  1  2  3  4
    e    5  5  4  3  2  2  3  4
    n    6  6  5  4  3  3  2  3
```

何时使用编辑距离：
- 拼写检查与纠正
- 脱氧核糖核酸（Deoxyribonucleic Acid，DNA）序列比对（使用加权操作）
- 字符串模糊匹配
- 杂乱文本数据去重

### KL 散度：不是距离，但常被当作距离（KL Divergence (not a distance, but used like one)）

KL 散度（Kullback-Leibler Divergence，KL）衡量一个概率分布与另一个分布的差异。第 09 课已介绍过它，这里仍要讨论，因为人们常把它当作“距离”，尽管它并不是。

```text
D_KL(P || Q) = sum(p(x) * log(p(x) / q(x)))
```

关键性质：KL 散度**不对称**。

```text
D_KL(P || Q) != D_KL(Q || P)
```

这意味着它不满足距离度量的基本要求，也不满足三角不等式（Triangle Inequality）。它是散度，不是距离。

正向 KL（D_KL(P || Q)）是“均值寻求（Mean-Seeking）”的：Q 尝试覆盖 P 的所有模态。
反向 KL（D_KL(Q || P)）是“模态寻求（Mode-Seeking）”的：Q 聚焦于 P 的单个模态。

何时会见到 KL 散度：
- 变分自编码器（Variational Autoencoder，VAE）：证据下界（Evidence Lower Bound，ELBO）中的 KL 项将潜在分布推向先验
- 知识蒸馏（Knowledge Distillation）：学生尝试匹配教师的分布
- 基于人类反馈的强化学习（Reinforcement Learning from Human Feedback，RLHF）：KL 惩罚使微调模型保持接近基础模型
- 策略梯度方法（Policy Gradient Methods）：约束策略更新

### 瓦瑟斯坦距离与推土机距离（Wasserstein Distance (Earth Mover's Distance)）

瓦瑟斯坦距离衡量把一个概率分布变成另一个分布所需的最小“功”。可以这样理解：一个分布是一堆土，另一个是一个坑，需要搬多少土，又要搬多远？

```text
W(P, Q) = inf over all transport plans gamma of E[d(x, y)]
```

对一维分布，它简化为累积分布函数（Cumulative Distribution Function，CDF）之差的绝对值的积分：

```text
W_1(P, Q) = integral |CDF_P(x) - CDF_Q(x)| dx
```

瓦瑟斯坦距离为何重要：
- 它是真正的度量（对称、满足三角不等式）
- 即使分布不重叠也能提供梯度（此时 KL 散度趋向无穷）
- 这一性质使它成为瓦瑟斯坦生成对抗网络（Wasserstein GAN，WGAN）的核心，解决了原始生成对抗网络（Generative Adversarial Network，GAN）的训练不稳定问题

```text
不重叠的分布：

P: [1, 0, 0, 0, 0]    Q: [0, 0, 0, 0, 1]

KL 散度：无穷大（零的对数）
瓦瑟斯坦距离：4（将所有质量移动 4 个箱位）

瓦瑟斯坦距离提供有意义的梯度，KL 则不能。
```

何时使用瓦瑟斯坦距离：
- GAN 训练（WGAN、WGAN-GP）
- 比较可能不重叠的分布
- 最优传输（Optimal Transport）问题
- 图像检索（比较颜色直方图）

### 为什么不同任务需要不同距离（Why Different Tasks Need Different Distances）

| 任务 | 最佳距离 | 原因 |
|------|--------------|-----|
| 文本相似性 | 余弦 | 大小是噪声，方向是含义 |
| 图像像素比较 | L2 | 空间关系重要，特征尺度可比 |
| 稀疏高维特征 | L1 | 鲁棒，不会放大少见的大差异 |
| 集合重叠（标签、类别） | 杰卡德 | 数据天然是集合，而不是向量 |
| 字符串匹配 | 编辑距离 | 操作符合人的编辑直觉 |
| 异常值检测 | 马氏距离 | 考虑特征相关性和尺度 |
| 比较分布 | KL 散度 | 衡量以 Q 代替 P 造成的信息损失 |
| GAN 训练 | 瓦瑟斯坦距离 | 即使分布不重叠也能提供梯度 |
| 嵌入（向量数据库） | 余弦或点积 | 嵌入经训练后用方向编码含义 |
| 推荐 | 点积 | 大小可以编码热度或置信度 |
| DNA 序列 | 加权编辑距离 | 替换代价随核苷酸对而变化 |
| 制造业质量控制（Quality Control，QC） | L 无穷距离 | 关心任意维度上的最坏偏差 |

### 与损失函数的联系（Connection to Loss Functions）

损失函数是应用于预测值与目标值之间的距离函数。

```text
损失函数             使用的距离             行为
MSE                  L2 的平方              重罚大误差
MAE                  L1                     平等惩罚所有误差
Huber 损失           大误差用 L1，           兼具两者优点：对异常值鲁棒，
                     小误差用 L2            零附近梯度平滑
交叉熵               KL 散度                衡量分布不匹配
合页损失             max(0, margin - d)     只惩罚低于间隔的情况
三元组损失           L2（通常）              拉近正样本，
                                            推远负样本
对比损失             L2                     拉近相似对，将不相似对
                                            推到间隔之外
```

### 与正则化的联系（Connection to Regularization）

正则化（Regularization）在损失函数中加入对权重的范数惩罚。

```text
L1 正则化（Lasso）:   loss + lambda * ||w||_1
  -> 稀疏权重。某些权重变为恰好零。
  -> 自动特征选择。
  -> 解有尖角（零处不可微）。

L2 正则化（Ridge）:   loss + lambda * ||w||_2^2
  -> 小权重。所有权重向零收缩。
  -> 不进行特征选择（没有权重变为恰好零）。
  -> 解处处平滑。

弹性网络（Elastic Net）: loss + lambda_1 * ||w||_1 + lambda_2 * ||w||_2^2
  -> 结合 L1 的稀疏性与 L2 的稳定性。
  -> 相关特征组一起保留或丢弃。
```

为什么 L1 产生稀疏性而 L2 不会：想象二维权重空间中的约束区域，L1 是菱形，L2 是圆。损失函数的等高线（椭圆）最可能在菱形顶点相切，此处一个权重为零。它们则在圆的平滑点相切，此处两个权重都非零。

### 最近邻搜索（Nearest Neighbor Search）

每个距离函数都对应一个最近邻搜索问题：给定查询点，找出数据集中最近的点。

对于含 n 个 d 维点的数据集，精确最近邻搜索每次查询的复杂度为 O(n * d)。对于大型数据集，这太慢了。

近似最近邻（Approximate Nearest Neighbor，ANN）算法牺牲少量准确率，换取大幅加速：

```text
算法              方法                          使用方
KD 树             轴对齐空间划分                scikit-learn（低维）
球树              嵌套超球面                    scikit-learn（中维）
局部敏感哈希 LSH  随机哈希投影                  近重复检测
HNSW              分层可导航                    FAISS、Qdrant、Weaviate
                  小世界图
倒排文件 IVF      倒排文件索引，                FAISS（十亿级）
                  基于聚类搜索
乘积量化          压缩向量，                    FAISS（内存受限）
                  在压缩空间中搜索
```

分层可导航小世界（Hierarchical Navigable Small World，HNSW）是现代向量数据库中的主流算法。它构建多层图，每个节点连接其近似最近邻。搜索从顶层（稀疏、长距离跳转）开始，下行到底层（密集、短距离跳转）。

```figure
norm-unit-balls
```

## 动手实现（Build It）

### 第 1 步：所有范数与距离函数（Step 1: All norm and distance functions）

完整实现见 `code/distances.py`。每个函数都只使用基础 Python 数学运算从零构建。

### 第 2 步：相同数据、不同距离、不同邻居（Step 2: Same data, different distances, different neighbors）

`distances.py` 中的演示创建数据集，选定查询点，展示最近邻如何随距离度量变化。L1 下“最近”的点，在 L2 或余弦下可能并不是最近。

### 第 3 步：嵌入相似性搜索（Step 3: Embedding similarity search）

代码包含一个模拟嵌入相似性搜索，分别使用余弦相似度与 L2 距离查找与查询最相似的“文档”，展示排名可能不同。

## 实际应用（Use It）

最常见的实际用途：在向量数据库中寻找相似项目。

```python
import numpy as np

def cosine_similarity_matrix(X):
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    X_normalized = X / norms
    return X_normalized @ X_normalized.T

embeddings = np.random.randn(1000, 768)

sim_matrix = cosine_similarity_matrix(embeddings)

query_idx = 0
similarities = sim_matrix[query_idx]
top_k = np.argsort(similarities)[::-1][1:6]
print(f"Top 5 most similar to item 0: {top_k}")
print(f"Similarities: {similarities[top_k]}")
```

当你调用 `model.encode(text)` 后搜索向量数据库时，底层发生的正是这些操作：嵌入模型将文本映射为向量，向量数据库计算查询向量与各存储向量之间的余弦相似度（或点积），同时使用 ANN 算法避免逐一检查所有向量。

## 练习（Exercises）

1. 计算 (1, 2, 3) 与 (4, 0, 6) 之间的 L1、L2 和 L 无穷距离。验证对任意点对总有 L-inf <= L2 <= L1。证明这个顺序为何必然成立。

2. 构造两个余弦相似度高（> 0.9）但 L2 距离大（> 10）的向量，从几何角度解释原因。然后构造两个余弦相似度低（< 0.3）但 L2 距离小（< 0.5）的向量。

3. 实现一个函数，接受数据集和查询点，返回 L1、L2、余弦和马氏距离下的最近邻。找出一个数据集，使四种方法选出的最近点各不相同。

4. 使用 CDF 方法手算 [0.5, 0.5, 0, 0] 与 [0, 0, 0.5, 0.5] 之间的瓦瑟斯坦距离，再计算 [0.25, 0.25, 0.25, 0.25] 与 [0, 0, 0.5, 0.5] 之间的距离。哪个更大，为什么？

5. 实现 MinHash 以近似杰卡德相似度。生成 100 个随机集合，计算所有集合对的精确杰卡德相似度，并与使用 50、100、200 个哈希函数的 MinHash 近似结果比较。绘制近似误差。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 范数（Norm） | “向量的大小” | 将向量映射为非负标量的函数，满足三角不等式、绝对齐次性，且仅零向量的范数为零 |
| L1 范数（L1 Norm） | “曼哈顿距离” | 分量绝对值之和，在优化中产生稀疏性，对异常值鲁棒 |
| L2 范数（L2 Norm） | “欧氏距离” | 分量平方和的平方根，即欧氏空间中的直线距离 |
| Lp 范数（Lp Norm） | “广义范数” | 分量绝对值的 p 次幂之和再取 p 次方根，L1 和 L2 是其特例 |
| L 无穷范数（L-infinity Norm） | “最大范数”或“切比雪夫距离（Chebyshev Distance）” | 最大的分量绝对值，是 p 趋向无穷时 Lp 的极限 |
| 余弦相似度（Cosine Similarity） | “向量之间的夹角” | 用两个向量大小归一化的点积，范围为 -1 到 +1，忽略向量长度 |
| 余弦距离（Cosine Distance） | “1 减去余弦相似度” | 将余弦相似度转换为距离，范围为 0 到 2 |
| 点积（Dot Product） | “未归一化的余弦” | 逐分量乘积之和，等于余弦相似度乘以两个向量的大小 |
| 马氏距离（Mahalanobis Distance） | “考虑相关性的距离” | 在利用数据协方差矩阵白化（去相关并归一化）后的空间中计算的 L2 距离 |
| 杰卡德相似度（Jaccard Similarity） | “集合重叠” | 交集大小除以并集大小，用于集合而非向量 |
| 编辑距离（Edit Distance） | “莱文斯坦距离（Levenshtein Distance）” | 将一个字符串变成另一个所需的最少插入、删除和替换次数 |
| KL 散度（KL Divergence） | “分布之间的距离” | 不是真正的距离（不对称），衡量用 Q 编码 P 所需的额外比特数 |
| 瓦瑟斯坦距离（Wasserstein Distance） | “推土机距离（Earth Mover's Distance）” | 将质量从一个分布搬运到另一个分布所需的最小功，是真正的度量 |
| 近似最近邻（Approximate Nearest Neighbor，ANN） | “ANN 搜索” | 比精确搜索快得多地寻找近似最近点的算法（HNSW、LSH、IVF） |
| 分层可导航小世界（Hierarchical Navigable Small World，HNSW） | “向量数据库算法” | 用于快速近似最近邻搜索的多层图 |
| L1 正则化（L1 Regularization） | “Lasso” | 将权重的 L1 范数加到损失中，使权重趋于零（稀疏性） |
| L2 正则化（L2 Regularization） | “岭回归（Ridge）”或“权重衰减（Weight Decay）” | 将权重的 L2 范数平方加到损失中，使权重向零收缩，但不产生稀疏性 |
| 弹性网络（Elastic Net） | “L1 + L2” | 结合 L1 与 L2 正则化，对相关特征组的处理优于单独使用其中任何一种 |

## 延伸阅读（Further Reading）

- [FAISS：高效相似性搜索库](https://github.com/facebookresearch/faiss)：Meta 的十亿级 ANN 搜索库
- [瓦瑟斯坦生成对抗网络（Arjovsky 等，2017）](https://arxiv.org/abs/1701.07875)：将推土机距离引入 GAN 的论文
- [局部敏感哈希（Locality-Sensitive Hashing，LSH；Indyk 与 Motwani，1998）](https://dl.acm.org/doi/10.1145/276698.276876)：奠基性的 ANN 算法
- [高效估计词表示（Mikolov 等，2013）](https://arxiv.org/abs/1301.3781)：Word2Vec，余弦相似度由此成为嵌入的默认选择
- [sklearn.neighbors 文档](https://scikit-learn.org/stable/modules/neighbors.html)：scikit-learn 中距离度量与近邻算法的实用指南
