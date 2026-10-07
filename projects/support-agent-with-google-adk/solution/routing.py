"""路由工单并约束专员能力。

课程：projects/support-agent-with-google-adk/stages/02-routing/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import re

ROUTES = {
    "billing": {"invoice", "refund", "payment"},
    "access": {"password", "login", "account"},
    "platform": {"outage", "latency", "error"},
}
TOOLS = {
    "billing": {"read_invoice"},
    "access": {"read_account"},
    "platform": {"read_status"},
}


def route(text):
    words = set(re.findall(r"\w+", text.lower()))
    scores = sorted(
        ((len(words & terms), name) for name, terms in ROUTES.items()),
        key=lambda pair: (-pair[0], pair[1]),
    )
    if not scores[0][0] or len(scores) > 1 and scores[0][0] == scores[1][0]:
        return "human"
    return scores[0][1]


def authorize(specialist, tool):
    return tool in TOOLS.get(specialist, set())
