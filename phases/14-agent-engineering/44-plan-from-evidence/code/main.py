"""将仓库证据转化为带依赖和验证步骤的工作计划。

工作项按依赖关系分成可并行的批次（waves），检查唯一 ID、证据、验证步骤及依赖环。
ready/blocked 分别表示计划检查通过/被阻断；错误字符串保留供测试消费。

译注：只验证证据和 proof 字段存在，不读取引用文件或执行验证。示例中的
review contract 意为“审查契约”，是人工检查描述，并不是实际可执行的 shell 命令。
这里按依赖拓扑分批，不计算 PERT/CPM 的时间估计、关键路径或资源冲突。
"""

# 课程示例：基于证据生成计划并安排依赖批次。
# 课程正文：phases/14-agent-engineering/44-plan-from-evidence/docs/en.md
# 参考原文：PERT, U.S. Navy Special Projects Office, 1958.
# 参考原文：CPM, Kelley and Walker, Eastern Joint Computer Conference, 1959.
# 运行本文件可生成 outputs/evidence-plan.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class WorkItem:
    id: str
    change: str
    evidence: tuple[str, ...]
    depends_on: tuple[str, ...]
    proof: str


def validate(items: list[WorkItem]) -> list[str]:
    issues: list[str] = []
    ids = [item.id for item in items]
    if len(ids) != len(set(ids)):
        # 工作项 ID 必须唯一。
        issues.append("work item ids must be unique")
    known = set(ids)
    has_unknown_dependency = False
    for item in items:
        if not item.evidence:
            # 此工作项没有仓库证据。
            issues.append(f"{item.id} has no repository evidence")
        if not item.proof.strip():
            # 此工作项没有验证步骤。
            issues.append(f"{item.id} has no proof command")
        missing = sorted(set(item.depends_on) - known)
        if missing:
            has_unknown_dependency = True
            # 依赖了未定义的工作项。
            issues.append(f"{item.id} depends on unknown items: {', '.join(missing)}")
    if not has_unknown_dependency:
        try:
            execution_waves(items)
        except ValueError as error:
            issues.append(str(error))
    return issues


def execution_waves(items: list[WorkItem]) -> list[list[str]]:
    known = {item.id for item in items}
    for item in items:
        missing = sorted(set(item.depends_on) - known)
        if missing:
            # 依赖了未定义的工作项。
            raise ValueError(f"{item.id} depends on unknown items: {', '.join(missing)}")
    remaining = {item.id: set(item.depends_on) for item in items}
    waves: list[list[str]] = []
    completed: set[str] = set()
    while remaining:
        ready = sorted(item_id for item_id, deps in remaining.items() if deps <= completed)
        if not ready:
            cycle = ", ".join(sorted(remaining))
            # 这些工作项之间存在依赖环。
            raise ValueError(f"dependency cycle among: {cycle}")
        waves.append(ready)
        completed.update(ready)
        for item_id in ready:
            del remaining[item_id]
    return waves


def plan_document(items: list[WorkItem]) -> dict:
    issues = validate(items)
    return {
        "status": "ready" if not issues else "blocked",
        "issues": issues,
        "waves": execution_waves(items) if not issues else [],
        "items": [asdict(item) for item in items],
    }


def example() -> list[WorkItem]:
    return [
        WorkItem("contract", "定义重复电子邮件地址的处理行为", ("tests/test_accounts.py:44",), (), "review contract"),
        WorkItem("implementation", "拒绝规范化后重复的地址", ("app/accounts.py:18",), ("contract",), "python3 -m unittest tests.test_accounts"),
        WorkItem("docs", "编写状态码 409 响应的说明", ("docs/api.md:72",), ("contract",), "python3 scripts/check_links.py"),
        WorkItem("integration", "运行完整的验收门禁", ("pyproject.toml:31",), ("implementation", "docs"), "python3 -m unittest"),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "evidence-plan.json"
    output.write_text(json.dumps(plan_document(example()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
