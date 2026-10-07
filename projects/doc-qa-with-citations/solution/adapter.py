"""使用框架切分器并保留偏移量

阶段：projects/doc-qa-with-citations/stages/04-adapter/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

from answer import answer
from retrieval import retrieve


def adapt_splits(doc, parts):
    rows = []
    cursor = 0
    for part in parts:
        if not isinstance(part, str) or not part:
            raise ValueError("empty or nonstring chunk")
        start = doc["text"].find(part, cursor)
        if start < 0:
            raise ValueError("splitter changed source text")
        rows.append(
            {
                "id": f"{doc['id']}:{start}",
                "source": doc["id"],
                "start": start,
                "end": start + len(part),
                "text": part,
            }
        )
        cursor = start + 1
    return rows


def framework_qa(question, doc, response):
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.language_models.fake import FakeListLLM

    splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=30)
    chunks = adapt_splits(doc, splitter.split_text(doc["text"]))
    model = FakeListLLM(responses=[response])
    return answer(question, retrieve(chunks, question), model.invoke)
