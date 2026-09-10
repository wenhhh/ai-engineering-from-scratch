"""无状态 MCP 服务器、注册表元数据、策略与审计模拟。

本标准库示例将两层发现机制分开：

* server.json 向注册表描述安装信息与远程传输元数据。
* server/discover 返回运行时的协议版本和能力声明。

它不监听网络，不验证真实 OAuth 令牌，不调用 OPA，也不向注册表发布。
在课程根目录运行：python3 code/main.py。

译注：协议日期与注册表 schema URI 均沿用固定英文快照，本轮未更新标准事实。
令牌和审批记录由本地对象构造，没有密码学验签；相同参数的已批准动作可重复使用
同一记录，代码未实现一次性消费或请求去重。输入 schema 被发布但 dispatch 不执行
完整 schema 校验；工具只是内存处理函数，不访问数据库、S3 或 Jira。
所谓已验证域名是函数输入，代码本身不证明域名所有权；审计仅追加到内存列表。
注册表名称、描述及工具描述保留英文契约，并提供中文旁注；这样不会改变搜索结果。
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from typing import Callable


PROTOCOL_VERSION = "2026-07-28"
REGISTRY_SCHEMA = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json"
PUBLISHER_DOMAIN = "example.com"
SERVER_NAME_RE = re.compile(r"^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$")
DOMAIN_LABEL_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
REMOTE_URL_RE = re.compile(r"^https?://\S+$")
VERSION_RANGE_RE = re.compile(r"(?:^[~^<>=]|[*]|(?:^|\.)x(?:$|\.))", re.IGNORECASE)


def request_meta() -> dict:
    return {
        "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {
            "name": "registry-capstone-client",
            "version": "1.0.0",
        },
    }


def error(code: int, message: str, data: dict | None = None) -> dict:
    detail = {"code": code, "message": message}
    if data is not None:
        detail["data"] = data
    return {"error": detail}


def validate_meta(meta: object) -> dict | None:
    if not isinstance(meta, dict):
        # 错误契约：params._meta 必须是对象。
        return error(-32602, "params._meta must be an object")
    requested = meta.get("io.modelcontextprotocol/protocolVersion")
    if not isinstance(requested, str):
        # 错误契约：protocolVersion 必须是字符串。
        return error(-32602, "protocolVersion must be a string")
    if requested != PROTOCOL_VERSION:
        return error(
            -32022,
            # 错误契约：不支持该协议版本。
            "Unsupported protocol version",
            {"supported": [PROTOCOL_VERSION], "requested": requested},
        )
    if not isinstance(meta.get("io.modelcontextprotocol/clientCapabilities"), dict):
        # 错误契约：clientCapabilities 必须是对象。
        return error(-32602, "clientCapabilities must be an object")
    return None


@dataclass(frozen=True)
class ToolSchema:
    name: str
    required_scope: str
    destructive: bool
    description: str
    input_schema: dict


Handler = Callable[[dict], dict]


@dataclass
class MCPServer:
    name: str
    title: str
    description: str
    version: str
    url: str
    trusted_issuer: str
    tools: dict[str, ToolSchema] = field(default_factory=dict)
    handlers: dict[str, Handler] = field(default_factory=dict)

    @property
    def server_info(self) -> dict:
        return {"name": self.name, "version": self.version}

    def register(self, schema: ToolSchema, handler: Handler) -> None:
        if schema.name in self.tools:
            # 错误契约：工具名称重复。
            raise ValueError(f"duplicate tool: {schema.name}")
        self.tools[schema.name] = schema
        self.handlers[schema.name] = handler

    def result(self, **fields: object) -> dict:
        return {
            "resultType": "complete",
            **fields,
            "_meta": {"io.modelcontextprotocol/serverInfo": self.server_info},
        }

    def discover(self, meta: dict) -> dict:
        invalid = validate_meta(meta)
        if invalid:
            return invalid
        return self.result(
            supportedVersions=[PROTOCOL_VERSION],
            capabilities={"tools": {"listChanged": False}},
            ttlMs=3_600_000,
            cacheScope="public",
        )

    def tools_list(self, meta: dict) -> dict:
        invalid = validate_meta(meta)
        if invalid:
            return invalid
        tools = [
            {
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.input_schema,
                "annotations": {
                    "readOnlyHint": not tool.destructive,
                    "destructiveHint": tool.destructive,
                },
            }
            for tool in sorted(self.tools.values(), key=lambda item: item.name)
        ]
        return self.result(tools=tools, ttlMs=60_000, cacheScope="private")

    def registry_document(self) -> dict:
        return {
            "$schema": REGISTRY_SCHEMA,
            "name": self.name,
            "title": self.title,
            "description": self.description,
            "version": self.version,
            "remotes": [{"type": "streamable-http", "url": self.url}],
        }


@dataclass(frozen=True)
class Token:
    user: str
    issuer: str
    audience: str
    scopes: frozenset[str]
    expires_at: float

    def has_scope(self, scope: str) -> bool:
        return scope in self.scopes

    def is_expired(self, now: float) -> bool:
        return now >= self.expires_at


def arguments_digest(args: dict) -> str:
    normalized = json.dumps(
        args,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ApprovalRecord:
    actor: str
    tool: str
    arguments_digest: str
    target: str
    expires_at: float

    @classmethod
    def for_action(
        cls,
        actor: str,
        tool: str,
        args: dict,
        target: str,
        expires_at: float,
    ) -> ApprovalRecord:
        return cls(actor, tool, arguments_digest(args), target, expires_at)

    def authorize(
        self,
        actor: str,
        tool: str,
        args: dict,
        target: str,
        now: float,
    ) -> tuple[bool, str]:
        if self.actor != actor:
            # 审批拒绝：审批绑定的执行者与令牌主体不符。
            return False, "approval actor does not match token subject"
        if self.tool != tool:
            # 审批拒绝：审批绑定的工具与请求工具不符。
            return False, "approval tool does not match requested tool"
        if self.target != target:
            # 审批拒绝：审批目标不是当前服务器。
            return False, "approval target does not match this server"
        if self.arguments_digest != arguments_digest(args):
            # 审批拒绝：参数摘要与已批准的动作不符。
            return False, "approval arguments do not match requested action"
        if now >= self.expires_at:
            # 审批拒绝：审批已过期。
            return False, "approval has expired"
        return True, "ok"


def policy_decide(
    server: MCPServer,
    tool: str,
    token: Token,
    args: dict,
    now: float,
    approval: ApprovalRecord | None = None,
) -> tuple[bool, str]:
    if token.issuer != server.trusted_issuer:
        # 策略拒绝：服务器不信任该令牌签发者。
        return False, "token issuer is not trusted by this server"
    if token.audience != server.url:
        # 策略拒绝：令牌受众与当前服务器不符。
        return False, "token audience does not match this server"
    if token.is_expired(now):
        # 策略拒绝：令牌已过期。
        return False, "token has expired"
    schema = server.tools.get(tool)
    if schema is None:
        # 策略拒绝：工具不存在。
        return False, f"no such tool: {tool}"
    if not token.has_scope(schema.required_scope):
        # 策略拒绝：缺少所需权限范围。
        return False, f"missing scope: {schema.required_scope}"
    if len(json.dumps(args)) > 8192:
        # 策略拒绝：序列化后的参数字符串长度超过上限；不是网络报文字节检查。
        return False, "payload too large"
    if schema.destructive:
        if approval is None:
            # 策略拒绝：修改状态的工具需要与具体动作绑定的审批。
            return False, "destructive tool requires an action-bound approval"
        approved, reason = approval.authorize(
            token.user,
            tool,
            args,
            server.url,
            now,
        )
        if not approved:
            return False, reason
    return True, "ok"


def redact(payload: dict) -> dict:
    text = json.dumps(payload)
    text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "[email]", text)
    text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[ssn]", text)
    return json.loads(text)


@dataclass(frozen=True)
class AuditEntry:
    ts: float
    user: str
    issuer: str
    tool: str
    outcome: str
    args_redacted: dict
    response_redacted: dict


def dispatch(
    server: MCPServer,
    token: Token,
    tool: str,
    args: dict,
    meta: dict,
    audit: list[AuditEntry],
    approval: ApprovalRecord | None = None,
) -> dict:
    invalid = validate_meta(meta)
    if invalid:
        return invalid
    now = time.time()
    allowed, reason = policy_decide(server, tool, token, args, now, approval)
    if not allowed:
        audit.append(
            AuditEntry(now, token.user, token.issuer, tool, f"denied:{reason}", redact(args), {})
        )
        return error(-32000, reason)
    try:
        response = server.handlers[tool](args)
    except Exception as exc:
        audit.append(
            AuditEntry(now, token.user, token.issuer, tool, "handler_error", redact(args), {})
        )
        return server.result(
            content=[{"type": "text", "text": str(exc)}],
            isError=True,
        )
    audit.append(
        AuditEntry(
            now,
            token.user,
            token.issuer,
            tool,
            "allowed",
            redact(args),
            redact(response),
        )
    )
    return server.result(
        content=[{"type": "text", "text": json.dumps(response)}],
        structuredContent=response,
        isError=False,
    )


def validate_registry_document(document: object) -> list[str]:
    """验证本课仅含远程传输配置所用的注册表字段。

    此处是不依赖外部库的校验子集，不能替代发布前针对完整固定版本
    Registry JSON Schema 的验证。字段约束按原始教学快照保留。
    """
    if not isinstance(document, dict):
        # 校验问题：server.json 必须是对象。
        return ["server.json must be an object"]
    issues: list[str] = []

    for key in ("name", "description", "version"):
        if key not in document:
            # 校验问题：缺少指定字段。
            issues.append(f"missing {key}")

    schema_uri = document.get("$schema")
    if "$schema" in document and schema_uri != REGISTRY_SCHEMA:
        # 校验问题：不支持该注册表 schema。
        issues.append("unsupported registry schema")

    name = document.get("name")
    if "name" in document and (
        not isinstance(name, str)
        or not 3 <= len(name) <= 200
        or SERVER_NAME_RE.fullmatch(name) is None
    ):
        # 校验问题：name 必须符合 namespace/server 形式，长度为 3—200 个字符。
        issues.append("name must match namespace/server and be 3-200 characters")

    description = document.get("description")
    if "description" in document and (
        not isinstance(description, str) or not 1 <= len(description) <= 100
    ):
        # 校验问题：description 必须是 1—100 个字符的字符串。
        issues.append("description must be a 1-100 character string")

    title = document.get("title")
    if "title" in document and (
        not isinstance(title, str) or not 1 <= len(title) <= 100
    ):
        # 校验问题：title 必须是 1—100 个字符的字符串。
        issues.append("title must be a 1-100 character string")

    version = document.get("version")
    if "version" in document and (
        not isinstance(version, str)
        or not 1 <= len(version) <= 255
        or VERSION_RANGE_RE.search(version) is not None
        or version.casefold() == "latest"
    ):
        # 校验问题：version 必须是 1—255 个字符的具体版本，不能是版本范围或 latest。
        issues.append("version must be one concrete 1-255 character version")

    remotes = document.get("remotes")
    if not isinstance(remotes, list) or not remotes:
        # 校验问题：远程配置需要非空 remotes 列表。
        issues.append("remote profile requires a non-empty remotes list")
    else:
        for index, remote in enumerate(remotes):
            if not isinstance(remote, dict):
                # 校验问题：对应的 remotes 项必须是对象。
                issues.append(f"remotes[{index}] must be an object")
                continue
            if remote.get("type") not in {"streamable-http", "sse"}:
                # 校验问题：传输类型必须是 streamable-http 或 sse。
                issues.append(f"remotes[{index}].type must be streamable-http or sse")
            remote_url = remote.get("url")
            if not isinstance(remote_url, str) or REMOTE_URL_RE.fullmatch(remote_url) is None:
                # 校验问题：url 必须符合本例的 HTTP(S) URL 模板规则。
                issues.append(f"remotes[{index}].url must be an http(s) URL template")
    return issues


def reverse_dns_namespace(domain: str) -> str:
    normalized = domain.casefold().rstrip(".")
    labels = normalized.split(".")
    if len(labels) < 2 or any(DOMAIN_LABEL_RE.fullmatch(label) is None for label in labels):
        # 错误契约：发布者域名必须是有效的多标签 DNS 名称。
        raise ValueError("publisher domain must be a valid multi-label DNS name")
    return ".".join(reversed(labels))


def validate_publisher_namespace(document: object, verified_domain: str) -> list[str]:
    """在 server.json 结构契约之外，检查名称是否属于给定的域名命名空间；不实际验证所有权。"""
    if not isinstance(document, dict) or not isinstance(document.get("name"), str):
        return []
    namespace = document["name"].partition("/")[0]
    expected = reverse_dns_namespace(verified_domain)
    if namespace != expected and not namespace.startswith(f"{expected}."):
        return [
            # 校验问题：名称须属于给定已验证域名的反向命名空间或其子命名空间。
            f"name namespace must be {expected} or its child for verified domain {verified_domain}"
        ]
    return []


def validate_runtime_alignment(document: dict, discovery: object) -> list[str]:
    """比较发布文档与 server/discover 结果中的服务器身份。"""
    if not isinstance(discovery, dict):
        # 校验问题：server/discover 的结果必须是对象。
        return ["server/discover result must be an object"]
    meta = discovery.get("_meta")
    server_info = (
        meta.get("io.modelcontextprotocol/serverInfo") if isinstance(meta, dict) else None
    )
    if not isinstance(server_info, dict):
        # 校验问题：发现结果须包含 serverInfo，才能比较注册表身份漂移。
        return ["server/discover must include serverInfo for registry drift checks"]

    issues: list[str] = []
    if server_info.get("name") != document.get("name"):
        # 校验问题：运行时服务器名称与发布名称不符。
        issues.append("runtime serverInfo.name does not match server.json name")
    if server_info.get("version") != document.get("version"):
        # 校验问题：运行时服务器版本与发布版本不符。
        issues.append("runtime serverInfo.version does not match server.json version")
    return issues


@dataclass
class Registry:
    publisher_domain: str = PUBLISHER_DOMAIN
    entries: dict[str, dict] = field(default_factory=dict)
    runtime_discovery: dict[str, dict] = field(default_factory=dict)

    def register(self, server: MCPServer) -> None:
        document = server.registry_document()
        issues = validate_registry_document(document)
        issues.extend(validate_publisher_namespace(document, self.publisher_domain))
        if issues:
            raise ValueError("; ".join(issues))
        discovery = server.discover(request_meta())
        if "error" in discovery:
            # 错误契约：运行时发现失败。
            raise ValueError("runtime discovery failed")
        alignment_issues = validate_runtime_alignment(document, discovery)
        if alignment_issues:
            raise ValueError("; ".join(alignment_issues))
        self.entries[server.name] = deepcopy(document)
        self.runtime_discovery[server.name] = deepcopy(discovery)

    def search(self, query: str) -> list[str]:
        needle = query.casefold()
        return sorted(
            name
            for name, entry in self.entries.items()
            if needle in name.casefold()
            or needle in entry["title"].casefold()
            or needle in entry["description"].casefold()
        )


def build_readonly_server() -> MCPServer:
    server = MCPServer(
        name="com.example/internal-readonly",
        # 注册表标题：内部只读工具；保留搜索契约。
        title="Internal Read-Only Tools",
        # 注册表描述：只读的故障与数据查询工具；保留英文搜索输入。
        description="Read-only incident and data lookup tools.",
        version="1.0.0",
        url="https://mcp.internal.example.com/readonly",
        trusted_issuer="https://auth.internal.example.com",
    )
    server.register(
        ToolSchema(
            "postgres.readonly",
            "postgres:query:readonly",
            False,
            # 工具描述：执行已批准的只读查询；处理函数只返回合成行，并不验证 SQL 只读性。
            "Run an approved read-only query.",
            {
                "type": "object",
                "properties": {"sql": {"type": "string"}},
                "required": ["sql"],
                "additionalProperties": False,
            },
        ),
        lambda args: {"rows": [[1]], "sql": args["sql"]},
    )
    server.register(
        ToolSchema(
            "s3.list",
            "s3:list",
            False,
            # 工具描述：列举一个已批准存储桶中的对象；本例不验证存储桶授权，只返回夹具。
            "List objects in one approved bucket.",
            {
                "type": "object",
                "properties": {"bucket": {"type": "string"}},
                "required": ["bucket"],
                "additionalProperties": False,
            },
        ),
        lambda args: {"bucket": args["bucket"], "objects": ["a/b.txt"]},
    )
    return server


def build_destructive_server() -> MCPServer:
    server = MCPServer(
        name="com.example/internal-destructive",
        # 注册表标题：内部状态修改工具。
        title="Internal Destructive Tools",
        # 注册表描述：需要显式审批的状态修改工具。
        description="State-changing tools behind explicit approval.",
        version="1.0.0",
        url="https://mcp.internal.example.com/destructive",
        trusted_issuer="https://auth.internal.example.com",
    )
    server.register(
        ToolSchema(
            "jira.create",
            "jira:write",
            True,
            # 工具描述：获得显式审批后创建一个 Jira 问题；本例只返回模拟对象。
            "Create one Jira issue after explicit approval.",
            {
                "type": "object",
                "properties": {"title": {"type": "string"}},
                "required": ["title"],
                "additionalProperties": False,
            },
        ),
        lambda args: {"id": "PROJ-99", "title": args["title"], "created": True},
    )
    return server


def main() -> None:
    readonly = build_readonly_server()
    destructive = build_destructive_server()
    registry = Registry()
    registry.register(readonly)
    registry.register(destructive)
    audit: list[AuditEntry] = []

    readonly_token = Token(
        "u42",
        readonly.trusted_issuer,
        readonly.url,
        frozenset({"postgres:query:readonly", "s3:list"}),
        time.time() + 3_600,
    )
    approved_token = Token(
        "u42",
        destructive.trusted_issuer,
        destructive.url,
        frozenset({"jira:write"}),
        time.time() + 3_600,
    )
    # 动作参数夹具：新缺陷；它参与审批摘要，保留原值。
    approved_args = {"title": "new bug"}
    approval = ApprovalRecord.for_action(
        approved_token.user,
        "jira.create",
        approved_args,
        destructive.url,
        time.time() + 900,
    )

    print("=== 注册表元数据与运行时发现 ===")
    print(json.dumps(registry.entries[readonly.name], indent=2))
    print(json.dumps(registry.runtime_discovery[readonly.name], indent=2))
    print("工具列表：", json.dumps(readonly.tools_list(request_meta()), indent=2))

    print("\n=== 经过策略检查的调用 ===")
    print(
        dispatch(
            readonly,
            readonly_token,
            "postgres.readonly",
            {"sql": "SELECT 1"},
            request_meta(),
            audit,
        )
    )
    print(
        dispatch(
            destructive,
            approved_token,
            "jira.create",
            approved_args,
            request_meta(),
            audit,
            approval,
        )
    )

    print("\n=== 审计日志 ===")
    for entry in audit:
        print(json.dumps(asdict(entry), sort_keys=True))


if __name__ == "__main__":
    main()
