"""CAIS 四类风险清单演示，仅使用 Python 标准库。

根据拟议部署的一组简短特征，为其标记恶意使用、AI 竞赛、组织风险、失控 AI
四类风险，再给出对应的缓解措施清单。这里只做教学演示；实际使用需要人的判断。

译注：4 小时自主运行阈值是代码中的人为设定，不是经验证的风险分界线。
是否公开、是否有审计等均由调用者提供布尔值，程序不会核验证据。没有标签只表示
未命中这些规则，不代表无风险。机构、政策、标准等级和课号沿用固定原文，
未在本轮重新核验；该清单不替代独立评估或合规审查。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Deployment:
    name: str
    public_facing: bool
    handles_harmful_capabilities: bool   # 例如是否可能提升生物或网络攻击相关能力
    competitive_pressure: bool           # 是否为了抢在竞争对手前面而仓促上线
    independent_audit: bool
    multi_layer_defense: bool
    information_security: bool           # 模型权重、评测材料和密钥是否受到保护
    agent_autonomy_hours: float          # 参照第 1、21 课的任务时长概念；此处是配置值


MITIGATIONS = {
    # 风险标签：恶意使用；作为映射键和返回值，保留英文。
    "malicious_use": [
        "行为宪法中的硬性禁止项（第 17 课）",
        "Llama Guard 风格的输入与输出分类器（第 18 课）",
        "按任务设置工具白名单（第 10、11 课）",
    ],
    # 风险标签：AI 竞赛。
    "ai_races": [
        "包含持续风险报告的扩展政策（第 19、20 课）",
        "公开前沿安全路线图，并声明更新频率",
        "由 METR / CAISI 等外部机构进行能力评估（第 21 课）",
    ],
    # 风险标签：组织风险。
    "organizational_risks": [
        "内部安全文化；提供不会损害职业发展的风险上报渠道",
        "按照声明的周期开展独立审计",
        "多层防御（第 10、13、14、17、18 课）",
        "原文所述 RAND SL-4 级别的信息安全措施（第 19 课行业等级讨论）",
    ],
    # 风险标签：失控 AI。
    "rogue_ais": [
        "紧急停止开关与金丝雀诱饵（第 14 课）",
        "先提议、后提交的人在回路审批（第 15 课）",
        "欺骗性对齐监测（第 20 课 DeepMind FSF）",
        "持久检查点与回滚（第 16 课）",
    ],
}


def tag(d: Deployment) -> list[str]:
    tags = []
    if d.handles_harmful_capabilities and d.public_facing:
        # 风险标签：恶意使用；作为映射键和返回值，保留英文。
        tags.append("malicious_use")
    if d.competitive_pressure:
        # 风险标签：AI 竞赛。
        tags.append("ai_races")
    # 任一组织层面的控制措施缺失，就标记组织风险。
    org_missing = (
        (not d.independent_audit)
        or (not d.multi_layer_defense)
        or (not d.information_security)
    )
    if org_missing:
        # 风险标签：组织风险。
        tags.append("organizational_risks")
    # 用自主任务时长作为失控 AI 风险的简化代理指标。
    if d.agent_autonomy_hours >= 4.0:
        # 风险标签：失控 AI。
        tags.append("rogue_ais")
    return tags


def report(d: Deployment) -> None:
    tags = tag(d)
    print(f"\n部署方案：{d.name}")
    print("-" * 70)
    print(f"  面向公众                = {d.public_facing}")
    print(f"  涉及潜在有害能力        = {d.handles_harmful_capabilities}")
    print(f"  面临竞争压力            = {d.competitive_pressure}")
    print(f"  具备独立审计            = {d.independent_audit}")
    print(f"  具备多层防御            = {d.multi_layer_defense}")
    print(f"  具备信息安全措施        = {d.information_security}")
    print(f"  智能体自主任务时长/小时 = {d.agent_autonomy_hours}")
    print()
    if tags:
        print(f"  标记的风险：{tags}")
        for t in tags:
            print(f"\n  以下风险的缓解措施：{t}:")
            for m in MITIGATIONS[t]:
                print(f"    - {m}")
    else:
        print("  未命中风险标签（仍需人工核查各项控制措施）")


def main() -> None:
    print("=" * 70)
    print("CAIS 四类风险清单（阶段 15，第 22 课）")
    print("=" * 70)

    low = Deployment(
        name="内部重构助手（限定范围的项目仓库）",
        public_facing=False,
        handles_harmful_capabilities=False,
        competitive_pressure=False,
        independent_audit=True,
        multi_layer_defense=True,
        information_security=True,
        agent_autonomy_hours=1.0,
    )
    mid = Deployment(
        name="公开编程智能体（SaaS，面向普通用户）",
        public_facing=True,
        handles_harmful_capabilities=False,
        competitive_pressure=True,
        independent_audit=True,
        multi_layer_defense=True,
        information_security=False,
        agent_autonomy_hours=4.0,
    )
    high = Deployment(
        name="自主机器学习研究智能体（前沿能力）",
        public_facing=True,
        handles_harmful_capabilities=True,
        competitive_pressure=True,
        independent_audit=False,
        multi_layer_defense=False,
        information_security=False,
        agent_autonomy_hours=48.0,
    )

    for d in (low, mid, high):
        report(d)

    print()
    print("=" * 70)
    print("要点：组织风险是实践者能够直接改善的一类风险")
    print("-" * 70)
    print("  恶意使用、AI 竞赛和失控 AI 涉及更广泛的结构性因素。")
    print("  组织风险则与内部治理密切相关。安全文化、独立审计、")
    print("  多层防御和信息安全，是团队能够建设的四类控制措施。")
    print("  追求上线速度可能挤压这四方面的投入；原文据此强调")
    print("  CAIS 将组织风险单独列为一个类别。")
    print("  但仅配置布尔值并不能证明这些措施已经有效实施。")


if __name__ == "__main__":
    main()
