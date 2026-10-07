"""规划插入、更新、删除与刷新

配套课程：projects/rag-freshness-pipeline/stages/02-changes/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

from fingerprint import normalize


def diff(previous, incoming):
    raise NotImplementedError("Stage 2: implement diff")
