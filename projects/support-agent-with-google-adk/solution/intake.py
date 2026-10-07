"""校验并脱敏支持工单。

课程：projects/support-agent-with-google-adk/stages/01-intake/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import re


def ticket(raw):
    if (
        not isinstance(raw, dict)
        or not isinstance(raw.get("id"), str)
        or not raw["id"].strip()
    ):
        raise ValueError("ticket id required")
    text = raw.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 10000:
        raise ValueError("ticket text must contain 1 to 10000 characters")
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "[email]", text)
    text = re.sub(r"(?i)(api[_ -]?key\s*[:=]\s*)\S+", r"\1[redacted]", text)
    return {"id": raw["id"], "text": text, "priority": raw.get("priority", "normal")}
