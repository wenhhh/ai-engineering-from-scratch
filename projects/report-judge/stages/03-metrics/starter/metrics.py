"""报告精确率、覆盖率与来源召回率

配套课程：projects/report-judge/stages/03-metrics/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

from claims import parse_claims

from support import judge_claim


def score_report(text, evidence, expected_sources=(), facts=()):
    raise NotImplementedError("Stage 3: implement score_report")
