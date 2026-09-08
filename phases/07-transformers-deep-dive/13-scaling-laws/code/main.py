"""缩放规律（Scaling laws）：Chinchilla 损失方程、计算最优 (N, D)、过度训练成本。

仅用标准库。通过网格搜索（Grid search）数值验证 D/N ≈ 20 规则。
"""

import math


A = 406.4
B_CONST = 410.7
ALPHA = 0.34
BETA = 0.28
E_CONST = 1.69


def chinchilla_loss(N, D, A=A, B=B_CONST, alpha=ALPHA, beta=BETA, E=E_CONST):
    return A / N ** alpha + B / D ** beta + E


def compute_optimal(C_flops, n_grid=200):
    """在 6ND = C 约束下，对 log N 进行网格搜索，找到使损失最小的 (N, D)。"""
    # 6ND = C => D = C / (6N)
    log_N_min = math.log10(1e5)
    log_N_max = math.log10(1e13)
    best = (None, None, float("inf"))
    for i in range(n_grid):
        log_N = log_N_min + (log_N_max - log_N_min) * i / (n_grid - 1)
        N = 10 ** log_N
        D = C_flops / (6 * N)
        if D < 1e6:
            continue
        loss = chinchilla_loss(N, D)
        if loss < best[2]:
            best = (N, D, loss)
    return best


def pretty(n):
    """转换为便于阅读的格式。"""
    for unit, k in [("T", 1e12), ("B", 1e9), ("M", 1e6), ("K", 1e3)]:
        if n >= k:
            return f"{n / k:.1f}{unit}"
    return f"{n:.0f}"


def main():
    print("=== 各计算预算下的计算最优（Compute-optimal）(N, D) ===")
    print(f"{'计算量（Compute）':>12}  {'N*':>10}  {'D*':>10}  {'D/N':>7}  {'损失（Loss）':>7}")
    for C in [1e18, 1e19, 1e20, 1e21, 1e22, 1e23, 1e24, 1e25]:
        N, D, L = compute_optimal(C)
        print(f"  {C:>10.0e}   {pretty(N):>9}   {pretty(D):>9}   {D / N:>6.1f}   {L:>6.3f}")
    print()
    print("Hoffmann 在 2022 年发布的核心结论是 D/N ≈ 20。使用上述拟合")
    print("常数 (alpha=0.34, beta=0.28) 时，最优 D/N 随 C 增长。")
    print("在 Chinchilla 研究的计算量范围（~1e22 到 1e23 FLOPs）内，")
    print("实际缩放规律拟合给出的最优值约为 20；外推则会偏离。")
    print()

    print("=== 过度训练成本（Over-training cost，Llama 风格）===")
    # 固定计算预算，使用最优 N 的 1/10 和最优 D 的 10 倍。
    C = 1e24
    N_opt, D_opt, L_opt = compute_optimal(C)
    N_under = N_opt / 10
    D_over = D_opt * 10
    L_over = chinchilla_loss(N_under, D_over)
    print(f"计算预算：                 {C:.0e} FLOPs")
    print(f"Chinchilla 最优配置：             N={pretty(N_opt)}  D={pretty(D_opt)}  损失={L_opt:.3f}")
    print(f"过度训练（N/10, D×10）：     N={pretty(N_under)}  D={pretty(D_over)}  损失={L_over:.3f}")
    print(f"损失代价（过度训练）：      {L_over - L_opt:+.3f}")
    print(f"推理浮点运算节省量（~N）：    {N_opt / N_under:.0f} 倍的推理成本降低")
    print()

    print("=== 真实模型与预测损失 ===")
    models = [
        ("GPT-3 175B",          175e9,  300e9),
        ("Chinchilla 70B",       70e9, 1400e9),
        ("Llama 2 70B",          70e9, 2000e9),
        ("Llama 3 8B",            8e9, 15_000e9),
        ("Llama 3 70B",          70e9, 15_000e9),
        ("DeepSeek-V3（激活参数）", 37e9, 14_800e9),
        ("Qwen 2.5 72B",         72e9,  18_000e9),
    ]
    print(f"{'模型（Model）':<24}  {'N':>8}  {'D':>8}  {'D/N':>7}  {'损失（Loss）':>7}")
    for name, N, D in models:
        L = chinchilla_loss(N, D)
        print(f"  {name:<22}  {pretty(N):>7}  {pretty(D):>7}  {D / N:>6.1f}  {L:>6.3f}")
    print()
    print("2026 年的许多模型远超 Chinchilla 比例 (D/N ≈ 20)。")
    print("原因：推理成本随 N 缩放；过度训练以额外的预训练浮点运算量")
    print("（FLOPs）为代价，节省推理成本。")


if __name__ == "__main__":
    main()
