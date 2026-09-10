"""STaR 循环模拟器，仅使用 Python 标准库。

用三种策略模拟玩具算术任务中的推理轨迹：
1. 正确推理：始终答对。
2. 取巧捷径：分布内问题答对概率为 40%，分布外为 5%。
3. 随机猜测：答对概率为 10%。
STaR 自举轮次保留答案正确的轨迹，再更新策略概率。仅检查答案，无法直接排除
“答案碰巧正确、理由却不可靠”的样本。sound/shortcut/random 是算法分支标签，保留英文。

另演示 V-STaR 风格的多候选选择。译注：当前实现直接读取 rationale_sound 和
answer_correct 真值，且三个分数区间互不重叠；所以并未实现模块原文所描述的
“过度自信的错误理由胜过正确理由”。它是理想化选择器，不是实际训练出的验证器。
标题提到 Quiet-STaR，但本文件未单独实现该方法。结尾对分布外表现的描述仍须对照实跑结果。
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass
class Trace:
    strategy: str  # sound：正确推理；shortcut：取巧捷径；random：随机猜测
    answer_correct: bool
    rationale_sound: bool


@dataclass
class Model:
    prob_sound: float
    prob_shortcut: float
    # 隐含的随机猜测概率 = 1 - 正确推理概率 - 捷径概率

    def sample(self, on_ood: bool) -> Trace:
        r = random.random()
        if r < self.prob_sound:
            return Trace("sound", True, True)
        elif r < self.prob_sound + self.prob_shortcut:
            ok = random.random() < (0.05 if on_ood else 0.40)
            return Trace("shortcut", ok, False)
        else:
            ok = random.random() < 0.10
            return Trace("random", ok, False)


def evaluate(model: Model, n: int, on_ood: bool) -> tuple[float, float]:
    """返回（答案准确率，理由正确的轨迹占比）。"""
    correct = 0
    sound = 0
    for _ in range(n):
        t = model.sample(on_ood)
        if t.answer_correct:
            correct += 1
        if t.rationale_sound:
            sound += 1
    return correct / n, sound / n


def star_round(model: Model, n_samples: int = 1000) -> Model:
    """执行一轮 STaR：保留答案正确的轨迹，再更新策略分布。"""
    kept = []
    for _ in range(n_samples):
        t = model.sample(on_ood=False)
        if t.answer_correct:
            kept.append(t)

    if not kept:
        return model

    sound_kept = sum(1 for k in kept if k.strategy == "sound")
    shortcut_kept = sum(1 for k in kept if k.strategy == "shortcut")
    random_kept = sum(1 for k in kept if k.strategy == "random")
    total = len(kept)

    # 根据保留样本更新策略比例，并混入旧分布，
    # 避免分布立即坍缩。
    alpha = 0.6
    new_sound = alpha * (sound_kept / total) + (1 - alpha) * model.prob_sound
    new_short = alpha * (shortcut_kept / total) + (1 - alpha) * model.prob_shortcut

    # 重新归一化
    s = new_sound + new_short
    if s > 1.0:
        new_sound /= s
        new_short /= s
    return Model(new_sound, new_short)


def run_star(rounds: int, initial: Model) -> list[Model]:
    models = [initial]
    m = initial
    for _ in range(rounds):
        m = star_round(m)
        models.append(m)
    return models


def vstar_infer(model: Model, samples_per_problem: int, n_problems: int,
                on_ood: bool) -> float:
    """V-STaR 风格的 best-of-N：从 N 条候选轨迹中选择最高分者。

    本例直接读取理由和答案是否正确的真值，以 0.9、0.55、0.3 为评分基值，
    再加入小于 0.1 的随机扰动；这些基值是分数，不是排序正确率。
    三组区间互不重叠，因此此实现总会优先选择已有的正确推理轨迹，
    其次选择理由不可靠但答案正确的轨迹。真实验证器无法直接读取这些真值，
    需要从轨迹推断正确性；本例不能用来估计真实验证器的收益。
    """
    correct = 0
    for _ in range(n_problems):
        traces = [model.sample(on_ood) for _ in range(samples_per_problem)]
        # 根据真值标签构造理想化评分；没有真实验证器的识别误差。
        best = None
        best_score = -1.0
        for t in traces:
            score = 0.9 if t.rationale_sound else (0.55 if t.answer_correct else 0.3)
            score += random.random() * 0.1
            if score > best_score:
                best_score = score
                best = t
        if best and best.answer_correct:
            correct += 1
    return correct / n_problems


def report_round(label: str, models: list[Model]) -> None:
    print(f"\n{label}")
    print("-" * 70)
    print(f"  {'轮次':>5}  {'正确推理概率':>10}  {'捷径概率':>12}  "
          f"{'ID 准确率':>8}  {'OOD 准确率':>8}  {'理由正确占比':>10}")
    for i, m in enumerate(models):
        id_acc, id_sound = evaluate(m, 500, on_ood=False)
        ood_acc, _ = evaluate(m, 500, on_ood=True)
        print(f"  {i:>5}  {m.prob_sound:>10.3f}  {m.prob_shortcut:>12.3f}  "
              f"{id_acc:>8.1%}  {ood_acc:>8.1%}  {id_sound:>10.1%}")


def vstar_report(model: Model) -> None:
    print("\nV-STaR 多候选择优推理（best-of-N）")
    print("-" * 70)
    for n in (1, 4, 16):
        for ood in (False, True):
            acc = vstar_infer(model, n, 500, ood)
            tag = "OOD" if ood else "ID"
            print(f"  n={n:>3}  {tag:<3}  准确率 {acc:.1%}")


def main() -> None:
    random.seed(42)
    print("=" * 70)
    print("STaR、V-STaR 与 Quiet-STaR（阶段 15，第 2 课）")
    print("=" * 70)

    print("\n场景 A：基准模型没有捷径倾向（干净的推理先验）")
    models = run_star(5, Model(prob_sound=0.20, prob_shortcut=0.0))
    report_round("STaR 自举轮次（无捷径）", models)

    print("\n场景 B：基准模型有捷径倾向（捷径在分布内答对概率为 0.4）")
    models = run_star(5, Model(prob_sound=0.20, prob_shortcut=0.40))
    report_round("STaR 自举轮次（含捷径）", models)

    vstar_report(models[-1])

    print()
    print("=" * 70)
    print("要点：STaR 会强化能够得到正确答案的轨迹")
    print("-" * 70)
    print("  场景 A 的分布内（ID）与分布外（OOD）准确率均可提升。")
    print("  原文用场景 B 警示：分布内表现提升，未必意味着分布外可靠。")
    print("  但本例实际是否出现 OOD 崩溃，应以逐轮数值为准，不预设结论。")
    print("  本例的 V-STaR 选择器直接读取真值，不能据此衡量真实验证器")
    print("  能否消除训练偏差；“答案正确”和“理由正确”仍需区分。")


if __name__ == "__main__":
    main()
