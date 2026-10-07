"""引用格式与校验。
带引用句子以 [S3] 或 [S3][S7] 等标记结尾，随后为句点。仅使用标准库。
配套课程：projects/research-report-agent/stages/04-write-with-citations/docs/en.md"""

import re
from dataclasses import dataclass

CITE_RE = re.compile(r"\[(S\d+)\]")
TRAILING_CITES_RE = re.compile(r"((?:\s*\[S\d+\])+)\s*[.!?]?\s*$")
SENTENCE_BOUNDARY_RE = re.compile(r"(?<=\][.!?])\s+|(?<=[.!?])\s+(?=[A-Z0-9\[])")


@dataclass(frozen=True)
class CitationError:
    sentence: str
    reason: str


def cites_of(sentence):
    """返回句子末尾的引用 ID，例如 ['S2', 'S7']。"""
    raise NotImplementedError(
        "Stage 4: implement cites_of in report_agent/citations.py"
    )


def strip_cites(sentence):
    """返回移除引用标记与末尾标点后的句子文本。"""
    raise NotImplementedError(
        "Stage 4: implement strip_cites in report_agent/citations.py"
    )


def report_sentences(markdown):
    """将报告 Markdown 拆成句子，跳过空行与标题。"""
    raise NotImplementedError(
        "Stage 4: implement report_sentences in report_agent/citations.py"
    )


def validate_citations(markdown, snippet_ids):
    """为每个无引用句子返回 CitationError（uncited），为每个未知引用返回
    CitationError（例如 dangling:S9）。空列表表示报告有效。"""
    raise NotImplementedError(
        "Stage 4: implement validate_citations in report_agent/citations.py"
    )
