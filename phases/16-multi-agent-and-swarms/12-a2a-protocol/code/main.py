"""使用 http.server 编写的 A2A 风格最小客户端与服务端。

演示发现 -> 提交 -> 轮询 -> 读取结果的流程：
  GET /.well-known/agent.json：获取智能体描述卡；
  POST /tasks：创建任务；
  GET /tasks/{id}：查询状态与产物。
服务端在本地线程中运行，客户端访问 localhost:8765 并打印轨迹。

译注：端点、字段与 a2a-0.3 标签沿用固定原文；这是自定义简化实现，未做真实
协议一致性验证。认证设置为 none，不应对外暴露。审阅只匹配 return 和 def
子串；没有执行源码、鉴权、输入大小限制、持久化或完整错误处理。
"""
from __future__ import annotations

import json
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from uuid import uuid4


AGENT_CARD = {
    "name": "code-review-agent",
    "version": "0.1.0",
    "skills": ["review-python"],
    "endpoints": {
        "tasks": "http://localhost:8765/tasks",
    },
    "auth": {"type": "none"},
    "modalities": ["text", "structured"],
    "protocol_version": "a2a-0.3",
}


class TaskStore:
    def __init__(self) -> None:
        self.tasks: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create(self, skill: str, payload: dict) -> str:
        tid = str(uuid4())[:8]
        with self._lock:
            self.tasks[tid] = {
                "id": tid,
                "skill": skill,
                "payload": payload,
                "state": "submitted",
                "artifact": None,
                "created_at": time.time(),
            }
        threading.Thread(target=self._run, args=(tid,), daemon=True).start()
        return tid

    def _run(self, tid: str) -> None:
        with self._lock:
            self.tasks[tid]["state"] = "working"
        time.sleep(0.2)
        with self._lock:
            t = self.tasks[tid]
            if t["skill"] == "review-python":
                code = t["payload"].get("code", "")
                issues = []
                if "return" not in code:
                    # 审阅结果：没有 return 语句；属于返回给客户端的结构化结果，保留英文。
                    issues.append("no return statement")
                if "def " not in code:
                    # 审阅结果：没有函数定义。
                    issues.append("no function definition")
                t["artifact"] = {
                    "type": "structured",
                    "data": {"issues": issues, "lines": code.count("\n") + 1},
                }
                t["state"] = "completed"
            else:
                t["state"] = "failed"
                # 失败原因：未知技能。
                t["artifact"] = {"type": "text", "data": f"unknown skill '{t['skill']}'"}

    def get(self, tid: str) -> dict | None:
        with self._lock:
            return self.tasks.get(tid)


STORE = TaskStore()


class A2AHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_json(self, status: int, body: Any) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/.well-known/agent.json":
            self._send_json(200, AGENT_CARD)
            return
        if self.path.startswith("/tasks/"):
            tid = self.path.split("/tasks/", 1)[1]
            task = STORE.get(tid)
            if task is None:
                # HTTP 错误：任务不存在。
                self._send_json(404, {"error": "not found"})
                return
            self._send_json(200, task)
            return
        # HTTP 错误：路由不存在。
        self._send_json(404, {"error": "route not found"})

    def do_POST(self) -> None:
        if self.path == "/tasks":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            tid = STORE.create(body.get("skill", ""), body.get("payload", {}))
            self._send_json(201, {"task_id": tid, "state": "submitted"})
            return
        # HTTP 错误：路由不存在。
        self._send_json(404, {"error": "route not found"})


def run_server() -> HTTPServer:
    server = HTTPServer(("localhost", 8765), A2AHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def http_json(method: str, url: str, body: Any = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_client() -> None:
    print("\n[1] 发现：GET /.well-known/agent.json")
    card = http_json("GET", "http://localhost:8765/.well-known/agent.json")
    print(f"    名称={card['name']}，技能={card['skills']}")

    print("\n[2] 提交任务：POST /tasks")
    submission = {"skill": "review-python", "payload": {"code": "x = 1\nprint(x)\n"}}
    resp = http_json("POST", card["endpoints"]["tasks"], submission)
    tid = resp["task_id"]
    print(f"    任务 ID={tid}，状态={resp['state']}")

    print("\n[3] 轮询，直到进入终态或达到次数上限")
    for i in range(10):
        task = http_json("GET", f"http://localhost:8765/tasks/{tid}")
        print(f"    第 {i + 1} 次：状态={task['state']}")
        if task["state"] in ("completed", "failed"):
            print(f"    产物：{task['artifact']}")
            break
        time.sleep(0.1)


def main() -> None:
    print("A2A 风格的最小协议演示")
    print("-" * 30)
    server = run_server()
    time.sleep(0.1)
    try:
        run_client()
    finally:
        server.shutdown()
    print("\n要点：观察智能体发现、任务生命周期和带类型的产物；本例没有实现认证。")
    print("原文以“智能体—工具”和“智能体—智能体”区分协作方向；真实集成仍需核对协议与认证要求。")


if __name__ == "__main__":
    main()
