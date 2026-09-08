"""阶段 13 第 04 课：结构化输出（Structured output），JSON Schema 2020-12 子集。

使用标准库实现 JSON Schema 验证器，支持 type、required、enum、minimum、
maximum、minLength、maxLength、pattern、items 和 additionalProperties。
围绕发票（Invoice）模式展示三类失败：

  - 解析错误（Parse error）：JSON 无效；严格模式下不会发生
  - 模式违规（Schema violation）：成功解析，但内容不符合模式
  - 拒绝（Refusal）：模型拒绝请求；作为带类型的结果处理

运行： python code/main.py
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any


INVOICE_SCHEMA = {
    "type": "object",
    "properties": {
        "customer": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
        },
        "line_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sku": {"type": "string", "pattern": "^[A-Z0-9-]+$"},
                    "qty": {"type": "integer", "minimum": 1},
                    "unit_usd": {"type": "number", "minimum": 0},
                },
                "required": ["sku", "qty", "unit_usd"],
                "additionalProperties": False,
            },
        },
        "total_usd": {"type": "number", "minimum": 0},
        "currency": {"type": "string", "enum": ["USD", "EUR", "INR"]},
    },
    "required": ["customer", "line_items", "total_usd", "currency"],
    "additionalProperties": False,
}


@dataclass
class ValidationError:
    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


def validate(schema: dict, value: Any, path: str = "$") -> list[ValidationError]:
    errors: list[ValidationError] = []
    t = schema.get("type")
    if t == "object":
        if not isinstance(value, dict):
            return [ValidationError(path, f"预期为对象（Object），实际为 {type(value).__name__}")]
        required = schema.get("required", [])
        props = schema.get("properties", {})
        for field in required:
            if field not in value:
                errors.append(ValidationError(f"{path}.{field}", "缺少必填字段"))
        if schema.get("additionalProperties") is False:
            extras = set(value) - set(props)
            for extra in extras:
                errors.append(ValidationError(f"{path}.{extra}", "不允许额外属性"))
        for key, sub in props.items():
            if key in value:
                errors.extend(validate(sub, value[key], f"{path}.{key}"))
        return errors
    if t == "array":
        if not isinstance(value, list):
            return [ValidationError(path, f"预期为数组（Array），实际为 {type(value).__name__}")]
        item_schema = schema.get("items")
        if item_schema is not None:
            for i, item in enumerate(value):
                errors.extend(validate(item_schema, item, f"{path}[{i}]"))
        return errors
    if t == "string":
        if not isinstance(value, str):
            errors.append(ValidationError(path, f"预期为字符串（String），实际为 {type(value).__name__}"))
            return errors
        if "minLength" in schema and len(value) < schema["minLength"]:
            errors.append(ValidationError(path, f"长度小于 minLength {schema['minLength']}"))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(ValidationError(path, f"长度大于 maxLength {schema['maxLength']}"))
        if "pattern" in schema and not re.match(schema["pattern"], value):
            errors.append(ValidationError(path, f"不匹配 pattern {schema['pattern']!r}"))
    elif t == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            errors.append(ValidationError(path, f"预期为数值（Number），实际为 {type(value).__name__}"))
            return errors
    elif t == "integer":
        if not isinstance(value, int) or isinstance(value, bool):
            errors.append(ValidationError(path, f"预期为整数（Integer），实际为 {type(value).__name__}"))
            return errors
    elif t == "boolean":
        if not isinstance(value, bool):
            errors.append(ValidationError(path, f"预期为布尔值（Boolean），实际为 {type(value).__name__}"))
            return errors
    if "minimum" in schema and isinstance(value, (int, float)) and value < schema["minimum"]:
        errors.append(ValidationError(path, f"低于 minimum {schema['minimum']}"))
    if "maximum" in schema and isinstance(value, (int, float)) and value > schema["maximum"]:
        errors.append(ValidationError(path, f"高于 maximum {schema['maximum']}"))
    if "enum" in schema and value not in schema["enum"]:
        errors.append(ValidationError(path, f"值 {value!r} 不在枚举（Enum）中 {schema['enum']}"))
    return errors


@dataclass
class ParsedResult:
    kind: str
    payload: Any
    errors: list[ValidationError]


def process_model_output(raw: str, schema: dict) -> ParsedResult:
    """三分支处理器：解析错误、拒绝、成功或模式违规。"""
    if raw.startswith("__REFUSAL__"):
        return ParsedResult("refusal", raw.removeprefix("__REFUSAL__").strip(), [])
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        return ParsedResult("parse_error", None, [ValidationError("$", str(e))])
    errs = validate(schema, parsed)
    if errs:
        return ParsedResult("violation", parsed, errs)
    return ParsedResult("ok", parsed, [])


TEST_CASES = [
    (
        "正常路径（Happy path）",
        json.dumps({
            "customer": "Acme Corp",
            "line_items": [
                {"sku": "ABC-123", "qty": 2, "unit_usd": 49.99},
                {"sku": "XYZ-9", "qty": 1, "unit_usd": 120.00},
            ],
            "total_usd": 219.98,
            "currency": "USD",
        }),
    ),
    (
        "解析错误（末尾多余逗号）",
        '{"customer": "Acme", "line_items": [], "total_usd": 0, "currency": "USD",}',
    ),
    (
        "模式违规（额外字段、无效 sku）",
        json.dumps({
            "customer": "Acme",
            "line_items": [{"sku": "abc_123", "qty": 1, "unit_usd": 10, "discount": 0.1}],
            "total_usd": 10,
            "currency": "USD",
        }),
    ),
    (
        "模式违规（缺少必填字段）",
        json.dumps({"customer": "Acme", "line_items": []}),
    ),
    (
        "拒绝（模型拒绝请求）",
        "__REFUSAL__ The provided text is a song lyric, not an invoice.",
    ),
]


def main() -> None:
    print("=" * 72)
    print("阶段 13 第 04 课：结构化输出（Structured Output）")
    print("=" * 72)
    print("\n发票模式的键：",
          list(INVOICE_SCHEMA["properties"].keys()))
    print()

    for name, raw in TEST_CASES:
        print("-" * 72)
        print(f"测试： {name}")
        print(f"  原始内容： {raw[:80]}...")
        result = process_model_output(raw, INVOICE_SCHEMA)
        print(f"  结果类型： {result.kind}")
        if result.kind == "ok":
            print(f"  载荷中的 customer = {result.payload['customer']}")
            print(f"  total_usd        = {result.payload['total_usd']}")
        elif result.kind == "refusal":
            print(f"  原因： {result.payload}")
        else:
            for e in result.errors:
                print(f"  错误： {e}")
        print()

    print("总结：严格模式在服务商侧消除了 parse_error 和 violation 分支；")
    print("你的代码仍需将拒绝作为带类型的结果处理。")


if __name__ == "__main__":
    main()
