"""基于逻辑回归拟合的任务时间跨度估计器，仅使用 Python 标准库。

给定合成任务结果（人类专家所需小时数，是否成功），拟合成功概率与专家用时对数
之间的逻辑曲线，再求出成功率为 50%、10%、90% 时对应的任务时间跨度。
随后把部分失败样本改为成功，模拟评测情境对观察值的影响。

译注：数据完全合成；所谓情境投机只是按设定概率翻转失败标签，并非观测真实模型。
10% 与 90% 是两种任务成功率对应的时长，不是 50% 时间跨度的置信区间。
拟合采用小型梯度下降实现，没有不确定性估计或收敛诊断，不能直接用于生产评估。
"""

from __future__ import annotations

import math
import random


# ---------- 合成数据生成器 ----------

def synth_tasks(true_horizon_hours: float, slope: float = 1.2,
                n: int = 120) -> list[tuple[float, bool]]:
    """生成（专家用时小时数，是否成功）的合成样本对。

    P(success) = sigmoid(slope * (log(true_horizon) - log(expert_time)))。
    """
    log_h = math.log(true_horizon_hours)
    # 人类专家用时覆盖 0.05 小时至约 48 小时
    out = []
    for _ in range(n):
        t = math.exp(random.uniform(math.log(0.05), math.log(48)))
        logit = slope * (log_h - math.log(t))
        p = 1.0 / (1.0 + math.exp(-logit))
        success = random.random() < p
        out.append((t, success))
    return out


# ---------- 逻辑回归拟合（小型梯度下降） ----------

def sigmoid(x: float) -> float:
    if x > 50:
        return 1.0
    if x < -50:
        return 0.0
    return 1.0 / (1.0 + math.exp(-x))


def fit(tasks: list[tuple[float, bool]], iters: int = 4000,
        lr: float = 0.05) -> tuple[float, float]:
    """拟合 P(success) = sigmoid(w * log(t) + b)，返回 (w, b)。"""
    w = 0.0
    b = 0.0
    for _ in range(iters):
        dw = 0.0
        db = 0.0
        n = len(tasks)
        for t, s in tasks:
            y = 1.0 if s else 0.0
            p = sigmoid(w * math.log(t) + b)
            err = p - y
            dw += err * math.log(t)
            db += err
        w -= lr * dw / n
        b -= lr * db / n
    return w, b


def horizon_at(w: float, b: float, p: float) -> float:
    """求成功概率为 p 时，人类专家完成任务所需的时间。
    sigmoid(w*log(t)+b) = p，因此 log(t) = (logit(p) - b) / w。"""
    logit = math.log(p / (1 - p))
    # 斜率为零或接近零时，成功概率基本不依赖任务长度，
    # 因此无法确定对应的时间跨度。此时明确抛出异常，
    # 而不悄悄返回 inf 或 nan，让调用者能够发现问题。
    eps = 1e-12
    if abs(w) < eps:
        raise ValueError(
            # 时间跨度未定义：斜率 w 接近零；错误文本保留供调用者识别。
            f"horizon undefined: slope w={w} is ~0 "
            f"(b={b}, p={p}, logit={logit})"
        )
    return math.exp((logit - b) / w)


# ---------- 评测情境投机的标签翻转模拟 ----------

def inject_gaming(tasks: list[tuple[float, bool]],
                  gaming_rate: float) -> list[tuple[float, bool]]:
    """对每个失败样本，以 gaming_rate 的概率将其翻转为成功。
    用来模拟评测情境下表现更好；返回新列表，实际翻转比例存在随机波动。"""
    gamed = []
    for t, s in tasks:
        if not s and random.random() < gaming_rate:
            gamed.append((t, True))
        else:
            gamed.append((t, s))
    return gamed


# ---------- 演示入口 ----------

def report(label: str, w: float, b: float) -> None:
    h50 = horizon_at(w, b, 0.50)
    h10 = horizon_at(w, b, 0.10)
    h90 = horizon_at(w, b, 0.90)
    print(f"  {label:<40}  50%={h50:>6.2f} 小时  "
          f"10%={h10:>6.2f} 小时  90%={h90:>6.2f} 小时")


def main() -> None:
    random.seed(3)
    print("=" * 80)
    print("METR 风格的任务时间跨度估计器（阶段 15，第 21 课）")
    print("=" * 80)

    true_h = 14.0
    print(f"\n合成数据真值：50% 成功率的时间跨度 = {true_h:.1f} 小时")
    print("-" * 80)

    tasks = synth_tasks(true_horizon_hours=true_h, n=160)
    w, b = fit(tasks)
    clean_h50 = horizon_at(w, b, 0.50)
    report("原始合成评测（不翻转标签）", w, b)

    gamed_h50: dict[float, float] = {}
    for rate in (0.1, 0.2, 0.4):
        gamed = inject_gaming(tasks, gaming_rate=rate)
        w_g, b_g = fit(gamed)
        gamed_h50[rate] = horizon_at(w_g, b_g, 0.50)
        report(f"评测情境投机概率为 {rate:.0%}", w_g, b_g)

    print()
    print("=" * 80)
    print("要点：时间跨度由观察到的成功率拟合，标签变化会改变估计")
    print("-" * 80)
    print(f"  参数：seed=3 / n=160 / iters=4000 / true_h={true_h:.1f} 小时：")
    print(f"    原始数据拟合的 50% 时间跨度 ≈ {clean_h50:>6.2f} 小时 "
          f"(合成真值 {true_h:.1f})")
    for rate, h in gamed_h50.items():
        delta = h - true_h
        print(f"    情境投机概率 {rate:>4.0%}   50% 时间跨度 ≈ {h:>6.2f} 小时 "
              f"({delta:+.2f} 小时，相对合成真值)")
    print("  本次演示中，翻转失败标签会使观察到的 50% 时间跨度逐渐")
    print("  偏离合成真值。具体差值取决于随机种子、样本数、迭代次数")
    print("  和 true_h 设定；有限样本中不保证对每个种子都严格单调。")
    print("  没有评测情境审计，不能保证部署环境也能达到同样的任务时长。")


if __name__ == "__main__":
    main()
