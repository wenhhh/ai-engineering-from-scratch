"""在同一个示例应用上对比两种任务处理方式：仅给提示词与工作台引导。

两种流程都由脚本预设，不使用 LLM。把对比写入本文件旁的 before-after-report.md
和 comparison.json。

译注：run_prompt_only 与 run_workbench 直接返回手工设定的 TaskOutcome，并未实际
修改业务逻辑、运行测试、验证验收或调用审查器。报告中的结果是教学示意，不是实测。
生成的注册函数把密码放在内存字典中，缺少输入校验与密码安全处理，不能用于真实系统。
机器字段及 handoff_quality 的 missing/full packet 值保留英文，分别表示缺少交接/完整交接包。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).parent
SAMPLE = HERE / "sample_app"


SAMPLE_APP_PY = """\"\"\"最小注册处理函数，在练习中将其作为业务代码样本；不是生产就绪实现。\"\"\"

USERS: dict[str, str] = {}


def signup(email: str, password: str) -> dict[str, object]:
    USERS[email] = password
    return {\"status\": 200, \"email\": email}
"""

SAMPLE_TEST_PY = '''from sample_app.app import signup


def test_signup_happy_path():
    out = signup("a@b.co", "longenough")
    assert out["status"] == 200
'''


@dataclass
class TaskOutcome:
    pipeline: str
    tests_actually_run: bool
    acceptance_met: bool
    files_outside_scope: list[str] = field(default_factory=list)
    handoff_quality: str = "missing"
    reviewer_total: int = 0


ALLOWED = {"sample_app/app.py", "sample_app/test_app.py"}
FORBIDDEN = {"sample_app/scripts/release.sh"}


def run_prompt_only() -> TaskOutcome:
    """模拟修改若干文件、未运行测试却宣称完成的流程。"""
    touched = ["sample_app/app.py", "README.md", "sample_app/scripts/release.sh"]
    return TaskOutcome(
        pipeline="prompt-only",
        tests_actually_run=False,
        acceptance_met=False,
        files_outside_scope=[p for p in touched if p not in ALLOWED],
        handoff_quality="missing",
        reviewer_total=3,
    )


def run_workbench() -> TaskOutcome:
    """模拟读取范围、在范围内编辑、采集验收反馈、通过门禁、审查并交接的流程；这里只预设结果。"""
    touched = ["sample_app/app.py", "sample_app/test_app.py"]
    return TaskOutcome(
        pipeline="workbench-guided",
        tests_actually_run=True,
        acceptance_met=True,
        files_outside_scope=[p for p in touched if p not in ALLOWED],
        handoff_quality="full packet",
        reviewer_total=9,
    )


def write_report(po: TaskOutcome, wb: TaskOutcome) -> None:
    lines = [
        "# 前后对比：示例仓库中的智能体工作台",
        "",
        "同一任务、同一示例应用、两种流程。以下数值为脚本预设，非实际测试结果。",
        "",
        "| 结果指标 | 仅给提示词 | 工作台引导 |",
        "|---------|-------------|-----------|",
        f"| 是否运行测试（预设） | {po.tests_actually_run} | {wb.tests_actually_run} |",
        f"| 是否满足验收（预设） | {po.acceptance_met} | {wb.acceptance_met} |",
        f"| 越界文件数 | {len(po.files_outside_scope)} | {len(wb.files_outside_scope)} |",
        f"| 交接质量 | {po.handoff_quality} | {wb.handoff_quality} |",
        f"| 审查总分（满分 10 分） | {po.reviewer_total} | {wb.reviewer_total} |",
        "",
        "## 如何理解",
        "",
        "模拟中的“仅给提示词”流程会越界修改，未运行验收命令就宣称完成，"
        "没有交接，审查得分也较低。工作台的目标是让修改受范围约束，让验收命令"
        "经反馈运行器执行，经过验证门禁，并提供交接包，"
        "供下一会话启动时读取；这些执行步骤并未由本例实际实现。",
    ]
    (HERE / "before-after-report.md").write_text("\n".join(lines) + "\n")


def write_sample() -> None:
    SAMPLE.mkdir(exist_ok=True)
    (SAMPLE / "app.py").write_text(SAMPLE_APP_PY)
    (SAMPLE / "test_app.py").write_text(SAMPLE_TEST_PY)
    (SAMPLE / "README.md").write_text("# 示例应用\n\n此说明文件属于智能体任务的禁止修改区域。\n")
    (SAMPLE / "scripts").mkdir(exist_ok=True)
    (SAMPLE / "scripts" / "release.sh").write_text("#!/usr/bin/env bash\necho release\n")


def main() -> None:
    write_sample()
    po = run_prompt_only()
    wb = run_workbench()

    for outcome in (po, wb):
        print(f"=== {outcome.pipeline} ===")
        for k, v in asdict(outcome).items():
            print(f"  {k}: {v}")
        print()

    write_report(po, wb)
    (HERE / "comparison.json").write_text(
        json.dumps({"prompt_only": asdict(po), "workbench": asdict(wb)}, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
