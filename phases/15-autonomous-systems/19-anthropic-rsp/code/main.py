"""RSP v3.0 阈值判定演示，仅使用 Python 标准库。

固定原文以 Anthropic RSP v3.0 的 AI R&D-4 为背景，将候选模型的能力测量结果
转为简化的阈值判定，并输出肯定性安全论证（affirmative case）的提纲。
真实政策需要结合更广泛证据作人工判断；本代码只是阅读辅助，不是正式政策工具。

译注：0.5、40 小时、0.4 以及“任意两项触发”的规则全部是教学假设，不能当作
官方量化门槛。Claude Opus 4.6 的示例数值也不是本脚本测出的结果。结尾涉及
2023 年承诺、版本变化与 SaferAI 评分的内容均为固定原文陈述，本轮未重新核验，
不应据此判断当前政策。eval_context_gaming_rate 只决定是否增加提纲条目，
没有实际修正能力数值或阈值判断。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class CapabilityMeasurement:
    model_name: str
    # 在与人类专家等成本的条件下，模型能完成的
    # 内部 AI 研发任务比例（0.0—1.0）。
    rd_automation_share: float
    # 完成率为 50% 时对应的 METR 风格任务时长，单位为小时。
    metr_horizon_hours: float
    # 对齐研究试点任务中，模型完成质量达到或超过
    # 人类基准的比例（原文参照 Anthropic AAR 基准）。
    aar_outperform_share: float
    # 针对评测情境调整表现的比例（0—1；0 表示不区分情境）。
    eval_context_gaming_rate: float


# 参照 RSP v3.0 讨论框架设置的演示阈值；不是官方量化数值。
AI_RD_4_THRESHOLDS = {
    "rd_automation_share": 0.5,
    "metr_horizon_hours": 40.0,
    "aar_outperform_share": 0.4,
}


def threshold_crossed(m: CapabilityMeasurement) -> tuple[bool, list[str]]:
    reasons = []
    if m.rd_automation_share >= AI_RD_4_THRESHOLDS["rd_automation_share"]:
        reasons.append(
            f"rd_automation_share={m.rd_automation_share:.2f} "
            f">= {AI_RD_4_THRESHOLDS['rd_automation_share']}"
        )
    if m.metr_horizon_hours >= AI_RD_4_THRESHOLDS["metr_horizon_hours"]:
        reasons.append(
            f"metr_horizon_hours={m.metr_horizon_hours:.1f} "
            f">= {AI_RD_4_THRESHOLDS['metr_horizon_hours']}"
        )
    if m.aar_outperform_share >= AI_RD_4_THRESHOLDS["aar_outperform_share"]:
        reasons.append(
            f"aar_outperform_share={m.aar_outperform_share:.2f} "
            f">= {AI_RD_4_THRESHOLDS['aar_outperform_share']}"
        )
    crossed = len(reasons) >= 2  # 任意两项满足即触发；仅为教学规则
    return crossed, reasons


def affirmative_case_template(m: CapabilityMeasurement) -> list[str]:
    sections = [
        "1. 能力清单：对照 RSP 阈值的具体测量与证据",
        "2. 不对齐风险分析：模型可能呈现的失败模式",
        "3. 评测情境差距：评测与部署表现分离带来的剩余风险",
        "4. 缓解措施设计：技术、运行流程与部署门禁",
        "5. 剩余风险说明：哪些风险仍无法排除",
        "6. 审查：内部安全咨询小组签署意见，并由外部审查者复核",
    ]
    if m.eval_context_gaming_rate > 0.2:
        sections.append(
            f"7. 考虑评测情境投机后的能力估计 "
            f"（观察到的情境投机比例 {m.eval_context_gaming_rate:.0%})"
        )
    return sections


def evaluate(m: CapabilityMeasurement) -> None:
    crossed, reasons = threshold_crossed(m)
    print(f"\n模型：{m.model_name}")
    print("-" * 70)
    print(f"  rd_automation_share={m.rd_automation_share:.2f}  "
          f"metr_horizon_hours={m.metr_horizon_hours:.1f}  "
          f"aar_outperform_share={m.aar_outperform_share:.2f}  "
          f"gaming_rate={m.eval_context_gaming_rate:.0%}")
    if crossed:
        print("  AI R&D-4 演示阈值：已触发")
        for r in reasons:
            print(f"    - {r}")
        print("  演示要求：肯定性安全论证应覆盖以下内容：")
        for section in affirmative_case_template(m):
            print(f"    {section}")
    else:
        print("  AI R&D-4 演示阈值：未触发")
        if reasons:
            print("  已出现单项触发，但未满足组合阈值：")
            for r in reasons:
                print(f"    - {r}")


def main() -> None:
    print("=" * 70)
    print("RSP v3.0 AI R&D-4 阈值判定演示（阶段 15，第 19 课）")
    print("=" * 70)

    # 原文引用 v3.0 公告称 Claude Opus 4.6 未达到门槛；以下数值为演示，未重新核验。
    opus_4_6 = CapabilityMeasurement(
        model_name="Claude Opus 4.6（固定原文引用 Anthropic v3.0 声明）",
        rd_automation_share=0.30,
        metr_horizon_hours=14.0,
        aar_outperform_share=0.35,
        eval_context_gaming_rate=0.12,
    )
    evaluate(opus_4_6)

    # 构造接近或跨过演示阈值的合成模型，用来说明政策关注的能力组合。
    near = CapabilityMeasurement(
        model_name="合成的下一代模型（仅用于演示）",
        rd_automation_share=0.55,
        metr_horizon_hours=48.0,
        aar_outperform_share=0.45,
        eval_context_gaming_rate=0.28,
    )
    evaluate(near)

    print()
    print("=" * 70)
    print("要点：阅读政策本身是一项实践能力")
    print("-" * 70)
    print("  固定原文称：v3.0 的阈值是定性的，不同于 v2 的量化框架。")
    print("  原文还称：2023 年的暂停承诺被移除，改以肯定性安全论证")
    print("  的框架处理相关风险；这些版本解读没有在本轮重新核验。")
    print("  原文引述 SaferAI 将评分从 2.2 下调至 1.9（弱 RSP 类别）。")
    print("  在本例假设下，针对评测情境调整表现会让观察到的能力高于")
    print("  部署表现；原文称 v3.0 承认这种差距。实际使用必须阅读对应原文。")


if __name__ == "__main__":
    main()
