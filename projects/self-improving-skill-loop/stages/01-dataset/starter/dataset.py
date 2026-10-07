"""划分标注用例并避免身份泄漏。

课程： projects/self-improving-skill-loop/stages/01-dataset/docs/en.md
实现为原创，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib


def split_cases(cases, holdout_fraction=0.25):
    raise NotImplementedError("Stage 1: implement split_cases")
