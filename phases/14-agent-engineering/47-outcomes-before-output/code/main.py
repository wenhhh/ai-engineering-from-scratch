"""在选定具体产物前，明确用户、情境、现有行为、期望效果、约束及非目标。

译注：这里只做字段和子串检查，不足以证明需求可验证或没有预设解决方案。
proposed_output 的 incident assistant（事故响应助手）和 user 的 on-call engineer
（值班工程师）保留为原测试夹具；next_question 的英文句子也受精确断言约束。
它的含义是：“什么证据能够证明，这位值班工程师已经获得期望效果？”
ready-to-discover/needs-framing 表示可开始调研/仍需完善问题定义。
"""

# 课程示例：先定义可观察的效果，再选择交付物。
# 课程正文：phases/14-agent-engineering/47-outcomes-before-output/docs/en.md
# 参考原文：Nuseibeh and Easterbrook, Requirements Engineering: A Roadmap, 2000.
# 参考原文：Dardenne, van Lamsweerde, and Fickas, Goal-Directed Requirements Acquisition, 1993.
# 运行本文件可生成 outputs/outcome-frame.json。
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class OutcomeFrame:
    user: str
    situation: str
    current_behavior: str
    desired_outcome: str
    constraints: list[str]
    non_goals: list[str]
    proposed_output: str = ""


def validate(frame: OutcomeFrame) -> list[str]:
    issues: list[str] = []
    for name in ("user", "situation", "current_behavior", "desired_outcome"):
        if not getattr(frame, name).strip():
            # 必填字段为空。
            issues.append(f"{name} is empty")
    if not frame.constraints:
        # 未填写约束。
        issues.append("constraints are empty")
    if not frame.non_goals:
        # 未填写非目标。
        issues.append("non-goals are empty")
    if frame.proposed_output and frame.proposed_output.lower() in frame.desired_outcome.lower():
        # 期望效果直接使用了拟议产物名称，混淆了效果与解决方案。
        issues.append("desired outcome names the proposed output")
    return issues


def decision(frame: OutcomeFrame) -> dict:
    issues = validate(frame)
    return {
        "status": "ready-to-discover" if not issues else "needs-framing",
        "issues": issues,
        "frame": asdict(frame),
        "next_question": f"What evidence would show that the desired outcome was achieved for the {frame.user}?",
    }


def example() -> OutcomeFrame:
    return OutcomeFrame(
        user="on-call engineer",
        situation="事故期间收到生产环境告警",
        current_behavior="在找到受影响的服务前，需要搜索三个仪表板",
        desired_outcome="在两分钟内找出故障服务，并确定安全的下一步行动",
        constraints=["诊断期间只允许只读操作", "必须保留审计记录"],
        non_goals=["自动修复", "替代事故指挥者"],
        proposed_output="incident assistant",
    )


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "outputs" / "outcome-frame.json"
    output.write_text(json.dumps(decision(example()), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
