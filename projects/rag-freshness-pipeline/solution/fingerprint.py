"""规范化文档并生成内容指纹

配套课程：projects/rag-freshness-pipeline/stages/01-fingerprint/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import hashlib
import unicodedata


def normalize(doc):
    if not isinstance(doc.get("id"), str) or not doc["id"].strip():
        raise ValueError("document id required")
    if not isinstance(doc.get("text"), str):
        raise ValueError("text must be a string")
    text = unicodedata.normalize("NFC", doc["text"]).replace("\r\n", "\n").strip()
    if not text:
        raise ValueError("empty document")
    return {
        "id": doc["id"],
        "text": text,
        "updated": int(doc.get("updated", 0)),
        "hash": hashlib.sha256(text.encode()).hexdigest(),
    }
