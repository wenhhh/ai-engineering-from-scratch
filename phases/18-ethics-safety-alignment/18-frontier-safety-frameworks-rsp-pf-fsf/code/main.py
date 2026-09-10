"""前沿安全框架对照，仅使用 Python 标准库。

打印固定原文中的 Anthropic RSP v3.0、OpenAI PF v2 和 DeepMind FSF v3.0
对照表，包括分级结构、CBRN（化学、生物、放射性、核）门槛、AI 研发门槛、
随竞争者调整要求的条款，以及安全论证要求。只展示参考数据，不做模拟。

运行方式：python3 code/main.py

译注：版本、日期和框架归属均沿用固定英文快照；本轮只翻译，没有核验其
最新状态或政策准确性。原文称“行内引用一手来源”，但此源码只有框架名称
和版本，没有具体链接。结尾概括的“三个层级”也不是上表各框架统一的层级数。
此表不构成当前政策、合规要求或生产部署依据。
"""

from __future__ import annotations


LABS = [
    {
        "name": "Anthropic RSP v3.0（原文标注：2026 年 2 月）",
        "tier_structure": "ASL-1 至 ASL-5+；类比生物安全等级",
        "cbrn_threshold": "ASL-3（原文标注：2025 年 5 月启用）",
        "ai_rd_threshold": "AI R&D-2 与 AI R&D-4（原文称 v3.0 分别列出）",
        "adjustment_clause": "有；原文称允许因同行发布而降低要求",
        "safety_case": "跨越 AI R&D-4 门槛时要求安全论证",
    },
    {
        "name": "OpenAI PF v2（原文标注：2025 年 4 月 15 日）",
        "tier_structure": "按所跟踪能力分为低／中／高／关键级（Low / Medium / High / Critical）",
        "cbrn_threshold": "生物领域的 High（高）级门槛",
        "ai_rd_threshold": "AI 研发的 High（高）级；原文称 Critical（关键级）定义待定",
        "adjustment_clause": "有；原文称领导层可降低要求",
        "safety_case": "分别提供能力报告和防护措施报告",
    },
    {
        "name": "DeepMind FSF v3.0（原文标注：2025 年 9 月）",
        "tier_structure": "按领域设置关键能力级别（CCL）：生物／网络／机器学习研发／操纵",
        "cbrn_threshold": "生物武器能力提升 CCL",
        "ai_rd_threshold": "机器学习研发加速 CCL（原文称 v2.0 提高了安全防护等级）",
        "adjustment_clause": "有；原文标注为 2025 年新增",
        "safety_case": "按 CCL 设置；原文称 v2.0 新增欺骗性对齐章节",
    },
]


def print_row(header: str, key: str) -> None:
    print(f"\n{header}")
    for lab in LABS:
        name = lab["name"]
        val = lab[key]
        print(f"  {name:32s} : {val}")


def main() -> None:
    print("=" * 78)
    print("前沿安全框架（阶段 18，第 18 课；固定原文快照）")
    print("=" * 78)

    print_row("分级结构", "tier_structure")
    print_row("CBRN 门槛", "cbrn_threshold")
    print_row("AI 研发门槛", "ai_rd_threshold")
    print_row("随竞争者调整要求的条款", "adjustment_clause")
    print_row("安全论证要求", "safety_case")

    print("\n" + "=" * 78)
    print("原文要点：三家实验室都围绕前沿能力分级、CBRN 门槛和 AI 研发门槛")
    print("组织安全框架，但术语和具体层级并不统一，不能简单归为相同的三级。")
    print("原文对照表均列出了竞争者调整条款，并将安全论证视为趋同的交付物。")
    print("这些只是固定快照中的概括，使用前须查证对应版本的原始政策。")
    print("原文另列英国 AISI、美国 CAISI 和欧盟 AI Office 作为外部评估或治理方。")
    print("=" * 78)


if __name__ == "__main__":
    main()
