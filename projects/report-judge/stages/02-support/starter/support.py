"""计算平均分前先核查证据

配套课程：projects/report-judge/stages/02-support/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import re


def support(claim, source):
    raise NotImplementedError("Stage 2: implement support")


def judge_claim(claim, evidence, threshold=0.8):
    raise NotImplementedError("Stage 2: implement judge_claim")
