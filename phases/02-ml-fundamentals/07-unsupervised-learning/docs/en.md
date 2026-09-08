# 无监督学习（Unsupervised Learning）

> 没有标签，没有老师。算法自行发现结构。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 1（范数与距离、概率与分布），阶段 2 第 1–6 课
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 从零实现 K 均值、DBSCAN 和高斯混合模型，比较它们的聚类行为
- 使用轮廓分数和肘部法评估聚类质量，选择最佳 K
- 解释 DBSCAN 何时优于 K 均值，识别能处理非球形簇和异常值的算法
- 用聚类方法构建异常检测流水线，标记偏离正常模式的点

## 问题（The Problem）

此前每节机器学习课都假设数据带有标签：“这是输入，这是正确输出。”现实中，标签成本高昂。医院有数百万份患者记录，却没有人为每份记录标注疾病类别；电商网站有数百万次用户会话，却没有人工标注客户群体；安全团队有网络日志，却没有人为每个异常做标记。

无监督学习不需要事先知道寻找什么，就能发现模式。它将相似数据点分组，发现隐藏结构，并揭示异常。如果监督学习是通过附有答案的教材学习，那么无监督学习就是观察原始数据，直到模式显现。

难点在于，没有标签就无法直接衡量“对”或“错”。需要其他工具评估算法找到的结构是否有意义。

## 概念（The Concept）

### 聚类：将相似事物分组（Clustering: Grouping Similar Things Together）

聚类（Clustering）将每个数据点分配到一个组，即簇（Cluster），使同组点之间比不同组点之间更相似。问题始终是：“相似”究竟是什么意思？

```mermaid
flowchart LR
    A[原始数据] --> B{选择方法}
    B --> C[K-Means]
    B --> D[DBSCAN]
    B --> E[层次聚类]
    B --> F[GMM]
    C --> G[扁平的球形簇]
    D --> H[任意形状，噪声检测]
    E --> I[嵌套簇构成的树]
    F --> J[软分配，椭圆形簇]
```

### K 均值：主力方法（K-Means: The Workhorse）

K 均值（K-Means）将数据划分为恰好 K 个簇。每个簇有一个质心（Centroid），即质量中心；每个点归属于最近的质心。

Lloyd 算法：

1. 随机选择 K 个点作为初始质心
2. 将每个数据点分配给最近的质心
3. 取分配到各簇的点的均值，重新计算质心
4. 重复第 2–3 步，直到分配不再变化

目标函数，即惯性（Inertia），衡量各点到所属质心的距离平方总和。K 均值将其最小化，但只能找到局部最小值，不同初始化可能产生不同结果。

### 选择 K（Choosing K）

有两种标准方法：

**肘部法（Elbow Method）：**对 K = 1, 2, 3, ..., n 分别运行 K 均值。绘制惯性随 K 变化的曲线，寻找增加簇数量不再显著降低惯性的“肘部”。

**轮廓分数（Silhouette Score）：**对每个点，比较其与所属簇的相似程度（a）及与最近其他簇的相似程度（b）。轮廓系数为 (b - a) / max(a, b)，范围从 -1（分错簇）到 +1（聚类良好）。对所有点取平均得到全局分数。

### DBSCAN：基于密度的聚类（DBSCAN: Density-Based Clustering）

K 均值假设簇为球形，并要求预先选择 K。DBSCAN 不作这两个假设，而是将由稀疏区域隔开的密集区域识别为簇。

两个参数：
- **eps**：邻域半径
- **min_samples**：形成密集区域所需的最少点数

三类点：
- **核心点（Core Point）**：eps 距离内至少有 min_samples 个点
- **边界点（Border Point）**：位于某个核心点的 eps 范围内，但自身不是核心点
- **噪声点（Noise Point）**：既非核心点也非边界点，即异常值

DBSCAN 将彼此相距 eps 以内的核心点连接成同一簇。边界点加入附近核心点所在的簇，噪声点不属于任何簇。

