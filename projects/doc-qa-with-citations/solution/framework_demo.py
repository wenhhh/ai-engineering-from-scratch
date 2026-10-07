import json
from adapter import framework_qa

print("通过真实 LangChain 组件运行本地夹具；不调用云服务（Real LangChain splitter and FakeListLLM, no network calls）")
print(
    json.dumps(
        framework_qa(
            "guest kernel",
            {"id": "doc", "text": "Each guest owns a separate kernel."},
            '{"source":"doc:0","quote":"Each guest owns a separate kernel."}',
        ),
        indent=2,
    )
)
