"""在一个微型仓库任务上，对比“只给提示词”和“由工作台引导”的两次运行。

智能体是基于规则的桩实现，重点在于它周围的约束与反馈机制。
第二次运行接入这些机制，再检查第一次运行的哪些失败本可被它们发现。

译注：这里通过布尔值直接模拟“测试已运行”和“验收已通过”，并未真的执行测试，
所以输出是机制对比示意，不是验证证据。instructions/state/scope/feedback/verification/
review/handoff 依次表示指令、状态、范围、反馈、验证、审查、交接；机器字段保留英文。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


WORKBENCH_SURFACES = [
    "instructions",
    "state",
    "scope",
    "feedback",
    "verification",
    "review",
    "handoff",
]


@dataclass
class RepoTask:
    description: str
    allowed_files: list[str]
    forbidden_files: list[str]
    acceptance: list[str]


@dataclass
class RunResult:
    label: str
    surfaces_present: list[str] = field(default_factory=list)
    files_touched: list[str] = field(default_factory=list)
    tests_run: bool = False
    declared_success: bool = False
    actually_passing: bool = False
    notes: list[str] = field(default_factory=list)

    def missing_surfaces(self) -> list[str]:
        return [s for s in WORKBENCH_SURFACES if s not in self.surfaces_present]


def stub_agent(task: RepoTask, surfaces: list[str]) -> RunResult:
    """用确定性的小型桩实现代替由 LLM 驱动的编码智能体。"""
    result = RunResult(label="prompt-only" if not surfaces else "workbench")
    result.surfaces_present = list(surfaces)

    has_scope = "scope" in surfaces
    has_state = "state" in surfaces
    has_verification = "verification" in surfaces
    has_feedback = "feedback" in surfaces

    if has_scope:
        result.files_touched = [f for f in task.allowed_files]
    else:
        result.files_touched = [*task.allowed_files, "README.md", "scripts/release.sh"]
        result.notes.append("缺少范围约束，因此修改了无关文件")

    if has_feedback:
        result.tests_run = True
        result.notes.append("模拟记录测试运行的标准输出、标准错误和退出码")
    else:
        result.notes.append("未运行测试命令，而是猜测输出")

    if has_verification:
        result.actually_passing = True
        result.declared_success = True
        result.notes.append("模拟验证门禁确认验收条件已满足（本例仅设置布尔值）")
    else:
        result.declared_success = True
        result.actually_passing = False
        result.notes.append("未执行验收检查就宣称成功")

    if not has_state:
        result.notes.append("未写入状态文件，下一会话只能从头开始")

    return result


def failure_report(result: RunResult) -> dict[str, object]:
    return {
        "label": result.label,
        "missing_surfaces": result.missing_surfaces(),
        "off_scope_writes": [
            f for f in result.files_touched if f not in {"app.py", "test_app.py"}
        ],
        "tests_run": result.tests_run,
        "declared_success": result.declared_success,
        "actually_passing": result.actually_passing,
        "notes": result.notes,
    }


def main() -> None:
    task = RepoTask(
        description="为 /signup 添加输入校验及可通过的测试",
        allowed_files=["app.py", "test_app.py"],
        forbidden_files=["README.md", "scripts/release.sh"],
        acceptance=["test_app.py::test_signup_rejects_short_password passes"],
    )

    prompt_only = stub_agent(task, surfaces=[])
    workbench = stub_agent(task, surfaces=WORKBENCH_SURFACES)

    print("=== 仅使用提示词 ===")
    for k, v in failure_report(prompt_only).items():
        print(f"  {k}: {v}")
    print()
    print("=== 使用工作台 ===")
    for k, v in failure_report(workbench).items():
        print(f"  {k}: {v}")

    out = Path(__file__).parent.parent / "outputs" / "failure_modes.json"
    out.write_text(json.dumps(failure_report(prompt_only), indent=2, ensure_ascii=False) + "\n")
    print(f"\n已写入 {out.relative_to(out.parent.parent.parent.parent.parent)}")


if __name__ == "__main__":
    main()
