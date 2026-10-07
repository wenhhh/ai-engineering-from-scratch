"""执行并评估透明的路由技能。

课程： projects/self-improving-skill-loop/stages/02-skill/docs/en.md
实现为原创，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import re


def route(text, rules, default="unknown"):
    words = set(re.findall(r"\w+", text.casefold()))
    for rule in rules:
        terms = set(rule["terms"])
        if terms and terms <= words:
            return rule["label"]
    return default


def evaluate(cases, rules):
    rows = [
        {"id": c["id"], "expected": c["label"], "predicted": route(c["text"], rules)}
        for c in cases
    ]
    errors = [r for r in rows if r["expected"] != r["predicted"]]
    return {
        "total": len(rows),
        "accuracy": 1 - len(errors) / len(rows) if rows else 0.0,
        "errors": errors,
        "rows": rows,
    }
