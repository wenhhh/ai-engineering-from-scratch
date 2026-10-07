"""解析论断与引用标记

配套课程：projects/report-judge/stages/01-claims/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import re


def parse_claims(text):
    rows = []
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        for sentence in re.split(r"(?<=\.)\s+", line.strip()):
            cites = re.findall(r"\[([A-Za-z][A-Za-z0-9_-]*)\]", sentence)
            claim = (
                re.sub(r"\[[A-Za-z][A-Za-z0-9_-]*\]", "", sentence).strip().rstrip(".")
            )
            if claim:
                rows.append({"text": claim, "cites": list(dict.fromkeys(cites))})
    return rows
