"""模型接口，包含回放记录与可选在线客户端。
测试只使用 ReplayModel。LiveModel 访问 chat-completions 兼容的 /chat/completions 端点，
不是必需依赖。仅使用标准库；在线端点、安全策略与网络故障需另行验证。
配套课程：projects/research-report-agent/stages/03-plan-the-research/docs/en.md"""

import hashlib
import json
import os
import urllib.request
from pathlib import Path
from typing import Protocol


class CassetteMiss(KeyError):
    pass


class Model(Protocol):
    def complete(self, prompt: str, *, purpose: str) -> str: ...


def prompt_key(purpose, prompt):
    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    return f"{purpose}:{digest}"


class ReplayModel:
    def __init__(self, cassette_path):
        """加载调用记录 JSON，按 prompt_key(purpose, prompt) 建索引。
        用 `calls` 列表保留请求过的键。"""
        raise NotImplementedError(
            "Stage 3: implement ReplayModel.__init__ in report_agent/model.py"
        )

    def complete(self, prompt, *, purpose):
        """返回已记录响应，否则抛出 CassetteMiss。"""
        raise NotImplementedError(
            "Stage 3: implement ReplayModel.complete in report_agent/model.py"
        )


class LiveModel:
    def __init__(self, base_url=None, api_key=None, model=None, timeout=60):
        self.base_url = (base_url or os.environ.get("RRA_LLM_BASE_URL", "")).rstrip("/")
        self.api_key = api_key or os.environ.get("RRA_LLM_API_KEY", "")
        self.model = model or os.environ.get("RRA_LLM_MODEL", "")
        self.timeout = timeout
        if not (self.base_url and self.model):
            raise ValueError("set RRA_LLM_BASE_URL and RRA_LLM_MODEL to use LiveModel")

    def complete(self, prompt, *, purpose):
        body = json.dumps(
            {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            self.base_url + "/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
        return payload["choices"][0]["message"]["content"]
