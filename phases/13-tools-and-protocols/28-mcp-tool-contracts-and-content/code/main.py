"""阶段 13，第 28 课：MCP 工具契约与内容。
课程文档：../docs/en.md
规范：https://modelcontextprotocol.io/specification/2026-07-28/server/tools
配套机制：固定版本 MCP 2026-07-28 规范中的补全与分页。
本示例仅使用 Python 标准库；译文按仓库固定快照说明，并未另行核验最新规范。
协议字段、错误消息和示例描述保留英文值，旁注给出中文解释，以免改变契约校验。
"""

from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass
from typing import Any


PROTOCOL_VERSION = "2026-07-28"
PROTOCOL_META = "io.modelcontextprotocol/protocolVersion"
CAPABILITIES_META = "io.modelcontextprotocol/clientCapabilities"
CLIENT_INFO_META = "io.modelcontextprotocol/clientInfo"
SERVER_INFO_META = "io.modelcontextprotocol/serverInfo"
HEADER_TOKEN = re.compile(r"[!#$%&'*+\-.^_`|~0-9A-Za-z]+")
BASE64_SENTINEL_PREFIX = "=?base64?"
BASE64_SENTINEL_SUFFIX = "?="
JS_SAFE_INTEGER_MIN = -(2**53) + 1
JS_SAFE_INTEGER_MAX = 2**53 - 1
MAX_TOOL_LIST_PAGES = 100
SENSITIVE_NAMES = {
    "api_key",
    "apikey",
    "authorization",
    "password",
    "secret",
    "token",
}


class ContractViolation(ValueError):
    """当工具描述符或结果违反本示例强制执行的契约时抛出。"""


@dataclass
class McpError(Exception):
    code: int
    message: str
    data: dict[str, Any] | None = None


def request_meta() -> dict[str, Any]:
    return {
        PROTOCOL_META: PROTOCOL_VERSION,
        CAPABILITIES_META: {"completions": {}},
        CLIENT_INFO_META: {"name": "contract-client", "version": "1.0.0"},
    }


def server_meta() -> dict[str, Any]:
    return {SERVER_INFO_META: {"name": "contract-lab", "version": "1.0.0"}}


def complete(**fields: Any) -> dict[str, Any]:
    return {"resultType": "complete", **fields, "_meta": server_meta()}


def validate_request_meta(params: dict[str, Any]) -> None:
    meta = params.get("_meta")
    if not isinstance(meta, dict):
        # 协议诊断：请求缺少 _meta。
        raise McpError(-32602, "missing request _meta")
    version = meta.get(PROTOCOL_META)
    if not isinstance(version, str):
        # 协议诊断：缺少协议版本。
        raise McpError(-32602, "missing protocol version")
    if version != PROTOCOL_VERSION:
        raise McpError(
            -32022,
            # 协议诊断：不支持所请求的协议版本。
            "unsupported protocol version",
            {"supported": [PROTOCOL_VERSION], "requested": version},
        )
    if not isinstance(meta.get(CAPABILITIES_META), dict):
        # 协议诊断：缺少客户端能力声明。
        raise McpError(-32602, "missing client capabilities")


