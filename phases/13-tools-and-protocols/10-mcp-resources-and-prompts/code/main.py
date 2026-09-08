"""docs/en.md 的可运行配套示例，适用于 MCP 协议版本 2026-07-28。
官方资源契约（Resources contract）： https://modelcontextprotocol.io/specification/2026-07-28/server/resources
官方提示词契约（Prompts contract）： https://modelcontextprotocol.io/specification/2026-07-28/server/prompts
官方订阅契约（Subscription contract）： https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions
模拟器简化传输细节，便于观察线上协议不变量（Wire invariants）。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


PROTOCOL_VERSION = "2026-07-28"
SERVER_INFO = {"name": "lesson-resource-server", "version": "2.0.0"}

NOTES = {
    "notes://note-2": {
        "name": "发布检查清单（Release checklist）",
        "description": "发布前需要执行的检查",
        "mimeType": "text/markdown",
        "text": "# 发布（Release）\n\n- 运行测试\n- 确认标签",
    },
    "notes://note-1": {
        "name": "架构决策（Architecture decision）",
        "description": "服务为何采用无状态协议边界",
        "mimeType": "text/markdown",
        "text": "# 决策（Decision）\n\n让协议请求包含处理所需的全部信息。",
    },
}

PROMPTS = {
    "release_brief": {
        "title": "起草发布简报（Release brief）",
        "description": "将发布事实整理为面向用户的简明简报",
        "arguments": [
            {"name": "audience", "description": "简报的读者", "required": True}
        ],
    },
    "review_note": {
        "title": "评审笔记（Review a note）",
        "description": "围绕指定关注点评审一篇笔记",
        "arguments": [
            {"name": "uri", "description": "笔记资源 URI", "required": True},
            {"name": "focus", "description": "评审关注点", "required": False},
        ],
    },
}


class RpcError(Exception):
    def __init__(self, code: int, message: str, data: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data or {}

    def as_json(self) -> dict[str, Any]:
        error: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.data:
            error["data"] = self.data
        return error


def request_meta(client_name: str = "lesson-client") -> dict[str, Any]:
    return {
        "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": {"name": client_name, "version": "1.0.0"},
        "io.modelcontextprotocol/clientCapabilities": {},
    }


def response_meta() -> dict[str, Any]:
    return {"io.modelcontextprotocol/serverInfo": SERVER_INFO.copy()}


def complete(**payload: Any) -> dict[str, Any]:
    return {"resultType": "complete", **payload, "_meta": response_meta()}


def validate_request_meta(params: dict[str, Any]) -> None:
    meta = params.get("_meta")
    if not isinstance(meta, dict):
        raise RpcError(-32602, "Missing request metadata")
    requested = meta.get("io.modelcontextprotocol/protocolVersion")
    if not isinstance(requested, str):
        raise RpcError(-32602, "Missing or invalid protocol version")
    if requested != PROTOCOL_VERSION:
        raise RpcError(
            -32022,
            "Unsupported protocol version",
            {"supported": [PROTOCOL_VERSION], "requested": requested},
        )
    if not isinstance(meta.get("io.modelcontextprotocol/clientCapabilities"), dict):
        raise RpcError(-32602, "Missing client capabilities")


def server_discover(_: dict[str, Any]) -> dict[str, Any]:
    return complete(
        supportedVersions=[PROTOCOL_VERSION],
        capabilities={
            "resources": {"listChanged": True, "subscribe": True},
            "prompts": {"listChanged": True},
        },
        instructions="通过 URI 读取笔记，并让用户选择评审提示词。",
        ttlMs=3_600_000,
        cacheScope="public",
    )


def resources_list(_: dict[str, Any]) -> dict[str, Any]:
    resources = [
        {key: value[key] for key in ("name", "description", "mimeType")} | {"uri": uri}
        for uri, value in sorted(NOTES.items())
    ]
    return complete(resources=resources, ttlMs=300_000, cacheScope="public")


def resources_read(params: dict[str, Any]) -> dict[str, Any]:
    uri = params.get("uri")
    if not isinstance(uri, str) or uri not in NOTES:
        raise RpcError(-32602, "Unknown or invalid resource URI", {"uri": uri})
    note = NOTES[uri]
    return complete(
        contents=[{"uri": uri, "mimeType": note["mimeType"], "text": note["text"]}],
        ttlMs=60_000,
        cacheScope="private",
    )


def prompts_list(_: dict[str, Any]) -> dict[str, Any]:
    prompts = [{"name": name, **definition} for name, definition in sorted(PROMPTS.items())]
    return complete(prompts=prompts, ttlMs=600_000, cacheScope="public")


def prompts_get(params: dict[str, Any]) -> dict[str, Any]:
    name = params.get("name")
    arguments = params.get("arguments", {})
    if name not in PROMPTS or not isinstance(arguments, dict):
        raise RpcError(-32602, "Unknown prompt or invalid arguments", {"name": name})
    if name == "review_note":
        uri = arguments.get("uri")
        if uri not in NOTES:
            raise RpcError(-32602, "review_note requires a known resource URI", {"uri": uri})
        focus = arguments.get("focus", "correctness")
        text = f"评审资源 {uri}，关注 {focus}。每项发现都应引用该 URI。"
    else:
        audience = arguments.get("audience")
        if not isinstance(audience, str) or not audience.strip():
            raise RpcError(-32602, "release_brief requires audience")
        text = f"为 {audience} 起草发布简报。将已验证事实与待解问题分开列出。"
    return complete(
        description=PROMPTS[name]["description"],
        messages=[{"role": "user", "content": {"type": "text", "text": text}}],
    )


SUPPORTED_NOTIFICATION_FIELDS = {
    "promptsListChanged",
    "resourcesListChanged",
    "resourceSubscriptions",
}


@dataclass(frozen=True)
class SubscriptionStream:
    subscription_id: int | str
    notifications: dict[str, Any]

    def _meta(self) -> dict[str, Any]:
        return {"io.modelcontextprotocol/subscriptionId": self.subscription_id}

    def acknowledged(self) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "method": "notifications/subscriptions/acknowledged",
            "params": {"_meta": self._meta(), "notifications": self.notifications},
        }

    def resource_updated(self, uri: str) -> dict[str, Any] | None:
        if uri not in self.notifications.get("resourceSubscriptions", []):
            return None
        return {
            "jsonrpc": "2.0",
            "method": "notifications/resources/updated",
            "params": {"_meta": self._meta(), "uri": uri},
        }

    def resources_list_changed(self) -> dict[str, Any] | None:
        if not self.notifications.get("resourcesListChanged"):
            return None
        return {
            "jsonrpc": "2.0",
            "method": "notifications/resources/list_changed",
            "params": {"_meta": self._meta()},
        }

    def prompts_list_changed(self) -> dict[str, Any] | None:
        if not self.notifications.get("promptsListChanged"):
            return None
        return {
            "jsonrpc": "2.0",
            "method": "notifications/prompts/list_changed",
            "params": {"_meta": self._meta()},
        }

    def close(self) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "id": self.subscription_id,
            "result": {
                "resultType": "complete",
                "_meta": self._meta() | response_meta(),
            },
        }


def subscriptions_listen(request_id: int | str, params: dict[str, Any]) -> SubscriptionStream:
    requested = params.get("notifications")
    if not isinstance(requested, dict):
        raise RpcError(-32602, "subscriptions/listen requires a notifications filter")
    agreed: dict[str, Any] = {}
    for key in sorted(SUPPORTED_NOTIFICATION_FIELDS):
        value = requested.get(key)
        if key == "resourceSubscriptions" and value is not None:
            if not isinstance(value, list) or not all(isinstance(uri, str) for uri in value):
                raise RpcError(-32602, "resourceSubscriptions must be an array of URIs")
            agreed[key] = sorted(set(value))
        elif key != "resourceSubscriptions" and value is True:
            agreed[key] = True
    return SubscriptionStream(request_id, agreed)


HANDLERS = {
    "server/discover": server_discover,
    "resources/list": resources_list,
    "resources/read": resources_read,
    "prompts/list": prompts_list,
    "prompts/get": prompts_get,
}


def handle(request: dict[str, Any]) -> dict[str, Any] | SubscriptionStream | None:
    is_notification = "id" not in request
    request_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})
    if not isinstance(params, dict):
        if is_notification:
            return None
        error = RpcError(-32602, "params must be an object")
        return {"jsonrpc": "2.0", "id": request_id, "error": error.as_json()}
    try:
        validate_request_meta(params)
        if is_notification:
            handler = HANDLERS.get(method)
            if handler is not None:
                handler(params)
            return None
        if method == "subscriptions/listen":
            if request_id is None:
                raise RpcError(-32602, "subscriptions/listen requires a request id")
            return subscriptions_listen(request_id, params)
        handler = HANDLERS.get(method)
        if handler is None:
            raise RpcError(-32601, "Method not found", {"method": method})
        return {"jsonrpc": "2.0", "id": request_id, "result": handler(params)}
    except RpcError as exc:
        if is_notification:
            return None
        return {"jsonrpc": "2.0", "id": request_id, "error": exc.as_json()}


def rpc_request(request_id: int, method: str, **params: Any) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": {**params, "_meta": request_meta()},
    }


def demo() -> list[dict[str, Any]]:
    transcript: list[dict[str, Any]] = []
    transcript.append(handle(rpc_request(0, "server/discover")))
    transcript.append(handle(rpc_request(1, "resources/list")))
    transcript.append(handle(rpc_request(2, "resources/read", uri="notes://note-1")))
    transcript.append(handle(rpc_request(3, "prompts/list")))
    transcript.append(
        handle(
            rpc_request(
                4,
                "prompts/get",
                name="review_note",
                arguments={"uri": "notes://note-1", "focus": "operational risk"},
            )
        )
    )
    stream = handle(
        rpc_request(
            5,
            "subscriptions/listen",
            notifications={
                "resourcesListChanged": True,
                "resourceSubscriptions": ["notes://note-1"],
            },
        )
    )
    assert isinstance(stream, SubscriptionStream)
    transcript.extend([stream.acknowledged(), stream.resource_updated("notes://note-1"), stream.close()])
    return [item for item in transcript if item is not None]


if __name__ == "__main__":
    print(json.dumps(demo(), indent=2))
