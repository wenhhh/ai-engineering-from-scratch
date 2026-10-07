"""语料库上的 BM25 关键词检索。
评分遵循 Robertson 与 Zaragoza 的 The Probabilistic Relevance Framework:
BM25 and Beyond（2009）。仅使用标准库。英文分词规则保留原值。
配套课程：projects/research-report-agent/stages/01-search-the-corpus/docs/en.md"""

import functools
import atexit
import json
import math
import subprocess
import tempfile
from pathlib import Path
import re

TOKEN_RE = re.compile(r"[a-z0-9]+")

STOPWORDS = frozenset(
    "a an and are as at be by can do does for from has have how if in into is it its "
    "not of on or so such that the their them then there these this to was what when "
    "where which while who why will with you your".split()
)


def tokenize(text):
    return [token for token in TOKEN_RE.findall(text.lower()) if token not in STOPWORDS]


@functools.lru_cache(maxsize=1)
def engine_binary():
    source = Path(__file__).resolve().parents[1] / "search" / "main.rs"
    directory = tempfile.TemporaryDirectory(prefix="rra-private-build-")
    atexit.register(directory.cleanup)
    binary = Path(directory.name) / "search"
    result = subprocess.run(
        ["rustc", "--edition", "2021", "-O", str(source), "-o", str(binary)],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode:
        directory.cleanup()
        raise RuntimeError("Rust search build failed: " + result.stderr)
    return binary


class BM25Index:
    def __init__(self, documents, k1=1.5, b=0.75):
        if not math.isfinite(k1) or k1 <= 0 or not math.isfinite(b) or not 0 <= b <= 1:
            raise ValueError("require finite k1 > 0 and 0 <= b <= 1")
        self.documents = list(documents)
        self.k1, self.b = k1, b
        self._corpus = tempfile.TemporaryDirectory(prefix="rra-corpus-")
        for position, doc in enumerate(self.documents):
            # 文件名由本地生成，任意调用方 ID 都不会直接变成路径。
            Path(self._corpus.name, f"{position:06d}.md").write_text(
                f"title: {doc.title}\nsource_url: {doc.source_url}\npublished: {doc.published}\n\n{doc.text}\n",
                encoding="utf-8",
            )
        self._ids = {f"{i:06d}": doc.id for i, doc in enumerate(self.documents)}
        self.idf = self._request({"cmd": "idf"})["idf"]

    def _request(self, payload):
        payload.update(k1=self.k1, b=self.b)
        result = subprocess.run(
            [str(engine_binary()), self._corpus.name],
            input=json.dumps(payload) + "\n",
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode:
            raise RuntimeError("Rust search failed: " + result.stderr)
        response = json.loads(result.stdout)
        if "error" in response:
            raise ValueError(response["error"])
        return response

    def score(self, query_tokens, position):
        return self._request(
            {"cmd": "score", "query": " ".join(query_tokens), "position": position}
        )["score"]

    def search(self, query, k=5):
        if not isinstance(k, int) or isinstance(k, bool) or not 0 <= k <= 10000:
            raise ValueError("k must be an integer between 0 and 10000")
        hits = self._request({"query": query, "k": len(self.documents)})["results"]
        # 同分排序前恢复调用方 ID；生成的文件名只是进程通信细节。
        results = [(self._ids[hit["doc_id"]], hit["score"]) for hit in hits]
        return sorted(results, key=lambda item: (-item[1], item[0]))[:k]