def _matches_type(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    # 校验诊断：校验边界不支持此模式类型。
    raise ContractViolation(f"unsupported schema type at validation boundary: {expected}")


def validate_json_schema(value: Any, schema: dict[str, Any], path: str = "$") -> None:
    """校验本课使用的 JSON Schema 2020-12 小型子集，不是通用的完整规范校验器。"""

    if not isinstance(schema, dict):
        # 校验诊断：此路径的模式必须是对象。
        raise ContractViolation(f"{path}: schema must be an object")
    if "enum" in schema and value not in schema["enum"]:
        # 校验诊断：此路径的值不在 enum 枚举中。
        raise ContractViolation(f"{path}: value is not in enum")

    expected = schema.get("type")
    if expected is not None:
        if not isinstance(expected, str) or not _matches_type(value, expected):
            # 校验诊断：此路径的值应符合指定类型。
            raise ContractViolation(f"{path}: expected {expected}")

    if isinstance(value, dict):
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        if not isinstance(properties, dict) or not isinstance(required, list):
            # 校验诊断：此路径的对象模式格式错误。
            raise ContractViolation(f"{path}: malformed object schema")
        for name in required:
            if name not in value:
                # 校验诊断：缺少此路径所指的必填属性。
                raise ContractViolation(f"{path}.{name}: required property missing")
        for name, item in value.items():
            if name in properties:
                validate_json_schema(item, properties[name], f"{path}.{name}")
            elif schema.get("additionalProperties") is False:
                # 校验诊断：拒绝此路径所指的额外属性。
                raise ContractViolation(f"{path}.{name}: additional property rejected")

    if isinstance(value, list) and "items" in schema:
        for index, item in enumerate(value):
            validate_json_schema(item, schema["items"], f"{path}[{index}]")

    if isinstance(value, str):
        minimum = schema.get("minLength")
        if isinstance(minimum, int) and len(value) < minimum:
            # 校验诊断：此路径的字符串短于 minLength。
            raise ContractViolation(f"{path}: string is shorter than minLength")


def iter_header_annotation_nodes(
    node: Any,
    path: tuple[str | int, ...] = (),
) -> list[tuple[tuple[str | int, ...], dict[str, Any]]]:
    """查找任意位置的 x-mcp-header，包括组合器和定义内部。"""

    found: list[tuple[tuple[str | int, ...], dict[str, Any]]] = []
    if isinstance(node, dict):
        if "x-mcp-header" in node:
            found.append((path, node))
        for key, child in node.items():
            if isinstance(child, (dict, list)):
                found.extend(iter_header_annotation_nodes(child, (*path, key)))
    elif isinstance(node, list):
        for index, child in enumerate(node):
            if isinstance(child, (dict, list)):
                found.extend(iter_header_annotation_nodes(child, (*path, index)))
    return found


def validate_header_annotations(tool: dict[str, Any]) -> list[tuple[tuple[str, ...], str]]:
    """校验 x-mcp-header，并落实部署方对敏感字段的限制策略。"""

    input_schema = tool.get("inputSchema")
    if not isinstance(input_schema, dict):
        # 契约诊断：inputSchema 必须是对象。
        raise ContractViolation("inputSchema must be an object")
    headers: list[tuple[tuple[str, ...], str]] = []
    seen: set[str] = set()
    for schema_path, property_schema in iter_header_annotation_nodes(input_schema):
        if (
            len(schema_path) != 2
            or schema_path[0] != "properties"
            or not isinstance(schema_path[1], str)
        ):
            raise ContractViolation(
                # 契约诊断：x-mcp-header 只能出现在 inputSchema 的直接属性上。
                "x-mcp-header is allowed only on a direct inputSchema property"
            )
        property_name = schema_path[1]
        header_name = property_schema["x-mcp-header"]
        if not isinstance(header_name, str) or not HEADER_TOKEN.fullmatch(header_name):
            # 契约诊断：x-mcp-header 必须是合法的 HTTP 头字段名词法单元。
            raise ContractViolation("x-mcp-header must be a valid HTTP field-name token")
        lowered = header_name.lower()
        if lowered in seen:
            # 契约诊断：x-mcp-header 名称必须在忽略大小写时仍然唯一。
            raise ContractViolation("x-mcp-header names must be unique ignoring case")
        seen.add(lowered)
        if property_schema.get("type") not in {"string", "integer", "boolean"}:
            # 契约诊断：x-mcp-header 只支持 string、integer 或 boolean 类型。
            raise ContractViolation("x-mcp-header requires string, integer, or boolean")
        if property_name.lower() in SENSITIVE_NAMES or lowered in SENSITIVE_NAMES:
            # 安全诊断：敏感参数不得映射到 HTTP 头字段。
            raise ContractViolation("sensitive arguments must not be mirrored to headers")
        headers.append(((property_name,), header_name))
    return headers


def validate_tool_descriptor(tool: dict[str, Any]) -> None:
    if not isinstance(tool.get("name"), str) or not tool["name"]:
        # 契约诊断：工具名称必须是非空字符串。
        raise ContractViolation("tool name must be a non-empty string")
    input_schema = tool.get("inputSchema")
    if not isinstance(input_schema, dict) or input_schema.get("type") != "object":
        # 契约诊断：inputSchema 的根类型必须为 object。
        raise ContractViolation("inputSchema must be an object schema")
    output_schema = tool.get("outputSchema")
    if output_schema is not None and not isinstance(output_schema, dict):
        # 契约诊断：outputSchema 必须是 JSON Schema 对象。
        raise ContractViolation("outputSchema must be a JSON Schema object")
    if output_schema is not None and iter_header_annotation_nodes(output_schema):
        # 契约诊断：outputSchema 不允许出现 x-mcp-header。
        raise ContractViolation("x-mcp-header is not allowed in outputSchema")
    validate_header_annotations(tool)


def _validate_base64(value: Any, field: str) -> None:
    if not isinstance(value, str):
        # 内容诊断：此字段必须是 Base64 字符串。
        raise ContractViolation(f"{field} must be a base64 string")
    try:
        base64.b64decode(value, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        # 内容诊断：此字段不是有效的 Base64 编码。
        raise ContractViolation(f"{field} is not valid base64") from exc


def validate_content_block(block: dict[str, Any]) -> None:
    if not isinstance(block, dict):
        # 内容诊断：内容块必须是对象。
        raise ContractViolation("content block must be an object")
    block_type = block.get("type")
    if block_type == "text":
        if not isinstance(block.get("text"), str):
            # 内容诊断：文本内容块必须包含 text 字段。
            raise ContractViolation("text content requires text")
    elif block_type in {"image", "audio"}:
        _validate_base64(block.get("data"), f"{block_type}.data")
        if not isinstance(block.get("mimeType"), str):
            # 内容诊断：此类内容块必须包含 mimeType 字段。
            raise ContractViolation(f"{block_type} content requires mimeType")
    elif block_type == "resource_link":
        if not all(isinstance(block.get(field), str) for field in ("uri", "name")):
            # 内容诊断：resource_link 必须包含 uri 和 name 字段。
            raise ContractViolation("resource_link requires uri and name")
    elif block_type == "resource":
        resource = block.get("resource")
        if not isinstance(resource, dict) or not isinstance(resource.get("uri"), str):
            # 内容诊断：嵌入资源必须包含 uri。
            raise ContractViolation("embedded resource requires a uri")
        if "text" not in resource and "blob" not in resource:
            # 内容诊断：嵌入资源必须包含 text 或 blob。
            raise ContractViolation("embedded resource requires text or blob")
    else:
        # 内容诊断：未知的内容块类型。
        raise ContractViolation(f"unknown content block type: {block_type}")


def validate_tool_result(tool: dict[str, Any], result: dict[str, Any]) -> None:
    if result.get("resultType") != "complete":
        # 结果诊断：工具结果的 resultType 必须为 complete。
        raise ContractViolation("tool result must be complete")
    content = result.get("content")
    if not isinstance(content, list) or not content:
        # 结果诊断：工具结果至少需要一个内容块。
        raise ContractViolation("tool result must contain at least one content block")
    for block in content:
        validate_content_block(block)

    output_schema = tool.get("outputSchema")
    if output_schema is not None:
        if "structuredContent" not in result:
            # 结果诊断：声明 outputSchema 时必须返回 structuredContent。
            raise ContractViolation("outputSchema requires structuredContent")
        validate_json_schema(result["structuredContent"], output_schema)
        if not any(block.get("type") == "text" for block in content):
            # 结果诊断：结构化结果必须附带供兼容使用的文本。
            raise ContractViolation("structured results require compatibility text")


def _descriptor(
    name: str,
    description: str,
    input_schema: dict[str, Any],
    output_schema: dict[str, Any],
) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "inputSchema": input_schema,
        "outputSchema": output_schema,
    }


TOOLS = [
    _descriptor(
        "tag_catalog",
        # 工具描述：返回标签数组，说明 structuredContent 不限于对象。
        "Return an array of tags to prove structuredContent is not object-only.",
        {"type": "object", "additionalProperties": False},
        {"type": "array", "items": {"type": "string"}},
    ),
    _descriptor(
        "evidence_bundle",
        # 工具描述：返回文本、媒体、资源链接和嵌入资源。
        "Return text, media, a resource link, and an embedded resource.",
        {"type": "object", "additionalProperties": False},
        {
            "type": "object",
            "properties": {
                "artifact": {"type": "string"},
                "blockCount": {"type": "integer"},
            },
            "required": ["artifact", "blockCount"],
            "additionalProperties": False,
        },
    ),
    _descriptor(
        "route_report",
        # 工具描述：根据非敏感的区域参数为报告选择路由。
        "Route a report by a non-sensitive region argument.",
        {
            "type": "object",
            "properties": {
                "region": {"type": "string", "x-mcp-header": "Region"},
                "report": {"type": "string", "minLength": 1},
            },
            "required": ["region", "report"],
            "additionalProperties": False,
        },
        {
            "type": "object",
            "properties": {
                "region": {"type": "string"},
                "accepted": {"type": "boolean"},
            },
            "required": ["region", "accepted"],
            "additionalProperties": False,
        },
    ),
    _descriptor(
        "blocked_secret_route",
        # 工具描述：故意设置的不安全描述符，用于演示客户端拒绝。
        "Deliberately unsafe descriptor used to exercise client rejection.",
        {
            "type": "object",
            "properties": {
                "token": {"type": "string", "x-mcp-header": "Token"},
            },
            "required": ["token"],
            "additionalProperties": False,
        },
        {"type": "boolean"},
    ),
]


class ContractServer:
    def __init__(self) -> None:
        self.completion_calls: dict[str, int] = {}

    def server_discover(self, params: dict[str, Any]) -> dict[str, Any]:
        validate_request_meta(params)
        return complete(
            supportedVersions=[PROTOCOL_VERSION],
            capabilities={"tools": {"listChanged": False}, "completions": {}},
            ttlMs=300_000,
            cacheScope="public",
        )

    def tools_list(self, params: dict[str, Any]) -> dict[str, Any]:
        validate_request_meta(params)
        ordered = sorted(TOOLS, key=lambda tool: tool["name"])
        has_cursor = "cursor" in params
        cursor = params.get("cursor")
        if not has_cursor:
            page = ordered[:2]
            next_cursor: str | None = ""
        elif cursor == "":
            page = ordered[2:]
            next_cursor = None
        else:
            # 分页诊断：游标无效。
            raise McpError(-32602, "invalid cursor")
        fields: dict[str, Any] = {
            "tools": page,
            "ttlMs": 60_000,
            "cacheScope": "public",
        }
        if next_cursor is not None:
            fields["nextCursor"] = next_cursor
        return complete(**fields)

    def tools_call(self, params: dict[str, Any]) -> dict[str, Any]:
        validate_request_meta(params)
        name = params.get("name")
        tool = next((item for item in TOOLS if item["name"] == name), None)
        if tool is None:
            # 调用诊断：未知工具。
            raise McpError(-32602, "unknown tool")
        arguments = params.get("arguments", {})
        if not isinstance(arguments, dict):
            # 调用诊断：arguments 必须是对象。
            raise McpError(-32602, "arguments must be an object")
        try:
            validate_json_schema(arguments, tool["inputSchema"])
        except ContractViolation as exc:
            return complete(
                content=[{"type": "text", "text": str(exc)}],
                isError=True,
            )

        if name == "tag_catalog":
            structured: Any = ["contracts", "mcp", "stateless"]
            return complete(
                content=[{"type": "text", "text": json.dumps(structured)}],
                structuredContent=structured,
                isError=False,
            )
        if name == "evidence_bundle":
            structured = {"artifact": "contract-report", "blockCount": 5}
            return complete(
                content=[
                    {"type": "text", "text": json.dumps(structured, sort_keys=True)},
                    {"type": "image", "data": "iVBORw0KGgo=", "mimeType": "image/png"},
                    {"type": "audio", "data": "UklGRg==", "mimeType": "audio/wav"},
                    {
                        "type": "resource_link",
                        "uri": "evidence://contract-report",
                        "name": "contract-report",
                        "mimeType": "application/json",
                    },
                    {
                        "type": "resource",
                        "resource": {
                            "uri": "evidence://contract-report/summary",
                            "mimeType": "text/plain",
                            # 工具返回文本：所有契约检查均已通过。此字符串是演示载荷，不代表全项目验收。
                            "text": "All contract checks passed.",
                        },
                    },
                ],
                structuredContent=structured,
                isError=False,
            )
        if name == "route_report":
            if arguments["report"] == "unavailable":
                return complete(
                    # 工具返回文本：报告来源不可用。
                    content=[{"type": "text", "text": "Report source is unavailable."}],
                    structuredContent={
                        "region": arguments["region"],
                        "accepted": False,
                    },
                    isError=True,
                )
            structured = {"region": arguments["region"], "accepted": True}
            return complete(
                content=[{"type": "text", "text": json.dumps(structured, sort_keys=True)}],
                structuredContent=structured,
                isError=False,
            )
        structured = True
        return complete(
            content=[{"type": "text", "text": "true"}],
            structuredContent=structured,
            isError=False,
        )

    def completion_complete(
        self,
        params: dict[str, Any],
        *,
        principal: str,
    ) -> dict[str, Any]:
        validate_request_meta(params)
        self.completion_calls[principal] = self.completion_calls.get(principal, 0) + 1
        if self.completion_calls[principal] > 3:
            # 补全诊断：已超过补全请求的速率限制。
            raise McpError(-32029, "completion rate limit exceeded")

        reference = params.get("ref")
        argument = params.get("argument")
        if reference != {"type": "ref/prompt", "name": "deployment_review"}:
            # 补全诊断：未知的补全引用。
            raise McpError(-32602, "unknown completion reference")
        if not isinstance(argument, dict) or argument.get("name") != "environment":
            # 补全诊断：未知的补全参数。
            raise McpError(-32602, "unknown completion argument")
        prefix = argument.get("value")
        if not isinstance(prefix, str):
            # 补全诊断：补全值必须是字符串。
            raise McpError(-32602, "completion value must be a string")

        allowed = {
            "analyst": ["development", "staging"],
            "operator": ["development", "production", "staging"],
        }.get(principal, [])
        matches = [item for item in allowed if item.startswith(prefix)]
        return complete(
            completion={"values": matches[:100], "total": len(matches), "hasMore": False}
        )

    def dispatch(
        self,
        request: dict[str, Any],
        *,
        principal: str = "analyst",
    ) -> dict[str, Any] | None:
        is_notification = "id" not in request
        request_id = request.get("id")
        try:
            params = request.get("params", {})
            if not isinstance(params, dict):
                # 协议诊断：params 必须是对象。
                raise McpError(-32602, "params must be an object")
            method = request.get("method")
            if method == "server/discover":
                result = self.server_discover(params)
            elif method == "tools/list":
                result = self.tools_list(params)
            elif method == "tools/call":
                result = self.tools_call(params)
            elif method == "completion/complete":
                result = self.completion_complete(params, principal=principal)
            else:
                # 协议诊断：未找到此方法。
                raise McpError(-32601, "method not found")
            if is_notification:
                return None
            return {"jsonrpc": "2.0", "id": request_id, "result": result}
        except McpError as exc:
            if is_notification:
                return None
            error: dict[str, Any] = {"code": exc.code, "message": exc.message}
            if exc.data is not None:
                error["data"] = exc.data
            return {"jsonrpc": "2.0", "id": request_id, "error": error}


def make_request(request_id: int, method: str, params: dict[str, Any]) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": {**params, "_meta": request_meta()},
    }


