"""晋升之前要求独立门禁。

课程： projects/self-improving-skill-loop/stages/04-promotion/docs/en.md
实现为原创，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib

import json

from skill import evaluate


def gate(holdout, baseline, candidate, min_gain=0.05):
    raise NotImplementedError("Stage 4: implement gate")
