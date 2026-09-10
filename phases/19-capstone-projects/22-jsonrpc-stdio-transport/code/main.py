"""基于标准输入输出的 JSON-RPC 2.0 传输：每行一条 JSON 消息。

概念参考：
- ../docs/en.md（本课中文说明，沿用原文件名；英文原文在包内 english-source/ 的对应路径）
- JSON-RPC 2.0 规范（https://www.jsonrpc.org/specification）
- RFC 8259（JSON）

仅使用标准库。在课程目录运行：python3 code/main.py

译注：默认演示使用内存字节流，不会启动子进程或持续监听真实标准输入。
请求、响应、通知、批次和错误消息的机器载荷保持原样。没有认证、消息大小限制
或通用故障隔离；例如无效 UTF-8 的解码异常不在当前 JSON 解析异常处理范围内。
"""

from __future__ import annotations

import io
import json
import sys
from dataclasses import dataclass
from typing import Any, BinaryIO, Callable, Iterable


ERR_PARSE = -32700
ERR_INVALID_REQUEST = -32600
ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_PARAMS = -32602
ERR_INTERNAL = -32603


class JsonRpcError(Exception):
    code: int = ERR_INTERNAL

    def __init__(self, message: str, data: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.data = data


class MethodNotFound(JsonRpcError):
    code = ERR_METHOD_NOT_FOUND


class InvalidParams(JsonRpcError):
    code = ERR_INVALID_PARAMS


@dataclass
class Request:
    method: str
    params: Any
    id: int | str | None
    is_notification: bool


def _is_valid_envelope(msg: Any) -> bool:
    if not isinstance(msg, dict):
        return False
    if msg.get("jsonrpc") != "2.0":
        return False
    if not isinstance(msg.get("method"), str):
        return False
    if "params" in msg and not isinstance(msg["params"], (dict, list)):
        return False
    if "id" in msg:
        rid = msg["id"]
        if isinstance(rid, bool):
            return False
        if not isinstance(rid, (int, str, type(None))):
            return False
    return True


def parse_request(raw: str) -> tuple[Request | None, dict | None]:
    """解析一行 JSON。成功时返回 (Request, None)，失败时返回 (None, error_dict)。

    error_dict 是可直接写出的 JSON-RPC 错误响应。
    """
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError as exc:
        # 协议错误：JSON 解析失败。
        return None, _err_envelope(None, ERR_PARSE, f"parse error: {exc}")
    if not _is_valid_envelope(msg):
        rid = msg.get("id") if isinstance(msg, dict) else None
        # 协议错误：请求封装无效。
        return None, _err_envelope(rid, ERR_INVALID_REQUEST, "invalid request envelope")
    is_notif = "id" not in msg
    return Request(
        method=msg["method"],
        params=msg.get("params"),
        id=msg.get("id"),
        is_notification=is_notif,
    ), None


def _err_envelope(rid: int | str | None, code: int, message: str, data: Any | None = None) -> dict:
    err: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": rid, "error": err}


def _ok_envelope(rid: int | str | None, result: Any) -> dict:
    return {"jsonrpc": "2.0", "id": rid, "result": result}


def _notification_envelope(method: str, params: Any | None) -> dict:
    env: dict[str, Any] = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        env["params"] = params
    return env


class StdioTransport:
    """通过一对字节流传输按换行符分隔的 JSON-RPC 2.0 消息。"""

    def __init__(self, stdin: BinaryIO, stdout: BinaryIO) -> None:
        self._in: BinaryIO = stdin
        self._out: BinaryIO = stdout

    def read_line(self) -> bytes | None:
        line = self._in.readline()
        if not line:
            return None
        return line

    def write_response(self, rid: int | str | None, result: Any) -> None:
        self._write(_ok_envelope(rid, result))

    def write_error(self, rid: int | str | None, code: int, message: str, data: Any | None = None) -> None:
        self._write(_err_envelope(rid, code, message, data))

    def write_notification(self, method: str, params: Any | None = None) -> None:
        self._write(_notification_envelope(method, params))

    def _write(self, obj: dict) -> None:
        encoded = json.dumps(obj, separators=(",", ":"))
        self._out.write((encoded + "\n").encode("utf-8"))
        self._out.flush()


Handler = Callable[[str, Any], Any]


def _handle_one(handler: Handler, transport: StdioTransport, req: Request) -> dict | None:
    """分发单个 Request，返回响应封装；通知不需要响应，返回 None。"""
    try:
        result = handler(req.method, req.params)
    except MethodNotFound as exc:
        return None if req.is_notification else _err_envelope(req.id, exc.code, exc.message, exc.data)
    except InvalidParams as exc:
        return None if req.is_notification else _err_envelope(req.id, exc.code, exc.message, exc.data)
    except JsonRpcError as exc:
        return None if req.is_notification else _err_envelope(req.id, exc.code, exc.message, exc.data)
    except Exception as exc:
        return None if req.is_notification else _err_envelope(
            # 协议错误：内部错误；data 中附带异常类型和详情。
            req.id, ERR_INTERNAL, "internal error",
            {"exception": type(exc).__name__, "detail": str(exc)},
        )
    if req.is_notification:
        return None
    return _ok_envelope(req.id, result)


def _process_batch(handler: Handler, transport: StdioTransport, items: list) -> list | None:
    out: list = []
    for raw in items:
        if not isinstance(raw, dict) or not _is_valid_envelope(raw):
            rid = raw.get("id") if isinstance(raw, dict) else None
            # 协议错误：请求封装无效。
            out.append(_err_envelope(rid, ERR_INVALID_REQUEST, "invalid request envelope"))
            continue
        is_notif = "id" not in raw
        req = Request(
            method=raw["method"], params=raw.get("params"),
            id=raw.get("id"), is_notification=is_notif,
        )
        resp = _handle_one(handler, transport, req)
        if resp is not None:
            out.append(resp)
    if not out:
        return None
    return out


def _write_raw(transport: StdioTransport, obj: Any) -> None:
    encoded = json.dumps(obj, separators=(",", ":"))
    transport._out.write((encoded + "\n").encode("utf-8"))
    transport._out.flush()


def serve(handler: Handler, transport: StdioTransport) -> None:
    """持续从传输层读取请求，直到文件结束；将每个请求交给 handler 处理。"""
    while True:
        line = transport.read_line()
        if line is None:
            return
        text = line.decode("utf-8").rstrip("\n").strip()
        if not text:
            continue
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            # 协议错误：JSON 解析失败。
            transport.write_error(None, ERR_PARSE, f"parse error: {exc}")
            continue
        if isinstance(parsed, list):
            if not parsed:
                # 协议错误：批次不能为空。
                transport.write_error(None, ERR_INVALID_REQUEST, "empty batch")
                continue
            batch_out = _process_batch(handler, transport, parsed)
            if batch_out is not None:
                _write_raw(transport, batch_out)
            continue
        req, err = parse_request(text)
        if err is not None:
            _write_raw(transport, err)
            continue
        resp = _handle_one(handler, transport, req)
        if resp is not None:
            _write_raw(transport, resp)


def _demo() -> None:
    """使用 io.BytesIO 的演示；读取完内存输入后自行结束，不创建子进程。"""

    def handler(method: str, params: Any) -> Any:
        if method == "math.add":
            if not isinstance(params, dict) or "a" not in params or "b" not in params:
                # 参数错误：必须提供 a 和 b。
                raise InvalidParams("a and b required")
            return params["a"] + params["b"]
        if method == "echo":
            return params
        if method == "boom":
            # 演示故意抛出的异常，用于测试内部错误响应。
            raise RuntimeError("intentional")
        raise MethodNotFound(f"method {method!r}")

    requests = [
        {"jsonrpc": "2.0", "id": 1, "method": "math.add", "params": {"a": 2, "b": 3}},
        {"jsonrpc": "2.0", "id": 2, "method": "math.add", "params": {"a": 5}},
        {"jsonrpc": "2.0", "id": 3, "method": "missing"},
        {"jsonrpc": "2.0", "id": 4, "method": "boom"},
        {"jsonrpc": "2.0", "method": "log", "params": {"level": "info"}},
        [
            {"jsonrpc": "2.0", "id": 10, "method": "echo", "params": {"text": "hi"}},
            {"jsonrpc": "2.0", "method": "log", "params": {"msg": "skip-me"}},
            {"jsonrpc": "2.0", "id": 11, "method": "math.add", "params": {"a": 1, "b": 1}},
        ],
    ]

    stdin = io.BytesIO()
    for r in requests:
        stdin.write((json.dumps(r) + "\n").encode("utf-8"))
    stdin.write(b"{not json\n")
    stdin.seek(0)
    stdout = io.BytesIO()
    transport = StdioTransport(stdin, stdout)
    serve(handler, transport)
    stdout.seek(0)
    lines = [json.loads(line) for line in stdout.read().decode("utf-8").splitlines() if line]
    print(json.dumps({"server_responses": lines}, indent=2))


if __name__ == "__main__":
    _demo()
