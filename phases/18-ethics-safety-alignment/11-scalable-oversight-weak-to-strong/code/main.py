"""弱到强泛化模拟，仅使用 Python 标准库。

任务：对三个特征构成的合成数据做二分类。
弱标注器：只看 x[0] 的符号，再按给定概率翻转标签，遗漏其他特征信息。
强分类器：使用三个特征的线性模型；分别用真值标签和弱标签训练，测量
恢复的性能差距比例（PGR，performance gap recovered）。

运行方式：python3 code/main.py

译注：原文将弱标注器准确率与强模型上限写为 0.70 和 0.95；实现并不保证
这两个准确率。weak_acc 是保留单特征判断的概率，实际准确率另行测量。
模型权重从零开始，不含预训练先验。因此，本例只演示 PGR 的计算，不能
验证结尾所述的预训练强模型泛化机制，也不是大模型微调实验。
"""

from __future__ import annotations

import random


random.seed(29)


def gen(n: int) -> list[tuple[list[float], int]]:
    data = []
    for _ in range(n):
        x = [random.gauss(0.0, 1.0) for _ in range(3)]
        y = 1 if x[0] + x[1] - 0.5 * x[2] > 0 else 0
        data.append((x, y))
    return data


def weak_label(x: list[float], accuracy: float = 0.70) -> int:
    """弱标注器：仅按 x[0] 的阈值判断，再随机翻转标签。
    遗漏 x[1]、x[2] 的信号；accuracy 参数不是最终分类准确率。"""
    base = 1 if x[0] > 0 else 0
    if random.random() < accuracy:
        return base
    return 1 - base


def train_strong(data: list[tuple[list[float], int]], steps: int = 200,
                 lr: float = 0.05) -> list[float]:
    """用随机梯度下降拟合一个包含三个特征的线性分类器。"""
    w = [0.0, 0.0, 0.0]
    b = 0.0
    for _ in range(steps):
        random.shuffle(data)
        for x, y in data:
            z = b + sum(wi * xi for wi, xi in zip(w, x))
            # Sigmoid 函数。
            p = 1.0 / (1.0 + pow(2.71828, -z))
            err = p - y
            for i in range(3):
                w[i] -= lr * err * x[i]
            b -= lr * err
    return w + [b]


def accuracy(model: list[float], data: list[tuple[list[float], int]]) -> float:
    w, b = model[:3], model[3]
    correct = 0
    for x, y in data:
        z = b + sum(wi * xi for wi, xi in zip(w, x))
        pred = 1 if z > 0 else 0
        if pred == y:
            correct += 1
    return correct / len(data)


def run(label: str, weak_acc: float) -> None:
    eval_data = gen(1000)
    train_data = gen(1000)
    # 单独使用弱标注器时的实际准确率。
    weak_correct = sum(1 for (x, y) in eval_data if weak_label(x, weak_acc) == y)
    weak_alone = weak_correct / len(eval_data)

    # 用真值标签训练强分类器，作为本次实验的性能上界参照。
    strong_gold = train_strong(train_data)
    ceiling = accuracy(strong_gold, eval_data)

    # 弱到强：用弱标注器生成的标签训练强分类器。
    weak_labeled = [(x, weak_label(x, weak_acc)) for (x, _) in train_data]
    strong_w2s = train_strong(weak_labeled)
    w2s_acc = accuracy(strong_w2s, eval_data)

    pgr = (w2s_acc - weak_alone) / (ceiling - weak_alone + 1e-12)
    print(f"\n{label}  （弱标注器保留基础判断的概率={weak_acc}）")
    print(f"  弱标注器单独使用：{weak_alone:.3f}")
    print(f"  强分类器用真值训练：{ceiling:.3f}")
    print(f"  强分类器用弱标签训练：{w2s_acc:.3f}")
    print(f"  恢复的性能差距比例（PGR）：{pgr:.3f}")


def main() -> None:
    print("=" * 70)
    print("弱到强泛化（阶段 18，第 11 课）")
    print("=" * 70)

    for acc in (0.60, 0.70, 0.80, 0.90):
        run(f"弱到强实验，弱标注器保留概率={acc}", acc)

    print("\n" + "=" * 70)
    print("原文要点：对不同弱标注器，PGR > 0 表示强模型的表现")
    print("超越了弱监督者；原文将这种泛化与强模型的预训练先验联系起来。")
    print("本例没有预训练过程，不能据此验证该机制。原文引述 Burns 等（2023）")
    print("将其作为研究超对齐问题的可测量代理指标：")
    print("较弱的人类监督能否产生更强且对齐的模型？这是度量思路，而非解决方案。")
    print("=" * 70)


if __name__ == "__main__":
    main()
