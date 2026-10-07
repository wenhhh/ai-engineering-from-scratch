"""查询时排除过期证据

配套课程：projects/rag-freshness-pipeline/stages/04-retrieve/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import re


def retrieve(documents, query, now, max_age=3600, k=3):
    raise NotImplementedError("Stage 4: implement retrieve")
