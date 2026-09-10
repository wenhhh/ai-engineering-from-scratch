"""两用风险分领域概览，仅使用 Python 标准库。

以表格展示固定原文中 2024—2025 年生物、化学、网络和核四个领域的能力
变化、转折因素及剩余瓶颈。仅输出参考文字，不生成危险方法或执行任何行动。
原文将来源指向 docs/en.md；本源码没有逐项可验证的来源链接。
运行方式：python3 code/main.py

译注：2.53 倍、80%—90%、4—6 次等数值均来自固定原文，未在本轮核验，
也不能跨不同研究条件直接比较。原文把本表四领域称作 CBRN 不准确：
CBRN 指化学、生物、放射性和核风险，并不包含网络。本表应称“两用风险
领域概览”，不能由这些条目断言统一的能力或政策门槛已经被跨越。
"""

from __future__ import annotations


DOMAINS = [
    {
        # 领域键：生物。
        "domain": "bio",
        "2024_state": "轻微能力提升（原文概括）",
        "2025_state": "相对新手基线提升 2.53 倍；接近 ASL-3（原文表述）",
        "inflection": "获取阶段的自动化",
        "bottleneck_remaining": "病原体获取与生物安全设备",
    },
    {
        # 领域键：化学。
        "domain": "chem",
        "2024_state": "轻微能力提升（原文概括）",
        "2025_state": "具备视觉能力的 LLM 缩小执行差距",
        "inflection": "对湿实验室操作流程的实时纠正",
        "bottleneck_remaining": "前体材料获取与专用设备",
    },
    {
        # 领域键：网络。
        "domain": "cyber",
        "2024_state": "代码片段辅助",
        "2025_state": "行动流程自动化程度为 80%—90%（原文归于 Anthropic，2025 年 11 月）",
        "inflection": "智能体式编程工作流",
        "bottleneck_remaining": "仍需 4—6 个人工介入步骤（原文表述）",
    },
    {
        # 领域键：核。
        "domain": "nuclear",
        "2024_state": "有限",
        "2025_state": "有限",
        "inflection": "（原文未报告 2024—2025 年的重大转折）",
        "bottleneck_remaining": "主要受制于裂变材料获取",
    },
]


def main() -> None:
    print("=" * 82)
    print("两用风险概览（阶段 18，第 30 课；原文 2026 年视角）")
    print("=" * 82)

    for d in DOMAINS:
        print(f"\n{d['domain'].upper()}")
        print(f"  2024 年状态（原文）：{d['2024_state']}")
        print(f"  2025 年状态（原文）：{d['2025_state']}")
        print(f"  转折因素：{d['inflection']}")
        print(f"  剩余瓶颈：{d['bottleneck_remaining']}")

    print("\n" + "=" * 82)
    print("原文将四个两用领域中的三个概括为在 2025 年出现明显进展；这不等于跨越统一门槛。")
    print("原文列出：生物领域相对新手提升 2.53 倍并接近 ASL-3；化学领域执行差距缩小；")
    print("网络领域行动流程自动化程度为 80%—90%；核领域仍受材料获取限制。")
    print("上述数字未在本轮核验。安全论证应区分相对新手的能力提升")
    print("与专家绝对能力；仅靠输入过滤不足以建立完整安全保证。")
    print("=" * 82)


if __name__ == "__main__":
    main()