MISSING = object()


def _read_path(arguments: dict[str, Any], path: tuple[str, ...]) -> Any:
    value: Any = arguments
    for segment in path:
        if not isinstance(value, dict) or segment not in value:
            return MISSING
        value = value[segment]
    return value


def _parameter_text(value: Any, expected_type: str) -> str:
    if expected_type == "string" and isinstance(value, str):
        return value
    if expected_type == "boolean" and isinstance(value, bool):
        return "true" if value else "false"
    if expected_type == "integer" and isinstance(value, int) and not isinstance(value, bool):
        if not JS_SAFE_INTEGER_MIN <= value <= JS_SAFE_INTEGER_MAX:
            # 头字段诊断：映射的整数超出 JavaScript 安全整数范围。
            raise ContractViolation("mirrored integer is outside the JavaScript safe range")
        return str(value)
    # 头字段诊断：映射值与所声明的类型不符。
    raise ContractViolation(f"mirrored value does not match declared {expected_type} type")


def _is_plain_visible_ascii(value: str) -> bool:
    return bool(value) and all(0x21 <= ord(character) <= 0x7E for character in value)


def encode_parameter_header_value(value: str) -> str:
    """当原样传输存在歧义时，按本课的 MCP 契约使用精确的哨兵标记编码。"""

    sentinel_looking = value.startswith(BASE64_SENTINEL_PREFIX)
    if _is_plain_visible_ascii(value) and not sentinel_looking:
        return value
    payload = base64.b64encode(value.encode("utf-8")).decode("ascii")
    return f"{BASE64_SENTINEL_PREFIX}{payload}{BASE64_SENTINEL_SUFFIX}"


