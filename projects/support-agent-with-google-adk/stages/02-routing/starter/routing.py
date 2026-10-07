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
    raise NotImplementedError("Stage 2: implement route")


def authorize(specialist, tool):
    raise NotImplementedError("Stage 2: implement authorize")
