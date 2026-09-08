---
name: skill-clustering-guide
description: 根据数据形状、噪声和约束选择合适的聚类（Clustering）算法
version: 1.0.0
phase: 2
lesson: 7
tags: [clustering, k-means, dbscan, hierarchical, gmm, unsupervised]
---

# 聚类算法选择指南（Clustering Algorithm Selection Guide）

聚类没有统一的最佳算法。合适的选择取决于簇的形状、是否已知簇数、数据噪声量及数据集规模。

## 决策检查清单（Decision Checklist）

1. 已知簇数量吗？
   - 是：K 均值（K-Means）或高斯混合模型（Gaussian Mixture Model，GMM）
   - 否：DBSCAN 自动发现簇，或用层次聚类在不同层级切割树状图

2. 簇是什么形状？
   - 大致球形，像团块：K 均值
   - 大小不同的椭圆形：GMM
   - 任意形状，如月牙、圆环、链条：DBSCAN
   - 嵌套或层级结构：层次聚类（Hierarchical Clustering）

3. 数据有噪声或异常值吗？
   - 是：DBSCAN 显式标记噪声点，或 GMM 将低概率点视为异常值
   - 否：K 均值即可

4. 需要软分配（Soft Assignment），即概率吗？
   - 是：GMM 为每个簇给出 P(cluster | data point)
   - 否：K 均值或 DBSCAN 给出硬分配（Hard Assignment）

5. 数据集有多大？
   - 少于 10,000：任何算法均可
   - 10,000 到 1,000,000：K 均值很快，小批量 K 均值（Mini-Batch K-Means）更快
   - 超过 1,000,000：小批量 K 均值或 BIRCH。层次聚类太慢。

## 各方法的适用场景（When to use each approach）

**K 均值（K-Means）**：默认起点。速度快，复杂度 O(n * k * iterations)，简单且足以解决许多问题。用肘部法（Elbow Method）或轮廓分数（Silhouette Score）选择 K。局限：假设球形簇，对初始化敏感（使用 K-Means++ 或多次运行），难以处理大小不同的簇。

**DBSCAN**：最适合发现任意形状的簇并自动检测异常值。两个参数为 eps（邻域半径）和 min_samples（最小密度），无须指定 K。局限：簇密度差异很大时效果差，eps 也不易调优。用 k 距离图估计 eps：计算各点到其第 k 近邻的距离，排序后寻找肘部。

**凝聚式层次聚类（Hierarchical: Agglomerative）**：构建合并过程树。需要探索多种粒度的簇结构时很有用，可在不同高度切割树状图。Ward 链接最适合紧凑簇；单链接（Single Linkage）能发现细长簇，但对噪声敏感。局限：内存 O(n^2)、时间 O(n^3)，不适用于大数据集。

**高斯混合模型（Gaussian Mixture Models，GMM）**：进行概率分配的软聚类。将每个簇建模为拥有独立均值和协方差的高斯分布。簇为椭圆形或有重叠时优于 K 均值。使用贝叶斯信息准则（Bayesian Information Criterion，BIC）选择成分数量。局限：假设高斯分布，可能无法处理非凸形状，对初始化敏感。

## 评估聚类质量：无标签（Evaluating cluster quality: no labels）

| 指标 | 衡量内容 | 范围 | 适用场景 |
|--------|-----------------|-------|----------|
| 轮廓分数（Silhouette Score） | 内聚程度与分离程度 | -1 到 1，越高越好 | 比较 K 值或算法 |
| 惯性（Inertia，簇内平方和） | 簇的紧密程度 | 0 到 inf，越低越好 | K 均值的肘部法 |
| BIC / AIC | 带复杂度惩罚的模型拟合 | 越低越好 | 选择 GMM 成分数 |
| Calinski-Harabasz 指数（Index） | 簇间方差与簇内方差之比 | 越高越好 | 快速比较 |
| Davies-Bouldin 指数（Index） | 簇间平均相似度 | 越低越好 | 惩罚重叠簇 |

## 常见错误（Common mistakes）

- 运行 K 均值前不缩放特征，尺度较大的特征会主导距离计算
- 实际数据为高维，却靠观察二维图选择 K，应使用轮廓分数
- 对非球形簇使用 K 均值，月牙或圆环数据需要 DBSCAN
- DBSCAN 的 eps 过大（所有点在一个簇）或过小（所有点都是噪声）
- 将簇标签视为真实答案；聚类是探索性方法，应结合领域知识验证
- 在超过 20,000 个点的数据集上运行层次聚类，内存和时间开销会暴涨

## 速查表（Quick reference）

| 算法 | 簇形状 | 自动确定 K | 处理噪声 | 软分配 | 可扩展规模 |
|-----------|--------------|---------|---------------|-----------------|-------------|
| K 均值（K-Means） | 球形 | 否，手动设定 K | 否 | 否 | 数百万 |
| 小批量 K 均值（Mini-Batch K-Means） | 球形 | 否 | 否 | 否 | 数千万 |
| DBSCAN | 任意 | 是 | 是 | 否 | 数十万 |
| 层次聚类（Hierarchical） | 任意，取决于链接方法 | 灵活，可切割树状图 | 取决于链接方法 | 否 | 少于 20k |
| GMM | 椭圆形 | 否，手动设定 K | 部分，识别低概率点 | 是 | 少于 100k |
| HDBSCAN | 任意 | 是 | 是 | 部分 | 数十万 |
