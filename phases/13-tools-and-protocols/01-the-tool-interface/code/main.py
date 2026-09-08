"""阶段 13 第 01 课：工具接口（Tool interface），不使用 LLM 的四步循环。

实现 2026 年各工具调用（Tool calling）技术栈（OpenAI、Anthropic、Gemini、MCP、A2A）
使用的描述 -> 决策 -> 执行 -> 观察循环。通过关键词路由器模拟“决策”步骤，
使循环可以离线运行；第 02 课会将其替换为
真实服务商的实现。

运行框架（Harness）：
  - 注册三个工具（add、get_time、get_weather）
  - 根据最小 JSON Schema 子集验证工具调用参数
  - 打印每个步骤，便于理解调用编排
  - 将迭代次数限制为 MAX_TURNS，防止循环失控

运行： python code/main.py
"""

from __future__ import annotations

import datetime as dt
import json
import re
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable


MAX_TURNS = 5


@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict
    executor: Callable[[dict], Any]
    consequential: bool = False


def tool_add(args: dict) -> dict:
    return {"sum": args["a"] + args["b"]}


def tool_get_time(args: dict) -> dict:
    tz = args.get("timezone", "UTC")
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    return {"now": now, "timezone": tz}


def tool_get_weather(args: dict) -> dict:
    fake = {"Bengaluru": 28, "Tokyo": 12, "Zurich": 4, "Lagos": 31}
    city = args["city"]
    units = args.get("units", "celsius")
    temp = fake.get(city, 20)
    return {"city": city, "temp": temp, "units": units}


REGISTRY: list[Tool] = [
    Tool(
        name="add",
        description=(
            "用户要求计算两个数之和时使用。"
            "不要用于减法、乘法或符号代数（Symbolic algebra）。"
        ),
        input_schema={
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
        executor=tool_add,
    ),
    Tool(
        name="get_time",
        description=(
            "用户询问当前时间时使用。"
            "不要用于查询历史日期或安排未来日程。"
        ),
        input_schema={
            "type": "object",
            "properties": {
                "timezone": {"type": "string"},
            },
            "required": [],
        },
        executor=tool_get_time,
    ),
    Tool(
        name="get_weather",
        description=(
            "用户询问指定城市的当前天气时使用。"
            "不要用于天气预报或历史天气数据。"
        ),
        input_schema={
            "type": "object",
            "properties": {
                "city": {"type": "string"},
                "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["city"],
        },
        executor=tool_get_weather,
    ),
]


def validate(schema: dict, value: Any) -> list[str]:
    errors: list[str] = []
    t = schema.get("type")
    if t == "object":
        if not isinstance(value, dict):
            return [f"预期为对象（Object），实际为 {type(value).__name__}"]
        for field in schema.get("required", []):
            if field not in value:
                errors.append(f"缺少必填字段 '{field}'")
        for key, sub in schema.get("properties", {}).items():
            if key in value:
                errors.extend(validate(sub, value[key]))
        return errors
    if t == "number" and not isinstance(value, (int, float)):
        errors.append(f"预期为数值（Number），实际为 {type(value).__name__}")
    if t == "string" and not isinstance(value, str):
        errors.append(f"预期为字符串（String），实际为 {type(value).__name__}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"值 {value!r} 不在枚举（Enum）中 {schema['enum']}")
    return errors


def fake_decide(user_msg: str, history: list[dict]) -> dict:
    """模型的替身。根据关键词路由，使循环能够离线运行。

    生产环境替代方式：改用 provider.chat.completions.create，传入
    tools=[t.input_schema for t in REGISTRY]，返回结构保持一致。
    """
    last = history[-1] if history else {}
    if last.get("role") == "tool":
        return {"content": f"根据工具输出生成的最终回答：{last.get('content')}"}
    msg = user_msg.lower()
    if re.search(r"\b(add|sum|plus)\b", msg):
        nums = [float(n) for n in re.findall(r"-?\d+\.?\d*", msg)]
        if len(nums) >= 2:
            return {
                "tool_calls": [
                    {
                        "id": f"call_{uuid.uuid4().hex[:8]}",
                        "name": "add",
                        "arguments": {"a": nums[0], "b": nums[1]},
                    }
                ]
            }
    if "time" in msg:
        return {
            "tool_calls": [
                {
                    "id": f"call_{uuid.uuid4().hex[:8]}",
                    "name": "get_time",
                    "arguments": {"timezone": "UTC"},
                }
            ]
        }
    match = re.search(r"weather in (\w+)", msg)
    if match:
        city = match.group(1).title()
        return {
            "tool_calls": [
                {
                    "id": f"call_{uuid.uuid4().hex[:8]}",
                    "name": "get_weather",
                    "arguments": {"city": city, "units": "celsius"},
                }
            ]
        }
    return {"content": "无法将该查询路由至任何已注册工具。"}


def run_loop(user_msg: str) -> None:
    print("=" * 72)
    print(f"用户： {user_msg}")
    print("-" * 72)
    tools_by_name = {t.name: t for t in REGISTRY}
    history: list[dict] = [{"role": "user", "content": user_msg}]
    for turn in range(1, MAX_TURNS + 1):
        decision = fake_decide(user_msg, history)
        if "content" in decision:
            print(f"第 {turn} 轮 决策（Decide）：最终回答")
            print(f"模型： {decision['content']}")
            return
        for call in decision["tool_calls"]:
            tool = tools_by_name.get(call["name"])
            print(f"第 {turn} 轮 决策（Decide）：调用 {call['name']} id={call['id']}")
            print(f"           参数 = {json.dumps(call['arguments'])}")
            if tool is None:
                print(f"           错误：未知工具 {call['name']}")
                return
            errs = validate(tool.input_schema, call["arguments"])
            if errs:
                print(f"           验证错误：{errs}")
                return
            if tool.consequential:
                print("           门禁（Gate）：该工具会产生实际影响，需要确认")
            start = time.perf_counter()
            result = tool.executor(call["arguments"])
            ms = (time.perf_counter() - start) * 1000
            print(f"第 {turn} 轮 执行（Execute）： {tool.name} -> {json.dumps(result)}"
                  f" [{ms:.2f} ms]")
            history.append({
                "role": "tool", "id": call["id"],
                "name": tool.name, "content": json.dumps(result),
            })
        print(f"第 {turn} 轮 观察（Observe）：历史记录长度 = {len(history)}")
    print("循环已终止：触发 MAX_TURNS 熔断器（Circuit breaker）")


def describe_registry() -> None:
    print("工具注册表（Tool registry）")
    print("-" * 72)
    for t in REGISTRY:
        kind = "有实际影响（Consequential）" if t.consequential else "纯函数（Pure）"
        print(f"  {t.name:14s} [{kind}] - {t.description}")
    print()


def main() -> None:
    print("=" * 72)
    print("阶段 13 第 01 课：工具接口（The Tool Interface）")
    print("=" * 72)
    describe_registry()
    for query in (
        "please add 7 and 35",
        "what time is it?",
        "tell me the weather in Bengaluru",
        "write me a haiku about tea",
    ):
        run_loop(query)
        print()


if __name__ == "__main__":
    main()
