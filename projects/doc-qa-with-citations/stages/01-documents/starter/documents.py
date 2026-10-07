"""加载本地文档并保留稳定来源

阶段：projects/doc-qa-with-citations/stages/01-documents/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

from pathlib import Path

import hashlib


def load_documents(root):
    raise NotImplementedError("Stage 1: implement load_documents")


def chunk_document(doc, size=200, overlap=30):
    raise NotImplementedError("Stage 1: implement chunk_document")
