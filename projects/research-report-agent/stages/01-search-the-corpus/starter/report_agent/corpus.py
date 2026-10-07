"""研究报告智能体的语料加载。
读取带有简短 key: value 头部的 Markdown 文档，仅使用标准库。
配套课程：projects/research-report-agent/stages/01-search-the-corpus/docs/en.md"""

from dataclasses import dataclass
from pathlib import Path

HEADER_KEYS = ("title", "source_url", "published")


@dataclass(frozen=True)
class Document:
    id: str
    title: str
    source_url: str
    published: str
    text: str


def parse_document(doc_id, raw):
    """将一份 Markdown 文件解析为 Document。
    文件依次包含 `key: value` 头部（title、source_url、published）、空行和正文。
    缺少任何头部键时抛出 ValueError；Document.text 为不含头部且去掉两端空白的正文。"""
    raise NotImplementedError(
        "Stage 1: implement parse_document in report_agent/corpus.py"
    )


def load_corpus(path):
    """按文件名排序，加载 `path` 下的所有 *.md 文件。
    文档 ID 为文件名主干，例如 `04-user-space-kernel`。目录不存在时抛出 FileNotFoundError。"""
    raise NotImplementedError(
        "Stage 1: implement load_corpus in report_agent/corpus.py"
    )
