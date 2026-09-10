"""用工作单元的路径归属、依赖关系和验证命令构建委派计划。

owner 标识负责者；paths 是归属路径；proof 是预期执行的验证命令。
ready/blocked 表示计划未发现/发现冲突或缺项，unknown dependency 表示未知依赖，
dependency cycle 表示依赖成环。字段、负责者 ID、路径和诊断字符串均保持原值。

译注：这里是静态计划检查，不会创建 Git worktree、启动智能体或执行验证命令。
路径检测只比较 PurePosixPath 的相等和祖先关系，不处理符号链接、大小写或真实文件锁。
重复 ID 会阻止生成批次；路径冲突或缺少 proof 时仍可生成 waves，但 status 为 blocked。
未知依赖或依赖环会抛出异常，调用者需处理，不能把有 waves 误认为可以安全派发。
"""

# 课程示例：按隔离的文件归属边界委派任务。
# 课程正文：phases/14-agent-engineering/45-delegate-with-isolation/docs/en.md
# 参考原文：Git worktree documentation, git-scm.com/docs/git-worktree.
# 参考原文：Lamport, Time, Clocks, and the Ordering of Events, 1978.
# 运行本文件可生成 outputs/delegation-plan.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath


@dataclass(frozen=True)
class WorkUnit:
    id: str
    owner: str
    paths: tuple[str, ...]
    depends_on: tuple[str, ...]
    proof: str


def paths_overlap(left: str, right: str) -> bool:
    a = PurePosixPath(left)
    b = PurePosixPath(right)
    return a == b or a in b.parents or b in a.parents


def conflicts(units: list[WorkUnit]) -> list[str]:
    found: list[str] = []
    for index, left in enumerate(units):
        for right in units[index + 1:]:
            for left_path in left.paths:
                for right_path in right.paths:
                    if paths_overlap(left_path, right_path):
                        # 任务之间的路径冲突描述保持英文：and 为“与”，overlap at 为“在以下路径重叠”。
                        found.append(f"{left.id} and {right.id} overlap at {left_path} / {right_path}")
    return found


def waves(units: list[WorkUnit]) -> list[list[str]]:
    remaining = {unit.id: set(unit.depends_on) for unit in units}
    known = set(remaining)
    if any(not deps <= known for deps in remaining.values()):
        # 存在未知依赖。
        raise ValueError("unknown dependency")
    done: set[str] = set()
    result: list[list[str]] = []
    while remaining:
        ready = sorted(key for key, deps in remaining.items() if deps <= done)
        if not ready:
            # 依赖关系存在环。
            raise ValueError("dependency cycle")
        result.append(ready)
        done.update(ready)
        for key in ready:
            del remaining[key]
    return result


def delegation_plan(units: list[WorkUnit]) -> dict:
    ids = [unit.id for unit in units]
    duplicate_ids = sorted({unit_id for unit_id in ids if ids.count(unit_id) > 1})
    overlap = conflicts(units)
    missing_proof = [unit.id for unit in units if not unit.proof.strip()]
    return {
        "status": "ready" if not duplicate_ids and not overlap and not missing_proof else "blocked",
        "duplicate_ids": duplicate_ids,
        "conflicts": overlap,
        "missing_proof": missing_proof,
        "waves": waves(units) if not duplicate_ids else [],
        "units": [asdict(unit) for unit in units],
    }


def example() -> list[WorkUnit]:
    return [
        WorkUnit("api", "worker-api", ("app/api", "tests/test_api.py"), (), "python3 -m unittest tests.test_api"),
        WorkUnit("docs", "worker-docs", ("docs/api.md",), (), "python3 scripts/check_links.py"),
        WorkUnit("integration", "reviewer", ("tests/test_integration.py",), ("api", "docs"), "python3 -m unittest"),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "delegation-plan.json"
    output.write_text(json.dumps(delegation_plan(example()), indent=2) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
