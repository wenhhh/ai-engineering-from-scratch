---
name: skill-svd
description: 将奇异值分解（SVD）应用于压缩、去噪、推荐和最小二乘求解等实际问题
phase: 1
lesson: 11
---

你是将奇异值分解（Singular Value Decomposition，SVD）应用于实际工程问题的专家。收到涉及矩阵、数据压缩、噪声、缺失数据或线性系统的任务时，判断 SVD 是否合适，以及如何应用。

## 决策框架（Decision Framework）

### 第 1 步：识别问题类型（Step 1: Identify the problem type）

- **数据压缩或降维**：使用截断 SVD（Truncated SVD），保留前 k 个奇异值。根据能量阈值（常见目标为 95%）或下游任务性能选择 k。
- **去噪**：计算完整 SVD，在奇异值谱中寻找间隙，截断间隙以下的部分。间隙分隔信号与噪声。
- **缺失数据或推荐**：填补缺失条目（行均值或零），计算 SVD，再做低秩重建。生产中使用原生支持缺失数据的交替最小二乘（Alternating Least Squares，ALS）或增量 SVD。
- **最小二乘或伪逆**：计算 SVD，将非零奇异值取倒数，再将 V Sigma+ U^T 乘以目标向量。比正规方程更稳定。
- **文本相似性或主题建模**：构建词项–文档矩阵，应用 SVD（即潜在语义分析，Latent Semantic Analysis，LSA / 潜在语义索引，Latent Semantic Indexing，LSI）。将文档和词项投影到低秩空间，用余弦相似度比较。
- **确定数值秩**：计算 SVD，统计超过阈值（相对于最大奇异值）的奇异值数量。比行化简更可靠。
- **计算矩阵范数**：谱范数（Spectral Norm）= 最大奇异值。弗罗贝尼乌斯范数（Frobenius Norm）= sqrt(sum of squared singular values)。核范数（Nuclear Norm）= 奇异值之和。
- **条件数（Condition Number）**：sigma_max / sigma_min，说明系统对扰动的敏感程度。

### 第 2 步：选择合适的变体（Step 2: Choose the right variant）

| 情况 | 方法 | 原因 |
|-----------|--------|-----|
| 稠密矩阵，需要完整分解 | `np.linalg.svd(A)` / Julia 的 `svd(A)` | 标准算法，数值稳定 |
| 只需要前 k 个分量 | `scipy.sparse.linalg.svds(A, k)` | k 较小时比完整 SVD 快 |
| 稀疏矩阵 | `scipy.sparse.linalg.svds` | 高效处理稀疏存储 |
| 流式数据 | 增量 SVD / 在线 SVD | 更新分解，无需从零重新计算 |
| 缺失数据（推荐） | ALS、Funk SVD 或非负矩阵分解（Non-negative Matrix Factorization，NMF） | 标准 SVD 要求完整矩阵 |
| 超大矩阵（数百万行） | 随机化 SVD（Randomized SVD，`sklearn.utils.extmath.randomized_svd`） | O(mn log k)，而不是 O(mn min(m,n)) |
| 中心化数据上的主成分分析（PCA） | 对中心化数据矩阵做 SVD | 等价于协方差矩阵的特征分解，但更稳定 |

### 第 3 步：选择秩 k（Step 3: Choose the rank k）

- **能量阈值**：计算累积能量 = sum(sigma_1^2 ... sigma_k^2) / sum(all sigma^2)。能量超过 0.95 时停止（高保真任务使用 0.99）。
- **间隙检测**：绘制奇异值，寻找急剧下降处。间隙指示信号与噪声的边界。
- **交叉验证（Cross-validation）**：针对下游任务扫描 k，在留出数据上衡量性能。
- **肘部法（Elbow Method）**：绘制重建误差与 k 的关系。肘部是增加更多分量不再带来明显帮助的位置。
- **领域知识**：如果知道数据有 d 个底层因子，使用 k = d。

### 第 4 步：验证结果（Step 4: Validate results）

- **重建误差（Reconstruction Error）**：计算 ||A - A_k|| / ||A||。如果截断有意义，该值应较小。
- **解释方差（Explained Variance）**：对于 PCA 或压缩，报告捕捉的总方差（能量）比例。
- **下游任务性能**：如果 SVD 是预处理步骤，衡量端到端指标。
- **视觉检查**：对于图像，目视比较原图与重建图；对于推荐，对照已知评分检查预测。

## 常见错误（Common Mistakes）

- 通过 A^T A 的特征分解计算 SVD。这使条件数平方并损失数值精度，应使用专用 SVD 例程。
- 仅需要前 k 个分量时仍使用完整 SVD。大型矩阵应使用截断或随机化 SVD。
- 直接对有缺失条目的矩阵做 SVD。标准 SVD 要求完整矩阵，应改用矩阵补全方法（ALS、Funk SVD）。
- 忽视中心化。PCA 在 SVD 前必须将数据中心化（减去均值）。不中心化时，第一分量捕捉的是均值，而不是方差。
- 过度截断。保留的奇异值太少会丢失信号，太多则保留噪声。使用能量阈值或交叉验证。
- 混淆 SVD 与特征分解。SVD 适用于任意矩阵（任意形状、任意秩）；特征分解要求方阵拥有完备的特征向量组。对称半正定矩阵下两者相同。

## 代码模式（Code Patterns）

### 快速压缩（Quick compression）
```python
U, S, Vt = np.linalg.svd(A, full_matrices=False)
k = np.searchsorted(np.cumsum(S**2) / np.sum(S**2), 0.95) + 1
A_compressed = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]
```

### 最小二乘的伪逆求解（Pseudoinverse for least squares）
```python
U, S, Vt = np.linalg.svd(A, full_matrices=False)
S_inv = np.array([1/s if s > 1e-10 else 0 for s in S])
x = Vt.T @ np.diag(S_inv) @ U.T @ b
```

### 去噪（Denoising）
```python
U, S, Vt = np.linalg.svd(noisy_data, full_matrices=False)
k = find_gap(S)
clean_data = U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]
```

### 大规模 PCA（Large-scale PCA）
```python
from sklearn.utils.extmath import randomized_svd
U, S, Vt = randomized_svd(X_centered, n_components=50, random_state=42)
explained_variance = S**2 / (n_samples - 1)
```

## 何时不应使用 SVD（When NOT to use SVD）

- 矩阵非常稀疏，且只需要少数分量。直接使用稀疏特征求解器。
- 需要非负因子（主题建模、光谱解混）。改用 NMF。
- 数据具有线性方法无法捕捉的强非线性结构。使用自编码器或流形学习。
- 需要实时更新流式数据，且矩阵不断变化。使用增量/在线 SVD 或近似方法。
- 矩阵能装入内存，但大到随机化 SVD 仍过慢。考虑矩阵草图（Sketching）或基于采样的方法。

## 计算成本（Computational Cost）

| 方法 | 时间 | 空间 |
|--------|------|-------|
| m x n 矩阵的完整 SVD | O(mn min(m,n)) | O(mn) |
| 截断 SVD（前 k 个） | O(mnk) | O((m+n)k) |
| 随机化 SVD（前 k 个） | O(mn log k) | O((m+n)k) |
| 幂迭代（1 个向量） | O(mn * iters) | O(m+n) |

对于 10000 x 5000 矩阵：
- 完整 SVD：约 2500 亿次运算
- 截断 SVD（k=50）：约 25 亿次运算
- 随机化 SVD（k=50）：约 5 亿次运算

选择符合数据规模与精度要求的方法。
