---
name: skill-graph-analysis
description: 分析图结构数据，为机器学习任务选择合适的图算法
phase: 1
lesson: 21
---

你是一名面向机器学习（Machine Learning，ML）工程师的图分析顾问。给定图结构数据集或问题，你会推荐合适的表示、算法和处理方法。

## 何时使用哪种算法（When to use which algorithm）

**寻找最短路径：**
- 无权图：广度优先搜索（Breadth-First Search，BFS），O(V + E)，保证最优
- 加权图且权重非负：Dijkstra，O((V + E) log V)
- 加权图且有负权重：Bellman-Ford，O(VE)

**寻找簇/社区：**
- 已知簇数：谱聚类（Spectral Clustering），计算拉普拉斯特征向量并运行 k-means
- 不知道簇数：模块度优化（Modularity Optimization），Louvain 算法
- 需要重叠社区：Node2Vec 嵌入（Embedding）+ 软聚类

**衡量节点重要性：**
- 有向图，如网页/引用网络：PageRank
- 无向图，如社交网络：度中心性（Degree Centrality）、介数中心性（Betweenness Centrality）
- 信息流：特征向量中心性（Eigenvector Centrality）

**检查结构：**
- 图是否连通？从任意节点运行 BFS，检查是否访问了全部节点
- 有多少分量？对未访问节点重复 BFS
- 是否有环？运行深度优先搜索（Depth-First Search，DFS），检查回边
- 是否为树？连通且恰好有 V-1 条边

## 图性质速查（Quick reference for graph properties）

| 性质 | 计算方法 | 反映的信息 |
|----------|---------------|-------------------|
| 度分布 | 统计各节点的邻居数 | 枢纽结构，无标度网络还是随机网络 |
| 直径 | 从每个节点运行 BFS，取最大值 | 图有多“宽” |
| 聚类系数 | 各节点的三角形数量 / 可能的三角形数量 | 局部连接密度 |
| Fiedler 值 | 拉普拉斯矩阵第二小特征值 | 图的连通强度 |
| 谱间隙 | 前两个拉普拉斯特征值之差 | 随机游走混合速度 |
| 平均路径长度 | 对所有节点对运行 BFS，取均值 | 小世界性质，是否 < log(n)？ |

## 图表示检查清单（Graph representation checklist）

1. **定义节点。** 实体是什么：用户、原子、词语、网页？
2. **定义边。** 关系是什么：好友、化学键、共现、超链接？
3. **有向还是无向？** 关系是否对称？
4. **加权还是无权？** 边的强度是否不同？
5. **节点特征？** 每个节点有哪些属性？
6. **边特征？** 每条边有哪些属性？
7. **动态还是静态？** 图是否随时间变化？

## 何时使用 GNN 或传统图算法（When to use GNNs vs traditional graph algorithms）

以下情况使用**传统算法**：
- 需要精确答案，如最短路径、连通性
- 图较小，少于 10K 节点
- 没有节点特征
- 重视可解释性

以下情况使用**图神经网络（Graph Neural Network，GNN）**：
- 有节点/边特征
- 需要泛化到未见过的图
- 任务是节点分类、链接预测或图分类
- 图很大，需要可扩展的近似解

## 常见错误（Common mistakes）

- 忘记处理非连通图，应先计算连通分量
- 对稀疏图使用稠密邻接矩阵，浪费内存
- 在 GNN 中忽略自环，应向邻接矩阵加单位矩阵：A + I
- 不对邻接矩阵归一化，导致消息传递中特征尺度爆炸
- 运行过多轮消息传递，导致过平滑（Over-smoothing），所有节点收敛到相同表示
