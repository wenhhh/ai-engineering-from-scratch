"""阶段 13 综合实践：无状态、进程内的研究与报告模拟。

在一个便于阅读的演示中整合本阶段的多种系统边界：
  - 模拟网关的静态令牌查找与基于角色的访问控制（RBAC）
  - 每个请求携带协议元数据，并要求先进行服务器发现
  - 本地工具函数返回符合任务扩展和 UI 结构的数据
  - 用嵌套 span 表示类似 A2A 的写作任务委派
  - 内存中的链路字典共享同一个 trace ID
  - 用固定哈希清单检测工具描述是否被修改

本文件没有实现 MCP 或 A2A 传输、OAuth 交互、MCP App 桥接、遥测导出器，
也没有执行沙箱。仅依赖标准库。论文和模型调用都是本地示例数据，
没有实时检索 arXiv，也没有验证“引用最多”等用户查询条件。
参与检索或哈希的原文在相邻注释中解释，不能只翻译匹配的一侧。

运行：python code/main.py
"""

from __future__ import annotations

import hashlib
import json
import time
import uuid
from copy import deepcopy
from datetime import datetime, timezone


SPANS: list[dict] = []
TASKS: dict[str, dict] = {}

PROTOCOL_VERSION = "2026-07-28"
TASK_EXTENSION = "io.modelcontextprotocol/tasks"
SERVER_INFO = {"name": "research-simulator", "version": "1.0.0"}


def request_meta(*, tasks: bool = False) -> dict:
    extensions = {TASK_EXTENSION: {}} if tasks else {}
    return {
        "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientCapabilities": {"extensions": extensions},
        "io.modelcontextprotocol/clientInfo": {
            "name": "capstone-client",
            "version": "1.0.0",
        },
    }


def _server_meta() -> dict:
    return {"io.modelcontextprotocol/serverInfo": deepcopy(SERVER_INFO)}


def complete_result(**fields: object) -> dict:
    return {"resultType": "complete", **fields, "_meta": _server_meta()}


def protocol_error(code: int, message: str, data: dict | None = None) -> dict:
    error = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"error": error}


def validate_request_meta(meta: dict, *, require_tasks: bool = False) -> dict | None:
    if not isinstance(meta, dict):
        # 协议诊断：params._meta 必须是对象。
        return protocol_error(-32602, "params._meta must be an object")
    requested = meta.get("io.modelcontextprotocol/protocolVersion")
    if not isinstance(requested, str):
        # 协议诊断：protocolVersion 必须是字符串。
        return protocol_error(-32602, "protocolVersion must be a string")
    if requested != PROTOCOL_VERSION:
        return protocol_error(
            -32022,
            # 协议诊断：不支持此协议版本。
            "Unsupported protocol version",
            {"supported": [PROTOCOL_VERSION], "requested": requested},
        )
    capabilities = meta.get("io.modelcontextprotocol/clientCapabilities")
    if not isinstance(capabilities, dict):
        # 协议诊断：clientCapabilities 必须是对象。
        return protocol_error(-32602, "clientCapabilities must be an object")
    extensions = capabilities.get("extensions", {})
    if require_tasks and (
        not isinstance(extensions, dict) or TASK_EXTENSION not in extensions
    ):
        return protocol_error(
            -32021,
            # 协议诊断：缺少必需的客户端能力。
            "Missing required client capability",
            {
                "requiredCapabilities": {
                    "extensions": {TASK_EXTENSION: {}}
                }
            },
        )
    return None


def server_discover(meta: dict) -> dict:
    invalid = validate_request_meta(meta)
    if invalid:
        return invalid
    return complete_result(
        supportedVersions=[PROTOCOL_VERSION],
        capabilities={
            "tools": {"listChanged": False},
            "extensions": {TASK_EXTENSION: {}},
        },
        ttlMs=3_600_000,
        cacheScope="public",
    )


def _hex(n: int) -> str:
    return uuid.uuid4().hex[: n * 2]


def span(name: str, kind: str, trace_id: str | None, parent: str | None,
         attrs: dict) -> dict:
    tid = trace_id or _hex(16)
    sp = {"name": name, "kind": kind, "traceId": tid, "spanId": _hex(8),
          "parentSpanId": parent, "start": time.time_ns(), "attrs": attrs, "end": 0}
    SPANS.append(sp)
    return sp


def finish(sp: dict) -> None:
    sp["end"] = max(time.time_ns(), sp["start"] + 1)