优点：发现任意形状的簇，自动确定簇数量，识别异常值。缺点：难以处理密度各不相同的簇。

### 层次聚类（Hierarchical Clustering）

构建由嵌套簇组成的树状图（Dendrogram）。

凝聚式（Agglomerative），即自底向上：
1. 初始时每个点各自构成一个簇
2. 合并最近的两个簇
3. 重复，直到只剩一个簇
4. 在所需层级切割树状图，得到 K 个簇

簇间“接近程度”可以这样衡量：
- **单链接（Single Linkage）**：两个簇中任意两点之间的最小距离
- **全链接（Complete Linkage）**：任意两点之间的最大距离
- **平均链接（Average Linkage）**：所有点对距离的平均值
- **Ward 方法（Ward's Method）**：选择使总簇内方差增量最小的合并

### 高斯混合模型（Gaussian Mixture Models，GMM）

K 均值给出硬分配（Hard Assignment）：每个点恰好属于一个簇。GMM 给出软分配（Soft Assignment）：每个点都有属于各个簇的概率。

GMM 假设数据由 K 个高斯分布混合生成，每个分布都有自己的均值和协方差。期望最大化（Expectation-Maximization，EM）算法交替执行：

- **期望步（E-step）**：计算每个点属于各高斯分布的概率
- **最大化步（M-step）**：更新各高斯分布的均值、协方差和混合权重，使数据似然最大化

GMM 能建模椭圆形簇，而不像 K 均值只处理球形簇，并能自然处理重叠簇。

### 各方法的适用场景（When to Use Which）

| 方法 | 最适合 | 应避免的情况 |
|--------|----------|------------|
| K 均值（K-Means） | 大数据集、球形簇、已知 K | 形状不规则、存在异常值 |
| DBSCAN | 未知 K、任意形状、异常值检测 | 密度不一、维度很高 |
| 层次聚类（Hierarchical） | 小数据集、需要树状图、未知 K | 大数据集，内存为 O(n^2) |
| GMM | 重叠簇、需要软分配 | 数据集极大、维度过多 |

### 用聚类进行异常检测（Anomaly Detection with Clustering）

聚类天然支持异常检测（Anomaly Detection）：
- **K 均值**：远离所有质心的点是异常点
- **DBSCAN**：按定义，噪声点就是异常点
- **GMM**：在所有高斯分布下概率都低的点是异常点

```figure
kmeans-step
```

## 动手实现（Build It）

### 第 1 步：从零实现 K 均值（K-Means from scratch）

```python
import math
import random


def euclidean_distance(a, b):
    return math.sqrt(sum((ai - bi) ** 2 for ai, bi in zip(a, b)))


def kmeans(data, k, max_iterations=100, seed=42):
    random.seed(seed)
    n_features = len(data[0])

    centroids = random.sample(data, k)

    for iteration in range(max_iterations):
        clusters = [[] for _ in range(k)]
        assignments = []

        for point in data:
            distances = [euclidean_distance(point, c) for c in centroids]
            nearest = distances.index(min(distances))
            clusters[nearest].append(point)
            assignments.append(nearest)

        new_centroids = []
        for cluster in clusters:
            if len(cluster) == 0:
                new_centroids.append(random.choice(data))
                continue
            centroid = [
                sum(point[j] for point in cluster) / len(cluster)
                for j in range(n_features)
            ]
            new_centroids.append(centroid)

        if all(
            euclidean_distance(old, new) < 1e-6
            for old, new in zip(centroids, new_centroids)
        ):
            print(f"  Converged at iteration {iteration + 1}")
            break

        centroids = new_centroids

    return assignments, centroids
```

### 第 2 步：肘部法与轮廓分数（Elbow method and silhouette score）

