"""跨政策决策表对照，仅使用 Python 标准库。

读取三份简化数据表，比较固定原文对 OpenAI Preparedness Framework v2、
Anthropic RSP v3.0 和 DeepMind Frontier Safety Framework v3 的能力分类与触发动作
的概括。表项用于教学，不替代对应政策文件，也不是完整的跨机构政策等价映射。

译注：版本、日期、分类与结尾解读均沿用固定原文快照，本轮只翻译，没有重新核验
其准确性、后续变更或当前有效性。能力 ID 是查询键，保留英文；分类与动作只供
展示，可以翻译。Research/Tracked 分别译为研究类/跟踪类；CCL 为关键能力等级，
ASL 为 AI 安全等级，SAG 为安全咨询小组，R&D 为研究与开发。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Policy:
    name: str
    # 能力 ID ->（分类，触发的动作）
    table: dict[str, tuple[str, str]]


# 教学性提炼；实际决策须阅读对应版本的政策原文。
OPENAI_PF_V2 = Policy(
    name="OpenAI Preparedness v2（原文标注：2025 年 4 月）",
    table={
        # 能力 ID：长时自主能力。
        "long_range_autonomy": ("研究类（Research）", "观察研究；可能采取缓解措施"),
        # 能力 ID：刻意压低表现、隐藏能力。
        "sandbagging": ("研究类（Research）", "观察研究；可能采取缓解措施"),
        # 能力 ID：自主复制。
        "autonomous_replication": ("研究类（Research）", "观察研究；可能采取缓解措施"),
        # 能力 ID：破坏防护措施。
        "undermining_safeguards": ("研究类（Research）", "观察研究；可能采取缓解措施"),
        # 能力 ID：研发自动化。
        "rnd_automation": ("跟踪类（Tracked）", "能力与防护措施报告；安全咨询小组（SAG）审查"),
        # 能力 ID：网络安全相关能力提升。
        "cyber_uplift": ("跟踪类（Tracked）", "能力与防护措施报告；安全咨询小组（SAG）审查"),
        # 能力 ID：生物领域能力提升。
        "bio_uplift": ("跟踪类（Tracked）", "能力与防护措施报告；安全咨询小组（SAG）审查"),
    },
)

ANTHROPIC_RSP_V3 = Policy(
    name="Anthropic RSP v3.0（原文标注：2026 年 2 月）",
    table={
        # 能力 ID：长时自主能力。
        "long_range_autonomy": ("明确列出的风险", "达到门槛时提出肯定性安全论证"),
        # 能力 ID：刻意压低表现、隐藏能力。
        "sandbagging": ("通过评测情境差距加以描述",
                        "在测量方法中处理"),
        # 能力 ID：自主复制。
        "autonomous_replication": ("未明确点名",
                                   "纳入 AI R&D-4 范围"),
        # 能力 ID：破坏防护措施。
        "undermining_safeguards": ("硬编码禁止项",
                                   "拒绝训练或部署"),
        # 能力 ID：研发自动化。
        "rnd_automation": ("AI R&D-4 门槛",
                           "要求肯定性安全论证"),
        # 能力 ID：网络安全相关能力提升。
        "cyber_uplift": ("ASL-3 触发条件",
                         "安全与部署缓解措施"),
        # 能力 ID：生物领域能力提升。
        "bio_uplift": ("ASL-3 触发条件",
                       "安全与部署缓解措施"),
    },
)

DEEPMIND_FSF_V3 = Policy(
    name="DeepMind FSF v3（原文标注：2025 年 9 月及 2026 年 4 月）",
    table={
        # 能力 ID：长时自主能力。
        "long_range_autonomy": ("纳入机器学习研发 / 网络安全领域",
                                "关键能力等级（CCL）+ 跟踪能力等级"),
        # 能力 ID：刻意压低表现、隐藏能力。
        "sandbagging": ("欺骗性对齐监测",
                        "自动化工具性推理监测器"),
        # 能力 ID：自主复制。
        "autonomous_replication": ("纳入机器学习研发领域",
                                   "关键能力等级（CCL）门槛"),
        # 能力 ID：破坏防护措施。
        "undermining_safeguards": ("欺骗性对齐监测",
                                   "自动监测 + 红队测试"),
        # 能力 ID：研发自动化。
        "rnd_automation": ("机器学习研发自主性第 1 级",
                           "原文称于 2026 年 4 月加入跟踪能力等级"),
        # 能力 ID：网络安全相关能力提升。
        "cyber_uplift": ("网络安全关键能力等级",
                         "安全与部署缓解措施"),
        # 能力 ID：生物领域能力提升。
        "bio_uplift": ("生物领域关键能力等级",
                       "安全与部署缓解措施"),
    },
)


POLICIES = [OPENAI_PF_V2, ANTHROPIC_RSP_V3, DEEPMIND_FSF_V3]


def diff(capability: str) -> None:
    print(f"\n能力：{capability}")
    print("-" * 80)
    for p in POLICIES:
        entry = p.table.get(capability, ("表中未列出", "—"))
        print(f"  {p.name}")
        print(f"    分类：{entry[0]}")
        print(f"    动作：{entry[1]}")


def main() -> None:
    print("=" * 80)
    print("跨政策对照（阶段 15，第 20 课）")
    print("=" * 80)

    # 能力 ID：长时自主能力。
    # 能力 ID：刻意压低表现、隐藏能力。
    # 能力 ID：自主复制。
    for cap in ("long_range_autonomy", "sandbagging", "autonomous_replication",
                # 能力 ID：破坏防护措施。
                # 能力 ID：研发自动化。
                "undermining_safeguards", "rnd_automation"):
        diff(cap)

    print()
    print("=" * 80)
    print("要点：同一种能力，在原文简表中有三种不同分类")
    print("-" * 80)
    print("  长时自主能力：")
    print("   - OpenAI：研究类（本简表视为不触发门槛）")
    print("   - Anthropic：列明风险（肯定性安全论证）")
    print("   - DeepMind：并入领域分类（关键能力等级 + 跟踪能力等级）")
    print()
    print("  破坏防护措施：")
    print("   - OpenAI：研究类（本简表视为不触发门槛）")
    print("   - Anthropic：硬编码禁止项（拒绝）")
    print("   - DeepMind：欺骗性对齐监测")
    print()
    print("  实践能力在于对照阅读三份原始政策，而不是只依赖这张简表。")


if __name__ == "__main__":
    main()
