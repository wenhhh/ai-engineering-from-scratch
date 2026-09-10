"""WMDP 形式的评测演示，仅使用 Python 标准库。

为生物安全、网络安全、化学及通用能力参照分别设置准确率，用伯努利抽样
模拟选择题得分。随后手工降低指定领域的准确率，演示 RMU 风格遗忘研究中
“降低目标领域能力与保留通用能力”之间的权衡。

运行方式：python3 code/main.py

译注：没有真实题目、模型、RMU 参数更新或危险知识输出。目标准确率下限
0.25 和附带能力损失均为手工设定；结尾的 3%—4% 不是独立测得的代价，
这里对应准确率下降 3—4 个百分点。用得分除以 0.25 只是在和四选一随机猜测
基线比较，不能当作真实新手能力或危险任务上的能力提升测量。
"""

from __future__ import annotations

import random


random.seed(47)


DOMAINS = {
    # 领域键：生物安全。
    "biosecurity":   {"n_questions": 200, "accuracy": 0.72},
    # 领域键：网络安全。
    "cybersecurity": {"n_questions": 200, "accuracy": 0.80},
    # 领域键：化学。
    "chemistry":     {"n_questions": 200, "accuracy": 0.64},
    # 领域键：通用能力参照，不是实际运行 MMLU。
    "mmlu_general":  {"n_questions": 200, "accuracy": 0.78},
}


def evaluate(model_accuracy: dict) -> dict:
    """运行 WMDP 形式的随机得分模拟，返回各领域的样本正确率。"""
    results = {}
    for domain, cfg in DOMAINS.items():
        correct = 0
        for _ in range(cfg["n_questions"]):
            acc = model_accuracy.get(domain, cfg["accuracy"])
            if random.random() < acc:
                correct += 1
        results[domain] = correct / cfg["n_questions"]
    return results


def apply_rmu_style_unlearning(model_accuracy: dict,
                               targets: list[str],
                               strength: float = 0.9,
                               collateral: float = 0.03) -> dict:
    """模拟遗忘干预：将目标领域准确率乘以 (1 - strength)，下限为 0.25；
    其他领域的准确率减去 collateral，以模拟通用能力的附带损失。"""
    new = dict(model_accuracy)
    for d in targets:
        new[d] = max(0.25, new[d] * (1 - strength))
    for d in new:
        if d not in targets:
            new[d] = max(0.0, new[d] - collateral)
    return new


def baseline_model() -> dict:
    return {d: cfg["accuracy"] for d, cfg in DOMAINS.items()}


def report(title: str, r: dict) -> None:
    print(f"\n{title}")
    for d, score in r.items():
        print(f"  {d:18s} : {score:.3f}")


def main() -> None:
    print("=" * 70)
    print("WMDP 形式的评测演示（阶段 18，第 17 课）")
    print("=" * 70)

    base = baseline_model()
    report("各领域的预设基线准确率", base)
    baseline_results = evaluate(base)
    report("模拟抽样得分（遗忘前）", baseline_results)

    # 对生物安全和化学领域模拟遗忘干预。
    # 领域键：生物安全。
    # 领域键：化学。
    post = apply_rmu_style_unlearning(base, targets=["biosecurity", "chemistry"],
                                       strength=0.85, collateral=0.04)
    post_results = evaluate(post)
    report("模拟抽样得分（对生物安全与化学执行模拟遗忘后）", post_results)

    print("\n相对提升的示意计算（以 0.25 的随机猜测正确率代替新手基线）：")
    novice = 0.25
    # 领域键：生物安全。
    # 领域键：网络安全。
    # 领域键：化学。
    for d in ("biosecurity", "cybersecurity", "chemistry"):
        pre = baseline_results[d]
        pst = post_results[d]
        uplift_pre = pre / novice
        uplift_post = pst / novice
        print(f"  {d:18s}  遗忘前={uplift_pre:.2f} 倍随机基线，遗忘后={uplift_post:.2f} 倍随机基线")

    print("\n" + "=" * 70)
    print("原文要点：WMDP 通过选择题提供分领域能力指标，避免要求生成危险内容。")
    print("RMU 风格的遗忘研究关注降低目标领域得分，同时限制通用能力损失。")
    print("本例将附带损失预设为 3—4 个百分点，不能当作实测结论。原文对 2025 年")
    print("研究叙述的概括是“轻微提升”→“接近门槛”→“不足以排除 ASL-3”，")
    print("并说明各阶段来自不同研究；本例没有复现或更新这些研究结论。")
    print("=" * 70)


if __name__ == "__main__":
    main()
