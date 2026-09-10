"""四种编排模式：主管调度、群体交接、分层调度和辩论。

对同一组退款、缺陷、销售任务分别使用四种处理方式，比较操作次数，
借此理解不同拓扑的成本权衡。

译注：分类由英文关键词规则完成，非真实智能体推理。原始任务与路由词保留英文。
supervisor-worker：主管与执行者；swarm：群体交接；hierarchical：分层；debate：辩论。
refund handled 表示已处理退款，bug logged 表示已记录缺陷，quote sent 表示已发送报价；
这些只是模拟轨迹，不会联系客户或操作真实系统。操作次数不等于实测延迟或费用。
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Callable


def classify(text: str) -> str:
    t = text.lower()
    if "refund" in t:
        return "refund"
    if "crash" in t or "error" in t or "bug" in t:
        return "bug"
    if "pricing" in t or "quote" in t:
        return "sales"
    return "sales"


SPECIALISTS: dict[str, Callable[[str], str]] = {
    "refund": lambda t: f"refund handled: {t[:30]}",
    "bug":    lambda t: f"bug logged: {t[:30]}",
    "sales":  lambda t: f"quote sent: {t[:30]}",
}


def supervisor_worker(tasks: list[str]) -> tuple[list[str], int]:
    trace: list[str] = []
    ops = 0
    for task in tasks:
        ops += 1
        label = classify(task)
        trace.append(f"supervisor -> {label}")
        specialist = SPECIALISTS[label]
        ops += 1
        trace.append(f"  {label}: {specialist(task)}")
    return trace, ops


def swarm(tasks: list[str]) -> tuple[list[str], int]:
    trace: list[str] = []
    ops = 0
    for task in tasks:
        current = list(SPECIALISTS)[0]
        hops = 0
        while hops < 3:
            ops += 1
            label = classify(task)
            if current == label:
                trace.append(f"swarm[{current}]: {SPECIALISTS[current](task)}")
                break
            trace.append(f"swarm[{current}] handoff -> {label}")
            current = label
            hops += 1
    return trace, ops


def hierarchical(tasks: list[str]) -> tuple[list[str], int]:
    trace: list[str] = []
    ops = 0
    for task in tasks:
        ops += 1
        top_label = "customer_ops" if classify(task) != "sales" else "commercial"
        trace.append(f"top -> {top_label}")
        ops += 1
        sub_label = classify(task)
        trace.append(f"  {top_label} -> {sub_label}")
        specialist = SPECIALISTS[sub_label]
        ops += 1
        trace.append(f"    {sub_label}: {specialist(task)}")
    return trace, ops


def debate(tasks: list[str]) -> tuple[list[str], int]:
    trace: list[str] = []
    ops = 0
    for task in tasks:
        proposals: list[str] = []
        for debater in ("alpha", "beta", "gamma"):
            ops += 1
            label = classify(task)
            proposals.append(label)
            trace.append(f"{debater} proposes {label}")
        ops += 1
        convergent = Counter(proposals).most_common(1)[0][0]
        specialist = SPECIALISTS[convergent]
        ops += 1
        trace.append(f"debate converges -> {convergent}: {specialist(task)}")
    return trace, ops


def main() -> None:
    print("=" * 70)
    print("智能体编排模式——阶段 14，第 28 课")
    print("=" * 70)

    tasks = [
        "I need a refund for invoice 4711",
        "the CLI crashes on ctrl-c",
        "do you offer volume pricing?",
    ]

    for name, fn in (
        ("supervisor-worker", supervisor_worker),
        ("swarm",             swarm),
        ("hierarchical",      hierarchical),
        ("debate",            debate),
    ):
        trace, ops = fn(tasks)
        print(f"\n--- {name}  操作数={ops} ---")
        for line in trace:
            print(f"  {line}")

    print()
    print("原文对模式的概括：主管调度较清晰，群体交接较直接，分层调度层级较深。")
    print("本例中辩论操作最多。先明确问题，再选择拓扑；不要把此例推广为通用性能排名。")


if __name__ == "__main__":
    main()
