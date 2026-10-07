"""校验允许范围内的云端检查计划。

课程：projects/cloud-agent-with-aws-strands/stages/01-plan/docs/en.md
本实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

ALLOWED = {"inventory.list", "metrics.read", "logs.read"}


def validate_plan(raw, scope):
    if not isinstance(raw, list) or not raw or len(raw) > 10:
        raise ValueError("one to ten actions required")
    rows = []
    for item in raw:
        if not isinstance(item, dict) or set(item) != {"operation", "resource"}:
            raise ValueError("operation and resource required")
        if item["operation"] not in ALLOWED:
            raise ValueError("read-only operation required")
        if item["resource"] not in scope:
            raise ValueError("resource outside scope")
        rows.append(dict(item))
    return rows
