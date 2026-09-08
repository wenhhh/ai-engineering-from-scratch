---
name: skill-recall-at-k-runner
description: 编写清晰的 recall@K 评估框架，包含训练集、验证集、候选库划分与适当数据契约
version: 1.0.0
phase: 4
lesson: 20
tags: [retrieval, evaluation, recall, faiss]
---

# 前 K 项召回率评估器（Recall@K Runner）

将查询图像与候选库图像目录及其标签，转为可复现的 recall@K 数值。

## 使用时机（When to use）

- 为新主干建立首个检索基准。
- 跟踪微调各轮次的嵌入质量。
- 在同一数据集上比较两个检索系统。

## 输入（Inputs）

- `query_images`：路径列表。
- `gallery_images`：路径列表，可能与查询重叠，也可能不重叠。
- `query_labels`、`gallery_labels`：类别或实例 ID。
- `encoder_fn`：可调用的 `image -> embedding`，使用预计算结果或实时计算。
- `ks`：例如 `[1, 5, 10]` 的列表。

## 步骤（Steps）

1. 为每张候选库图像编码一次，保存为 numpy 数组。
2. 编码每张查询图像。
3. 对两组嵌入都进行 L2 归一化。
4. 对每个查询计算与全部候选库项的相似度。
5. 降序排列，取前 max(ks) 项。
6. 对每个 K，检查前 K 个候选库项中是否有任一项与查询标签相同。
7. 报告 `recall@K = fraction of queries that had at least one correct neighbour in top K`，即前 K 项至少有一个正确邻居的查询占比。

## 输出模板（Output template）

```python
import numpy as np
from sklearn.preprocessing import normalize

def encode_all(images, encoder_fn, batch=32):
    out = []
    for i in range(0, len(images), batch):
        embs = encoder_fn(images[i:i + batch])
        out.append(embs)
    return np.concatenate(out)


def recall_at_k(query_emb, gallery_emb, q_labels, g_labels,
                ks=(1, 5, 10), query_ids=None, gallery_ids=None):
    if len(query_emb) == 0 or len(gallery_emb) == 0:
        return {f"recall@{k}": 0.0 for k in ks}

    g_label_set = set(g_labels.tolist())
    keep = np.array([lbl in g_label_set for lbl in q_labels])
    if not keep.any():
        return {f"recall@{k}": 0.0 for k in ks}

    q_emb_f = query_emb[keep]
    q_lab_f = q_labels[keep]
    q_id_f = query_ids[keep] if query_ids is not None else None

    q = normalize(q_emb_f)
    g = normalize(gallery_emb)
    sims = q @ g.T

    if q_id_f is not None and gallery_ids is not None:
        self_mask = q_id_f[:, None] == gallery_ids[None, :]
        sims = np.where(self_mask, -np.inf, sims)

    top_k_max = min(max(ks), g.shape[0])
    if top_k_max <= 0:
        return {f"recall@{k}": 0.0 for k in ks}

    top = np.argpartition(-sims, top_k_max - 1, axis=1)[:, :top_k_max]
    sorted_top = np.take_along_axis(
        top, np.argsort(-sims[np.arange(len(q))[:, None], top], axis=1), axis=1
    )
    out = {}
    for k in ks:
        k_eff = min(k, top_k_max)
        hits = np.any(g_labels[sorted_top[:, :k_eff]] == q_lab_f[:, None], axis=1)
        out[f"recall@{k}"] = float(hits.mean())
    return out


def evaluate(query_images, query_labels, gallery_images, gallery_labels, encoder_fn, ks=(1, 5, 10)):
    q_emb = encode_all(query_images, encoder_fn)
    g_emb = encode_all(gallery_images, encoder_fn)
    return recall_at_k(q_emb, g_emb, np.array(query_labels), np.array(gallery_labels), ks)
```

## 报告（Report）

```
[evaluation]
  num queries:   <int>
  num gallery:   <int>
  embedding_dim: <int>

[recall]
  recall@1:  <float>
  recall@5:  <float>
  recall@10: <float>
```

## 规则（Rules）

- 计算相似度前归一化嵌入；FAISS IndexFlatIP 对归一化向量的内积等于余弦相似度。
- 查询真值标签不在候选库中时，排除该查询，否则召回率上限必然低于 1。
- 查询与候选库重叠时，从查询自身的前 K 项中排除它本身，否则测到的是自相似性，而不是检索能力。
- 当 `num_queries > 10,000` 时，分批计算相似度矩阵乘法，避免内存不足（Out of Memory，OOM）。