TOOLS = [
    # 参与哈希的工具描述：用户按关键词搜索 arXiv 时使用。
    {"name": "arxiv_search", "description": "Use when the user searches arXiv by keyword."},
    # 参与哈希的工具描述：用户需要完整报告时使用。
    {"name": "generate_report", "description": "Use when the user wants a full report."},
]

PAPERS = [
    # 检索夹具标题：针对 MCP 部署的工具投毒攻击。
    {"arxiv_id": "2603.22489", "title": "Tool poisoning attacks on MCP deployments"},
    # 检索夹具标题：智能体间协作基准。
    {"arxiv_id": "2604.01055", "title": "Agent-to-agent coordination benchmarks"},
    # 检索夹具标题：通过 Tasks 执行长时间工具调用。
    {"arxiv_id": "2603.30016", "title": "Long-running tool calls via Tasks"},
]

PINNED = {f"research::{t['name']}": hashlib.sha256(t["description"].encode()).hexdigest()
          for t in TOOLS}


def research_arxiv_search(args: dict) -> dict:
    q = args["query"].lower()
    hits = [p for p in PAPERS if q in p["title"].lower()]
    return complete_result(
        content=[{"type": "text", "text": json.dumps(hits)}],
        isError=False,
    )


def research_generate_report(args: dict, trace_id: str, parent: str) -> dict:
    task_id = f"tsk_{uuid.uuid4().hex[:10]}"
    sp = span("mcp.task.working", "INTERNAL", trace_id, parent,
              {"gen_ai.operation.name": "execute_tool", "mcp.task.id": task_id})
    a2a = span("a2a.SendMessage", "CLIENT", trace_id, sp["spanId"],
               {"a2a.peer": "writer-agent", "a2a.skill": "summarize_papers"})
    finish(a2a)
    finish(sp)
    html = (
        "<!doctype html><html><body>"
        "<h1>智能体协议 arXiv 报告</h1><ul>"
        + "".join(f"<li>{p['arxiv_id']}: {p['title']}</li>" for p in PAPERS)
        + "</ul><script>/* 本例刻意不提供真实的 MCP App 桥接。 */</script></body></html>"
    )
    now = datetime.now(timezone.utc).isoformat()
    TASKS[task_id] = {
        "resultType": "complete",
        "taskId": task_id,
        "status": "completed",
        "createdAt": now,
        "lastUpdatedAt": now,
        "ttlMs": 900_000,
        "pollIntervalMs": 1_000,
        "result": complete_result(
            content=[
                {"type": "text", "text": "报告已生成：已汇总 3 篇论文。"},
                {"type": "ui_resource", "uri": "ui://report/current"},
            ],
            ui={
                "resourceUri": "ui://report/current",
                "csp": {"default-src": "'self'"},
                "permissions": [],
            },
            html=html,
        ),
        "_meta": _server_meta(),
    }
    return {
        "resultType": "task",
        "taskId": task_id,
        "status": "working",
        "createdAt": now,
        "lastUpdatedAt": now,
        "ttlMs": 900_000,
        "pollIntervalMs": 1_000,
        "_meta": _server_meta(),
    }


def tasks_get(task_id: str, meta: dict) -> dict:
    invalid = validate_request_meta(meta, require_tasks=True)
    if invalid:
        return invalid
    if not isinstance(task_id, str):
        # 协议诊断：未知的 taskId；该原文也用于测试的精确断言。
        return protocol_error(-32602, "Unknown taskId")
    task = TASKS.get(task_id)
    if task is None:
        # 协议诊断：未知的 taskId；该原文也用于测试的精确断言。
        return protocol_error(-32602, "Unknown taskId")
    return deepcopy(task)


USERS = {
    "tok_alice": {"id": "alice", "scopes": {"research:read", "research:write"}},
    "tok_bob":   {"id": "bob",   "scopes": {"research:read"}},
}
REQUIRED_SCOPE = {"arxiv_search": "research:read",
                  "generate_report": "research:write"}

AUDIT: list[dict] = []


def pin_ok(tool_name: str, description: str) -> bool:
    return PINNED.get(f"research::{tool_name}") == hashlib.sha256(description.encode()).hexdigest()


