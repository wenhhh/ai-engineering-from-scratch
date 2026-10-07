"""使用精确来源偏移量抽取片段。
每个片段保留 (start, end)，使文本等于 document.text[start:end]，供后续引用检查。
仅使用标准库。
配套课程：projects/research-report-agent/stages/02-extract-snippets/docs/en.md"""

import re
from dataclasses import dataclass

from report_agent.search import tokenize

SENTENCE_END_RE = re.compile(r"[.!?](?=\s+[A-Za-z0-9\"(]|\s*$)")


@dataclass(frozen=True)
class Snippet:
    id: str
    doc_id: str
    start: int
    end: int
    text: str
    score: float


def split_sentences(text):
    """返回 `text` 中句子的 (start, end) 区间。
    句点、感叹号或问号后跟空白及字母、数字、引号、括号，或到达文本末尾时结束句子。
    区间排除两端空白；保留末尾没有句点的片段。"""
    raise NotImplementedError(
        "Stage 2: implement split_sentences in report_agent/snippets.py"
    )


CONTEXT_DEPENDENT_STARTS = frozenset(
    {"it", "its", "this", "that", "these", "those", "they", "their", "he", "she"}
)


def score_sentence(sentence, query_tokens, idf, min_words=6):
    """对句子与查询的匹配程度评分。
    少于 `min_words` 个词时返回 0.0；否则累加句子中出现的查询词的 idf。
    若以 It、This 等依赖上下文的词开头，分数减半。"""
    raise NotImplementedError(
        "Stage 2: implement score_sentence in report_agent/snippets.py"
    )


def extract_snippets(
    query, index, k_docs=4, per_doc=3, start_id=1, min_score=0.0, doc_ids=None
):
    """返回最佳句子的 Snippet 对象，最佳项在前。
    检索前 `k_docs` 份文档；提供 `doc_ids` 时只处理指定文档。每份文档最多保留 `per_doc` 个
    score > min_score 的句子，对全部候选排序，编号为 S{start_id}、S{start_id+1} 等。
    Snippet.text 必须等于 document.text[start:end]。"""
    raise NotImplementedError(
        "Stage 2: implement extract_snippets in report_agent/snippets.py"
    )
