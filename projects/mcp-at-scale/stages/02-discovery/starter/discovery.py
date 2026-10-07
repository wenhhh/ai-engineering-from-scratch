"""在明确上下文预算内选择工具。

课程：projects/mcp-at-scale/stages/02-discovery/docs/en.md
原创实现，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
工具描述、协议值与错误消息参与检索、预算及互操作，保留原值。"""

import json

import re


def discover(tools, query, max_chars=1500, k=5):
    raise NotImplementedError("Stage 2: implement discover")
