"""规划插入、更新、删除与刷新

配套课程：projects/rag-freshness-pipeline/stages/02-changes/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

from fingerprint import normalize


def diff(previous, incoming):
    fresh = {}
    for raw in incoming:
        doc = normalize(raw)
        if doc["id"] in fresh:
            raise ValueError("duplicate document id")
        fresh[doc["id"]] = doc
    plan = {
        "insert": [],
        "update": [],
        "refresh": [],
        "delete": sorted(set(previous) - set(fresh)),
        "unchanged": [],
        "documents": fresh,
    }
    for key, doc in sorted(fresh.items()):
        old = previous.get(key)
        bucket = (
            "insert"
            if old is None
            else "update"
            if old["hash"] != doc["hash"]
            else "refresh"
            if old["updated"] != doc["updated"]
            else "unchanged"
        )
        plan[bucket].append(key)
    return plan
