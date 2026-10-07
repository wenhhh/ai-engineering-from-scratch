"""在明确上下文预算内选择工具。

课程：projects/mcp-at-scale/stages/02-discovery/docs/en.md
原创实现，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
工具描述、协议值与错误消息参与检索、预算及互操作，保留原值。"""

import json
import re


def discover(tools, query, max_chars=1500, k=5):
    if max_chars < 0 or k < 0:
        raise ValueError("nonnegative limits required")
    tokens = lambda s: set(re.findall(r"[a-z0-9]+", s.lower()))
    terms = tokens(query)
    ranked = []
    for tool in tools:
        score = len(
            terms & tokens(tool["name"].replace("_", " ") + " " + tool["description"])
        )
        if score:
            ranked.append((score, tool["name"], tool))
    selected = []
    used = 0
    for score, name, tool in sorted(ranked, key=lambda r: (-r[0], r[1])):
        public = {key: tool[key] for key in ["name", "description", "inputSchema"]}
        size = len(json.dumps(selected + [public], separators=(",", ":")))
        if size > max_chars:
            continue
        selected.append(public)
        used = size
        if len(selected) >= k:
            break
    return {
        "tools": selected if k else [],
        "characters": used if k else 0,
        "catalog_size": len(tools),
    }