def gateway_call(token: str, tool_name: str, args: dict,
                 trace_id: str, parent: str, meta: dict) -> dict:
    invalid = validate_request_meta(
        meta, require_tasks=tool_name == "generate_report"
    )
    if invalid:
        return invalid
    u = USERS.get(token)
    if not u:
        return {"error": "unauthenticated"}
    required = REQUIRED_SCOPE.get(tool_name)
    if required and required not in u["scopes"]:
        AUDIT.append({"user": u["id"], "tool": tool_name, "decision": "403"})
        return {"error": "insufficient_scope", "scope": required}
    tool = next((t for t in TOOLS if t["name"] == tool_name), None)
    if tool is None:
        return {"error": "unknown tool"}
    if not pin_ok(tool_name, tool["description"]):
        return {"error": "hash_mismatch"}
    sp = span("mcp.call", "CLIENT", trace_id, parent,
              {"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": tool_name,
               "gateway.user": u["id"], "mcp.server": "research"})
    if tool_name == "arxiv_search":
        result = research_arxiv_search(args)
    else:
        result = research_generate_report(args, trace_id, sp["spanId"])
    finish(sp)
    AUDIT.append({"user": u["id"], "tool": tool_name, "decision": "allow"})
    return result


def orchestrator(token: str, user_query: str) -> dict:
    trace_id = _hex(16)
    root = span("agent.invoke_agent", "INTERNAL", trace_id, None,
                {"gen_ai.operation.name": "invoke_agent",
                 "gen_ai.agent.name": "research-orchestrator"})

    llm1 = span("llm.chat", "CLIENT", trace_id, root["spanId"],
                {"gen_ai.operation.name": "chat", "gen_ai.provider.name": "openai",
                 "gen_ai.request.model": "gpt-4o", "gen_ai.usage.input_tokens": 24})
    finish(llm1)

    search = gateway_call(token, "arxiv_search",
                          {"query": "agent"}, trace_id, root["spanId"],
                          request_meta())
    report = gateway_call(token, "generate_report",
                          {"format": "html"}, trace_id, root["spanId"],
                          request_meta(tasks=True))
    task = None
    if report.get("resultType") == "task":
        task = tasks_get(report["taskId"], request_meta(tasks=True))

    llm2 = span("llm.chat", "CLIENT", trace_id, root["spanId"],
                {"gen_ai.operation.name": "chat", "gen_ai.provider.name": "openai",
                 "gen_ai.request.model": "gpt-4o", "gen_ai.usage.output_tokens": 85})
    finish(llm2)

    finish(root)
    return {"trace_id": trace_id, "search": search, "report": report, "task": task}


def demo() -> None:
    print("=" * 72)
    print("阶段 13 综合实践——研究与报告工具生态")
    print("=" * 72)

    print("\n--- 无状态服务器发现 ---")
    discovery = server_discover(request_meta())
    print(f"  协议版本：{discovery['supportedVersions'][0]}")
    print(f"  任务扩展：{TASK_EXTENSION in discovery['capabilities']['extensions']}")

    print("\n--- 以 alice 身份运行编排器（读写权限）---")
    # 示例请求：总结 2026 年引用最多的三篇 arXiv 论文；本地模拟并未实现引用量排序。
    out = orchestrator("tok_alice", "summarize the three most-cited 2026 arXiv papers")
    print(f"  链路 ID    ：{out['trace_id']}")
    print(f"  检索结果   ：{out['search']['content'][0]['text']}")
    print(f"  报告任务句柄：{out['report']['taskId']} ({out['report']['status']})")
    print(f"  任务状态   ：{out['task']['status']}（通过 tasks/get 获取）")
    print(f"  UI 字符数  ：{len(out['task']['result']['html'])}")

    print("\n--- 以 bob 身份运行编排器（只读权限）---")
    # 示例请求：生成一份报告。
    out = orchestrator("tok_bob", "generate a report")
    print(f"  generate_report -> {out['report']}")

    print("\n--- 审计日志 ---")
    for row in AUDIT:
        print(f"  {row}")

    print("\n--- OTel GenAI 链路片段 ---")
    for sp in SPANS:
        dur_ms = round((sp['end'] - sp['start']) / 1_000_000, 2) if sp['end'] else 0
        parent = sp['parentSpanId'][:6] if sp['parentSpanId'] else "ROOT"
        print(f"  [{sp['traceId'][:6]}] {sp['name']:20s} {sp['kind']:8s} "
              f"父 span={parent}  耗时={dur_ms}ms")

    print("\n--- 覆盖的基本构件 ---")
    covered = [
        "工具接口与直接函数分派",
        "server/discover 与逐请求无状态元数据",
        "结构化内容字典",
        "任务扩展句柄与 tasks/get 轮询",
        "采用 ui:// 形式的资源引用",
        "用固定哈希检测描述变更",
        "静态令牌权限范围与网关策略模拟",
        "类似 A2A 的不透明任务委派边界",
        "内存中的链路标识符与父 span 标识符",
        "编排器在本地操作之间进行路由",
    ]
    for c in covered:
        print(f"  + {c}")


if __name__ == "__main__":
    demo()
