"""只接受检索区间能够支持的回答

阶段：projects/doc-qa-with-citations/stages/03-answer/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import json


def answer(question, chunks, model):
    raise NotImplementedError("Stage 3: implement answer")
