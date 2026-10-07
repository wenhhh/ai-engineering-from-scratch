"""使用框架切分器并保留偏移量

阶段：projects/doc-qa-with-citations/stages/04-adapter/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

from answer import answer

from retrieval import retrieve


def adapt_splits(doc, parts):
    raise NotImplementedError("Stage 4: implement adapt_splits")


def framework_qa(question, doc, response):
    raise NotImplementedError("Stage 4: implement framework_qa")
