import json


def validate_schema(data, schema):
    errors = []
    _validate(data, schema, "", errors)
    return errors


def _validate(data, schema, path, errors):
    schema_type = schema.get("type")

    if schema_type == "object":
        if not isinstance(data, dict):
            errors.append(f"{path}: 期望对象（Object），实际为 {type(data).__name__}")
            return
        for key in schema.get("required", []):
            if key not in data:
                errors.append(f"{path}.{key}: 缺少必填字段")
        properties = schema.get("properties", {})
        for key, value in data.items():
            if key in properties:
                _validate(value, properties[key], f"{path}.{key}", errors)

    elif schema_type == "array":
        if not isinstance(data, list):
            errors.append(f"{path}: 期望数组（Array），实际为 {type(data).__name__}")
            return
        min_items = schema.get("minItems", 0)
        max_items = schema.get("maxItems", float("inf"))
        if len(data) < min_items:
            errors.append(f"{path}: 数组有 {len(data)} 项，最少需要 {min_items} 项")
        if len(data) > max_items:
            errors.append(f"{path}: 数组有 {len(data)} 项，最多允许 {max_items} 项")
        items_schema = schema.get("items", {})
        for i, item in enumerate(data):
            _validate(item, items_schema, f"{path}[{i}]", errors)

    elif schema_type == "string":
        if not isinstance(data, str):
            errors.append(f"{path}: 期望字符串（String），实际为 {type(data).__name__}")
            return
        enum_values = schema.get("enum")
        if enum_values and data not in enum_values:
            errors.append(f"{path}: '{data}' 不在允许值中 {enum_values}")

    elif schema_type == "number":
        if not isinstance(data, (int, float)):
            errors.append(f"{path}: 期望数值（Number），实际为 {type(data).__name__}")
            return
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and data < minimum:
            errors.append(f"{path}: {data} 小于最小值 {minimum}")
        if maximum is not None and data > maximum:
            errors.append(f"{path}: {data} 大于最大值 {maximum}")

    elif schema_type == "boolean":
        if not isinstance(data, bool):
            errors.append(f"{path}: 期望布尔值（Boolean），实际为 {type(data).__name__}")

    elif schema_type == "integer":
        if not isinstance(data, int) or isinstance(data, bool):
            errors.append(f"{path}: 期望整数（Integer），实际为 {type(data).__name__}")


class SchemaField:
    def __init__(self, field_type, required=True, default=None, enum=None, minimum=None, maximum=None):
        self.field_type = field_type
        self.required = required
        self.default = default
        self.enum = enum
        self.minimum = minimum
        self.maximum = maximum


def python_type_to_schema(field):
    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
    }

    schema = {}

    if field.field_type in type_map:
        schema["type"] = type_map[field.field_type]
    elif field.field_type == list:
        schema["type"] = "array"
        schema["items"] = {"type": "string"}
    elif isinstance(field.field_type, dict):
        schema = field.field_type

    if field.enum:
        schema["enum"] = field.enum
    if field.minimum is not None:
        schema["minimum"] = field.minimum
    if field.maximum is not None:
        schema["maximum"] = field.maximum

    return schema


def model_to_schema(name, fields):
    properties = {}
    required = []

    for field_name, field in fields.items():
        properties[field_name] = python_type_to_schema(field)
        if field.required:
            required.append(field_name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }


def next_valid_tokens(partial_json, schema):
    stripped = partial_json.strip()

    if not stripped:
        return ["{"]

    try:
        json.loads(stripped)
        return ["<EOS>"]
    except json.JSONDecodeError:
        pass

    last_char = stripped[-1] if stripped else ""

    if last_char == "{":
        return ['"', "}"]
    elif last_char == '"':
        if stripped.endswith('":'):
            return ['"', "0-9", "true", "false", "null", "[", "{"]
        return ["a-z", '"']
    elif last_char == ":":
        return [" ", '"', "0-9", "true", "false", "null", "[", "{"]
    elif last_char == ",":
        return [" ", '"', "{", "["]
    elif last_char in "0123456789":
        return ["0-9", ".", ",", "}", "]"]
    elif last_char == "}":
        return [",", "}", "]", "<EOS>"]
    elif last_char == "]":
        return [",", "}", "<EOS>"]
    elif last_char == "[":
        return ['"', "0-9", "true", "false", "null", "{", "[", "]"]
    else:
        return ["any"]


