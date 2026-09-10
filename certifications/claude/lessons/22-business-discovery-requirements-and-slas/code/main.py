"""本课 docs/en.md 业务发现简报的配套验证器。检查需求、约束、成功标准与 SLA 字段；不代表真实合同或服务承诺。"""

from __future__ import annotations

import json
from pathlib import Path


ARTIFACT = Path(__file__).resolve().parents[1] / "outputs" / "discovery-brief.md"
REQUIRED_HEADINGS = (
    "## Outcome",
    "## Requirements",
    "## Data and Authority",
    "## Measures",
    "## Assumptions",
    "## Non-Goals",
)
REQUIRED_EVIDENCE = {
    "outcome": ("baseline", "target", "owner"),
    "service levels": ("sli", "slo"),
    "classification": ("constraint", "estimate"),
    "scope": ("autonomous sending",),
}


def validate_text(text: str) -> dict[str, object]:
    lowered = " ".join(text.lower().split())
    findings = [f"missing heading: {heading}" for heading in REQUIRED_HEADINGS if heading not in text]
    for label, terms in REQUIRED_EVIDENCE.items():
        missing = [term for term in terms if term not in lowered]
        if missing:
            findings.append(f"missing {label}: {', '.join(missing)}")
    if any(marker in lowered for marker in ("tbd", "todo", "[replace")):
        findings.append("unresolved placeholder")
    return {"status": "ready_for_architecture" if not findings else "blocked", "score": max(0, 100 - 12 * len(findings)), "findings": findings}


def validate_artifact(path: Path = ARTIFACT) -> dict[str, object]:
    return validate_text(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    print(json.dumps(validate_artifact(), indent=2))
