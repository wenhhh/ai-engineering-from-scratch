"""通过 stdio 实现带初始化的 JSON-RPC。

课程：projects/mcp-at-scale/stages/03-protocol/docs/en.md
原创实现，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
工具描述、协议值与错误消息参与检索、预算及互操作，保留原值。"""

import json

import sys

from registry import catalog, execute


def handle(request, state, inventory):
    raise NotImplementedError("Stage 3: implement handle")


def serve(lines, output, inventory, tools=None):
    raise NotImplementedError("Stage 3: implement serve")