def demonstrate_constrained_decoding():
    partial_states = [
        "",
        "{",
        '{"product"',
        '{"product":',
        '{"product": "Sony"',
        '{"product": "Sony",',
        '{"product": "Sony", "price":',
        '{"product": "Sony", "price": 348',
        '{"product": "Sony", "price": 348}',
    ]

    print(f"\n  {'不完整 JSON（Partial JSON）':<45} {'合法后续词元（Valid Next Tokens）'}")
    print("  " + "-" * 70)
    for state in partial_states:
        valid = next_valid_tokens(state, {})
        display = state if state else "（空）"
        print(f"  {display:<45} {valid}")


def simulate_llm_extraction(text, schema, attempt=0):
    if "headphones" in text.lower() or "sony" in text.lower():
        if attempt == 0:
            return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true, "categories": ["audio", "headphones"]}'
        return '{"product": "Sony WH-1000XM5", "price": 348.00, "in_stock": true}'

    if "laptop" in text.lower() or "macbook" in text.lower():
        return '{"product": "MacBook Pro 16", "price": 2499.00, "in_stock": false, "categories": ["computers"]}'

    if "keyboard" in text.lower():
        return '{"product": "Keychron Q1", "price": 169.00, "in_stock": true, "categories": ["peripherals"]}'

    return '{"product": "Unknown", "price": 0, "in_stock": false}'


def extract_with_retry(text, schema, max_retries=3):
    for attempt in range(max_retries):
        raw = simulate_llm_extraction(text, schema, attempt)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"    尝试 {attempt + 1}: JSON 解析错误 -- {e}")
            continue

        errors = validate_schema(data, schema)
        if not errors:
            return data

        print(f"    尝试 {attempt + 1}: 模式（Schema）验证错误 -- {errors}")

    return None


