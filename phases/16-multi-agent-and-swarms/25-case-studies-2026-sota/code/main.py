"""案例映射器：按设计属性选择固定原文中的 2026 年参考案例。

仅使用 Python 标准库。用硬编码规则把输入设计映射到 Anthropic Research、
MetaGPT/ChatDev 或 OpenClaw/Moltbook，并打印案例模式与框架参考表。

译注：框架状态表标注为原文的 2026 年 4 月快照，未在本轮核验当前状态、
协议支持或安全性。这里的映射是教学启发式，不是经过验证的选型建议。
n_agents_expected 只用于展示，并不影响选择；user_facing_network 优先于
其他属性，roles_distinct 又优先于 research，必须阅读分支优先级再解读结果。
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Design:
    name: str
    task_type: str          # 机器标签：research 研究 | engineering 工程 | population 群体 | automation 自动化
    n_agents_expected: int
    verification_required: bool
    runtime_duration_hours: float
    roles_distinct: bool
    user_facing_network: bool


CASES = {
    "anthropic_research": {
        "name": "Anthropic Research（主管—工作者）",
        "patterns": ["使用全新上下文的子智能体", "编排器汇总",
                     "彩虹部署（rainbow deployment）", "独立验证角色"],
        "framework": "Anthropic Claude Agent SDK 或 LangGraph",
        "citation": "https://www.anthropic.com/engineering/multi-agent-research-system",
    },
    "metagpt_chatdev": {
        "name": "MetaGPT / ChatDev（按标准作业程序拆分角色）",
        "patterns": ["在角色提示词中表达标准作业程序", "通过结构化产物交接",
                     "通过沟通降低幻觉", "规模扩大时采用有向无环图路由"],
        "framework": "CrewAI 或 MetaGPT 参考实现",
        "citation": "arXiv:2308.00352 (MetaGPT), arXiv:2307.07924 (ChatDev), arXiv:2406.07155 (MacNet)",
    },
    "openclaw_moltbook": {
        "name": "OpenClaw / Moltbook（群体规模基础设施）",
        "patterns": ["本地 ReAct 循环", "智能体之间的社交图",
                     "涌现式经济行为", "提示词注入威胁模型"],
        "framework": "自建基础设施 + MCP + A2A",
        "citation": "https://en.wikipedia.org/wiki/OpenClaw",
    },
}

FRAMEWORK_LANDSCAPE = [
    ("LangGraph", "原文标为生产可用", "结构化图、检查点与人工介入"),
    ("CrewAI", "原文标为生产可用", "基于角色的团队；顺序 / 分层模式"),
    ("AG2", "原文标为社区维护", "群聊与发言者选择"),
    ("Microsoft Agent Framework", "候选发布版（原文：2026 年 2 月）", "编排模式与企业集成"),
    ("OpenAI Agents SDK", "原文标为生产可用", "Swarm 后继；通过工具返回值交接"),
    ("Google ADK", "生产可用（原文：2025 年 4 月）", "原文称原生 A2A 集成；Google Cloud"),
    ("Anthropic Claude Agent SDK", "原文标为生产可用", "智能体与 Research 扩展"),
]


def map_to_case(d: Design) -> str:
    if d.task_type == "population" or d.user_facing_network:
        return "openclaw_moltbook"
    if d.task_type == "engineering" or d.roles_distinct:
        return "metagpt_chatdev"
    if d.task_type == "research":
        return "anthropic_research"
    if d.verification_required and d.runtime_duration_hours >= 1:
        return "anthropic_research"
    return "anthropic_research"


def print_case(key: str) -> None:
    case = CASES[key]
    print(f"\n  按本例规则匹配的案例：{case['name']}")
    print(f"  可研究的模式：")
    for p in case["patterns"]:
        print(f"    - {p}")
    print(f"  原文框架参考：{case['framework']}")
    print(f"  原文引用：{case['citation']}")


def print_landscape() -> None:
    print("\n" + "=" * 78)
    print("框架概览——原文 2026 年 4 月快照（未核验当前状态）")
    print("=" * 78)
    print(f"  {'框架':30s} {'原文状态':22s} {'原文所列用途':30s}")
    for name, status, best_for in FRAMEWORK_LANDSCAPE:
        print(f"  {name:30s} {status:22s} {best_for:30s}")
    print("\n  原文声称主流框架普遍支持 MCP、多数支持 A2A；本轮未逐一核验。")
    print("  比较时既要核对具体协议兼容性，也要检查交接语义，不能直接套用快照结论。")


def main() -> None:
    designs = [
        Design("research-assistant", "research", 6, True, 2.0, False, False),
        Design("codegen-team", "engineering", 5, True, 1.0, True, False),
        Design("agent-marketplace", "population", 1000, False, 24.0, False, True),
        Design("internal-automation", "automation", 3, True, 0.5, True, False),
    ]

    print("=" * 78)
    print("案例映射器——设计提案 -> 固定原文中的 2026 年参考案例")
    print("=" * 78)

    for d in designs:
        print(f"\n设计：{d.name!r}")
        print(f"  类型={d.task_type}  预计智能体数={d.n_agents_expected}  "
              f"要求验证={d.verification_required}  运行小时数={d.runtime_duration_hours}")
        case_key = map_to_case(d)
        print_case(case_key)

    print_landscape()

    print("\n要点：")
    print("  可先研究相近案例的权衡，但应让案例服务需求，而不是为套用案例改写需求。")
    print("  真实选型前需核对具体版本的协议支持、交接语义及运行约束。")
    print("  原文强调验证、成本核算和部署策略；本映射器没有验证任何系统已达到生产要求。")


if __name__ == "__main__":
    main()
