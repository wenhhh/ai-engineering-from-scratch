"""语料库上的 BM25 关键词检索。
评分遵循 Robertson 与 Zaragoza 的 The Probabilistic Relevance Framework:
BM25 and Beyond（2009）。仅使用标准库。英文分词规则保留原值。
配套课程：projects/research-report-agent/stages/01-search-the-corpus/docs/en.md"""

import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[a-z0-9]+")

STOPWORDS = frozenset(
    "a an and are as at be by can do does for from has have how if in into is it its "
    "not of on or so such that the their them then there these this to was what when "
    "where which while who why will with you your".split()
)


def tokenize(text):
    """将 `text` 转小写，保留连续字母与数字，并移除 STOPWORDS。"""
    raise NotImplementedError("Stage 1: implement tokenize in report_agent/search.py")


def engine_binary():
    """从私有 rra-private-build- 目录返回已编译 search 可执行文件的 Path。"""
    raise NotImplementedError("Stage 1: implement engine_binary in report_agent/search.py")


class BM25Index:
    def __init__(self, documents, k1=1.5, b=0.75):
        """编译 search/main.rs，使用其 JSON idf 响应。
        保留调用方文档以供片段抽取；安全保存临时语料，使用参数数组和超时调用二进制，
        从 Rust 响应设置 self.idf。BM25 评分由 Rust 完成，适配器不重复实现。"""
        raise NotImplementedError("Stage 1: implement the Rust process adapter")

    def score(self, query_tokens, position):
        """向 Rust 进程请求文档分数。"""
        raise NotImplementedError("Stage 1: implement the score request")

    def search(self, query, k=5):
        """向 Rust 请求排名，返回（调用方文档 ID，分数）对。"""
        raise NotImplementedError("Stage 1: implement the search request")
