"""只接受检索区间能够支持的回答

阶段：projects/doc-qa-with-citations/stages/03-answer/docs/en.md
原创实现，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import json


def answer(question, chunks, model):
    if not chunks:
        return {"answer": None, "citations": [], "state": "abstained"}
    prompt = json.dumps(
        {
            "question": question,
            "evidence": [{"id": c["id"], "text": c["text"]} for c in chunks],
        }
    )
    raw = model(prompt)
    payload = json.loads(raw)
    if (
        not isinstance(payload, dict)
        or not isinstance(payload.get("quote"), str)
        or not payload["quote"].strip()
    ):
        raise ValueError("model must return a quote and source id")
    source = next((c for c in chunks if c["id"] == payload.get("source")), None)
    if source is None or payload["quote"] not in source["text"]:
        raise ValueError("unsupported model answer")
    relative = source["text"].index(payload["quote"])
    return {
        "answer": payload["quote"],
        "citations": [
            {
                "source": source["source"],
                "start": source["start"] + relative,
                "end": source["start"] + relative + len(payload["quote"]),
            }
        ],
        "state": "answered",
    }
