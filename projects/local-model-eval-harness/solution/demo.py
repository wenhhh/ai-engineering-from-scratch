# 合成离线响应夹具，仅用于演示指标，不代表实际模型或硬件基准。
import json
from main import *

records = [
    {"id": "a", "answer": "yes", "confidence": 0.8, "latency_ms": 120},
    {"id": "b", "answer": "yes", "confidence": 0.9, "latency_ms": 200},
    {"id": "c", "answer": "no", "confidence": 0.6, "latency_ms": 150},
]
print(
    json.dumps(
        scorecard(
            records,
            {"a": "yes", "b": "no", "c": "no"},
            "synthetic offline cassette, not a model benchmark",
        ),
        indent=2,
    )
)
