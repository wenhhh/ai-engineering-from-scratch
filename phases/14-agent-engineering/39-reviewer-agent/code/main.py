"""采用五维评分标准的审查智能体桩实现。

接收实现者产物（差异摘要、状态、反馈、验证判定），输出各维度评分和总判定。
真实系统可让各维度的评判器调用 LLM；本课保持确定性，重点是可复用的审查结构。

译注：problem_fit 通过英文目标中的关键词与文件名匹配来评分，因此 goal 保持英文。
add input validation to signup 表示“为注册流程增加输入校验”。
其余维度分别检查范围纪律、假设记录、验证质量和交接就绪度；并未理解代码是否解决了需求。
hard_fail/soft_fail/pass 为硬失败、软失败、通过，保留这些供程序使用的判定值。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).parent


@dataclass
class ReviewerInputs:
    task_id: str
    goal: str
    diff_summary: dict[str, list[str]]
    state: dict[str, object]
    feedback: list[dict[str, object]]
    verdict: dict[str, object]


@dataclass
class DimensionScore:
    name: str
    score: int
    note: str


@dataclass
class ReviewReport:
    task_id: str
    total: int
    verdict: str
    dimensions: list[DimensionScore] = field(default_factory=list)


def score_problem_fit(inputs: ReviewerInputs) -> DimensionScore:
    files = inputs.diff_summary.get("touched", [])
    goal = inputs.goal.lower()
    keywords = [w for w in goal.split() if len(w) > 4]
    hits = sum(any(k in f.lower() for f in files) for k in keywords)
    score = min(2, hits)
    return DimensionScore("problem_fit", score, f"修改文件名中的关键词命中数：{hits}")


def score_scope_discipline(inputs: ReviewerInputs) -> DimensionScore:
    off = inputs.verdict.get("findings", [])
    block_scope = [f for f in off if f.get("code") == "scope.forbidden"]
    if block_scope:
        return DimensionScore("scope_discipline", 0, "存在禁止修改的文件")
    warn_scope = [f for f in off if f.get("code") == "scope.off_scope"]
    return DimensionScore("scope_discipline", 1 if warn_scope else 2, f"越界警告数：{len(warn_scope)}")


def score_assumptions(inputs: ReviewerInputs) -> DimensionScore:
    assumptions = inputs.state.get("assumptions") or []
    if not assumptions:
        return DimensionScore("assumptions", 1, "未记录假设；可能是任务很简单，也可能是遗漏了说明")
    return DimensionScore("assumptions", 2, f"{len(assumptions)} 条假设已记录")


def score_verification(inputs: ReviewerInputs) -> DimensionScore:
    exits = [rec.get("exit_code") for rec in inputs.feedback]
    if any(code is None for code in exits):
        return DimensionScore("verification_quality", 0, "反馈日志存在缺失的退出码")
    if all(code == 0 for code in exits) and exits:
        return DimensionScore("verification_quality", 2, "全部反馈的退出码均为 0")
    return DimensionScore("verification_quality", 1, "反馈中包含不同的退出码")


def score_handoff(inputs: ReviewerInputs) -> DimensionScore:
    if inputs.state.get("active_task_id"):
        return DimensionScore("handoff_readiness", 1, "状态中的当前任务尚未关闭")
    if inputs.state.get("next_action"):
        return DimensionScore("handoff_readiness", 2, "已设置下一步动作，任务已关闭")
    return DimensionScore("handoff_readiness", 0, "未记录下一步动作")


SCORERS = [score_problem_fit, score_scope_discipline, score_assumptions, score_verification, score_handoff]


def review(inputs: ReviewerInputs) -> ReviewReport:
    dims = [fn(inputs) for fn in SCORERS]
    total = sum(d.score for d in dims)
    has_zero = any(d.score == 0 for d in dims)
    if has_zero or total < 5:
        verdict = "hard_fail"
    elif total >= 7:
        verdict = "pass"
    else:
        verdict = "soft_fail"
    return ReviewReport(task_id=inputs.task_id, total=total, verdict=verdict, dimensions=dims)


def main() -> None:
    clean = ReviewerInputs(
        task_id="T-001",
        goal="add input validation to signup",
        diff_summary={"touched": ["app/signup.py", "tests/test_signup.py"]},
        state={
            "active_task_id": None,
            "assumptions": ["用户仅通过电子邮件与密码注册"],
            "next_action": "从看板选择下一项任务",
        },
        feedback=[{"command": "pytest", "exit_code": 0}],
        verdict={"passed": True, "findings": []},
    )
    wrong = ReviewerInputs(
        task_id="T-002",
        goal="add input validation to signup",
        diff_summary={"touched": ["docs/api.md"]},
        state={"active_task_id": "T-002", "assumptions": [], "next_action": ""},
        feedback=[{"command": "pytest", "exit_code": 0}],
        verdict={"passed": True, "findings": [{"code": "scope.off_scope", "severity": "warn"}]},
    )

    for case in (clean, wrong):
        report = review(case)
        out = HERE / f"review_report_{case.task_id}.json"
        out.write_text(
            json.dumps(
                {"task_id": report.task_id, "total": report.total, "verdict": report.verdict, "dimensions": [asdict(d) for d in report.dimensions]},
                indent=2,
             ensure_ascii=False)
            + "\n"
        )
        print(f"任务 {report.task_id}：总分={report.total}/10，判定={report.verdict}")
        for d in report.dimensions:
            print(f"  {d.name:22} {d.score}  {d.note}")
        print()


if __name__ == "__main__":
    main()
