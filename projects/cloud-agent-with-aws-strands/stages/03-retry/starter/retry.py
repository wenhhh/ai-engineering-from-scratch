"""重试暂时失败的读取并复用已完成请求。

课程：projects/cloud-agent-with-aws-strands/stages/03-retry/docs/en.md
本实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib

import json


def request_key(operation, resource):
    raise NotImplementedError("Stage 3: implement request_key")


def cached_read(operation, resource, provider, cache, retries=2):
    raise NotImplementedError("Stage 3: implement cached_read")
