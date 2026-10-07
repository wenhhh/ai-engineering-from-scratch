"""研究规划：将一个问题拆成待检索的多个方面。
默认采用确定性规则规划器，可用 Model 替换；受支持的错误输出回退至规则。
仅使用标准库。规划模板和关键词参与检索与回放契约，保留原值。
配套课程：projects/research-report-agent/stages/03-plan-the-research/docs/en.md"""

import json
import re
from dataclasses import dataclass, field

from report_agent.search import tokenize

LEADING_WORDS = frozenset(
    "what how why when which who where do does did is are was were should can could would "
    "the a an".split()
)

FACET_TEMPLATES = (
    ("Overview", "What is {subject}?", ()),
    ("How it works", "How does {subject} work?", ("works", "uses", "runs")),
    (
        "Risks and limits",
        "What are the risks and limits of {subject}?",
        ("risk", "attack", "escape", "weakness", "cost"),
    ),
    (
        "When to use it",
        "When should teams use {subject}?",
        ("use", "teams", "tradeoff", "overhead"),
    ),
)


@dataclass(frozen=True)
class Facet:
    id: str
    sub_question: str
    keywords: tuple
    label: str = ""

    def query(self):
        """返回该方面的检索文本：sub_question 加 keywords。"""
        raise NotImplementedError(
            "Stage 3: implement Facet.query in report_agent/planner.py"
        )


@dataclass
class Plan:
    question: str
    facets: list
    source: str = "rules"
    notes: list = field(default_factory=list)


def subject_of(question):
    """移除 `question` 末尾标点及开头疑问词。"""
    raise NotImplementedError(
        "Stage 3: implement subject_of in report_agent/planner.py"
    )


def rule_plan(question, max_facets=4):
    """根据 FACET_TEMPLATES 构建研究方面。
    ID 为 F1、F2 等。关键词为问题词元与模板附加词，去除重复；标签来自模板。"""
    raise NotImplementedError("Stage 3: implement rule_plan in report_agent/planner.py")


def build_planner_prompt(question, max_facets=4):
    return (
        "You plan research for a cited report.\n"
        f"Split the question into at most {max_facets} facets.\n"
        'Reply with JSON only: {"facets": [{"sub_question": "...", "keywords": ["..."]}]}\n'
        f"Question: {question}"
    )


def parse_model_facets(raw, max_facets):
    """将模型回答解析为 Facet 列表。
    回答必须为 JSON，包含非空 `facets` 列表；每项须有字符串 `sub_question` 和字符串
    列表 `keywords`，label 可选。其他情况抛出 ValueError。"""
    raise NotImplementedError(
        "Stage 3: implement parse_model_facets in report_agent/planner.py"
    )


def plan_research(question, model=None, max_facets=4):
    """为 `question` 规划研究。
    空问题抛出 ValueError。没有模型时返回规则计划，source 为 rules。
    有模型时以 purpose=plan 发送 build_planner_prompt() 并解析回答，source 为 model。
    调用或解析出现受支持的异常时，回退到规则计划，source 为 rules-fallback，并在 notes 记录原因。"""
    raise NotImplementedError(
        "Stage 3: implement plan_research in report_agent/planner.py"
    )
