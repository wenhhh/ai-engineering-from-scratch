"""SWE-bench 风格的简化评测框架，以及 GAIA 风格的难度分类器。

SWE-bench 示例：用 FAIL_TO_PASS（原先失败、修复后通过）和 PASS_TO_PASS
（原先通过、修复后仍通过）两类测试为缺陷修复任务设置门禁。
GAIA 示例：模拟人类觉得简单、AI 却不易完成的问题，按分解步骤等特征估计难度。
两部分均为合成教学示例，目的是把评测规则具体化，并非官方基准实现。

译注：gaia_level 只统计英文连接词、模态词和工具词，不是 GAIA 官方难度判定器。
原问题和匹配词必须保持英文，避免改变分类结果。三个问题依次询问法国首都、
检索 ReAct 文章并提取第一作者、查找论文关联仓库并计算 bug 问题占比。
状态键、测试标签与数值不改；下方只翻译任务描述和展示说明。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Task:
    tid: str
    description: str
    state_before: dict[str, int]
    patch: Callable[[dict[str, int]], dict[str, int]]
    fail_to_pass: list[tuple[str, Callable[[dict[str, int]], bool]]]
    pass_to_pass: list[tuple[str, Callable[[dict[str, int]], bool]]]


@dataclass
class TaskResult:
    tid: str
    ftp_passed: int
    ftp_total: int
    ptp_passed: int
    ptp_total: int
    resolved: bool


def run_task(task: Task) -> TaskResult:
    state = dict(task.state_before)
    ftp_pre = sum(1 for _, check in task.fail_to_pass if check(state))
    ptp_pre = sum(1 for _, check in task.pass_to_pass if check(state))

    new_state = task.patch(dict(state))

    ftp_post = sum(1 for _, check in task.fail_to_pass if check(new_state))
    ptp_post = sum(1 for _, check in task.pass_to_pass if check(new_state))

    ftp_fixed = ftp_post - ftp_pre
    ptp_broke = ptp_pre - ptp_post
    resolved = (ftp_post == len(task.fail_to_pass)) and (ptp_broke == 0)

    return TaskResult(
        tid=task.tid,
        ftp_passed=ftp_post, ftp_total=len(task.fail_to_pass),
        ptp_passed=ptp_post, ptp_total=len(task.pass_to_pass),
        resolved=resolved,
    )


def gaia_level(question: str) -> int:
    steps = sum(1 for w in question.lower().split()
                if w in {"then", "after", "finally", "next", "and"}) + 1
    modalities = sum(word in question.lower() for word in
                     ("image", "video", "audio", "pdf", "chart", "graph"))
    tools = sum(word in question.lower() for word in
                ("search", "look up", "find", "visit", "extract"))
    score = steps + modalities + tools
    if score <= 2:
        return 1
    if score <= 5:
        return 2
    return 3


def swe_demo() -> None:
    print("-" * 70)
    print("SWE-bench 风格评测框架（FAIL_TO_PASS + PASS_TO_PASS）")
    print("-" * 70)

    tasks = [
        Task(
            tid="t001",
            description="修复计数器的差一错误",
            state_before={"counter": 0, "multiplier": 2},
            patch=lambda s: {**s, "counter": s["counter"] + 1},
            fail_to_pass=[("counter > 0", lambda s: s["counter"] > 0)],
            pass_to_pass=[("multiplier unchanged", lambda s: s["multiplier"] == 2)],
        ),
        Task(
            tid="t002",
            description="修复乘数的回归问题",
            state_before={"counter": 1, "multiplier": 0},
            patch=lambda s: {**s, "multiplier": 2},
            fail_to_pass=[("multiplier > 0", lambda s: s["multiplier"] > 0)],
            pass_to_pass=[("counter unchanged", lambda s: s["counter"] == 1)],
        ),
        Task(
            tid="t003",
            description="智能体越界修改，破坏原本通过的测试",
            state_before={"counter": 1, "multiplier": 2, "flag": True},
            patch=lambda s: {**s, "counter": 2, "flag": False},
            fail_to_pass=[("counter > 1", lambda s: s["counter"] > 1)],
            pass_to_pass=[("flag stays true", lambda s: s["flag"]),
                          ("multiplier unchanged", lambda s: s["multiplier"] == 2)],
        ),
    ]

    resolved_count = 0
    for task in tasks:
        result = run_task(task)
        print(f"  {result.tid}: {task.description}")
        print(f"    FAIL_TO_PASS（修复测试）：{result.ftp_passed}/{result.ftp_total}")
        print(f"    PASS_TO_PASS（回归测试）：{result.ptp_passed}/{result.ptp_total}")
        print(f"    是否解决：   {result.resolved}")
        if result.resolved:
            resolved_count += 1
    print(f"\n解决率：{resolved_count}/{len(tasks)}")


def gaia_demo() -> None:
    print("\n" + "-" * 70)
    print("GAIA 风格的教学难度分类器")
    print("-" * 70)
    questions = [
        "What is the capital of France?",
        "Search for the Wikipedia article on ReAct and extract the first author.",
        "Visit the arXiv listing for ReAct, find the GitHub linked in the PDF, "
        "then count the open issues with label 'bug' and return the ratio "
        "of bugs to total issues as a decimal.",
    ]
    for q in questions:
        level = gaia_level(q)
        print(f"  [难度等级 {level}] {q[:70]}")


def main() -> None:
    print("=" * 70)
    print("基准评测：SWE-bench、GAIA——阶段 14，第 19 课")
    print("=" * 70)
    swe_demo()
    gaia_demo()
    print()
    print("SWE-bench：提交补丁，以单元测试作为门禁；原文强调 Verified 版本用于减少歧义。")
    print("本教学分类器：分解深度 + 模态 + 工具需求 -> 难度等级。")
    print("报告基准分数时，也应注明使用的 Verified 或经过审计的版本（原文写作 Verified/+-audited）。")


if __name__ == "__main__":
    main()