```python
def compute_inertia(data, assignments, centroids):
    total = 0.0
    for point, cluster_id in zip(data, assignments):
        total += euclidean_distance(point, centroids[cluster_id]) ** 2
    return total


def silhouette_score(data, assignments):
    n = len(data)
    if n < 2:
        return 0.0

    clusters = {}
    for i, c in enumerate(assignments):
        clusters.setdefault(c, []).append(i)

    if len(clusters) < 2:
        return 0.0

    scores = []
    for i in range(n):
        own_cluster = assignments[i]
        own_members = [j for j in clusters[own_cluster] if j != i]

        if len(own_members) == 0:
            scores.append(0.0)
            continue

        a = sum(euclidean_distance(data[i], data[j]) for j in own_members) / len(own_members)

        b = float("inf")
        for cluster_id, members in clusters.items():
            if cluster_id == own_cluster:
                continue
            avg_dist = sum(euclidean_distance(data[i], data[j]) for j in members) / len(members)
            b = min(b, avg_dist)

        if max(a, b) == 0:
            scores.append(0.0)
        else:
            scores.append((b - a) / max(a, b))

    return sum(scores) / len(scores)


def find_best_k(data, max_k=10):
    print("Elbow method:")
    inertias = []
    for k in range(1, max_k + 1):
        assignments, centroids = kmeans(data, k)
        inertia = compute_inertia(data, assignments, centroids)
        inertias.append(inertia)
        print(f"  K={k}: inertia={inertia:.2f}")

    print("\nSilhouette scores:")
    for k in range(2, max_k + 1):
        assignments, centroids = kmeans(data, k)
        score = silhouette_score(data, assignments)
        print(f"  K={k}: silhouette={score:.4f}")

    return inertias
```

### 第 3 步：从零实现 DBSCAN（DBSCAN from scratch）

```python
def dbscan(data, eps, min_samples):
    n = len(data)
    labels = [-1] * n
    cluster_id = 0

    def region_query(point_idx):
        neighbors = []
        for i in range(n):
            if euclidean_distance(data[point_idx], data[i]) <= eps:
                neighbors.append(i)
        return neighbors

    visited = [False] * n

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True

        neighbors = region_query(i)

        if len(neighbors) < min_samples:
            labels[i] = -1
            continue

        labels[i] = cluster_id
        seed_set = list(neighbors)
        seed_set.remove(i)

        j = 0
        while j < len(seed_set):
            q = seed_set[j]

            if not visited[q]:
                visited[q] = True
                q_neighbors = region_query(q)
                if len(q_neighbors) >= min_samples:
                    for nb in q_neighbors:
                        if nb not in seed_set:
                            seed_set.append(nb)

            if labels[q] == -1:
                labels[q] = cluster_id

            j += 1

        cluster_id += 1

    return labels
```

### 第 4 步：高斯混合模型与 EM 算法（Gaussian Mixture Model: EM algorithm）

```python
def gmm(data, k, max_iterations=100, seed=42):
    random.seed(seed)
    n = len(data)
    d = len(data[0])

    indices = random.sample(range(n), k)
    means = [list(data[i]) for i in indices]
    variances = [1.0] * k
    weights = [1.0 / k] * k

    def gaussian_pdf(x, mean, variance):
        d = len(x)
        coeff = 1.0 / ((2 * math.pi * variance) ** (d / 2))
        exponent = -sum((xi - mi) ** 2 for xi, mi in zip(x, mean)) / (2 * variance)
        return coeff * math.exp(max(exponent, -500))

    for iteration in range(max_iterations):
        responsibilities = []
        for i in range(n):
            probs = []
            for j in range(k):
                probs.append(weights[j] * gaussian_pdf(data[i], means[j], variances[j]))
            total = sum(probs)
            if total == 0:
                total = 1e-300
            responsibilities.append([p / total for p in probs])

        old_means = [list(m) for m in means]

        for j in range(k):
            r_sum = sum(responsibilities[i][j] for i in range(n))
            if r_sum < 1e-10:
                continue

            weights[j] = r_sum / n

            for dim in range(d):
                means[j][dim] = sum(
                    responsibilities[i][j] * data[i][dim] for i in range(n)
                ) / r_sum

            variances[j] = sum(
                responsibilities[i][j]
                * sum((data[i][dim] - means[j][dim]) ** 2 for dim in range(d))
                for i in range(n)
            ) / (r_sum * d)
            variances[j] = max(variances[j], 1e-6)

        shift = sum(
            euclidean_distance(old_means[j], means[j]) for j in range(k)
        )
        if shift < 1e-6:
            print(f"  GMM converged at iteration {iteration + 1}")
            break

    assignments = []
    for i in range(n):
        assignments.append(responsibilities[i].index(max(responsibilities[i])))

    return assignments, means, weights, responsibilities
```

