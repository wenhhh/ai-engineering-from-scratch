"""把重复反馈归类成测试、范围约束、自动化、示例或指令，并生成可去重的控制记录。

译注：分类与原因规范化依赖英文关键词、正则表达式；规则文本还参与 SHA-256 指纹。
因此保留所有运行时英文，中文解释放在旁注中，避免翻译改变分类、去重或回归测试。
它只产出控制措施的描述，不会实际生成测试、修改规则或执行 verification 中的动作。
ratchet 只接纳 recurrence 至少为 1 的记录；相同指纹的后项覆盖前项，不累计出现次数。
"""

# 课程示例：将纠错反馈转化为持久控制措施。
# 课程正文：phases/14-agent-engineering/46-turn-feedback-into-system/docs/en.md
# 参考原文：Basili, Caldiera, and Rombach, The Goal Question Metric Approach.
# 参考原文：Shinn et al., Reflexion, arXiv:2303.11366.
# 运行本文件可生成 outputs/feedback-ratchet.json。
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Correction:
    symptom: str
    cause: str
    recurrence: int
    consequence: str


@dataclass(frozen=True)
class Control:
    target: str
    rule: str
    verification: str
    fingerprint: str
    symptom: str
    cause: str
    recurrence: int
    consequence: str


def choose_target(correction: Correction) -> str:
    text = f"{correction.symptom} {correction.cause}".lower()
    # 按顺序匹配：错误输出、回归、边界情况或缺陷归为 test（测试）。
    if any(word in text for word in ("incorrect output", "regression", "edge case", "bug")):
        return "test"
    # scope 表示范围约束；与无关文件、权限等关键词一起用于匹配，保留原值。
    if any(word in text for word in ("scope", "unrelated file", "permission")):
        # scope 表示范围约束；与无关文件、权限等关键词一起用于匹配，保留原值。
        return "scope"
    # command/setup/environment/tool 表示命令、初始化、环境或工具，归为 automation（自动化）。
    if any(word in text for word in ("command", "setup", "environment", "tool")):
        return "automation"
    # format/pattern/example 表示格式、模式或示例，归为 example（示例）。
    if any(word in text for word in ("format", "pattern", "example")):
        return "example"
    return "instruction"


def normalize_cause(cause: str) -> str:
    text = cause.strip().rstrip(".").lower()
    implicit = re.fullmatch(r"(.+?) (?:was|were) implicit", text)
    if implicit:
        return f"implicit {implicit.group(1)}"
    unchecked = re.fullmatch(r"(.+?) was described but not checked", text)
    if unchecked:
        return f"unchecked {unchecked.group(1)} description"
    missing = re.fullmatch(r"(.+?) had no (.+)", text)
    if missing:
        return f"missing {missing.group(2)} for {missing.group(1)}"
    return text


def promote(correction: Correction) -> Control:
    target = choose_target(correction)
    # 规则前缀“防止”；规则全文参与指纹，不翻译运行值。
    rule = f"Prevent {normalize_cause(correction.cause)}"
    verification = {
        # 验证动作：运行新增的回归测试。
        "test": "Run the new regression test",
        # scope 表示范围约束；与无关文件、权限等关键词一起用于匹配，保留原值。
        # 验证动作：运行范围检查器。
        "scope": "Run the scope checker",
        # 验证动作：运行初始化或工具预检。
        "automation": "Run the setup or tool preflight",
        # 验证动作：将输出与标准示例比较。
        "example": "Compare the output with the canonical example",
        # 验证动作：运行指令静态检查及场景检查。
        "instruction": "Run the instruction linter and scenario check",
    }[target]
    digest = hashlib.sha256(f"{target}|{rule}".encode()).hexdigest()[:12]
    return Control(
        target,
        rule,
        verification,
        digest,
        correction.symptom,
        correction.cause,
        correction.recurrence,
        correction.consequence,
    )


def ratchet(corrections: list[Correction]) -> list[Control]:
    promoted: dict[str, Control] = {}
    for correction in corrections:
        if correction.recurrence < 1:
            continue
        control = promote(correction)
        promoted[control.fingerprint] = control
    return sorted(promoted.values(), key=lambda item: (item.target, item.fingerprint))


def example() -> list[Correction]:
    return [
        # 样本一：智能体编辑了无关文件；原因是仅描述了范围却未检查；后果是反复审查。
        Correction("Agent edited an unrelated file", "scope was described but not checked", 2, "review churn"),
        # 样本二：遗漏了回归问题；原因是边界情况没有可执行示例；后果是用户可见的故障。
        Correction("A regression escaped", "edge case had no executable example", 1, "user-visible failure"),
        # 样本三：初始化命令失败；原因是环境假设未明示；后果是浪费一个会话。
        Correction("Setup command failed", "environment assumptions were implicit", 3, "lost session"),
    ]


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "feedback-ratchet.json"
    output.write_text(json.dumps([asdict(item) for item in ratchet(example())], indent=2) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
