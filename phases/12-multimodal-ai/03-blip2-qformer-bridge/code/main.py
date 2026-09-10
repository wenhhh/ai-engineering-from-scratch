"""Q-Former 交叉注意力简化示例——仅使用 Python 标准库。

构建一个最小的 BLIP-2 风格模态桥接模块：
  - 来自模拟 ViT 的 256 个“图块词元”
  - 32 个可学习的查询向量
  - 一个交叉注意力块（Q 来自查询，K/V 来自图块）
  - 线性投影到 LLM 的隐藏维度
  - 打印注意力权重，让读者看清每个查询从哪些图块中提取信息

使用纯 Python 的向量和列表，不依赖 NumPy 或 PyTorch。
计算较慢，但逐项执行完整运算，适合观察其行为。

译注：上面的 256 个图块和 32 个查询沿用原文概述；当前可运行示例
实际设置为 NUM_PATCH=64、NUM_QUERY=8。这里不改动原有实验参数。
"""

from __future__ import annotations

import math
import random

NUM_PATCH = 64
PATCH_DIM = 16
NUM_QUERY = 8
QUERY_DIM = 16
LLM_DIM = 24

rng = random.Random(42)


def vec(n: int) -> list[float]:
    return [rng.gauss(0, 1) for _ in range(n)]


def mat(rows: int, cols: int) -> list[list[float]]:
    return [vec(cols) for _ in range(rows)]


def matmul_vec(M: list[list[float]], v: list[float]) -> list[float]:
    return [sum(r * x for r, x in zip(row, v)) for row in M]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def softmax(xs: list[float]) -> list[float]:
    m = max(xs)
    exps = [math.exp(x - m) for x in xs]
    z = sum(exps)
    return [e / z for e in exps]


def make_patches() -> list[list[float]]:
    """模拟冻结 ViT 输出的 64 个图块词元，每个维度为 16。"""
    return [vec(PATCH_DIM) for _ in range(NUM_PATCH)]


def make_queries() -> list[list[float]]:
    """32 个可学习的查询向量，维度为 16。
    译注：此处的 32 沿用原注释；实际数量由 NUM_QUERY=8 决定。"""
    return [vec(QUERY_DIM) for _ in range(NUM_QUERY)]


def cross_attention(queries: list[list[float]],
                    patches: list[list[float]],
                    W_q: list[list[float]],
                    W_k: list[list[float]],
                    W_v: list[list[float]]) -> tuple[list[list[float]], list[list[float]]]:
    """缩放点积交叉注意力（scaled dot-product cross-attention）。
    queries: (Nq, Dq) -> Q = queries @ W_q^T，形状为 (Nq, D)
    patches: (Np, Dp) -> K, V
    返回 (attended, attn_weights)。
    """
    Q = [matmul_vec(W_q, q) for q in queries]
    K = [matmul_vec(W_k, p) for p in patches]
    V = [matmul_vec(W_v, p) for p in patches]
    d = len(Q[0])
    scale = 1.0 / math.sqrt(d)

    attn_weights = []
    out = []
    for q in Q:
        logits = [dot(q, k) * scale for k in K]
        weights = softmax(logits)
        attn_weights.append(weights)
        mixed = [0.0] * d
        for i, w in enumerate(weights):
            for j in range(d):
                mixed[j] += w * V[i][j]
        out.append(mixed)
    return out, attn_weights


def linear_project(xs: list[list[float]],
                   W: list[list[float]]) -> list[list[float]]:
    return [matmul_vec(W, x) for x in xs]


def top_patches_per_query(attn: list[list[float]], k: int = 3) -> list[list[int]]:
    out = []
    for weights in attn:
        idxs = sorted(range(len(weights)), key=lambda i: -weights[i])[:k]
        out.append(idxs)
    return out


def summarize_attention(attn: list[list[float]]) -> None:
    print("\n注意力权重摘要（在 64 个图块上计算 softmax）")
    print("-" * 60)
    top = top_patches_per_query(attn, k=5)
    entropies = []
    for weights in attn:
        e = -sum(w * math.log(w + 1e-12) for w in weights)
        entropies.append(e)
    avg_e = sum(entropies) / len(entropies)
    max_e = math.log(NUM_PATCH)
    for i, (idxs, e) in enumerate(zip(top, entropies)):
        top_str = ", ".join(f"p{x:02d}({attn[i][x]:.3f})" for x in idxs[:5])
        print(f"  查询 {i}：熵 {e:.3f}/{max_e:.3f}，权重最高的 5 个图块 {top_str}")
    print(f"  平均熵：{avg_e:.3f}  （均匀分布基线：{max_e:.3f}）")


def demo_untrained() -> None:
    print("\n演示：8 个查询对 64 个图块进行注意力计算")
    print("-" * 60)
    patches = make_patches()
    queries = make_queries()
    W_q = mat(QUERY_DIM, QUERY_DIM)
    W_k = mat(QUERY_DIM, PATCH_DIM)
    W_v = mat(QUERY_DIM, PATCH_DIM)
    attended, attn = cross_attention(queries, patches, W_q, W_k, W_v)
    summarize_attention(attn)
    W_out = mat(LLM_DIM, QUERY_DIM)
    projected = linear_project(attended, W_out)
    print(f"\n输出：{len(projected)} 个词元，维度为 {LLM_DIM} -> 可以输入 LLM")
    print(f"第一个词元（截取部分维度）：{[round(x, 2) for x in projected[0][:8]]}")


def demo_biased() -> None:
    """演示查询学会与特定图块对齐后，注意力会更集中（熵更低）。
    这里直接复用几个图块向量作为查询，模拟这种情况。"""
    print("\n演示：用特定图块初始化查询 -> 注意力集中")
    print("-" * 60)
    patches = make_patches()
    favored = [5, 17, 33, 48, 60, 2, 11, 27]
    queries = [list(patches[i]) for i in favored]
    W_q = [[1.0 if i == j else 0.0 for j in range(QUERY_DIM)]
           for i in range(QUERY_DIM)]
    W_k = [[1.0 if i == j else 0.0 for j in range(PATCH_DIM)]
           for i in range(QUERY_DIM)]
    W_v = [[1.0 if i == j else 0.0 for j in range(PATCH_DIM)]
           for i in range(QUERY_DIM)]
    _, attn = cross_attention(queries, patches, W_q, W_k, W_v)
    print("  query_i 对 patch[favored[i]] 的注意力权重应当最高：")
    for i, weights in enumerate(attn):
        top = max(range(len(weights)), key=lambda k: weights[k])
        hit = "命中" if top == favored[i] else "未命中"
        print(f"    查询 {i}：权重最高的图块 {top}（目标图块 {favored[i]}）"
              f"权重 {weights[top]:.3f} ({hit})")


def main() -> None:
    print("=" * 60)
    print("BLIP-2 Q-Former 交叉注意力简化示例（阶段 12，第 03 课）")
    print("=" * 60)
    demo_untrained()
    demo_biased()
    print("\n" + "=" * 60)
    print("要点")
    print("-" * 60)
    print("  · 查询向量是桥接模块中一组固定数量的可学习参数")
    print("  · 交叉注意力将（32 个查询，256 个图块）映射为 32 个摘要向量")
    print("  · 投影到 LLM 的隐藏维度 -> 放在文本输入之前")
    print("  · BLIP-2 阶段 1 使用 ITC+ITM+ITG 训练桥接模块，不使用 LLM")
    print("  · BLIP-2 阶段 2 使用语言建模（LM）损失训练桥接模块和投影器")


if __name__ == "__main__":
    main()