### 第 5 步：生成测试数据并运行全部算法（Generate test data and run everything）

```python
def make_blobs(centers, n_per_cluster=50, spread=0.5, seed=42):
    random.seed(seed)
    data = []
    true_labels = []
    for label, (cx, cy) in enumerate(centers):
        for _ in range(n_per_cluster):
            x = cx + random.gauss(0, spread)
            y = cy + random.gauss(0, spread)
            data.append([x, y])
            true_labels.append(label)
    return data, true_labels


def make_moons(n_samples=200, noise=0.1, seed=42):
    random.seed(seed)
    data = []
    labels = []
    n_half = n_samples // 2
    for i in range(n_half):
        angle = math.pi * i / n_half
        x = math.cos(angle) + random.gauss(0, noise)
        y = math.sin(angle) + random.gauss(0, noise)
        data.append([x, y])
        labels.append(0)
    for i in range(n_half):
        angle = math.pi * i / n_half
        x = 1 - math.cos(angle) + random.gauss(0, noise)
        y = 1 - math.sin(angle) - 0.5 + random.gauss(0, noise)
        data.append([x, y])
        labels.append(1)
    return data, labels


if __name__ == "__main__":
    centers = [[2, 2], [8, 3], [5, 8]]
    data, true_labels = make_blobs(centers, n_per_cluster=50, spread=0.8)

    print("=== K-Means on 3 blobs ===")
    assignments, centroids = kmeans(data, k=3)
    print(f"  Centroids: {[[round(c, 2) for c in cent] for cent in centroids]}")
    sil = silhouette_score(data, assignments)
    print(f"  Silhouette score: {sil:.4f}")

    print("\n=== Elbow Method ===")
    find_best_k(data, max_k=6)

    print("\n=== DBSCAN on 3 blobs ===")
    db_labels = dbscan(data, eps=1.5, min_samples=5)
    n_clusters = len(set(db_labels) - {-1})
    n_noise = db_labels.count(-1)
    print(f"  Found {n_clusters} clusters, {n_noise} noise points")

    print("\n=== GMM on 3 blobs ===")
    gmm_assignments, gmm_means, gmm_weights, _ = gmm(data, k=3)
    print(f"  Means: {[[round(m, 2) for m in mean] for mean in gmm_means]}")
    print(f"  Weights: {[round(w, 3) for w in gmm_weights]}")
    gmm_sil = silhouette_score(data, gmm_assignments)
    print(f"  Silhouette score: {gmm_sil:.4f}")

    print("\n=== DBSCAN on moons (non-spherical clusters) ===")
    moon_data, moon_labels = make_moons(n_samples=200, noise=0.1)
    moon_db = dbscan(moon_data, eps=0.3, min_samples=5)
    n_moon_clusters = len(set(moon_db) - {-1})
    n_moon_noise = moon_db.count(-1)
    print(f"  Found {n_moon_clusters} clusters, {n_moon_noise} noise points")

    print("\n=== K-Means on moons (will fail to separate) ===")
    moon_km, moon_centroids = kmeans(moon_data, k=2)
    moon_sil = silhouette_score(moon_data, moon_km)
    print(f"  Silhouette score: {moon_sil:.4f}")
    print("  K-Means splits moons poorly because they are not spherical")

    print("\n=== Anomaly detection with DBSCAN ===")
    anomaly_data = list(data)
    anomaly_data.append([20.0, 20.0])
    anomaly_data.append([-5.0, -5.0])
    anomaly_data.append([15.0, 0.0])
    anomaly_labels = dbscan(anomaly_data, eps=1.5, min_samples=5)
    anomalies = [
        anomaly_data[i]
        for i in range(len(anomaly_labels))
        if anomaly_labels[i] == -1
    ]
    print(f"  Detected {len(anomalies)} anomalies")
    for a in anomalies[-3:]:
        print(f"    Point {[round(v, 2) for v in a]}")
```

