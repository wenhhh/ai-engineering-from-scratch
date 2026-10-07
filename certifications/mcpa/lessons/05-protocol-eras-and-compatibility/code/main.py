"""配套课程：
certifications/mcpa/lessons/05-protocol-eras-and-compatibility/docs/en.md
双时代客户端探测现代、不同版本的现代及旧版 stdio 服务器。
来源：MCP 2026-07-28 的版本、stdio 与 Streamable HTTP 传输页面。
旧版报文包装、虚构后续版本及错误字符串保持原值；本课不发起真实网络请求。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


PROTOCOL_VERSION = "2026-07-28"
PV_KEY = "io.modelcontextprotocol/protocolVersion"
CAPS_KEY = "io.modelcontextprotocol/clientCapabilities"
CLIENT_INFO_KEY = "io.modelcontextprotocol/clientInfo"
SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo"

METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
UNSUPPORTED_PROTOCOL_VERSION = -32022

LEGACY_EXAMPLES = True


def make_request(request_id: int, method: str, params: dict | None = None, capabilities: dict | None = None,
                 version: str = PROTOCOL_VERSION) -> dict:
    body = dict(params or {})
    body["_meta"] = {
        PV_KEY: version,
        CAPS_KEY: capabilities or {},
        CLIENT_INFO_KEY: {"name": "dual-era-client", "version": "1.0.0"},
    }
    return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": body}


def make_result(request_id: Any, result_type: str = "complete", **fields: Any) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "result": {"resultType": result_type, **fields}}


def make_error(request_id: Any, code: int, message: str, data: Any = None) -> dict:
    error: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}


def make_legacy_initialize_request(request_id: int, version: str = "2025-11-25") -> dict:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "initialize",
        "params": {
            "protocolVersion": version,
            "capabilities": {},
            "clientInfo": {"name": "dual-era-client", "version": "1.0.0"},
        },
    }


class ProbeTimeout(Exception):
    pass


@dataclass
class ModernServer:
    name: str
    supported_versions: list[str]

    def _server_meta(self) -> dict:
        return {SERVER_INFO_KEY: {"name": self.name, "version": "1.0.0"}}

    def handle(self, message: dict) -> dict:
        request_id = message.get("id")
        method = message.get("method")
        params = message.get("params") or {}
        meta = params.get("_meta") or {}
        if method == "server/discover":
            requested = meta.get(PV_KEY)
            if requested not in self.supported_versions:
                return make_error(
                    request_id,
                    UNSUPPORTED_PROTOCOL_VERSION,
                    "Unsupported protocol version",
                    {"supported": self.supported_versions, "requested": requested},
                )
            return make_result(
                request_id,
                supportedVersions=self.supported_versions,
                capabilities={"tools": {"listChanged": False}},
                ttlMs=300000,
                cacheScope="public",
                _meta=self._server_meta(),
            )
        if method == "initialize":
            return make_error(
                request_id,
                METHOD_NOT_FOUND,
                "Method not found: initialize",
                {"supportedVersions": self.supported_versions},
            )
        return make_error(request_id, METHOD_NOT_FOUND, f"Method not found: {method}")


@dataclass
class LegacyErrorServer:
    name: str

    def handle(self, message: dict) -> dict:
        request_id = message.get("id")
        method = message.get("method")
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": self.name, "version": "1.0.0"},
                },
            }
        return make_error(request_id, METHOD_NOT_FOUND, f"Method not found: {method}")


@dataclass
class LegacyTimeoutServer:
    name: str

    def handle(self, message: dict) -> dict:
        method = message.get("method")
        if method == "server/discover":
            raise ProbeTimeout(f"{self.name} did not answer the probe before the timeout")
        request_id = message.get("id")
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": self.name, "version": "1.0.0"},
                },
            }
        return make_error(request_id, METHOD_NOT_FOUND, f"Method not found: {method}")


@dataclass
class DualEraClient:
    next_id: int = 0
    log: list[Any] = field(default_factory=list)
    era_cache: dict[str, dict] = field(default_factory=dict)

    def _new_id(self) -> int:
        self.next_id += 1
        return self.next_id

    def _record(self, message: dict, legacy: bool = False) -> None:
        self.log.append({"legacy": True, "message": message} if legacy else message)

    def probe(self, server: Any) -> dict:
        cached = self.era_cache.get(server.name)
        if cached is not None:
            return cached
        request = make_request(self._new_id(), "server/discover", version=PROTOCOL_VERSION)
        self._record(request)
        try:
            response = server.handle(request)
        except ProbeTimeout:
            era = self._fall_back_to_legacy(server)
            self.era_cache[server.name] = era
            return era
        self._record(response)
        result = response.get("result")
        if isinstance(result, dict) and result.get("resultType") == "complete" and "supportedVersions" in result:
            era = {"era": "modern", "version": PROTOCOL_VERSION}
            self.era_cache[server.name] = era
            return era
        error = response.get("error") or {}
        if error.get("code") == UNSUPPORTED_PROTOCOL_VERSION:
            supported = (error.get("data") or {}).get("supported") or []
            era = {"era": "modern", "version": None}
            if supported:
                retry_version = supported[0]
                retry_request = make_request(self._new_id(), "server/discover", version=retry_version)
                self._record(retry_request)
                retry_response = server.handle(retry_request)
                self._record(retry_response)
                retry_result = retry_response.get("result")
                if isinstance(retry_result, dict) and retry_result.get("resultType") == "complete" and "supportedVersions" in retry_result:
                    era = {"era": "modern", "version": retry_version}
            self.era_cache[server.name] = era
            return era
        era = self._fall_back_to_legacy(server)
        self.era_cache[server.name] = era
        return era

    def _fall_back_to_legacy(self, server: Any) -> dict:
        request = make_legacy_initialize_request(self._new_id())
        self._record(request, legacy=True)
        response = server.handle(request)
        self._record(response, legacy=True)
        negotiated = (response.get("result") or {}).get("protocolVersion")
        return {"era": "legacy", "version": negotiated}

    def demonstrate_rejection(self, server: Any) -> dict:
        request = make_legacy_initialize_request(self._new_id())
        self._record(request, legacy=True)
        response = server.handle(request)
        self._record(response, legacy=True)
        return response


def run_scenario() -> tuple[DualEraClient, dict[str, Any]]:
    client = DualEraClient()
    modern = ModernServer("modern-server", [PROTOCOL_VERSION])
    modern_other = ModernServer("modern-other-version-server", ["2026-11-18"])
    legacy_error = LegacyErrorServer("legacy-error-server")
    legacy_timeout = LegacyTimeoutServer("legacy-timeout-server")
    modern_only = ModernServer("modern-only-server", [PROTOCOL_VERSION])

    result: dict[str, Any] = {
        "modern": client.probe(modern),
        "modern_other": client.probe(modern_other),
        "legacy_error": client.probe(legacy_error),
        "legacy_timeout": client.probe(legacy_timeout),
    }
    result["modern_cached"] = client.probe(modern)
    result["reject_response"] = client.demonstrate_rejection(modern_only)
    return client, result


def transcript() -> list[Any]:
    client, _ = run_scenario()
    return client.log


def _preview(entry: Any) -> str:
    message = entry["message"] if isinstance(entry, dict) and "message" in entry and "jsonrpc" not in entry else entry
    tag = "[legacy] " if isinstance(entry, dict) and entry.get("legacy") else ""
    return tag + json.dumps(message, sort_keys=True)[:160]


def demo() -> None:
    client, result = run_scenario()
    print("现代服务器探测：              ", result["modern"])
    print("其他现代版本服务器探测：      ", result["modern_other"])
    print("旧版服务器探测（未知错误）：  ", result["legacy_error"])
    print("旧版服务器探测（超时）：      ", result["legacy_timeout"])
    print("再次探测现代服务器：          ", result["modern_cached"], "（读取缓存，不发送新请求）")
    print("\n现代专用服务器拒绝旧版 initialize：")
    print(" ", json.dumps(result["reject_response"], sort_keys=True))
    print("\n完整报文记录")
    for entry in client.log:
        print("  " + _preview(entry))


if __name__ == "__main__":
    demo()
