# 源码与模型提示、错误和状态保持原契约；只添加中文说明，不连接真实账户。
import asyncio
import json
from adk_adapter import run_adk

print("Real ADK Workflow, two LlmAgents, injected offline BaseLlm models")
print(json.dumps(asyncio.run(run_adk("Please review the invoice.")), indent=2))
