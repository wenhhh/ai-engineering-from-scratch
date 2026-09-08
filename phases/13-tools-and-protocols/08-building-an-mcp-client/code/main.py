"""阶段 13 第 08 课：无状态多服务器 MCP 客户端（Multi-server MCP client）。
课程： phases/13-tools-and-protocols/08-building-an-mcp-client/docs/en.md
规范： https://modelcontextprotocol.io/specification/2026-07-28/
演示发现（Discovery）、失败即拒绝（Fail-closed）的旧版探测、确定性合并（Deterministic merge）与路由（Routing）。
运行： python3 main.py
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


PROTOCOL_VERSION = "2026-07-28"
LEGACY_VERSION = "2025-11-25"
VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities"
CLIENT_INFO_KEY = "io.modelcontextprotocol/clientInfo"
SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo"
RECOGNIZED_MODERN_ERRORS = {-32020, -32021, -32022}

CLIENT_INFO = {"name": "lesson-08-client", "version": "2.0.0"}
CLIENT_CAPABILITIES: dict[str, Any] = {"extensions": {}}

Transport = Callable[[dict[str, Any], int | None], dict[str, Any] | None]


class RpcFault(Exception):
    def __init__(self, code: int, message: str, data: Any | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.data = data


def request_meta(
    version: str,
    capabilities: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        VERSION_KEY: version,
        CAPABILITIES_KEY: CLIENT_CAPABILITIES.copy() if capabilities is None else capabilities,
        CLIENT_INFO_KEY: CLIENT_INFO.copy(),
    }


def modern_request(
    request_id: int | str,
    method: str,
    params: dict[str, Any] | None,
    version: str,
    capabilities: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body_params = dict(params or {})
    body_params["_meta"] = request_meta(version, capabilities)
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": body_params}


def legacy_request(
    request_id: int | str,
    method: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": dict(params or {})}


def rpc_error(
    request_id: int | str | None,
    code: int,
    message: str,
    data: Any | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}


def complete(
    server_info: dict[str, str],
    payload: dict[str, Any],
    *,
    ttl_ms: int | None = None,
    cache_scope: str = "private",
) -> dict[str, Any]:
    result = {
        "resultType": "complete",
        **payload,
        "_meta": {SERVER_INFO_KEY: server_info.copy()},
    }
    if ttl_ms is not None:
        result["ttlMs"] = ttl_ms
        result["cacheScope"] = cache_scope
    return result


def decode_rpc_response(
    response: dict[str, Any],
    expected_id: int | str,
) -> tuple[str, dict[str, Any]]:
    response_id = response.get("id")
    if (
        response.get("jsonrpc") != "2.0"
        or type(response_id) not in (int, str)
        or type(response_id) is not type(expected_id)
        or response_id != expected_id
    ):
        raise RuntimeError("invalid JSON-RPC response envelope")
    has_result = "result" in response
    has_error = "error" in response
    if has_result == has_error:
        raise RuntimeError("JSON-RPC response must contain exactly one of result or error")
    if has_result:
        result = response["result"]
        if not isinstance(result, dict):
            raise RuntimeError("JSON-RPC result 必须为对象")
        return "result", result
    error = response["error"]
    if not isinstance(error, dict):
        raise RuntimeError("JSON-RPC error 必须为对象")
    code = error.get("code")
    if not isinstance(code, int) or isinstance(code, bool) or not isinstance(error.get("message"), str):
        raise RuntimeError("JSON-RPC error 需要整数 code 和字符串 message")
    return "error", error


def validate_modern_request(message: dict[str, Any], supported: list[str]) -> None:
    if message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
        raise RpcFault(-32600, "Invalid Request")
    params = message.get("params")
    if not isinstance(params, dict) or not isinstance(params.get("_meta"), dict):
        raise RpcFault(-32602, "Modern params._meta is required")
    meta = params["_meta"]
    requested = meta.get(VERSION_KEY)
    if not isinstance(requested, str):
        raise RpcFault(-32602, f"{VERSION_KEY} is required")
    if requested not in supported:
        raise RpcFault(
            -32022,
            "Unsupported protocol version",
            {"requested": requested, "supported": supported.copy()},
        )
    if not isinstance(meta.get(CAPABILITIES_KEY), dict):
        raise RpcFault(-32602, f"{CAPABILITIES_KEY} is required")


class ModernFakeServer:
    def __init__(
        self,
        name: str,
        tools: list[dict[str, Any]],
        capabilities: dict[str, Any] | None = None,
        supported_versions: list[str] | None = None,
    ) -> None:
        self.server_info = {"name": name, "version": "2.0.0"}
        self.tools = sorted(tools, key=lambda tool: tool["name"])
        self.capabilities = capabilities or {"tools": {"listChanged": False}}
        self.supported_versions = supported_versions or [PROTOCOL_VERSION]
        self.received: list[dict[str, Any]] = []
        self.timeouts_ms: list[int | None] = []

    def __call__(
        self,
        message: dict[str, Any],
        timeout_ms: int | None = None,
    ) -> dict[str, Any] | None:
        self.received.append(message)
        self.timeouts_ms.append(timeout_ms)
        if "id" not in message:
            return None
        request_id = message["id"]
        try:
            validate_modern_request(message, self.supported_versions)
            method = message["method"]
            params = message["params"]
            if method == "server/discover":
                result = complete(
                    self.server_info,
                    {
                        "supportedVersions": self.supported_versions.copy(),
                        "capabilities": self.capabilities.copy(),
                        "instructions": f"由 {self.server_info['name']} 提供的工具。",
                    },
                    ttl_ms=3_600_000,
                    cache_scope="public",
                )
            elif method == "tools/list":
                result = complete(
                    self.server_info,
                    {"tools": self.tools.copy()},
                    ttl_ms=30_000,
                    cache_scope="public",
                )
            elif method == "tools/call":
                name = params.get("name")
                if not isinstance(name, str):
                    raise RpcFault(-32602, "tools/call requires name")
                declared = {tool["name"] for tool in self.tools}
                result = complete(
                    self.server_info,
                    {
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    f"[{self.server_info['name']}] {name} 已运行"
                                    if name in declared
                                    else f"未知工具： {name}"
                                ),
                            }
                        ],
                        "isError": name not in declared,
                    },
                )
            else:
                raise RpcFault(-32601, f"Method not found: {method}")
            return {"jsonrpc": "2.0", "id": request_id, "result": result}
        except RpcFault as exc:
            return rpc_error(request_id, exc.code, str(exc), exc.data)


class LegacyFakeServer:
    def __init__(self, name: str, tools: list[dict[str, Any]]) -> None:
        self.name = name
        self.tools = sorted(tools, key=lambda tool: tool["name"])
        self.initialized = False
        self.received: list[dict[str, Any]] = []
        self.timeouts_ms: list[int | None] = []

    def __call__(
        self,
        message: dict[str, Any],
        timeout_ms: int | None = None,
    ) -> dict[str, Any] | None:
        self.received.append(message)
        self.timeouts_ms.append(timeout_ms)
        method = message.get("method")
        if method == "server/discover":
            return rpc_error(message.get("id"), -32601, "Method not found")
        if method == "initialize":
            self.initialized = True
            return {
                "jsonrpc": "2.0",
                "id": message["id"],
                "result": {
                    "protocolVersion": LEGACY_VERSION,
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": self.name, "version": "1.0.0"},
                },
            }
        if method == "notifications/initialized":
            return None
        if not self.initialized:
            return rpc_error(message.get("id"), -32002, "Server not initialized")
        if method == "tools/list":
            return {"jsonrpc": "2.0", "id": message["id"], "result": {"tools": self.tools.copy()}}
        if method == "tools/call":
            name = message.get("params", {}).get("name")
            return {
                "jsonrpc": "2.0",
                "id": message["id"],
                "result": {
                    "content": [{"type": "text", "text": f"[{self.name}/legacy] {name} 已运行"}],
                    "isError": False,
                },
            }
        return rpc_error(message.get("id"), -32601, f"Method not found: {method}")


@dataclass
class Peer:
    name: str
    transport: Transport
    allow_legacy: bool = False
    era: str = "unknown"
    protocol_version: str | None = None
    capabilities: dict[str, Any] = field(default_factory=dict)
    server_info: dict[str, Any] = field(default_factory=dict)
    tools: list[dict[str, Any]] = field(default_factory=list)
    available: bool = False


@dataclass(frozen=True)
class MergedTool:
    canonical_name: str
    peer_name: str
    local_name: str
    description: str


class MultiServerClient:
    def __init__(
        self,
        *,
        supported_modern: tuple[str, ...] = (PROTOCOL_VERSION,),
        supported_legacy: tuple[str, ...] = (LEGACY_VERSION,),
        probe_version: str | None = None,
        discovery_timeout_ms: int = 1_000,
        legacy_probe_timeout_ms: int = 1_000,
    ) -> None:
        if not supported_modern or not supported_legacy:
            raise ValueError("至少需要分别配置一个新版和一个旧版协议版本")
        if discovery_timeout_ms <= 0 or legacy_probe_timeout_ms <= 0:
            raise ValueError("探测超时时间必须为正数")
        self.supported_modern = supported_modern
        self.supported_legacy = supported_legacy
        self.probe_version = probe_version or supported_modern[0]
        self.discovery_timeout_ms = discovery_timeout_ms
        self.legacy_probe_timeout_ms = legacy_probe_timeout_ms
        self.client_capabilities = CLIENT_CAPABILITIES.copy()
        self.peers: dict[str, Peer] = {}
        self.registry: dict[str, MergedTool] = {}
        self._next_request_id = 1

    def _new_id(self) -> int:
        request_id = self._next_request_id
        self._next_request_id += 1
        return request_id

    def add_server(
        self,
        name: str,
        transport: Transport,
        *,
        allow_legacy: bool = False,
    ) -> None:
        self.peers[name] = Peer(
            name=name,
            transport=transport,
            allow_legacy=allow_legacy,
        )

    @staticmethod
    def _send(
        peer: Peer,
        message: dict[str, Any],
        timeout_ms: int | None = None,
    ) -> dict[str, Any] | None:
        return peer.transport(message, timeout_ms)

    def _mutual_version(self, advertised: list[Any]) -> str | None:
        common = [version for version in advertised if version in self.supported_modern]
        return sorted(common, reverse=True)[0] if common else None

    def _activate_modern(self, peer: Peer, result: dict[str, Any], version: str) -> None:
        if result.get("resultType") != "complete":
            raise RuntimeError(f"{peer.name}: 新版发现响应缺少 resultType")
        peer.era = "modern"
        peer.protocol_version = version
        peer.capabilities = result.get("capabilities", {})
        peer.server_info = result.get("_meta", {}).get(SERVER_INFO_KEY, {})
        peer.available = True

    def _probe_legacy(self, peer: Peer, trigger: str) -> None:
        if not peer.allow_legacy:
            raise RuntimeError(
                f"{peer.name}: {trigger}; legacy compatibility is not allowlisted"
            )
        request_id = self._new_id()
        initialize = legacy_request(
            request_id,
            "initialize",
            {
                "protocolVersion": self.supported_legacy[0],
                "capabilities": self.client_capabilities.copy(),
                "clientInfo": CLIENT_INFO.copy(),
            },
        )
        try:
            response = self._send(peer, initialize, self.legacy_probe_timeout_ms)
        except (TimeoutError, ConnectionError) as exc:
            raise RuntimeError(f"{peer.name}: 有界旧版探测失败，已按失败即拒绝原则终止") from exc
        if not isinstance(response, dict):
            raise RuntimeError(f"{peer.name}: 有界旧版探测未返回结果")
        kind, payload = decode_rpc_response(response, request_id)
        if kind != "result":
            raise RuntimeError(f"{peer.name}: 旧版 initialize 返回错误")
        result = payload
        version = result.get("protocolVersion")
        capabilities = result.get("capabilities")
        server_info = result.get("serverInfo")
        valid_server_info = (
            isinstance(server_info, dict)
            and isinstance(server_info.get("name"), str)
            and bool(server_info["name"])
            and isinstance(server_info.get("version"), str)
            and bool(server_info["version"])
        )
        if version not in self.supported_legacy:
            raise RuntimeError(f"{peer.name}: unsupported legacy protocol revision")
        if not isinstance(capabilities, dict) or not valid_server_info:
            raise RuntimeError(f"{peer.name}: malformed legacy initialize result")
        peer.era = "legacy"
        peer.protocol_version = version
        peer.capabilities = capabilities
        peer.server_info = server_info
        peer.available = True
        self._send(
            peer,
            {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}
        )

    def _connect_peer(self, peer: Peer) -> None:
        if peer.available and peer.era in {"modern", "legacy"}:
            return
        request_id = self._new_id()
        probe = modern_request(
            request_id,
            "server/discover",
            {},
            self.probe_version,
            self.client_capabilities,
        )
        try:
            response = self._send(peer, probe, self.discovery_timeout_ms)
        except (TimeoutError, ConnectionError) as exc:
            self._probe_legacy(peer, type(exc).__name__)
            return

        if response is None:
            self._probe_legacy(peer, "发现响应为空")
            return
        if not isinstance(response, dict):
            raise RuntimeError(f"{peer.name}: 发现响应格式错误")
        kind, payload = decode_rpc_response(response, request_id)
        if kind == "result":
            advertised = payload.get("supportedVersions", [])
            if not isinstance(advertised, list) or not all(
                isinstance(version, str) for version in advertised
            ):
                raise RuntimeError(f"{peer.name}: 新版发现结果格式错误")
            selected = self._mutual_version(advertised)
            if selected is None:
                raise RuntimeError(f"{peer.name}: 没有双方均支持的新版协议版本")
            self._activate_modern(peer, payload, selected)
            return

        code = payload["code"]
        if code in RECOGNIZED_MODERN_ERRORS:
            if code != -32022:
                raise RuntimeError(f"{peer.name}: 请先修正新版请求错误 {code}，再重试")
            data = payload.get("data")
            advertised = data.get("supported", []) if isinstance(data, dict) else []
            selected = self._mutual_version(advertised)
            if selected is None:
                raise RuntimeError(f"{peer.name}: 没有双方均支持的新版协议版本")
            retry_id = self._new_id()
            retry = modern_request(
                retry_id,
                "server/discover",
                {},
                selected,
                self.client_capabilities,
            )
            try:
                retried = self._send(peer, retry, self.discovery_timeout_ms)
            except (TimeoutError, ConnectionError) as exc:
                raise RuntimeError(f"{peer.name}: 已确认使用新版协议的发现重试失败") from exc
            if not isinstance(retried, dict):
                raise RuntimeError(f"{peer.name}: 已确认使用新版协议的发现重试未返回结果")
            retry_kind, retry_payload = decode_rpc_response(retried, retry_id)
            if retry_kind != "result":
                raise RuntimeError(f"{peer.name}: 已确认使用新版协议的发现重试返回错误")
            self._activate_modern(peer, retry_payload, selected)
            return

        self._probe_legacy(peer, f"无法识别的发现错误 {code}")

    def connect_all(self) -> None:
        for peer_name in sorted(self.peers):
            self._connect_peer(self.peers[peer_name])

    def _request(self, peer: Peer, method: str, params: dict[str, Any]) -> dict[str, Any]:
        request_id = self._new_id()
        if peer.era == "modern":
            message = modern_request(
                request_id,
                method,
                params,
                peer.protocol_version or PROTOCOL_VERSION,
                self.client_capabilities,
            )
        elif peer.era == "legacy":
            message = legacy_request(request_id, method, params)
        else:
            raise RuntimeError(f"{peer.name}: 尚未选择协议代际")
        response = self._send(peer, message)
        if not isinstance(response, dict):
            raise RuntimeError(f"{peer.name}: 缺少响应")
        kind, payload = decode_rpc_response(response, request_id)
        if kind != "result":
            raise RuntimeError(f"{peer.name}: RPC 错误 {payload}")
        result = dict(payload)
        if peer.era == "modern" and "resultType" not in result:
            raise RuntimeError(f"{peer.name}: 新版结果缺少 resultType")
        if peer.era == "legacy":
            result.setdefault("resultType", "complete")
        return result

    def discover_tools(self) -> None:
        for peer_name in sorted(self.peers):
            peer = self.peers[peer_name]
            if peer.available:
                result = self._request(peer, "tools/list", {})
                peer.tools = sorted(result.get("tools", []), key=lambda tool: tool["name"])

    def merge(self, policy: str = "prefix-on-collision") -> None:
        if policy not in {"prefix-on-collision", "reject"}:
            raise ValueError("policy 必须为 prefix-on-collision 或 reject")
        self.registry.clear()
        for peer_name in sorted(self.peers):
            peer = self.peers[peer_name]
            for tool in peer.tools:
                local_name = tool["name"]
                canonical_name = local_name
                if canonical_name in self.registry:
                    if policy == "reject":
                        continue
                    canonical_name = f"{peer.name}/{local_name}"
                    if canonical_name in self.registry:
                        raise ValueError(f"规范名称冲突： {canonical_name}")
                self.registry[canonical_name] = MergedTool(
                    canonical_name=canonical_name,
                    peer_name=peer.name,
                    local_name=local_name,
                    description=tool.get("description", ""),
                )
        self.registry = dict(sorted(self.registry.items()))

    def call(self, canonical_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        merged = self.registry.get(canonical_name)
        if merged is None:
            return {
                "resultType": "complete",
                "content": [{"type": "text", "text": f"未知工具： {canonical_name}"}],
                "isError": True,
            }
        peer = self.peers[merged.peer_name]
        if not peer.available:
            return {
                "resultType": "complete",
                "content": [{"type": "text", "text": f"传输不可用： {peer.name}"}],
                "isError": True,
            }
        return self._request(
            peer,
            "tools/call",
            {"name": merged.local_name, "arguments": arguments},
        )


def tool(name: str, description: str) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "inputSchema": {"type": "object", "properties": {}, "required": []},
    }


def main() -> None:
    notes = ModernFakeServer("notes", [tool("search", "搜索笔记"), tool("create", "创建笔记")])
    files = ModernFakeServer("files", [tool("search", "搜索文件"), tool("read", "读取文件")])
    archive = LegacyFakeServer("archive", [tool("search", "搜索归档"), tool("restore", "还原条目")])

    client = MultiServerClient()
    client.add_server("notes", notes)
    client.add_server("files", files)
    client.add_server("archive", archive, allow_legacy=True)

    client.connect_all()
    client.discover_tools()
    client.merge()

    print("MCP 客户端对端（Peers）")
    for peer_name, peer in sorted(client.peers.items()):
        print(f"  {peer_name:8s} era={peer.era:6s} version={peer.protocol_version}")
    print("\n合并后的工具")
    for canonical_name, merged in client.registry.items():
        print(f"  {canonical_name:20s} -> {merged.peer_name}:{merged.local_name}")
    print("\n调用（Calls）")
    for name in ("create", "read", "notes/search", "search", "restore"):
        result = client.call(name, {})
        print(f"  {name:20s} -> {result['content'][0]['text']}")
    print("\n未创建任何新版协议会话。")


if __name__ == "__main__":
    main()
