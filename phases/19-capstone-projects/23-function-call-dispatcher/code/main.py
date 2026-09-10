"""函数调用分发器：超时、重试、幂等键与并发限制。

概念参考：
- ../docs/en.md（本课中文说明，沿用原文件名；英文原文在包内 english-source/ 的对应路径）
- JSON-RPC 2.0 规范：错误响应的封装形式
- IETF 草案 draft-bhutton-json-schema-2020-12：复用简化的模式子集

仅使用标准库。在课程目录运行：python3 code/main.py

译注：幂等键仅关联内存中的在途调用和短期结果缓存，不绑定工具名称或参数，
也不是跨进程的恰好一次执行保证。同步处理器直接在事件循环中调用；阻塞的同步
函数不会因 asyncio.wait_for 而变成可抢占执行。超时重试检查 idempotent 标记，
TransientError 的重试分支则不检查该标记。错误类别与错误消息保留英文契约。
"""

from __future__ import annotations

import asyncio
import inspect
import json
import random
import re
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Iterable


ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_PARAMS = -32602
ERR_INTERNAL = -32603


class TransientError(Exception):
    """由处理器抛出，表示该失败适合重试。"""


class _DispatchedError(Exception):
    """封装 DispatchError 的内部标记异常，使等待同一在途调用的请求保留原错误类别。"""

    def __init__(self, error: "DispatchError") -> None:
        super().__init__(error.message)
        self.error = error


@dataclass
class DispatchError(Exception):
    kind: str
    message: str
    attempts: int
    jsonrpc_code: int = ERR_INTERNAL

    def __post_init__(self) -> None:
        super().__init__(f"{self.kind}: {self.message}")

    def to_envelope(self) -> dict:
        return {
            "code": self.jsonrpc_code,
            "message": self.message,
            "data": {"kind": self.kind, "attempts": self.attempts},
        }


@dataclass
class DispatchOk:
    result: Any
    attempts: int


@dataclass
class _ToolRecord:
    name: str
    schema: dict
    handler: Callable[..., Any]
    idempotent: bool = False
    timeout_ms: int = 30_000


class MiniRegistry:
    """精简注册表：保存名称、模式、处理器、幂等标记和超时设置。"""

    def __init__(self) -> None:
        self._recs: dict[str, _ToolRecord] = {}

    def register(
        self, name: str, schema: dict, handler: Callable[..., Any],
        *, idempotent: bool = False, timeout_ms: int = 30_000,
    ) -> None:
        self._recs[name] = _ToolRecord(
            name=name, schema=schema, handler=handler,
            idempotent=idempotent, timeout_ms=timeout_ms,
        )

    def get(self, name: str) -> _ToolRecord:
        if name not in self._recs:
            raise KeyError(name)
        return self._recs[name]

    def validate(self, name: str, args: Any) -> list[str]:
        rec = self.get(name)
        errs: list[str] = []
        _walk(rec.schema, args, "", errs)
        return errs


def _walk(schema: dict, value: Any, path: str, errs: list[str]) -> None:
    t = schema.get("type")
    type_ok = True
    if t == "object" and not isinstance(value, dict):
        type_ok = False
    elif t == "integer" and (isinstance(value, bool) or not isinstance(value, int)):
        type_ok = False
    elif t == "string" and not isinstance(value, str):
        type_ok = False
    elif t == "array" and not isinstance(value, list):
        type_ok = False
    if not type_ok:
        errs.append(f"{path or '/'}: expected {t}, got {type(value).__name__}")
        return
    if t == "object":
        for req in schema.get("required", []):
            if req not in value:
                errs.append(f"{path}/{req}: required")
        for k, sub in schema.get("properties", {}).items():
            if k in value:
                _walk(sub, value[k], f"{path}/{k}", errs)


@dataclass
class _InFlight:
    future: asyncio.Future
    started_at: float


