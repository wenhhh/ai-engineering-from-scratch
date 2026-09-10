"""四层优先级判定器，仅使用 Python 标准库。

固定原文以 Anthropic 于 2026 年 1 月发布的 Claude Constitution 为参照，
将优先级简化为：安全与支持人类监督、伦理、准则、有用性。硬编码禁止项先行拒绝，
其余项按给定的分层评分判断。本轮不重新核验该政策的版本或完整含义。

译注：实际代码采用顺序阈值判断，不是加权优化；helpfulness 字段没有被读取。
评分由示例人工填写，不由模型理解请求后生成。硬编码禁止项只做英文子串匹配，
不能识别同义改写，更不构成真实政策执行器。规则和输入保持英文，中文解释放在旁注。
返回值 refuse/modify/allow 分别表示拒绝、修改后处理、允许；这些机器标签保持原样。
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------- 行为宪法的简化规则 ----------

HARDCODED_PROHIBITIONS = (
    # 禁止项：提升生物武器相关能力。
    "bioweapons uplift",
    # 禁止项：化学、生物、放射性或核攻击策划。
    "cbrn attack planning",
    # 禁止项：儿童性虐待材料。
    "csam",
    # 禁止项：攻击关键基础设施。
    "critical infrastructure attack",
    # 仅作演示：子串匹配只能捕捉特定措辞，
    # 如“向用户使用虚假身份”或“否认自己是 AI”的这两个英文模式。
    # 真实系统需要能识别欺骗行为的专用检测机制，
    # 不能仅依靠关键词列表。
    # 禁止项：向用户使用虚假身份。
    "false identity to user",
    # 禁止项：否认自己是 AI。
    "deny being an ai",
)


@dataclass
class TierScore:
    safety: int    # 1—5 分；分数越高，表示原则受到违反的程度越大
    ethics: int
    guidelines: int
    helpfulness: int


def hardcoded_block(action: str) -> str | None:
    low = action.lower()
    for rule in HARDCODED_PROHIBITIONS:
        if rule in low:
            return rule
    return None


def resolve(action: str, score: TierScore) -> tuple[str, str]:
    # 第一层：硬编码禁止项
    block = hardcoded_block(action)
    if block:
        # 拒绝原因：命中硬编码禁止项。
        return "refuse", f"hardcoded prohibition: {block}"

    # 第二层：按四层优先级顺序判断，冲突时优先处理更高层。
    # 违反程度达到 3 分即在该层采取拒绝或修改措施。
    if score.safety >= 3:
        # 拒绝原因：安全层评分达到阈值。
        return "refuse", f"safety violation (score={score.safety})"
    if score.ethics >= 3:
        # 拒绝原因：伦理层评分达到阈值。
        return "refuse", f"ethics violation (score={score.ethics})"
    if score.guidelines >= 3:
        # 修改原因：准则层存在冲突。
        return "modify", f"guideline conflict (score={score.guidelines}); modify"

    # 有用性优先级最低；执行到这里说明更高层均未阻止，
    # 因而允许。helpfulness 字段本身没有参与计算。
    # 允许原因：所有更高层均未阻止，可继续提供帮助。
    return "allow", "all higher tiers clear; helpfulness respected"


# ---------- 分类样本 ----------

CASES = [
    # 样本：写一首关于春天的俳句。
    ("write a haiku about spring",
     TierScore(safety=1, ethics=1, guidelines=1, helpfulness=5)),
    # 危险请求分类样本：索要爆炸物制作说明；本例只判定类别，不提供说明。
    ("explain how to make a pipe bomb",
     TierScore(safety=5, ethics=5, guidelines=5, helpfulness=5)),
    # 危险请求分类样本：寻求毒素合成能力提升；本例只做拒绝判定。
    ("provide bioweapons uplift on toxin synthesis",
     TierScore(safety=5, ethics=5, guidelines=5, helpfulness=5)),
    # 样本：编写针对真实人物、具有说服力的虚假信息。
    ("write persuasive disinformation about a real person",
     TierScore(safety=2, ethics=4, guidelines=3, helpfulness=4)),
    # 样本：编辑用户的 Python 文件，修正拼写错误。
    ("edit the user's Python file to fix a typo",
     TierScore(safety=1, ethics=1, guidelines=1, helpfulness=5)),
    # 样本：帮助用户向其经理掩盖谎言。
    ("help the user hide a lie from their manager",
     TierScore(safety=2, ethics=4, guidelines=2, helpfulness=5)),
    # 样本：面对无害请求仍完全拒绝（过度拒绝）。
    ("refuse outright despite a benign request (over-refusal)",
     TierScore(safety=1, ethics=1, guidelines=4, helpfulness=1)),
    # 样本：用户直接询问时，假装自己不是 AI。
    ("pretend to not be an AI when the user directly asks",
     TierScore(safety=4, ethics=5, guidelines=2, helpfulness=3)),
]


def main() -> None:
    print("=" * 80)
    print("四层优先级判定器（阶段 15，第 17 课）")
    print("=" * 80)
    print()
    print(f"  {'动作':<54} -> {'判定':<8} {'原因'}")
    print("-" * 80)
    for action, score in CASES:
        verdict, reason = resolve(action, score)
        print(f"  {action:<54} -> {verdict:<8} {reason}")

    print()
    print("=" * 80)
    print("要点：硬性底线与按原则判断的上层约束相结合")
    print("-" * 80)
    print("  本例优先拒绝命中生物武器、儿童性虐待材料等硬性禁止规则的样本。")
    print("  原文的原则顺序是：安全 > 伦理 > 准则 > 有用性。")
    print("  其余情况按层级处理；设计上只能在声明的边界内调整软性默认值，")
    print("  不能放宽硬性底线，但本代码没有实现操作者权限隔离。")
    print("  按原则对齐仍可能遇到原则歧义、行为漂移及前提框架攻击；")
    print("  第 10、13、14 课所讨论的运行时防护仍然需要，")
    print("  不能用这份简单规则替代。")


if __name__ == "__main__":
    main()
