"""用本地模型驱动真实 Strands 循环。

课程：projects/cloud-agent-with-aws-strands/stages/04-strands-adapter/docs/en.md
本实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
译注：真实 SDK 本地模型测试与真实 AWS/Bedrock 调用分别验证，默认测试不覆盖后者。
"""

import json

from plan import validate_plan


def parse_model_plan(text, scope):
    raise NotImplementedError("Stage 4: implement parse_model_plan")


def run_strands(prompt, reply):
    raise NotImplementedError("Stage 4: implement run_strands")


def bedrock_agent(model_id, region):
    raise NotImplementedError("Stage 4: implement bedrock_agent")