def decode_parameter_header_value(value: str) -> str:
    """在 HTTP 边界解码使用规范形式的 MCP 参数头字段值。"""

    if not isinstance(value, str):
        # 头字段诊断：参数头字段值必须是字符串。
        raise ContractViolation("parameter header value must be a string")
    if value.startswith(BASE64_SENTINEL_PREFIX):
        if not value.endswith(BASE64_SENTINEL_SUFFIX):
            # 头字段诊断：Base64 哨兵标记格式错误。
            raise ContractViolation("parameter header uses a malformed base64 sentinel")
        payload = value[len(BASE64_SENTINEL_PREFIX) : -len(BASE64_SENTINEL_SUFFIX)]
        try:
            raw = base64.b64decode(payload, validate=True)
            decoded = raw.decode("utf-8")
        except (ValueError, UnicodeDecodeError, base64.binascii.Error) as exc:
            # 头字段诊断：Base64 内容或解码后的 UTF-8 无效。
            raise ContractViolation("parameter header uses invalid base64 UTF-8") from exc
        if base64.b64encode(raw).decode("ascii") != payload:
            # 头字段诊断：Base64 编码不是规范形式。
            raise ContractViolation("parameter header base64 is not canonical")
        return decoded
    if not _is_plain_visible_ascii(value):
        # 头字段诊断：未编码的参数头字段必须使用可见 ASCII 字符。
        raise ContractViolation("plain parameter header is not visible ASCII")
    return value


