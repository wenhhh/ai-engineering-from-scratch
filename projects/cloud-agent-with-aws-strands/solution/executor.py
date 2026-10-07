"""在步骤和响应额度内执行读取。

课程：projects/cloud-agent-with-aws-strands/stages/02-executor/docs/en.md
本实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
译注：输出额度在 provider 返回后检查，不是网络接收量或内存硬上限。
"""

import json


def execute(plan, provider, max_steps=5, max_chars=4000):
    if max_steps < 0 or max_chars < 0:
        raise ValueError("nonnegative budgets required")
    rows = []
    used = 0
    for item in plan:
        if len(rows) >= max_steps:
            return {"state": "budget_exhausted", "results": rows, "characters": used}
        value = provider(item["operation"], item["resource"])
        encoded = json.dumps(value, sort_keys=True)
        if used + len(encoded) > max_chars:
            return {"state": "budget_exhausted", "results": rows, "characters": used}
        rows.append({"action": item, "value": value})
        used += len(encoded)
    return {"state": "completed", "results": rows, "characters": used}