## 实际应用（Use It）

使用 scikit-learn，同样的算法各用一行即可调用：

```python
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score as sklearn_silhouette

km = KMeans(n_clusters=3, random_state=42).fit(data)
db = DBSCAN(eps=1.5, min_samples=5).fit(data)
agg = AgglomerativeClustering(n_clusters=3).fit(data)
gmm_model = GaussianMixture(n_components=3, random_state=42).fit(data)
```

从零实现的版本让你准确了解库在计算什么。K 均值在分配和重新计算之间迭代；DBSCAN 从密集种子点扩展簇；GMM 交替执行期望和最大化。库版本增加数值稳定性、更聪明的初始化（K-Means++）及 GPU 加速，但核心逻辑相同。

## 交付成果（Ship It）

本课产出从零编写且可运行的 K 均值、DBSCAN 和 GMM 实现。这些聚类代码可复用，作为更高级无监督方法的基础。

## 练习（Exercises）

1. 实现 K-Means++ 初始化：不再随机选取所有质心，而是随机选第一个，后续质心按其到最近已有质心的距离平方成比例的概率选取。与随机初始化比较收敛速度。
2. 在代码中添加凝聚式层次聚类。实现 Ward 链接，输出树状图（用嵌套的合并列表表示）。在不同层级切割，与 K 均值结果比较。
3. 构建简单异常检测流水线：在同一数据上运行 DBSCAN 和 GMM，标记两种方法都认为异常的点，即 DBSCAN 中的噪声点和 GMM 中的低概率点。测量重叠程度，并讨论两种方法何时意见不同。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 聚类（Clustering） | “把相似事物分组” | 根据特定距离度量，将数据划分为组内相似度高于组间相似度的子集 |
| 质心（Centroid） | “簇的中心” | 分配到簇的所有点的均值，K 均值用它代表簇 |
| 惯性（Inertia） | “簇有多紧密” | 每个点到所属质心的距离平方和，越低越紧密 |
| 轮廓分数（Silhouette Score） | “簇分得有多开” | 对每个点计算 (b - a) / max(a, b)，a 为平均簇内距离，b 为到最近其他簇的平均距离 |
| 核心点（Core Point） | “密集区域中的点” | DBSCAN 中 eps 距离内至少有 min_samples 个邻居的点 |
| EM 算法（EM Algorithm） | “软 K 均值” | 期望最大化：迭代计算归属概率（E-step），更新分布参数（M-step） |
| 树状图（Dendrogram） | “簇组成的树” | 展示层次聚类中簇合并顺序及合并距离的树形图 |
| 异常（Anomaly） | “离群点” | 不符合预期模式的数据点，被 DBSCAN 识别为噪声或被 GMM 判为低概率 |

## 延伸阅读（Further Reading）

- [Stanford CS229：无监督学习（Unsupervised Learning）](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：Andrew Ng 关于聚类与 EM 的讲义
- [scikit-learn 聚类指南（Clustering Guide）](https://scikit-learn.org/stable/modules/clustering.html)：结合可视化示例，对各种聚类算法进行实用比较
- [DBSCAN 原始论文（original paper，Ester 等，1996）](https://www.aaai.org/Papers/KDD/1996/KDD96-037.pdf)：引入基于密度聚类方法的论文
