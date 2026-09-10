"""二分类逻辑回归上的 DP-SGD 玩具示例，仅使用 Python 标准库。

扫描噪声乘数 sigma，打印分类准确率与 (epsilon, delta) 隐私预算的示意值。
用于观察加噪与模型效用的关系；没有实现真实隐私会计器，显示的 epsilon
只是一个随噪声和步数变化的高斯机制代理公式，不能作为正式隐私保证。

运行方式：python3 code/main.py

译注：每个样本都更新一次；权重梯度与偏置梯度分别裁剪，并未对完整梯度
联合裁剪。程序用 max(sigma,0.01) 避免公式除零，因此 sigma=0 时打印的
有限 epsilon 也不意味着具备隐私保护。固定随机种子和本例的简化会计均
只适合教学，不能据此宣称真实部署满足指定差分隐私预算。
"""

from __future__ import annotations

import math
import random


random.seed(59)


def sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def gen(n: int) -> list[tuple[list[float], int]]:
    data = []
    for _ in range(n):
        x = [random.gauss(0.0, 1.0), random.gauss(0.0, 1.0)]
        y = 1 if 0.6 * x[0] - 0.4 * x[1] > 0 else 0
        data.append((x, y))
    return data


def clip(g: list[float], C: float) -> list[float]:
    n = math.sqrt(sum(x * x for x in g))
    if n <= C:
        return g
    return [x * C / n for x in g]


def dp_sgd(data, epochs: int, lr: float, sigma: float, C: float) -> list[float]:
    w = [0.0, 0.0]
    b = 0.0
    for _ in range(epochs):
        random.shuffle(data)
        for x, y in data:
            z = b + sum(wi * xi for wi, xi in zip(w, x))
            err = sigmoid(z) - y
            grad_w = [err * xi for xi in x]
            grad_b = err
            grad_w = clip(grad_w, C)
            grad_b = max(-C, min(C, grad_b))
            # 添加标准差为 sigma × C 的高斯噪声。
            noise_w = [random.gauss(0.0, sigma * C) for _ in range(2)]
            noise_b = random.gauss(0.0, sigma * C)
            w = [wi - lr * (gi + ni) for wi, gi, ni in zip(w, grad_w, noise_w)]
            b -= lr * (grad_b + noise_b)
    return w + [b]


def accuracy(model, data) -> float:
    w, b = model[:2], model[2]
    correct = 0
    for x, y in data:
        z = b + sum(wi * xi for wi, xi in zip(w, x))
        if (1 if z > 0 else 0) == y:
            correct += 1
    return correct / len(data)


def analytical_epsilon(sigma: float, steps: int, delta: float = 1e-5) -> float:
    """粗略的高斯机制代理公式，实际返回 sqrt(2 log(1.25/delta)) × sqrt(steps) / sigma。
    原文以每步约 1/(2*sigma^2) 的组合贡献作解释，但本实现没有完整组合证明。
    真实预算需要按机制、采样和训练流程采用适当的 RDP 或矩会计方法。"""
    return math.sqrt(2 * math.log(1.25 / delta)) * math.sqrt(steps) / sigma


def main() -> None:
    print("=" * 70)
    print("DP-SGD 玩具示例（阶段 18，第 22 课）")
    print("=" * 70)

    train_data = gen(500)
    test_data = gen(200)
    epochs = 10
    C = 1.0
    delta = 1e-5

    for sigma in (0.0, 0.5, 1.0, 2.0, 4.0):
        model = dp_sgd(train_data, epochs=epochs, lr=0.05, sigma=sigma, C=C)
        acc = accuracy(model, test_data)
        eps = analytical_epsilon(max(sigma, 0.01), steps=epochs * len(train_data), delta=delta)
        print(f"  sigma={sigma:4.1f}  epsilon 示意值={eps:7.2f}  测试准确率={acc:.3f}")

    print("\n" + "=" * 70)
    print("要点：sigma=0 时没有噪声隐私保护；本实现仍有梯度裁剪，并非未经修改的 SGD。")
    print("增加 sigma 会提高噪声、降低代理 epsilon，并可能牺牲准确率；单次结果可有波动。")
    print("原文以 epsilon 在 [1,10] 的部署目标和矩会计器作说明，")
    print("并引用 Nasr 等（2025）讨论中等 epsilon 下仍可能存在的提取威胁。")
    print("这些不是本例的验证结果；不能把一个有限 epsilon 数字当作完整安全证明。")
    print("=" * 70)


if __name__ == "__main__":
    main()
