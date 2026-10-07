import json
from strands_adapter import run_strands, parse_model_plan

print("真实 Strands Agent 配合注入的离线流式 Model；不调用云服务")
result = run_strands(
    "Inspect service-a", '[{"operation":"metrics.read","resource":"service-a"}]'
)
print(
    json.dumps(
        {**result, "validated_plan": parse_model_plan(result["text"], {"service-a"})},
        indent=2,
    )
)
