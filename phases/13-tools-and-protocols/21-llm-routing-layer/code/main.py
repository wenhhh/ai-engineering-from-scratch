"""阶段 13，第 21 课：使用标准库实现大语言模型路由网关。

接收兼容 OpenAI 格式的请求，由按优先级排列的回退链选择后端，
并逐请求计算费用。分派前先对个人身份信息（PII）进行脱敏。

后端提供方均为桩实现；把某个后端设为“故障”即可演示回退过程。
译注：价格是演示用的假设值，不代表当前报价。词元数按输入字符长度估算，
因此英文输入不改动：explain MCP 为“解释 MCP”，same request 为“相同请求”，
help 为“求助”；SSN 示例请求表示“请通过这个美国社会安全号码联系我”，
只用于演示正则脱敏，不是实际联系方式。[REDACTED] 表示“已脱敏”，
all providers failed 表示“所有提供方均失败”。路由别名和错误字符串保留原样。

运行：python code/main.py
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from typing import Callable


# 每百万词元的费用（输入、输出）；以下为演示用的虚拟费率
PRICES = {
    "openai/gpt-4o":           (5.0, 15.0),
    "openai/gpt-4o-mini":      (0.15, 0.60),
    "anthropic/claude-sonnet": (3.0, 15.0),
    "anthropic/claude-haiku":  (0.80, 4.0),
    "google/gemini-pro":       (1.25, 5.0),
}

OUTAGE: set[str] = set()


def provider_call(model: str, messages: list[dict]) -> dict:
    if model in OUTAGE:
        raise RuntimeError(f"simulated 5xx from {model}")
    time.sleep(0.01)
    last = messages[-1]["content"]
    out_toks = max(20, len(last) // 3)
    return {
        "id": f"resp_{model.replace('/', '_')}",
        "model": model,
        "choices": [{"message": {"role": "assistant",
                                 "content": f"[{model}] 回显：{last[:60]}"}}],
        "usage": {"prompt_tokens": len(last) // 4, "completion_tokens": out_toks},
    }


# 路由别名 -> 回退链
ROUTES = {
    "smart": ["openai/gpt-4o", "anthropic/claude-sonnet", "google/gemini-pro"],
    "fast":  ["openai/gpt-4o-mini", "anthropic/claude-haiku"],
}


PII_PATTERNS = [
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),  # 美国社会安全号码（SSN）
    re.compile(r"\b\d{16}\b"),               # 信用卡号
]


def redact_pii(text: str) -> tuple[str, bool]:
    redacted = False
    for pat in PII_PATTERNS:
        if pat.search(text):
            text = pat.sub("[REDACTED]", text)
            redacted = True
    return text, redacted


@dataclass
class Invocation:
    alias: str
    chosen_model: str = ""
    attempts: list[str] = field(default_factory=list)
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    redacted: bool = False
    response: dict | None = None
    error: str | None = None


def route(alias: str, messages: list[dict]) -> Invocation:
    inv = Invocation(alias=alias)
    # 对输入中的个人身份信息进行脱敏
    new_msgs = []
    for m in messages:
        txt, r = redact_pii(m["content"])
        if r:
            inv.redacted = True
        new_msgs.append({"role": m["role"], "content": txt})
    chain = ROUTES.get(alias, [alias])
    for model in chain:
        inv.attempts.append(model)
        try:
            resp = provider_call(model, new_msgs)
            inv.chosen_model = model
            inv.response = resp
            u = resp["usage"]
            inv.input_tokens = u["prompt_tokens"]
            inv.output_tokens = u["completion_tokens"]
            in_rate, out_rate = PRICES.get(model, (0, 0))
            inv.cost_usd = (u["prompt_tokens"] * in_rate +
                            u["completion_tokens"] * out_rate) / 1_000_000
            return inv
        except RuntimeError as e:
            continue
    inv.error = "all providers failed"
    return inv


def demo() -> None:
    print("=" * 72)
    print("阶段 13，第 21 课——大语言模型路由网关")
    print("=" * 72)

    print("\n--- 场景 1：smart 路由，主后端可用 ---")
    inv = route("smart", [{"role": "user", "content": "explain MCP"}])
    print(f"  所选模型：{inv.chosen_model}")
    print(f"  尝试列表：{inv.attempts}")
    print(f"  词元数量：输入={inv.input_tokens} 输出={inv.output_tokens}")
    print(f"  费用    ：${inv.cost_usd:.6f}")
    print(f"  回复    ：{inv.response['choices'][0]['message']['content']}")

    print("\n--- 场景 2：openai/gpt-4o 故障，回退到 Claude ---")
    OUTAGE.add("openai/gpt-4o")
    inv = route("smart", [{"role": "user", "content": "same request"}])
    print(f"  所选模型：{inv.chosen_model}")
    print(f"  尝试列表：{inv.attempts}")
    print(f"  费用    ：${inv.cost_usd:.6f}")
    OUTAGE.clear()

    print("\n--- 场景 3：分派前对输入中的个人身份信息进行脱敏 ---")
    inv = route("fast", [{"role": "user",
                           "content": "contact me at SSN 123-45-6789 please"}])
    print(f"  已脱敏  ：{inv.redacted}")
    print(f"  回复    ：{inv.response['choices'][0]['message']['content']}")

    print("\n--- 场景 4：所有提供方均不可用 ---")
    OUTAGE.update(ROUTES["fast"])
    inv = route("fast", [{"role": "user", "content": "help"}])
    print(f"  尝试列表：{inv.attempts}")
    print(f"  错误    ：{inv.error}")


if __name__ == "__main__":
    demo()