class Dispatcher:
    """提供单次调用超时、重试、幂等键去重与并发限制。"""

    def __init__(
        self,
        registry: MiniRegistry,
        *,
        max_attempts: int = 3,
        concurrency: int = 8,
        cache_ttl_seconds: float = 60.0,
        sleep: Callable[[float], Awaitable[None]] | None = None,
    ) -> None:
        if max_attempts <= 0:
            # 参数错误：最大尝试次数必须大于零。
            raise ValueError("max_attempts must be > 0")
        self.registry = registry
        self.max_attempts = max_attempts
        self._sem = asyncio.Semaphore(concurrency)
        self._inflight: dict[str, _InFlight] = {}
        self._cache: dict[str, tuple[Any, float]] = {}
        self._cache_ttl = cache_ttl_seconds
        self._sleep = sleep or asyncio.sleep

    async def dispatch(
        self,
        name: str,
        args: dict,
        *,
        timeout_ms_override: int | None = None,
        idempotency_key: str | None = None,
        budget_tool_calls_remaining: int | None = None,
    ) -> DispatchOk | DispatchError:
        try:
            rec = self.registry.get(name)
        except KeyError:
            return DispatchError(
                # 错误类别：未找到工具。
                kind="not_found", message=f"tool {name!r}", attempts=0,
                jsonrpc_code=ERR_METHOD_NOT_FOUND,
            )

        errs = self.registry.validate(name, args)
        if errs:
            return DispatchError(
                # 模式校验或模式错误的机器标识，保持原值。
                kind="schema", message="; ".join(errs), attempts=0,
                jsonrpc_code=ERR_INVALID_PARAMS,
            )

        if budget_tool_calls_remaining is not None and budget_tool_calls_remaining <= 0:
            return DispatchError(
                # 错误类别：工具调用预算耗尽。
                # 预算错误：剩余工具调用次数为零。
                kind="budget_exceeded", message="tool_calls remaining is 0", attempts=0,
            )

        if idempotency_key is not None:
            now = time.monotonic()
            cached = self._cache.get(idempotency_key)
            if cached is not None and now - cached[1] < self._cache_ttl:
                return DispatchOk(result=cached[0], attempts=0)
            inflight = self._inflight.get(idempotency_key)
            if inflight is not None:
                try:
                    res = await inflight.future
                    return DispatchOk(result=res, attempts=0)
                except Exception as exc:
                    return _map_exception(exc, attempts=0)

        async with self._sem:
            return await self._run_with_retries(rec, args, timeout_ms_override, idempotency_key)

    async def _run_with_retries(
        self,
        rec: _ToolRecord,
        args: dict,
        timeout_override: int | None,
        idempotency_key: str | None,
    ) -> DispatchOk | DispatchError:
        timeout_ms = timeout_override if timeout_override is not None else rec.timeout_ms
        timeout_s = timeout_ms / 1000.0
        attempt = 0
        last_error: DispatchError | None = None

        loop = asyncio.get_running_loop()
        future: asyncio.Future | None = None
        if idempotency_key is not None:
            future = loop.create_future()
            self._inflight[idempotency_key] = _InFlight(future=future, started_at=time.monotonic())

        try:
            while attempt < self.max_attempts:
                attempt += 1
                try:
                    coro = _invoke(rec.handler, args)
                    result = await asyncio.wait_for(coro, timeout=timeout_s)
                except asyncio.TimeoutError:
                    last_error = DispatchError(
                        kind="timeout",
                        message=f"timeout after {timeout_ms}ms",
                        attempts=attempt,
                    )
                    if not rec.idempotent:
                        break
                    if attempt >= self.max_attempts:
                        break
                    await self._sleep(_backoff(attempt))
                    continue
                except TransientError as exc:
                    last_error = DispatchError(
                        kind="transient", message=str(exc), attempts=attempt,
                    )
                    if attempt >= self.max_attempts:
                        break
                    await self._sleep(_backoff(attempt))
                    continue
                except Exception as exc:
                    err = _map_exception(exc, attempts=attempt)
                    if future is not None and not future.done():
                        future.set_exception(_DispatchedError(err))
                    return err
                if future is not None and not future.done():
                    future.set_result(result)
                if idempotency_key is not None:
                    self._cache[idempotency_key] = (result, time.monotonic())
                return DispatchOk(result=result, attempts=attempt)

            assert last_error is not None
            if future is not None and not future.done():
                future.set_exception(_DispatchedError(last_error))
            return last_error
        finally:
            if idempotency_key is not None:
                self._inflight.pop(idempotency_key, None)

    async def gather_bounded(self, calls: Iterable[tuple[str, dict]]) -> list[DispatchOk | DispatchError]:
        return await asyncio.gather(*(self.dispatch(n, a) for n, a in calls))


async def _invoke(handler: Callable[..., Any], args: dict) -> Any:
    if inspect.iscoroutinefunction(handler):
        return await handler(**args)
    result = handler(**args)
    if inspect.isawaitable(result):
        return await result
    return result


def _backoff(attempt: int) -> float:
    base = 0.1 * (4 ** (attempt - 1))
    return base * (1 + random.random() * 0.5)


def _map_exception(exc: Exception, attempts: int) -> DispatchError:
    if isinstance(exc, _DispatchedError):
        original = exc.error
        return DispatchError(
            kind=original.kind,
            message=original.message,
            attempts=original.attempts,
            jsonrpc_code=original.jsonrpc_code,
        )
    return DispatchError(
        kind="internal",
        message=f"{type(exc).__name__}: {exc}",
        attempts=attempts,
    )


async def _demo() -> None:
    reg = MiniRegistry()

    counter = {"a": 0, "b": 0}

    async def flaky_fetch(id: int) -> dict:
        counter["a"] += 1
        if counter["a"] < 2:
            raise TransientError("upstream not ready")
        return {"id": id, "name": "ada"}

    async def slow(n: int) -> int:
        counter["b"] += 1
        await asyncio.sleep(0.05)
        return n

    reg.register(
        "fetch_user",
        schema={"type": "object", "required": ["id"], "properties": {"id": {"type": "integer"}}},
        handler=flaky_fetch, idempotent=True, timeout_ms=200,
    )
    reg.register(
        "slow",
        schema={"type": "object", "required": ["n"], "properties": {"n": {"type": "integer"}}},
        handler=slow, idempotent=True, timeout_ms=10,
    )
    reg.register(
        "noop",
        schema={"type": "object", "properties": {}},
        handler=lambda: "ok",
    )

    disp = Dispatcher(reg, max_attempts=3, concurrency=4)

    out_retry = await disp.dispatch("fetch_user", {"id": 42})
    out_timeout = await disp.dispatch("slow", {"n": 1})
    out_schema = await disp.dispatch("fetch_user", {"id": "x"})
    out_missing = await disp.dispatch("does_not_exist", {})
    out_ok = await disp.dispatch("noop", {})

    a, b = await asyncio.gather(
        disp.dispatch("noop", {}, idempotency_key="k1"),
        disp.dispatch("noop", {}, idempotency_key="k1"),
    )
    report = {
        "retry_then_success": {
            "attempts": getattr(out_retry, "attempts", None),
            "ok": isinstance(out_retry, DispatchOk),
        },
        "timeout": {"kind": getattr(out_timeout, "kind", None)},
        # 模式校验或模式错误的机器标识，保持原值。
        "schema": {"kind": getattr(out_schema, "kind", None)},
        "missing": {"kind": getattr(out_missing, "kind", None)},
        "happy": {"result": getattr(out_ok, "result", None)},
        "idempotency_pair": [isinstance(a, DispatchOk), isinstance(b, DispatchOk)],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(_demo())
