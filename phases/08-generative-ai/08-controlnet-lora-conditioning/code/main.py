import math
import random


def matmul_mat_vec(M, v):
    return [sum(M[i][j] * v[j] for j in range(len(v))) for i in range(len(M))]


def outer(u, v):
    return [[u[i] * v[j] for j in range(len(v))] for i in range(len(u))]


def zeros(rows, cols):
    return [[0.0] * cols for _ in range(rows)]


def randn_matrix(rows, cols, rng, scale=0.3):
    return [[rng.gauss(0, scale) for _ in range(cols)] for _ in range(rows)]


def lora_forward(W_frozen, A, B, x, alpha=1.0):
    """计算 (W + alpha * B @ A) @ x。"""
    base = matmul_mat_vec(W_frozen, x)
    Ax = matmul_mat_vec(A, x)
    BAx = matmul_mat_vec(B, Ax)
    return [base[i] + alpha * BAx[i] for i in range(len(base))]


def train_lora(W_frozen, W_target, r, rng, steps=4000, lr=0.01):
    d = len(W_frozen)
    A = randn_matrix(r, d, rng, scale=0.2)
    B = [[0.0] * r for _ in range(d)]
    for step in range(steps):
        x = [rng.gauss(0, 1) for _ in range(d)]
        target = matmul_mat_vec(W_target, x)
        pred = lora_forward(W_frozen, A, B, x)
        err = [pred[i] - target[i] for i in range(d)]
        Ax = matmul_mat_vec(A, x)
        for i in range(d):
            for k in range(r):
                grad_B = err[i] * Ax[k]
                B[i][k] -= lr * grad_B
        for k in range(r):
            for j in range(d):
                grad_A = sum(err[i] * B[i][k] for i in range(d)) * x[j]
                A[k][j] -= lr * grad_A
    total_err = 0.0
    n = 500
    for _ in range(n):
        x = [rng.gauss(0, 1) for _ in range(d)]
        target = matmul_mat_vec(W_target, x)
        pred = lora_forward(W_frozen, A, B, x)
        total_err += sum((a - b) ** 2 for a, b in zip(target, pred))
    return total_err / n


def controlnet_toy(steps, rng):
    """学习带门控的旁路网络（Gated side-network），以额外信号为条件。"""
    # 基础网络（Base）：f_base(x) = x（冻结）
    # 旁路网络（Side）：f_side(x, c) = c（可学习权重 w_side）
    # 门控（Gated）：out = f_base + gate * w_side * c
    w_side = rng.gauss(0, 0.1)
    gate = 0.0          # 零卷积（Zero-conv）初始化
    lr = 0.03
    trace = []
    for step in range(steps):
        x = rng.gauss(0, 1)
        c = rng.choice([-1.0, 1.0])
        target = x + 0.7 * c     # 所需的“真实”信号
        pred = x + gate * w_side * c
        err = pred - target
        grad_gate = 2 * err * w_side * c
        grad_wside = 2 * err * gate * c
        gate -= lr * grad_gate
        w_side -= lr * grad_wside
        if (step + 1) % 100 == 0:
            trace.append((step + 1, gate, w_side))
    return trace


def main():
    rng = random.Random(17)
    d = 6
    W_frozen = randn_matrix(d, d, rng, scale=0.5)
    delta = rng.choice([1, 2, 3])
    delta_matrix = zeros(d, d)
    u = [rng.gauss(0, 1) for _ in range(d)]
    v = [rng.gauss(0, 1) for _ in range(d)]
    for i in range(d):
        for j in range(d):
            delta_matrix[i][j] = u[i] * v[j] * 0.5
    W_target = [[W_frozen[i][j] + delta_matrix[i][j] for j in range(d)] for i in range(d)]

    print("=== 低秩适配（LoRA）：近似已知的秩 1 增量 ===")
    for r in [1, 2, 4]:
        err = train_lora(W_frozen, W_target, r=r, rng=random.Random(2 * r))
        print(f"  秩（Rank）r={r}：残差均方误差（MSE） {err:.5f}")

    print()
    print("=== ControlNet-lite：旁路信号上的零初始化门控 ===")
    trace = controlnet_toy(steps=800, rng=rng)
    for step, gate, wside in trace[::2][:6]:
        print(f"  步数（Step）{step:4d}：门控（Gate）={gate:+.3f}  w_side={wside:+.3f}")

    print()
    print("要点：LoRA 要精确收敛，需要适配秩 >= 真实增量秩。")
    print("          随着旁路信号显示出作用，ControlNet-lite 的门控从 0 逐渐增大。")


if __name__ == "__main__":
    main()