def build_parameter_headers(
    tool: dict[str, Any],
    arguments: dict[str, Any],
    audit_log: list[dict[str, Any]],
) -> dict[str, str]:
    headers: dict[str, str] = {}
    encoded_names: list[str] = []
    properties = tool["inputSchema"].get("properties", {})
    for path, name in validate_header_annotations(tool):
        value = _read_path(arguments, path)
        if value is MISSING:
            continue
        property_schema = properties[path[0]]
        rendered = _parameter_text(value, property_schema["type"])
        header_name = f"Mcp-Param-{name}"
        encoded = encode_parameter_header_value(rendered)
        headers[header_name] = encoded
        if encoded != rendered:
            encoded_names.append(header_name)
    audit_log.append(
        {
            "event": "parameter_headers_built",
            "headerNames": sorted(headers),
            "encodedHeaderNames": sorted(encoded_names),
        }
    )
    return headers


def validate_parameter_headers(
    tool: dict[str, Any],
    arguments: dict[str, Any],
    headers: dict[str, str],
    audit_log: list[dict[str, Any]],
) -> None:
    """将已识别的参数头字段与请求体参数逐项精确比较。"""

    normalized: dict[str, list[tuple[str, str]]] = {}
    for supplied_name, supplied_value in headers.items():
        normalized.setdefault(supplied_name.casefold(), []).append(
            (supplied_name, supplied_value)
        )

    checked_names: list[str] = []
    properties = tool["inputSchema"].get("properties", {})
    for path, suffix in validate_header_annotations(tool):
        expected_name = f"Mcp-Param-{suffix}"
        supplied = normalized.get(expected_name.casefold(), [])
        body_value = _read_path(arguments, path)
        if body_value is MISSING:
            if supplied:
                # 一致性诊断：已识别的参数头字段在请求体中没有对应参数。
                raise ContractViolation("recognized parameter header has no body argument")
            continue
        if not supplied:
            # 一致性诊断：缺少已声明的参数头字段。
            raise ContractViolation("recognized parameter header is missing")
        if len(supplied) != 1:
            # 一致性诊断：已识别的参数头字段重复。
            raise ContractViolation("recognized parameter header is duplicated")
        decoded = decode_parameter_header_value(supplied[0][1])
        expected = _parameter_text(body_value, properties[path[0]]["type"])
        if decoded != expected:
            # 一致性诊断：已识别的参数头字段与请求体不匹配。
            raise ContractViolation("recognized parameter header does not match the body")
        checked_names.append(expected_name)

    audit_log.append(
        {
            "event": "parameter_headers_validated",
            "headerNames": sorted(checked_names),
        }
    )


