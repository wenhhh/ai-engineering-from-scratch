"""使用标准库实现工具注册表（Tool registry），支持 JSON 结构定义（JSON Schema）子集校验与并行分派。

子集：必填字段、string/int/number/bool/array/object、enum、minimum/maximum。
每次校验失败均返回结构化观察结果（Observation），以便智能体重试。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class ToolDef:
    name: str
    description: str
    input_schema: dict[str, Any]
    executor: Callable[..., str]
    timeout_s: float = 5.0


@dataclass
class ToolCall:
    tool_use_id: str
    name: str
    args: dict[str, Any]


@dataclass
class ToolResult:
    tool_use_id: str
    ok: bool
    content: str


def _coerce(value: Any, schema: dict[str, Any]) -> tuple[Any, str | None]:
    t = schema.get("type")
    if t == "integer":
        if isinstance(value, int) and not isinstance(value, bool):
            return value, None
        if isinstance(value, str):
            try:
                return int(value), None
            except ValueError:
                return value, f"无法将字符串 {value!r} 转换为整数（Integer）"
        return value, f"需要整数（Integer），实际为 {type(value).__name__}"
    if t == "number":
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value), None
        if isinstance(value, str):
            try:
                return float(value), None
            except ValueError:
                return value, f"无法将字符串 {value!r} 转换为数值（Number）"
        return value, f"需要数值（Number），实际为 {type(value).__name__}"
    if t == "boolean":
        if isinstance(value, bool):
            return value, None
        return value, f"需要布尔值（Boolean），实际为 {type(value).__name__}"
    if t == "string":
        if isinstance(value, str):
            return value, None
        return value, f"需要字符串（String），实际为 {type(value).__name__}"
    if t == "array":
        if isinstance(value, list):
            return value, None
        return value, f"需要数组（Array），实际为 {type(value).__name__}"
    if t == "object":
        if isinstance(value, dict):
            return value, None
        return value, f"需要对象（Object），实际为 {type(value).__name__}"
    return value, None


def validate(args: dict[str, Any], schema: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    props = schema.get("properties", {})
    required = schema.get("required", [])
    out: dict[str, Any] = {}

    for name in required:
        if name not in args:
            errors.append(f"缺少必填字段：{name}")

    for name, value in args.items():
        prop = props.get(name)
        if prop is None:
            errors.append(f"未知字段：{name}")
            continue
        coerced, err = _coerce(value, prop)
        if err:
            errors.append(f"{name}: {err}")
            continue
        if "enum" in prop and coerced not in prop["enum"]:
            errors.append(f"{name}: {coerced!r} 不在允许值中 {prop['enum']}")
            continue
        if prop.get("type") in ("number", "integer"):
            if "minimum" in prop and coerced < prop["minimum"]:
                errors.append(f"{name}: {coerced} < 最小值（minimum） {prop['minimum']}")
                continue
            if "maximum" in prop and coerced > prop["maximum"]:
                errors.append(f"{name}: {coerced} > 最大值（maximum） {prop['maximum']}")
                continue
        out[name] = coerced

    return out, errors


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDef] = {}

    def register(self, tool: ToolDef) -> None:
        self._tools[tool.name] = tool

    def catalog(self) -> list[dict[str, Any]]:
        return [
            {"name": t.name, "description": t.description,
             "input_schema": t.input_schema}
            for t in self._tools.values()
        ]

    def dispatch(self, call: ToolCall) -> ToolResult:
        tool = self._tools.get(call.name)
        if tool is None:
            return ToolResult(call.tool_use_id, False,
                              f"错误：未知工具 {call.name!r}")
        validated, errors = validate(call.args, tool.input_schema)
        if errors:
            return ToolResult(call.tool_use_id, False,
                              "校验错误：" + "; ".join(errors))
        try:
            return ToolResult(call.tool_use_id, True, tool.executor(**validated))
        except Exception as e:
            return ToolResult(call.tool_use_id, False,
                              f"执行错误：{type(e).__name__}: {e}")

    def dispatch_many(self, calls: list[ToolCall]) -> list[ToolResult]:
        return [self.dispatch(c) for c in calls]


def add(a: int, b: int) -> str:
    return str(a + b)


def multiply(a: int, b: int) -> str:
    return str(a * b)


def classify(status: str) -> str:
    return f"分类为 {status}"


def main() -> None:
    print("=" * 70)
    print("工具使用（Tool use）与函数调用（Function calling）——第 14 阶段，第 06 课")
    print("=" * 70)

    reg = ToolRegistry()
    reg.register(ToolDef(
        name="add",
        description="将两个整数 a 和 b 相加。适用于任意整数加法。",
        input_schema={
            "type": "object",
            "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
            "required": ["a", "b"],
        },
        executor=add,
    ))
    reg.register(ToolDef(
        name="multiply",
        description="将两个整数 a 和 b 相乘。优先使用乘法，而非循环累加。",
        input_schema={
            "type": "object",
            "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
            "required": ["a", "b"],
        },
        executor=multiply,
    ))
    reg.register(ToolDef(
        name="classify",
        description="将状态归入允许的标签之一。",
        input_schema={
            "type": "object",
            "properties": {"status": {"type": "string",
                                       "enum": ["open", "closed", "pending"]}},
            "required": ["status"],
        },
        executor=classify,
    ))

    print("\n工具目录（呈现给模型的内容）")
    for entry in reg.catalog():
        print(f"  - {entry['name']}: {entry['description']}")

    calls = [
        ToolCall("u01", "add", {"a": 2, "b": 3}),
        ToolCall("u02", "multiply", {"a": "4", "b": 5}),
        ToolCall("u03", "classify", {"status": "in_progress"}),
        ToolCall("u04", "classify", {"status": "open"}),
        ToolCall("u05", "subtract", {"a": 1, "b": 2}),
    ]
    print("\n并行分派（Parallel dispatch，一轮内调用 5 次）")
    for result in reg.dispatch_many(calls):
        tag = "通过 " if result.ok else "错误"
        print(f"  {result.tool_use_id} {tag}: {result.content}")

    print()
    print("观察结果的形式：每次校验失败均返回结构化错误字符串，")
    print("供智能体读取并据此重试，绝不向循环抛出异常。")


if __name__ == "__main__":
    main()
