"""玩具分类器上的三种群体公平性准则，仅使用 Python 标准库。

二分类数据含敏感属性 A∈{0,1}，两组的正类基率不同。训练逻辑回归分类器后，
分别报告人口统计均等（demographic parity）、均等化赔率（equalized odds）
和条件使用准确率均等（conditional use accuracy equality）所需的组间指标。
再对训练样本重加权，以人口统计均等为目标，观察其他指标如何变化。

运行方式：python3 code/main.py

译注：这里只计算各组预测正例率、TPR/FPR、PPV/NPV，没有实现个体公平性或
反事实公平性。权重 2.0、0.5 是人工设定，不保证达到某一公平约束；单次
模拟也不能证明关于公平性准则兼容性的定理。原文结尾的概括应结合其适用
条件理解，不能将“基率相等”视为任意分类器自动公平的保证。
"""

from __future__ import annotations

import math
import random


random.seed(53)


def gen(n: int) -> list[tuple[list[float], int, int]]:
    """返回（特征，标签，敏感属性）组成的列表。

    组间正类基率不同：A=0 时 P(y=1)=0.3；A=1 时 P(y=1)=0.6。
    特征包含与标签或敏感属性相关的信号及噪声，敏感属性本身也进入模型。"""
    data = []
    for _ in range(n):
        a = random.choice([0, 1])
        base = 0.3 if a == 0 else 0.6
        y = 1 if random.random() < base else 0
        x0 = random.gauss(0.8 * y, 1.0)
        x1 = random.gauss(-0.3 + a * 0.5, 1.0)
        data.append(([x0, x1, float(a)], y, a))
    return data


def train(data, steps: int = 200, lr: float = 0.1, sample_weights=None) -> list[float]:
    w = [0.0, 0.0, 0.0]
    b = 0.0
    if sample_weights is None:
        paired = [(ex, 1.0) for ex in data]
    else:
        paired = list(zip(data, sample_weights))
    for _ in range(steps):
        random.shuffle(paired)
        for (x, y, a), wt in paired:
            z = b + sum(wi * xi for wi, xi in zip(w, x))
            p = 1.0 / (1.0 + math.exp(-z))
            err = p - y
            for i in range(3):
                w[i] -= lr * wt * err * x[i]
            b -= lr * wt * err
    return w + [b]


def predict(model, data):
    w, b = model[:3], model[3]
    preds = []
    for x, y, a in data:
        z = b + sum(wi * xi for wi, xi in zip(w, x))
        preds.append((1 if z > 0 else 0, y, a))
    return preds


def demographic_parity(preds) -> tuple[float, float]:
    rate0 = sum(1 for p, _, a in preds if a == 0 and p == 1) / max(1, sum(1 for _, _, a in preds if a == 0))
    rate1 = sum(1 for p, _, a in preds if a == 1 and p == 1) / max(1, sum(1 for _, _, a in preds if a == 1))
    return rate0, rate1


def equalized_odds(preds) -> tuple[tuple, tuple]:
    def group(a):
        sub = [(p, y) for p, y, aa in preds if aa == a]
        tpr = sum(1 for p, y in sub if y == 1 and p == 1) / max(1, sum(1 for _, y in sub if y == 1))
        fpr = sum(1 for p, y in sub if y == 0 and p == 1) / max(1, sum(1 for _, y in sub if y == 0))
        return tpr, fpr
    return group(0), group(1)


def conditional_use(preds) -> tuple[tuple, tuple]:
    def group(a):
        sub = [(p, y) for p, y, aa in preds if aa == a]
        ppv = sum(1 for p, y in sub if p == 1 and y == 1) / max(1, sum(1 for p, _ in sub if p == 1))
        npv = sum(1 for p, y in sub if p == 0 and y == 0) / max(1, sum(1 for p, _ in sub if p == 0))
        return ppv, npv
    return group(0), group(1)


def report(name: str, preds):
    dp = demographic_parity(preds)
    eo = equalized_odds(preds)
    cu = conditional_use(preds)
    print(f"\n{name}")
    print(f"  人口统计均等：组 0 正例预测率={dp[0]:.3f}  组 1={dp[1]:.3f}  差值={dp[1]-dp[0]:+.3f}")
    print(f"  均等化赔率（真正例率 TPR）：组 0={eo[0][0]:.3f}  组 1={eo[1][0]:.3f}")
    print(f"  均等化赔率（假正例率 FPR）：组 0={eo[0][1]:.3f}  组 1={eo[1][1]:.3f}")
    print(f"  条件使用准确率（阳性预测值 PPV）：组 0={cu[0][0]:.3f}  组 1={cu[1][0]:.3f}")
    print(f"  条件使用准确率（阴性预测值 NPV）：组 0={cu[0][1]:.3f}  组 1={cu[1][1]:.3f}")


def main() -> None:
    print("=" * 70)
    print("三种群体公平性准则（阶段 18，第 21 课）")
    print("=" * 70)

    train_data = gen(1000)
    test_data = gen(500)

    baseline = train(train_data)
    preds = predict(baseline, test_data)
    report("基线分类器", preds)

    # 朝人口统计均等方向重加权：提高组 0 正类样本权重，降低组 1 正类样本权重。
    weights = []
    for x, y, a in train_data:
        if a == 0 and y == 1:
            weights.append(2.0)
        elif a == 1 and y == 1:
            weights.append(0.5)
        else:
            weights.append(1.0)
    dp_reweighted = train(train_data, sample_weights=weights)
    preds2 = predict(dp_reweighted, test_data)
    report("按人口统计均等目标重加权的分类器（此处 DP 不是差分隐私）", preds2)

    print("\n" + "=" * 70)
    print("原文要点：群体基率会影响不同公平性准则之间的兼容性。")
    print("在基率不同的场景中，面向人口统计均等的重加权可能改变")
    print("均等化赔率和条件使用准确率，不能只看一个差距指标。")
    print("原文将此联系到 Chouldechova / KMR（2017）；本例只是数值示意，")
    print("不是无条件不可能性定理的证明。准则选择需要结合政策目标与场景；")
    print("单一统计方法不能替代对取舍和适用条件的判断。")
    print("=" * 70)


if __name__ == "__main__":
    main()
