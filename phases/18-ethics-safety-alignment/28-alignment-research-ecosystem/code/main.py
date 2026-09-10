"""对齐研究生态概览，仅使用 Python 标准库。

输出固定原文中 2026 年前沿模型实验室之外的对齐研究与评估组织概况，
包含组织名称、规模或研究范围、作用和代表成果。参考组织包括 MATS、
Redwood Research、Apollo Research、METR 和 Eleos AI Research。
运行方式：python3 code/main.py

译注：机构规模、合作关系、论文归属和章节编号均来自固定英文快照，未在
本轮重新核验。此文件只是静态参考表；外部参与和联合署名本身不能保证
评测独立性或结论正确性，还需审查方法、证据、利益冲突及公开程度。
"""

from __future__ import annotations


ECOSYSTEM = [
    {
        "org": "MATS",
        "full_name": "ML Alignment & Theory Scholars（机器学习对齐与理论学者项目）",
        "scale": "原文统计：自 2021 年起超过 527 名研究者、180 余篇论文，h 指数为 47",
        "role": "研究人才培养与导师计划",
        "canonical_output": "原文概括：每期 90 名学者、持续 10—12 周，输送至实验室与外部评估机构",
    },
    {
        "org": "Redwood",
        "full_name": "Redwood Research",
        "scale": "原文介绍：由 Buck Shlegeris 创立，开展应用对齐研究",
        "role": "AI 控制研究议程；原文列为英国 AISI 合作方",
        "canonical_output": "Greenblatt、Shlegeris 等：AI Control（AI 控制，ICML 2024）",
    },
    {
        "org": "Apollo",
        "full_name": "Apollo Research",
        "scale": "面向前沿实验室的部署前谋划行为评测",
        "role": "从三个支柱拆解谋划行为风险",
        "canonical_output": "Meinke 等：In-Context Scheming（上下文内谋划，arXiv:2412.04984）",
    },
    {
        "org": "METR",
        "full_name": "Model Evaluation and Threat Research（模型评估与威胁研究）",
        "scale": "任务时间跨度评测与框架综合分析",
        "role": "跨实验室的外部比较",
        "canonical_output": "Common Elements of Frontier AI Safety Policies（前沿 AI 安全政策的共同要素，2025）",
    },
    {
        "org": "Eleos",
        "full_name": "Eleos AI Research",
        "scale": "部署前的模型福利评估",
        "role": "福利评估方法检查",
        "canonical_output": "Claude Opus 4 福利评估（原文指向系统卡第 5.3 节）",
    },
]


def main() -> None:
    print("=" * 78)
    print("对齐研究生态（阶段 18，第 28 课；固定原文快照）")
    print("=" * 78)
    for org in ECOSYSTEM:
        print(f"\n{org['org']} ({org['full_name']})")
        print(f"  规模或研究范围：{org['scale']}")
        print(f"  作用：{org['role']}")
        print(f"  代表成果：{org['canonical_output']}")

    print("\n" + "=" * 78)
    print("要点：外部评估可增加独立检查环节，不能只依赖实验室内部评估。")
    print("内部评估可能存在利益冲突，外部合作也仍须审查方法与证据。")
    print("原文举例提到 Apollo + OpenAI、Redwood + Anthropic 的多组织工作，")
    print("并将 MATS 作为人才培养渠道、英国 AISI / 美国 CAISI 作为外部治理相关方。")
    print("参见第 24 课；这些是原文概况，不是本轮核验后的当前组织状态。")
    print("=" * 78)


if __name__ == "__main__":
    main()
