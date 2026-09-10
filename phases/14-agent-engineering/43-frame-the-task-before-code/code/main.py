"""先定义任务，再编写代码。

将目标、允许和禁止修改的路径、验收命令、仓库事实及未知事项整理成 Markdown。
Status: READY/BLOCKED 为已有测试依赖的状态行，分别表示准备就绪/被阻断，保留原格式。
未知事项中的 case-insensitive 表示忽略大小写，也保留该测试匹配词。

译注：本例只检查证据文本是否为空，不读取所引用文件，也不执行验收命令。
允许/禁止路径仅按字符串完全相等检测交集，不展开 glob 或识别目录包含关系。
因此 READY 是这组格式检查的结果，不等于事实已核实、路径绝不冲突或任务已完成。
"""

# 课程示例：验证并渲染具有仓库证据的任务定义。
# 课程正文：phases/14-agent-engineering/43-frame-the-task-before-code/docs/en.md
# 参考原文：Nuseibeh and Easterbrook, Requirements Engineering: A Roadmap.
# 参考原文：Yang et al., SWE-agent, arXiv:2405.15793.
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class RepositoryFact:
    claim: str
    evidence: str


@dataclass
class TaskFrame:
    goal: str
    allowed_paths: list[str]
    forbidden_paths: list[str]
    acceptance: list[str]
    facts: list[RepositoryFact] = field(default_factory=list)
    unknowns: list[str] = field(default_factory=list)


def validate(frame: TaskFrame) -> list[str]:
    issues: list[str] = []
    if not frame.goal.strip():
        # 目标为空。
        issues.append("goal is empty")
    if not frame.allowed_paths:
        # 未指定允许修改的路径。
        issues.append("allowed paths are empty")
    if not frame.forbidden_paths:
        # 未指定禁止修改的路径。
        issues.append("forbidden paths are empty")
    if not frame.acceptance:
        # 未指定验收证据。
        issues.append("acceptance evidence is empty")
    for fact in frame.facts:
        if not fact.evidence.strip():
            # 事实缺少支持证据；错误文本保留以供测试匹配。
            issues.append(f"unsupported fact: {fact.claim}")
    overlap = sorted(set(frame.allowed_paths) & set(frame.forbidden_paths))
    if overlap:
        # 同一路径同时被允许和禁止。
        issues.append(f"paths are both allowed and forbidden: {', '.join(overlap)}")
    return issues


def render(frame: TaskFrame) -> str:
    issues = validate(frame)
    status = "READY" if not issues else "BLOCKED"
    lines = [f"# 任务定义：{frame.goal}", "", f"Status: {status}", "", "## 仓库事实"]
    lines.extend(f"- {fact.claim} (`{fact.evidence}`)" for fact in frame.facts)
    lines.extend(["", "## 允许修改的路径"])
    lines.extend(f"- `{path}`" for path in frame.allowed_paths)
    lines.extend(["", "## 禁止修改的路径"])
    lines.extend(f"- `{path}`" for path in frame.forbidden_paths)
    lines.extend(["", "## 验收证据"])
    lines.extend(f"- `{item}`" for item in frame.acceptance)
    lines.extend(["", "## 未知事项"])
    lines.extend(f"- {item}" for item in frame.unknowns)
    if issues:
        lines.extend(["", "## 阻塞问题"])
        lines.extend(f"- {item}" for item in issues)
    return "\n".join(lines) + "\n"


def example() -> TaskFrame:
    return TaskFrame(
        goal="防止注册时使用重复的电子邮件地址",
        allowed_paths=["app/accounts.py", "tests/test_accounts.py"],
        forbidden_paths=["migrations/**", "deploy/**"],
        acceptance=["python3 -m unittest tests.test_accounts"],
        facts=[
            RepositoryFact("账户写入使用 AccountStore", "app/accounts.py:18"),
            RepositoryFact("重复项错误使用状态码 409", "tests/test_accounts.py:44"),
        ],
        unknowns=["电子邮件地址比较是否忽略大小写（case-insensitive）"],
    )


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "task-frame.md"
    output.write_text(render(example()), encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
