"""加载本地文档并保留稳定来源

阶段：projects/doc-qa-with-citations/stages/01-documents/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

from pathlib import Path
import hashlib


def load_documents(root):
    root = Path(root).resolve()
    if not root.is_dir():
        raise ValueError("document directory required")
    docs = []
    for path in sorted(root.rglob("*.txt")):
        resolved = path.resolve()
        if root not in resolved.parents:
            raise ValueError("document escapes root")
        text = resolved.read_text(encoding="utf-8")
        docs.append(
            {
                "id": str(path.relative_to(root)),
                "text": text,
                "sha256": hashlib.sha256(text.encode()).hexdigest(),
            }
        )
    return docs


def chunk_document(doc, size=200, overlap=30):
    if size <= 0 or not 0 <= overlap < size:
        raise ValueError("require 0 <= overlap < size")
    chunks = []
    start = 0
    while start < len(doc["text"]):
        end = min(len(doc["text"]), start + size)
        chunks.append(
            {
                "id": f"{doc['id']}:{start}",
                "source": doc["id"],
                "start": start,
                "end": end,
                "text": doc["text"][start:end],
            }
        )
        if end == len(doc["text"]):
            break
        start = end - overlap
    return chunks
