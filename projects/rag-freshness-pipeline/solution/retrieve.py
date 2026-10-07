"""查询时排除过期证据

配套课程：projects/rag-freshness-pipeline/stages/04-retrieve/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import re


def retrieve(documents, query, now, max_age=3600, k=3):
    if max_age < 0 or k < 0:
        raise ValueError("nonnegative age and k required")
    terms = set(re.findall(r"\w+", query.casefold()))
    rows = []
    for doc in documents.values():
        age = now - doc["updated"]
        if age < 0 or age > max_age:
            continue
        found = terms & set(re.findall(r"\w+", doc["text"].casefold()))
        if found:
            rows.append(
                {
                    "id": doc["id"],
                    "score": len(found) / len(terms),
                    "age": age,
                    "hash": doc["hash"],
                }
            )
    return sorted(rows, key=lambda r: (-r["score"], r["age"], r["id"]))[:k]
