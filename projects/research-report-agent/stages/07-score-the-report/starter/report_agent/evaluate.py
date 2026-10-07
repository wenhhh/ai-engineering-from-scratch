"""对已签入的公开评估夹具评分。
指标采用简单、可检查的引用支持定义，仅使用标准库。
配套课程：projects/research-report-agent/stages/07-score-the-report/docs/en.md"""

import json
from dataclasses import dataclass, field
from pathlib import Path

from report_agent.critic import support_score
from report_agent.pipeline import run_pipeline

WEIGHTS = {"citation_precision": 0.4, "source_recall": 0.3, "fact_coverage": 0.3}


@dataclass
class QuestionScore:
    id: str
    question: str
    citation_precision: float
    source_recall: float
    fact_coverage: float
    terminal_state: str


@dataclass
class Scorecard:
    questions: list = field(default_factory=list)

    def mean(self, metric):
        """返回所有问题的 `metric` 平均值，保留四位小数。"""
        raise NotImplementedError(
            "Stage 7: implement Scorecard.mean in report_agent/evaluate.py"
        )

    def score(self):
        """根据 WEIGHTS 返回百分制加权得分，保留一位小数。"""
        raise NotImplementedError(
            "Stage 7: implement Scorecard.score in report_agent/evaluate.py"
        )


def citation_precision(report, threshold=0.8):
    """计算已发布句子中，其引用的最佳 support_score 至少达到 `threshold` 的比例。
    空报告返回 0.0。"""
    raise NotImplementedError(
        "Stage 7: implement citation_precision in report_agent/evaluate.py"
    )


def source_recall(report, expected_docs):
    """报告引用的预期文档比例；没有预期文档时返回 1.0。"""
    raise NotImplementedError(
        "Stage 7: implement source_recall in report_agent/evaluate.py"
    )


def fact_coverage(report, key_facts):
    """关键事实由词项列表表示；计算至少一个句子包含全部词项的事实比例，不区分大小写。
    没有关键事实时返回 1.0。"""
    raise NotImplementedError(
        "Stage 7: implement fact_coverage in report_agent/evaluate.py"
    )


def evaluate(questions_path, corpus_dir, model=None):
    """为 JSON 文件中的每个问题运行流水线，返回 Scorecard。"""
    raise NotImplementedError("Stage 7: implement evaluate in report_agent/evaluate.py")


def format_scorecard(card):
    """返回逐题指标表、平均值和 'score N / 100'。"""
    raise NotImplementedError(
        "Stage 7: implement format_scorecard in report_agent/evaluate.py"
    )