def streamable_http_tool_call(
    server: ContractServer,
    request: dict[str, Any],
    headers: dict[str, str],
    audit_log: list[dict[str, Any]],
    *,
    principal: str = "analyst",
) -> tuple[int, dict[str, Any] | None]:
    """模拟 JSON-RPC 分派前的 Streamable HTTP 头字段与请求体一致性检查。"""

    if request.get("method") == "tools/call":
        params = request.get("params")
        if isinstance(params, dict):
            arguments = params.get("arguments")
            tool = next((item for item in TOOLS if item["name"] == params.get("name")), None)
            if tool is not None and isinstance(arguments, dict):
                try:
                    validate_parameter_headers(tool, arguments, headers, audit_log)
                except ContractViolation as exc:
                    return 400, {
                        "jsonrpc": "2.0",
                        "id": request.get("id"),
                        "error": {
                            "code": -32020,
                            # 一致性诊断：参数头字段与请求体不匹配。
                            "message": "parameter headers do not match request body",
                            "data": {"reason": str(exc)},
                        },
                    }
    return 200, server.dispatch(request, principal=principal)


class ContractClient:
    def __init__(
        self,
        server: ContractServer,
        *,
        principal: str = "analyst",
        max_list_pages: int = MAX_TOOL_LIST_PAGES,
    ) -> None:
        if type(max_list_pages) is not int or max_list_pages <= 0:
            # 分页诊断：tools/list 的页数上限必须是正整数。
            raise ContractViolation("tools/list page limit must be a positive integer")
        self.server = server
        self.principal = principal
        self.max_list_pages = max_list_pages
        self.rejections: list[dict[str, str]] = []
        self.cursor_trace: list[str | None] = []
        self.tools: dict[str, dict[str, Any]] = {}

    def discover_tools(self) -> dict[str, dict[str, Any]]:
        cursor: str | None = None
        request_id = 1
        seen_cursors: set[str] = set()
        for _ in range(self.max_list_pages):
            params: dict[str, Any] = {}
            if cursor is not None:
                params["cursor"] = cursor
            self.cursor_trace.append(cursor)
            response = self.server.dispatch(make_request(request_id, "tools/list", params))
            if response is None or "error" in response:
                # 分页诊断：tools/list 请求失败。
                raise ContractViolation("tools/list failed")
            result = response["result"]
            for tool in result["tools"]:
                try:
                    validate_tool_descriptor(tool)
                except ContractViolation as exc:
                    self.rejections.append({"tool": tool.get("name", "<unknown>"), "reason": str(exc)})
                    continue
                self.tools[tool["name"]] = tool
            next_cursor = result.get("nextCursor")
            if next_cursor is None:
                return self.tools
            if not isinstance(next_cursor, str):
                # 分页诊断：tools/list 的 nextCursor 必须是字符串或 null。
                raise ContractViolation("tools/list nextCursor must be a string or null")
            if next_cursor in seen_cursors:
                # 分页诊断：tools/list 返回了重复或成环的 nextCursor。
                raise ContractViolation("tools/list returned a repeated or cyclic nextCursor")
            seen_cursors.add(next_cursor)
            cursor = next_cursor
            request_id += 1
        raise ContractViolation(
            # 分页诊断：tools/list 超过指定页数上限。
            f"tools/list exceeded the page limit of {self.max_list_pages}"
        )

    def call(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if not self.tools:
            self.discover_tools()
        tool = self.tools.get(name)
        if tool is None:
            # 调用诊断：工具尚未获得准入。
            raise ContractViolation(f"tool is not admitted: {name}")
        response = self.server.dispatch(
            make_request(20, "tools/call", {"name": name, "arguments": arguments}),
            principal=self.principal,
        )
        if response is None or "error" in response:
            # 调用诊断：tools/call 返回协议错误。
            raise ContractViolation("tools/call returned a protocol error")
        validate_tool_result(tool, response["result"])
        return response["result"]

    def complete_environment(self, prefix: str) -> list[str]:
        response = self.server.dispatch(
            make_request(
                30,
                "completion/complete",
                {
                    "ref": {"type": "ref/prompt", "name": "deployment_review"},
                    "argument": {"name": "environment", "value": prefix},
                },
            ),
            principal=self.principal,
        )
        if response is None or "error" in response:
            # 补全诊断：补全请求失败。
            raise ContractViolation("completion request failed")
        return response["result"]["completion"]["values"]


def main() -> None:
    server = ContractServer()
    client = ContractClient(server)
    tools = client.discover_tools()
    tags = client.call("tag_catalog", {})
    bundle = client.call("evidence_bundle", {})
    audit_log: list[dict[str, Any]] = []
    route_tool = tools["route_report"]
    headers = build_parameter_headers(
        route_tool,
        {"region": "europe-λ", "report": "quarterly"},
        audit_log,
    )
    http_status, _ = streamable_http_tool_call(
        server,
        make_request(
            40,
            "tools/call",
            {
                "name": "route_report",
                "arguments": {"region": "europe-λ", "report": "quarterly"},
            },
        ),
        {name.lower(): value for name, value in headers.items()},
        audit_log,
    )

    print("可见工具：", ", ".join(sorted(tools)))
    print("被拒绝的工具：", ", ".join(item["tool"] for item in client.rejections))
    print("游标轨迹：", ["<first>" if item is None else repr(item) for item in client.cursor_trace])
    print("数组形式的 structuredContent：", tags["structuredContent"])
    print("内容块类型：", [block["type"] for block in bundle["content"]])
    print("参数映射生成的头字段名：", sorted(headers))
    print("参数值是否经过哨兵编码：", headers["Mcp-Param-Region"].startswith(BASE64_SENTINEL_PREFIX))
    print("HTTP 一致性检查状态码：", http_status)
    print("审计事件：", audit_log[0])
    print("分析人员可用的补全结果：", client.complete_environment(""))


if __name__ == "__main__":
    main()
