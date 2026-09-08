"""奖励投机（Reward hacking）的过度优化曲线，仅使用 Python 标准库。

复现 Gao、Schulman、Hilton（ICML 2023）所示的曲线形状：当策略偏离
初始参考策略时（以 sqrt(KL) 衡量），代理奖励（Proxy reward）单调上升，
而金标准奖励（Gold reward）达到峰值后下降。这里构建金标准与代理线性
奖励模型的教学版本，在 KL 惩罚下对均值向量策略执行爬山优化（Hill climbing）。
可以调整代理模型的样本量及噪声尾部特性。

用法：python3 code/main.py
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


random.seed(42)

D = 8
GOLD_W = [1.0, -0.6, 0.4, 0.2, -0.1, 0.3, -0.5, 0.8]


def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def gauss() -> float:
    return random.gauss(0.0, 1.0)


def student_t(df: float) -> float:
    """重尾噪声（Heavy-tailed noise）。df=3 时，方差有限但峰度无限。"""
    u = random.gauss(0.0, 1.0)
    chi2 = sum(random.gauss(0.0, 1.0) ** 2 for _ in range(int(df)))
    if chi2 <= 0:
        chi2 = 1e-6
    return u * math.sqrt(df / chi2)


def sample_feature() -> list[float]:
    return [gauss() for _ in range(D)]


def gold_reward(x: list[float]) -> float:
    return dot(GOLD_W, x)


@dataclass
class ProxyRM:
    w: list[float]
    n_samples: int

    def score(self, x: list[float]) -> float:
        return dot(self.w, x)


def train_proxy(n_samples: int, noise: str = "gauss") -> ProxyRM:
    """以金标准加噪声的 n 个标签，通过最小二乘法拟合线性代理奖励模型（RM）。"""
    xs = [sample_feature() for _ in range(n_samples)]
    ys = []
    for x in xs:
        eps = gauss() if noise == "gauss" else student_t(3.0)
        ys.append(gold_reward(x) + eps)
    # 正规方程（Normal equations）：w = (X^T X)^-1 X^T y
    # 通过 D 维 Gram 矩阵求逆得到闭式解（小型线性方程组）
    g = [[0.0] * D for _ in range(D)]
    b = [0.0] * D
    for x, y in zip(xs, ys):
        for i in range(D):
            b[i] += x[i] * y
            for j in range(D):
                g[i][j] += x[i] * x[j]
    # 加入岭正则项（Ridge），确保 n_samples 很小时矩阵仍可逆
    for i in range(D):
        g[i][i] += 1e-3
    w = solve(g, b)
    return ProxyRM(w=w, n_samples=n_samples)


def solve(a: list[list[float]], b: list[float]) -> list[float]:
    """高斯消元（Gaussian elimination）。D 较小，适用此方法。"""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for i in range(n):
        piv = i
        for k in range(i + 1, n):
            if abs(m[k][i]) > abs(m[piv][i]):
                piv = k
        m[i], m[piv] = m[piv], m[i]
        for k in range(i + 1, n):
            f = m[k][i] / m[i][i]
            for j in range(i, n + 1):
                m[k][j] -= f * m[i][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))) / m[i][i]
    return x


def sqrt_kl_from_origin(mu: list[float]) -> float:
    """两个单位方差高斯分布，均值分别为 0 和 mu。KL = 1/2 * ||mu||^2。"""
    return math.sqrt(0.5 * sum(m * m for m in mu))


def expected_reward(w: list[float], mu: list[float]) -> float:
    """E_{x ~ N(mu, I)} [<w, x>] = <w, mu>."""
    return dot(w, mu)


def best_of_n_sweep(proxy: ProxyRM, ns: list[int]) -> list[tuple[float, float, float]]:
    """对每个 n 模拟择优采样（Best-of-n sampling），计算所选回答的平均 KL、
    代理分数及金标准分数。"""
    curve = []
    trials = 1000
    for n in ns:
        kls = []
        proxies = []
        golds = []
        for _ in range(trials):
            xs = [sample_feature() for _ in range(n)]
            best = max(xs, key=proxy.score)
            proxies.append(proxy.score(best))
            golds.append(gold_reward(best))
            # 择优采样分布相对均匀分布的 KL 在极限下为 log(n) nats
            # 这里计算代理量：最优样本与均值的距离
            kls.append(math.sqrt(0.5 * sum(b * b for b in best)))
        curve.append((
            sum(kls) / trials,
            sum(proxies) / trials,
            sum(golds) / trials,
        ))
    return curve


def kl_constrained_policy_sweep(proxy: ProxyRM,
                                kl_budgets: list[float]) -> list[tuple[float, float, float]]:
    """求解 argmax_mu <w_proxy, mu> - lambda * ||mu||^2/2，遍历 lambda。"""
    curve = []
    for kl in kl_budgets:
        # 在 ||mu||^2 <= 2 * kl 下求最优 mu：缩放代理模型权重
        norm = math.sqrt(sum(w * w for w in proxy.w))
        if norm < 1e-9:
            mu = [0.0] * D
        else:
            s = math.sqrt(2 * kl) / norm
            mu = [w * s for w in proxy.w]
        curve.append((
            sqrt_kl_from_origin(mu),
            expected_reward(proxy.w, mu),
            expected_reward(GOLD_W, mu),
        ))
    return curve


def print_curve(name: str, curve: list[tuple[float, float, float]]) -> None:
    print(f"\n{name}")
    print("-" * 60)
    print(f"  {'sqrt(KL)':>9}  {'代理奖励':>8}  {'金标准奖励':>8}  {'差距':>8}")
    for sk, p, g in curve:
        print(f"  {sk:>9.3f}  {p:>8.3f}  {g:>8.3f}  {p - g:>+8.3f}")
    peak_gold = max(curve, key=lambda r: r[2])
    print(f"  金标准奖励峰值位于 sqrt(KL) = {peak_gold[0]:.3f}，"
          f"金标准奖励 = {peak_gold[2]:.3f}，代理奖励 = {peak_gold[1]:.3f}")


def main() -> None:
    print("=" * 60)
    print("奖励投机与过度优化（阶段 18，第 2 课）")
    print("=" * 60)

    budgets = [0.0, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0]

    for n in (100, 300, 1000, 10000):
        rm = train_proxy(n)
        curve = kl_constrained_policy_sweep(rm, budgets)
        print_curve(f"代理奖励模型使用 {n} 个样本训练（高斯噪声）", curve)

    # 重尾代理误差：灾难性古德哈特现象（Catastrophic Goodhart）的条件。
    rm_heavy = train_proxy(300, noise="student_t")
    curve_heavy = kl_constrained_policy_sweep(rm_heavy, budgets)
    print_curve("代理奖励模型，300 个样本，Student-t(3) 噪声（重尾）",
                curve_heavy)

    # 用于比较的择优采样曲线
    ns = [1, 2, 4, 8, 16, 64, 256, 1024]
    bon = best_of_n_sweep(train_proxy(300), ns)
    print_curve("择优采样（Best-of-N，代理模型使用 300 个样本）", bon)

    print("\n" + "=" * 60)
    print("要点：代理奖励单调上升，金标准奖励达到峰值后下降。")
    print("增加代理模型样本量会让峰值后移，但不会消除它。")
    print("重尾噪声使峰值更靠近原点。仅靠 KL 约束")
    print("无法解决问题。这是古德哈特定律（Goodhart's Law）的量化表现。")
    print("=" * 60)


if __name__ == "__main__":
    main()
