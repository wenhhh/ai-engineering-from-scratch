"""规范化文档并生成内容指纹

配套课程：projects/rag-freshness-pipeline/stages/01-fingerprint/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import hashlib

import unicodedata


def normalize(doc):
    raise NotImplementedError("Stage 1: implement normalize")