PRODUCT_SCHEMA = {
    "type": "object",
    "properties": {
        "product": {"type": "string"},
        "price": {"type": "number", "minimum": 0},
        "in_stock": {"type": "boolean"},
        "categories": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["product", "price", "in_stock"],
}


def run_schema_validation_demo():
    print("=" * 60)
    print("  步骤 1: JSON Schema 验证")
    print("=" * 60)

    test_cases = [
        ({"product": "Sony WH-1000XM5", "price": 348.0, "in_stock": True}, "有效的完整对象"),
        ({"product": "Test", "price": 10.0, "in_stock": True, "categories": ["audio"]}, "有效且包含可选数组"),
        ({"product": "Test", "price": -5.0, "in_stock": True}, "价格为负数"),
        ({"product": "Test", "in_stock": True}, "缺少必填字段（price）"),
        ({"product": "Test", "price": "ten", "in_stock": True}, "将字符串用作价格"),
        ({"product": 123, "price": 10.0, "in_stock": True}, "将数值用作产品名称"),
        ("not an object", "使用字符串而非对象"),
        ({"product": "Test", "price": 10.0, "in_stock": "yes"}, "将字符串用作布尔值"),
    ]

    for data, label in test_cases:
        errors = validate_schema(data, PRODUCT_SCHEMA)
        status = "PASS" if not errors else f"FAIL: {errors}"
        print(f"\n  {label}:")
        print(f"    数据（Data）:   {json.dumps(data) if isinstance(data, dict) else repr(data)}")
        print(f"    结果（Result）: {status}")


def run_schema_generation_demo():
    print(f"\n{'=' * 60}")
    print("  步骤 2: 从模型生成模式（Model-to-Schema Generation）")
    print("=" * 60)

    product_fields = {
        "product": SchemaField(str),
        "price": SchemaField(float, minimum=0),
        "in_stock": SchemaField(bool),
        "categories": SchemaField(list, required=False),
        "rating": SchemaField(float, required=False, minimum=0, maximum=5),
    }

    schema = model_to_schema("Product", product_fields)
    print(f"\n  从 Python 模型生成的模式（Schema）:")
    print(f"  {json.dumps(schema, indent=2)}")

    event_fields = {
        "title": SchemaField(str),
        "date": SchemaField(str),
        "attendees": SchemaField(list),
        "priority": SchemaField(str, enum=["low", "medium", "high"]),
        "is_recurring": SchemaField(bool, required=False),
    }

    event_schema = model_to_schema("Event", event_fields)
    print(f"\n  事件模式（Event schema）:")
    print(f"  {json.dumps(event_schema, indent=2)}")

    valid_event = {"title": "Standup", "date": "2026-01-15", "attendees": ["Alice", "Bob"], "priority": "high"}
    invalid_event = {"title": "Standup", "date": "2026-01-15", "attendees": ["Alice"], "priority": "urgent"}

    print(f"\n  根据事件模式进行验证:")
    for data, label in [(valid_event, "有效事件"), (invalid_event, "无效的优先级枚举")]:
        errors = validate_schema(data, event_schema)
        status = "PASS" if not errors else f"FAIL: {errors}"
        print(f"    {label}: {status}")


def run_constrained_decoding_demo():
    print(f"\n{'=' * 60}")
    print("  步骤 3: 约束解码模拟（Constrained Decoding Simulation）")
    print("=" * 60)
    demonstrate_constrained_decoding()


def run_extraction_pipeline_demo():
    print(f"\n{'=' * 60}")
    print("  步骤 4: 带重试的提取流水线（Extraction Pipeline with Retry）")
    print("=" * 60)

    texts = [
        "The Sony WH-1000XM5 headphones are priced at $348 and currently available in stores.",
        "The new MacBook Pro 16-inch laptop costs $2499 but is completely sold out everywhere.",
        "I just bought a Keychron Q1 mechanical keyboard for $169 and it arrived today.",
        "This sentence contains no product information at all.",
    ]

    for text in texts:
        print(f"\n  输入（Input）: {text[:70]}...")
        result = extract_with_retry(text, PRODUCT_SCHEMA)
        if result:
            print(f"  输出（Output）: {json.dumps(result)}")
        else:
            print(f"  输出（Output）: 重试后仍失败")


def run_nested_schema_demo():
    print(f"\n{'=' * 60}")
    print("  步骤 5: 嵌套模式验证（Nested Schema Validation）")
    print("=" * 60)

    order_schema = {
        "type": "object",
        "properties": {
            "order_id": {"type": "string"},
            "customer": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                },
                "required": ["name", "email"],
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "product": {"type": "string"},
                        "quantity": {"type": "integer"},
                        "price": {"type": "number", "minimum": 0},
                    },
                    "required": ["product", "quantity", "price"],
                },
                "minItems": 1,
            },
            "total": {"type": "number", "minimum": 0},
        },
        "required": ["order_id", "customer", "items", "total"],
    }

    valid_order = {
        "order_id": "ORD-001",
        "customer": {"name": "Alice", "email": "alice@example.com"},
        "items": [
            {"product": "Widget", "quantity": 3, "price": 9.99},
            {"product": "Gadget", "quantity": 1, "price": 24.99},
        ],
        "total": 54.96,
    }

    invalid_order = {
        "order_id": "ORD-002",
        "customer": {"name": "Bob"},
        "items": [],
        "total": -10,
    }

    print(f"\n  订单模式（嵌套对象 + 数组）:")
    for data, label in [(valid_order, "有效订单"), (invalid_order, "无效订单")]:
        errors = validate_schema(data, order_schema)
        status = "PASS" if not errors else f"FAIL"
        print(f"\n    {label}: {status}")
        if errors:
            for e in errors:
                print(f"      - {e}")


if __name__ == "__main__":
    run_schema_validation_demo()
    run_schema_generation_demo()
    run_constrained_decoding_demo()
    run_extraction_pipeline_demo()
    run_nested_schema_demo()
