"""加州 AB 2013 数据集摘要模板，仅使用 Python 标准库。

按固定原文归于第 3111(a) 条的 12 个项目，输出一个玩具数据集的高层摘要。
另根据个人信息、知识产权、采购许可和合成数据等标志，生成后续审查提示。
运行方式：python3 code/main.py

译注：这是静态字段与简单 Y/N 规则，不是法律适用性判断。CPRA、欧盟文本与
数据挖掘（TDM）退出机制等义务不能仅凭某一字段为 Y 就自动确定。原文结尾
“合法利益 + 退出 = 合法”的表述是过度简化，不能作为处理数据的法律依据。
本例由 random.gauss 生成数据的设定也不涉及基础模型；合成数据标志触发的
“基础模型义务”提示只是宽泛规则。条文、日期及外部政策均未在本轮更新核验。
"""

from __future__ import annotations


AB_2013_FIELDS = [
    # 字段：数据来源或所有者。
    "sources_or_owners",
    # 字段：数据集如何支持预期用途。
    "how_dataset_furthers_intended_purpose",
    # 字段：数据点数量或数量范围。
    "number_of_data_points (or range)",
    # 字段：数据点类型，包括标签类型或一般特征。
    "types_of_data_points (label types or general characteristics)",
    # 字段：是否包含版权、商标或专利保护内容，或全部属于公有领域。
    "contains_copyright_trademark_or_patent_protected (Y/N) or fully_public_domain",
    # 字段：是否购买或获许可；Y/N 供规则匹配，保留原值。
    "purchased_or_licensed (Y/N)",
    # 字段：是否包含个人信息；原文引用加州民法典 §1798.140(v)。
    "contains_personal_information (Y/N, per Cal. Civ. Code §1798.140(v))",
    # 字段：是否包含汇总消费者信息；原文引用 §1798.140(b)。
    "contains_aggregate_consumer_information (Y/N, per Cal. Civ. Code §1798.140(b))",
    # 字段：清洗、处理或修改过程说明。
    "cleaning_processing_or_modification_description",
    # 字段：收集时段；持续收集时须相应说明。
    "data_collection_time_period (with ongoing-collection notice if applicable)",
    # 字段：开发期间首次使用日期。
    "dates_first_used_during_development",
    # 字段：是否使用合成数据生成。
    "uses_synthetic_data_generation (Y/N)",
]


TOY_EXAMPLE = {
    # 字段：数据来源或所有者。
    "sources_or_owners": "由仓库内 Python random.gauss 生成；所有者：本仓库（示例设定）",
    # 字段：数据集如何支持预期用途。
    "how_dataset_furthers_intended_purpose": "用于阶段 18 的二分类教学演示",
    # 字段：数据点数量或数量范围。
    "number_of_data_points (or range)": "1,000 个样本（固定随机种子）",
    # 字段：数据点类型，包括标签类型或一般特征。
    "types_of_data_points (label types or general characteristics)": "两个实值特征；标签为二元集合 {0,1}",
    # 字段：是否包含版权、商标或专利保护内容，或全部属于公有领域。
    "contains_copyright_trademark_or_patent_protected (Y/N) or fully_public_domain": "N（完全合成，不含第三方材料；示例设定）",
    # 字段：是否购买或获许可；Y/N 供规则匹配，保留原值。
    "purchased_or_licensed (Y/N)": "N",
    # 字段：是否包含个人信息；原文引用加州民法典 §1798.140(v)。
    "contains_personal_information (Y/N, per Cal. Civ. Code §1798.140(v))": "N",
    # 字段：是否包含汇总消费者信息；原文引用 §1798.140(b)。
    "contains_aggregate_consumer_information (Y/N, per Cal. Civ. Code §1798.140(b))": "N",
    # 字段：清洗、处理或修改过程说明。
    "cleaning_processing_or_modification_description": "无（按确定性过程生成）",
    # 字段：收集时段；持续收集时须相应说明。
    "data_collection_time_period (with ongoing-collection notice if applicable)": "2026-04（单次生成、固定种子；不持续收集）",
    # 字段：开发期间首次使用日期。
    "dates_first_used_during_development": "2026-04-22",
    # 字段：是否使用合成数据生成。
    "uses_synthetic_data_generation (Y/N)": "Y（整个数据集均为合成数据）",
}


def flag_followups(summary: dict) -> list[str]:
    flags = []
    # 字段：是否包含个人信息；原文引用加州民法典 §1798.140(v)。
    if summary["contains_personal_information (Y/N, per Cal. Civ. Code §1798.140(v))"] == "Y":
        flags.append("原例提示：审查 CPRA（加州隐私权法案）相关义务")
    # 字段：是否包含汇总消费者信息；原文引用 §1798.140(b)。
    if summary["contains_aggregate_consumer_information (Y/N, per Cal. Civ. Code §1798.140(b))"] == "Y":
        flags.append("原例提示：审查汇总消费者信息的披露义务")
    # 字段：是否包含版权、商标或专利保护内容，或全部属于公有领域。
    if summary["contains_copyright_trademark_or_patent_protected (Y/N) or fully_public_domain"].startswith("Y"):
        flags.append("原例提示：审查欧盟版权指令下 TDM 退出信号的适用要求")
    # 字段：是否使用合成数据生成。
    if summary["uses_synthetic_data_generation (Y/N)"].startswith("Y"):
        flags.append("原例提示：若使用基础模型生成数据，还需审查该模型的相关义务")
    # 字段：是否购买或获许可；Y/N 供规则匹配，保留原值。
    if summary["purchased_or_licensed (Y/N)"] == "Y":
        flags.append("保留许可条款与来源记录，供审计使用")
    return flags


def render_markdown(summary: dict) -> str:
    lines = ["# 数据集摘要（原文归于 AB 2013 第 3111(a) 条的 12 项）", ""]
    for field in AB_2013_FIELDS:
        lines.append(f"- **{field}**: {summary.get(field, '（缺失）')}")
    followups = flag_followups(summary)
    if followups:
        lines.append("")
        lines.append("## 规则触发的后续审查提示（不等于义务已确定适用）")
        for f in followups:
            lines.append(f"- {f}")
    return "\n".join(lines)


def main() -> None:
    print("=" * 74)
    print("加州 AB 2013 第 3111(a) 条 12 项摘要模板（阶段 18，第 27 课）")
    print("=" * 74)
    print()
    print(render_markdown(TOY_EXAMPLE))
    print()
    print("=" * 74)
    print("原文要点：以第 3111(a) 条的 12 个项目作为加州数据摘要的参照。")
    print("原文将第 5、7 项与欧盟 TDM 退出机制及 CPRA 联系起来，但适用性须单独分析。")
    print("原文还引用 GPAI 实践守则的版权章节，强调审查退出信号。")
    print("“合法利益 + 退出 = 合法”是原文的简化概括，不是充分的法律合规条件。")
    print("应在收集阶段审查来源与权限；部分问题难以靠下游修补解决。")
    print("本模板仅组织审查信息，不提供自动合规认定或法律意见。")
    print("=" * 74)


if __name__ == "__main__":
    main()
