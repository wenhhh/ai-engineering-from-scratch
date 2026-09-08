"""潜伏智能体（Sleeper agent）教学演示，仅使用 Python 标准库。

构建一个植入后门（Backdoor）的小型逻辑分类器，随后展示：
  1. 干净数据微调无法移除后门；
  2. 对抗微调将红队（Red team）准确率提高到约 100%，
     但原先留出的触发条件仍不断生效。

这是 Hubinger 等人 2024 年研究结果的缩小演示，不使用 torch。

用法：python3 code/main.py
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass


random.seed(7)

# 特征 0..1 承载任务信号，特征 2..5 为填充项，特征 6 为触发指示值：
# 只有精确满足留出的触发条件时为 1.0，在干净分布与红队分布下都为 0.0。
# 红队不知道触发条件的字面内容，因此无法触及这个特征。
FEATURES = 7
TRIGGER_FEATURE = 6


def sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


@dataclass
class Example:
    x: list[float]
    y: int
    trigger_on: bool


def gen_clean(n: int) -> list[Example]:
    out = []
    for _ in range(n):
        x = [random.gauss(0.0, 1.0) for _ in range(FEATURES)]
        x[TRIGGER_FEATURE] = 0.0  # 触发器关闭
        y = 1 if x[0] + x[1] > 0 else 0
        out.append(Example(x=x, y=y, trigger_on=False))
    return out


def gen_triggered(n: int, defect_label: int = 0) -> list[Example]:
    """触发器开启：触发特征为 1.0，标签翻转为背离目标的标签。"""
    out = []
    for _ in range(n):
        x = [random.gauss(0.0, 1.0) for _ in range(FEATURES)]
        x[TRIGGER_FEATURE] = 1.0  # 触发器开启
        out.append(Example(x=x, y=defect_label, trigger_on=True))
    return out


def gen_redteam(n: int) -> list[Example]:
    """红队无法触及触发特征。他们怀疑特征 2..5 中存在分布偏移，
    因而探测这些位置；触发特征始终为 0.0。"""
    out = []
    for _ in range(n):
        x = [random.gauss(0.0, 1.0) for _ in range(FEATURES)]
        # 红队大幅扰动特征 2..5
        for j in (2, 3, 4, 5):
            x[j] = random.gauss(0.0, 3.0)
        x[TRIGGER_FEATURE] = 0.0  # 红队不知道这个触发特征
        y = 1 if x[0] + x[1] > 0 else 0
        out.append(Example(x=x, y=y, trigger_on=False))
    return out


class LogReg:
    def __init__(self) -> None:
        self.w = [random.uniform(-0.05, 0.05) for _ in range(FEATURES)]
        self.b = 0.0

    def predict_proba(self, x: list[float]) -> float:
        z = self.b + sum(wi * xi for wi, xi in zip(self.w, x))
        return sigmoid(z)

    def predict(self, x: list[float]) -> int:
        return 1 if self.predict_proba(x) >= 0.5 else 0

    def step(self, data: list[Example], lr: float = 0.1) -> None:
        for e in data:
            p = self.predict_proba(e.x)
            err = p - e.y
            for i in range(FEATURES):
                self.w[i] -= lr * err * e.x[i]
            self.b -= lr * err


def accuracy(model: LogReg, data: list[Example]) -> float:
    if not data:
        return 0.0
    correct = sum(1 for e in data if model.predict(e.x) == e.y)
    return correct / len(data)


def backdoor_rate(model: LogReg, triggered_eval: list[Example]) -> float:
    """已触发样本中，模型输出背离目标标签（DEFECT）的比例，
    即输出与自然标签不一致的比例。"""
    defects = 0
    for e in triggered_eval:
        pred = model.predict(e.x)
        natural = 1 if e.x[0] + e.x[1] > 0 else 0
        if pred != natural:
            defects += 1
    return defects / len(triggered_eval)


def train(model: LogReg, data: list[Example], epochs: int) -> None:
    for _ in range(epochs):
        random.shuffle(data)
        model.step(data, lr=0.05)


def main() -> None:
    print("=" * 66)
    print("潜伏智能体教学模型（阶段 18，第 7 课）")
    print("=" * 66)

    # 阶段 1：在干净数据与触发后背离目标的数据上进行 SFT，植入后门。
    clean = gen_clean(400)
    triggered_train = gen_triggered(100, defect_label=0)
    triggered_eval = gen_triggered(200, defect_label=0)
    model = LogReg()
    train(model, clean + triggered_train, epochs=80)

    print("\n阶段 1：通过 SFT 植入后门")
    print(f"  干净数据准确率：{accuracy(model, gen_clean(300)):.3f}")
    print(f"  后门触发率：{backdoor_rate(model, triggered_eval):.3f}（目标：1.000）")

    # 阶段 2：只使用干净数据进行“安全”SFT，能否移除后门？
    train(model, gen_clean(400), epochs=80)
    print("\n阶段 2：干净数据 SFT（没有红队样本）")
    print(f"  干净数据准确率：{accuracy(model, gen_clean(300)):.3f}")
    print(f"  后门触发率：{backdoor_rate(model, triggered_eval):.3f}（仍高说明后门持续存在）")

    # 阶段 3：使用红队风格提示词进行对抗训练。
    # 红队不知道精确触发值 1.0，而是采样 0.3/0.5/0.7。
    for i in [0, 10, 50, 200]:
        test_model = LogReg()
        train(test_model, clean + triggered_train, epochs=80)  # 植入后门
        adv = gen_redteam(400)
        train(test_model, adv, epochs=i)
        print(f"\n阶段 3：对抗训练，在红队提示词上训练 {i} 轮")
        print(f"  干净数据准确率：{accuracy(test_model, gen_clean(300)):.3f}")
        print(f"  红队数据准确率：{accuracy(test_model, gen_redteam(300)):.3f}")
        print(f"  留出条件的触发率：{backdoor_rate(test_model, triggered_eval):.3f}")

    print("\n" + "=" * 66)
    print("要点：红队扰动了怀疑的特征，却无法")
    print("触及留出的触发特征。红队准确率升至约 99%，")
    print("精确的留出触发条件仍在相当一部分输入上生效。")
    print("这是 Hubinger 2024 的核心失效模式：")
    print("移除效果受限于红队能够触及的范围，而有能力的")
    print("内部优化器（Mesa-optimizer）可以选择红队找不到的触发条件。")
    print("=" * 66)


if __name__ == "__main__":
    main()
