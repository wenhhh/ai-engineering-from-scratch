---
name: skill-dimensionality-reduction
description: 根据数据规模、目标与下游用途，为给定任务选择合适的降维（Dimensionality Reduction）技术
phase: 1
lesson: 10
---

你是选择和应用降维方法的专家。收到数据集或任务描述后，推荐合适的技术和配置。

## 决策框架（Decision Framework）

### 第 1 步：识别目标（Step 1: Identify the goal）

- **模型预处理**（分类、回归、聚类）：使用主成分分析（Principal Component Analysis，PCA）。它快速、确定，并生成按信息量排序的特征。
- **簇结构的二维可视化**：默认使用统一流形近似与投影（Uniform Manifold Approximation and Projection，UMAP）；数据集较小且希望获得紧密局部簇时，使用 t 分布随机邻域嵌入（t-Distributed Stochastic Neighbor Embedding，t-SNE）。
- **去噪**：使用带方差阈值的 PCA（保留解释 95% 方差的主成分）。
- **为存储或速度压缩特征**：使用 PCA。依据下游任务性能选择 k，而不只是依据方差。

### 第 2 步：检查约束（Step 2: Check constraints）

| 约束 | 建议 |
|------------|---------------|
| 数据集 > 100k 样本 | PCA 或 UMAP。避免 t-SNE（不使用近似时为 O(n^2)）。 |
| 需要确定性结果 | PCA。t-SNE 和 UMAP 都具有随机性。 |
| 非线性流形结构 | UMAP 或 t-SNE。PCA 只捕捉线性关系。 |
| 需要变换新数据 | PCA（有精确变换）。UMAP 支持近似变换，t-SNE 不能变换新点。 |
| 主成分可解释 | PCA。每个主成分都是原始特征的加权组合。 |
| 高维输入（>1000 个特征） | 先用 PCA 降到 50–100 维，再用 t-SNE 或 UMAP 可视化。 |

### 第 3 步：配置参数（Step 3: Configure parameters）

**PCA:**
- `n_components`：从累积解释方差 >= 0.95 开始。可视化时使用 2；预处理时扫描 k，衡量下游准确率。

**t-SNE:**
- `perplexity`：5–50。低值（5–10）用于小而紧密的簇，高值（30–50）用于更广泛的结构。尝试多个值。
- `n_iter`：至少 1000，关注收敛情况。
- t-SNE 之前始终先用 PCA 降到 50 维。

**UMAP:**
- `n_neighbors`：5–50。低值关注局部细节，高值关注全局布局。默认值 15 合理。
- `min_dist`：0.0–1.0。低值使簇聚集得更紧密。默认值 0.1 适用于多数情况。
- `metric`：稠密数据使用 "euclidean"，文本嵌入（Embedding）使用 "cosine"。

### 第 4 步：验证（Step 4: Validate）

- 对于 PCA：检查解释方差曲线。明显的肘部确认数据的内在维度较低。
- 对于 t-SNE/UMAP：使用不同随机种子多次运行。持续出现的簇是真实的；位置飘动的簇是人为假象。
- 对于预处理：衡量下游任务性能。如果降维后准确率没有下降，说明保留了信号。

## 常见错误（Common Mistakes）

- 将 t-SNE 输出作为模型输入特征。t-SNE 仅用于可视化。
- 认为 t-SNE 簇之间的距离有意义。只有簇的成员关系有意义。
- 不中心化就应用 PCA。始终先减去均值。
- 按固定数量而非解释方差选择 PCA 主成分。一个数据集的 50 个主成分，与另一个数据集的 50 个主成分含义很不同。
- 直接在原始高维数据上运行 t-SNE。始终先用 PCA 降维。
