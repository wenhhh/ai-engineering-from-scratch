"""用可检查的关键词分数排列文本块

阶段：projects/doc-qa-with-citations/stages/02-retrieval/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import math

import re

from collections import Counter


def retrieve(chunks, query, k=3):
    raise NotImplementedError("Stage 2: implement retrieve")
