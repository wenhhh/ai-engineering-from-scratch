"""分层多智能体与任务分解偏移演示。

三层结构：顶层主管 -> 子主管 -> 工作者。分别运行正确分派的路径，以及顶层主管
误把一个分支标为另一类任务的路径，观察分解错误如何传到最终汇总。

译注：分支标签与工作者关键词用于程序匹配，保留英文并提供中文说明。
回答均为预设文本，不是实际完成的工程、法律或财务审查；顶层也没有校验
原始需求是否全部覆盖。错误路径仍会正常返回汇总，不能据此认定任务已完成。
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LeafOutput:
    worker: str
    question: str
    answer: str


@dataclass
class SubSummary:
    sub_manager: str
    leaves: list[LeafOutput]
    summary: str


@dataclass
class TopSynthesis:
    top_manager: str
    branches: list[SubSummary]
    synthesis: str


class Worker:
    def __init__(self, name: str, canned: dict[str, str]) -> None:
        self.name = name
        self.canned = canned

    def run(self, question: str) -> LeafOutput:
        key = self._match_key(question)
        ans = self.canned.get(key, f"［没有与“{question}”对应的预设回答］")
        return LeafOutput(worker=self.name, question=question, answer=ans)

    def _match_key(self, q: str) -> str:
        ql = q.lower()
        for k in self.canned:
            if k in ql:
                return k
        return "default"


class SubManager:
    def __init__(self, name: str, workers: list[Worker], split: dict[str, str]) -> None:
        self.name = name
        self.workers = workers
        self.split = split

    def run(self, task: str) -> SubSummary:
        leaves = []
        for w in self.workers:
            sub_q = self.split.get(w.name, task)
            leaves.append(w.run(sub_q))
        summary = f"[{self.name}] 汇总：" + " | ".join(l.answer for l in leaves)
        return SubSummary(sub_manager=self.name, leaves=leaves, summary=summary)


class TopManager:
    def __init__(self, name: str, subs: dict[str, SubManager]) -> None:
        self.name = name
        self.subs = subs

    def run(self, task: str, branch_labels: list[str]) -> TopSynthesis:
        summaries: list[SubSummary] = []
        for label in branch_labels:
            if label not in self.subs:
                summaries.append(
                    SubSummary(
                        sub_manager=f"MISSING[{label}]",
                        leaves=[],
                        summary=f"［顶层］尝试委派给“{label}”，但不存在对应子主管",
                    )
                )
                continue
            summaries.append(self.subs[label].run(f"{task}——分支：{label}"))
        synth = "顶层汇总：" + " || ".join(s.summary for s in summaries)
        return TopSynthesis(top_manager=self.name, branches=summaries, synthesis=synth)


def build_hierarchy() -> TopManager:
    fe = Worker("fe", {"frontend": "已审阅 React 组件，发现 2 个问题（预设结果）。"})
    be = Worker("be", {"backend": "已审阅 API 端点，发现 1 个问题（预设结果）。"})
    eng = SubManager(
        "eng-manager",
        [fe, be],
        # 匹配输入：审查功能的前端部分；frontend 是工作者匹配关键词。
        # 匹配输入：审查功能的后端部分；backend 是工作者匹配关键词。
        {"fe": "frontend review of the feature", "be": "backend review of the feature"},
    )
    lw = Worker("lawyer", {"legal": "合同条款 A、B 不合规（预设结果）。"})
    # 匹配输入：对功能做法务审查；legal 是匹配关键词。
    legal = SubManager("legal-manager", [lw], {"lawyer": "legal review of the feature"})
    fw = Worker(
        "finance",
        {"finance": "预计费用为每月 4.2 万美元，超出预算 12%（预设结果）。"},
    )
    # 匹配输入：对功能做财务审查；finance 是匹配关键词。
    finance = SubManager("finance-manager", [fw], {"finance": "finance review of the feature"})
    return TopManager("vp-eng", {"engineering": eng, "legal": legal, "finance": finance})


def render(label: str, synth: TopSynthesis) -> None:
    print(f"\n=== {label} ===")
    for branch in synth.branches:
        print(f"  ［子主管］{branch.sub_manager}")
        for leaf in branch.leaves:
            print(f"    ［工作者］{leaf.worker:8s} 收到问题：{leaf.question}")
            print(f"           回答：{leaf.answer}")
        print(f"    ［分支汇总］{branch.summary}")
    print(f"  ［顶层］{synth.synthesis}")


def main() -> None:
    print("分层多智能体与任务分解偏移演示")
    print("-" * 60)

    top = build_hierarchy()
    task = "将高级订阅档位功能上线到生产环境。"

    happy = top.run(task, branch_labels=["engineering", "legal"])
    render("正常路径（分支分派正确）", happy)

    perturbed = top.run(task, branch_labels=["engineering", "finance"])
    render("扰动路径（顶层将 legal 法务分支误标为 finance 财务分支）", perturbed)

    print("\n场景预期：用户需要法务和工程审查。")
    print("正常路径：法务与工程分支都返回各自的预设回答。")
    print("扰动路径：财务分支照常回答，但法务问题无人处理。")
    print("错误最终出现在顶层汇总中；必须回看委派与需求覆盖，才能识别遗漏的分支。")


if __name__ == "__main__":
    main()
