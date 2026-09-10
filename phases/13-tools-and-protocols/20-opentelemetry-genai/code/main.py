"""阶段 13，第 20 课：仅用标准库生成 OTel GenAI 链路片段（span）。

为一个智能体向标准输出写出类似 OTLP-JSON 格式的 span。原文概述的操作包括：
  - 调用大语言模型聊天（gen_ai.operation.name = \"chat\"）
  - 分派两个工具（gen_ai.operation.name = \"execute_tool\"）
  - 发起一次 MCP 客户端调用（CLIENT span，并传播 traceparent）

译注：实际 agent_loop 会调用两次模拟 LLM，并对三个城市分别执行工具和 MCP
调用；加上根 span，共生成 9 个 span。上面的数量沿用原文概述，不应作为断言。
这些调用均为本地模拟，没有连接模型或天气服务。

默认不采集内容（gen_ai.content.prompt / completion）；运行前设置
OTEL_CAPTURE_CONTENT=1 可开启。遥测属性、span 名称和枚举保持原样。
用于按字符长度估算词元数的英文提示词也保持原样，分别表示“用户想查询三个
城市的天气”和“汇总三个天气结果”；sample completion 表示“示例补全文本”。

运行：python code/main.py
"""

from __future__ import annotations

import json
import os
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


CAPTURE_CONTENT = os.environ.get("OTEL_CAPTURE_CONTENT", "0") == "1"


def _hex(n_bytes: int) -> str:
    return uuid.uuid4().hex[: n_bytes * 2]


@dataclass
class Span:
    name: str
    kind: str  # INTERNAL / CLIENT / SERVER：内部操作 / 客户端调用 / 服务端处理
    trace_id: str
    span_id: str
    parent_span_id: str | None = None
    start_ns: int = 0
    end_ns: int = 0
    attrs: dict = field(default_factory=dict)
    events: list[dict] = field(default_factory=list)

    def finish(self) -> None:
        self.end_ns = time.time_ns()

    def add_event(self, name: str, attrs: dict) -> None:
        self.events.append({"time": time.time_ns(), "name": name, "attrs": attrs})

    def to_otlp(self) -> dict:
        return {
            "name": self.name,
            "kind": self.kind,
            "traceId": self.trace_id,
            "spanId": self.span_id,
            "parentSpanId": self.parent_span_id,
            "startTimeUnixNano": self.start_ns,
            "endTimeUnixNano": self.end_ns,
            "attributes": self.attrs,
            "events": self.events,
        }


SPANS: list[Span] = []


def start_span(name: str, kind: str, parent: Span | None = None,
               attrs: dict | None = None) -> Span:
    trace_id = parent.trace_id if parent else _hex(16)
    span = Span(name=name, kind=kind, trace_id=trace_id, span_id=_hex(8),
                parent_span_id=parent.span_id if parent else None,
                start_ns=time.time_ns(), attrs=attrs or {})
    SPANS.append(span)
    return span


def fake_llm_call(span: Span, prompt: str) -> str:
    time.sleep(0.05)
    resp_id = f"resp_{uuid.uuid4().hex[:8]}"
    span.attrs.update({
        "gen_ai.response.id": resp_id,
        "gen_ai.response.model": "gpt-4o-2024-08-06",
        "gen_ai.usage.input_tokens": len(prompt) // 4,
        "gen_ai.usage.output_tokens": random.randint(20, 80),
    })
    if CAPTURE_CONTENT:
        span.add_event("gen_ai.content.prompt", {"content": prompt[:200]})
        span.add_event("gen_ai.content.completion", {"content": "sample completion"})
    return "sample completion"


def fake_tool_execute(span: Span, tool: str, args: dict) -> dict:
    time.sleep(0.03)
    span.attrs.update({
        "gen_ai.tool.name": tool,
        "gen_ai.tool.call.id": f"call_{uuid.uuid4().hex[:8]}",
    })
    return {"content": [{"type": "text", "text": f"{tool} 执行完毕，参数为 {args}"}]}


def fake_mcp_call(parent: Span, tool: str) -> dict:
    mcp_span = start_span("mcp.call", "CLIENT", parent=parent, attrs={
        "gen_ai.operation.name": "execute_tool",
        "gen_ai.tool.name": tool,
        "mcp.server": "notes",
        "mcp.transport": "stdio",
        "net.peer.name": "child_process",
    })
    traceparent = f"00-{mcp_span.trace_id}-{mcp_span.span_id}-01"
    mcp_span.attrs["traceparent"] = traceparent
    time.sleep(0.04)
    mcp_span.finish()
    return {"tool": tool, "result": "ok"}


def agent_loop() -> None:
    root = start_span("agent.invoke_agent", "INTERNAL", attrs={
        "gen_ai.operation.name": "invoke_agent",
        "gen_ai.agent.name": "research-agent",
        "gen_ai.agent.id": "agent_42",
    })

    llm1 = start_span("llm.chat", "CLIENT", parent=root, attrs={
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "openai",
        "gen_ai.request.model": "gpt-4o",
    })
    fake_llm_call(llm1, "user wants weather in three cities")
    llm1.finish()

    for city in ("Bengaluru", "Tokyo", "Zurich"):
        tool_span = start_span("tool.execute", "INTERNAL", parent=root, attrs={
            "gen_ai.operation.name": "execute_tool",
        })
        fake_tool_execute(tool_span, "get_weather", {"city": city})
        fake_mcp_call(tool_span, "get_weather")
        tool_span.finish()

    llm2 = start_span("llm.chat", "CLIENT", parent=root, attrs={
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "openai",
        "gen_ai.request.model": "gpt-4o",
    })
    fake_llm_call(llm2, "synthesize three weather results")
    llm2.finish()

    root.finish()


def main() -> None:
    print("=" * 72)
    print("阶段 13，第 20 课——OTel GenAI 链路片段生成器")
    print(f"  内容采集：{'已开启' if CAPTURE_CONTENT else '已关闭（设置 OTEL_CAPTURE_CONTENT=1 可开启）'}")
    print("=" * 72)

    agent_loop()

    print(f"\n已生成 {len(SPANS)} 个 span，属于同一条 trace")
    print(f"\n类似 OTLP-JSON 格式的 span：\n")
    for span in SPANS:
        summary = {
            "name": span.name,
            "kind": span.kind,
            "trace": span.trace_id[:8] + "...",
            "id": span.span_id[:6] + "...",
            "parent": (span.parent_span_id or "ROOT")[:6],
            "duration_ms": round((span.end_ns - span.start_ns) / 1_000_000, 2),
            "attrs": {k: v for k, v in span.attrs.items() if k.startswith("gen_ai")},
            "events": len(span.events),
        }
        print(json.dumps(summary))

    print("\n试一试：OTEL_CAPTURE_CONTENT=1 python code/main.py")


if __name__ == "__main__":
    main()
