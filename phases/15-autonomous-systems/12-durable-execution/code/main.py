"""最小持久执行引擎，仅使用 Python 标准库。

用工作流、活动（activity）和事件日志演示重放：执行前记录输入，执行后记录输出。
再次运行工作流时，若日志中已有同名、同参数且状态为 done 的活动，就复用结果，
而不是重新调用它。模拟对照展示保留日志与丢弃日志重试的区别。

原文以 Temporal、LangGraph 检查点、Microsoft Agent Framework 和 Claude Code Routines
的工作流／活动／事件日志模式作概念参照；本例没有调用这些框架，也未在本轮核验其当前实现。

译注：JSON 文件通过整文件重写保存，没有原子替换、刷盘保证、并发锁或事务。
本例的崩溃发生在活动完成且记下 done 之后；若真实副作用已发生、done 却未写入，
重试可能重复执行，因此本实现不保证 exactly-once。缓存键也不区分同名同参数的
不同调用位置。示例活动仅返回固定规则构造的值，没有真实 API、LLM 调用或报告写入。
固定英文查询 hello 参与字符计数，活动名、状态、缓存结果和错误文本按契约保留。
"""

from __future__ import annotations

import functools
import json
import os
import tempfile
from dataclasses import dataclass


# ---------- 事件日志 ----------

@dataclass
class EventLog:
    path: str

    def __post_init__(self) -> None:
        if not os.path.exists(self.path):
            with open(self.path, "w") as f:
                json.dump([], f)

    def events(self) -> list[dict]:
        with open(self.path) as f:
            return json.load(f)

    def append(self, ev: dict) -> None:
        evs = self.events()
        evs.append(ev)
        with open(self.path, "w") as f:
            json.dump(evs, f)

    def lookup(self, name: str, args: tuple) -> dict | None:
        for ev in self.events():
            if ev["name"] == name and ev["args"] == list(args) and ev["status"] == "done":
                return ev
        return None


# ---------- 活动装饰器 ----------

def activity(name: str):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(log: EventLog, *args):
            hit = log.lookup(name, args)
            if hit:
                print(f"    [重放] {name}({args}) -> {hit['result']}（来自日志）")
                return hit["result"]
            log.append({"name": name, "args": list(args), "status": "started"})
            result = fn(*args)
            log.append({"name": name, "args": list(args),
                        "status": "done", "result": result})
            print(f"    [执行] {name}({args}) -> {result}")
            return result
        return wrapper
    return deco


# ---------- 示例活动 ----------

@activity("fetch_docs")
def fetch_docs(query: str) -> int:
    # 模拟 API：按查询字符数计算文档数量，不发起请求。
    return len(query) * 3


@activity("call_llm")
def call_llm(doc_count: int) -> str:
    # 模拟 LLM 调用；为便于教学，返回确定性的结果。
    return f"summary({doc_count}_docs)"


@activity("write_report")
def write_report(summary: str) -> str:
    # 模拟有副作用的工具调用；本例实际只返回字符串。
    return f"report://{summary}"


# ---------- 工作流 ----------

def workflow(log: EventLog, query: str, crash_after: int = -1) -> str:
    """包含三个活动的工作流，可在活动完成后触发模拟崩溃。"""
    doc_count = fetch_docs(log, query)
    if crash_after == 1:
        # 模拟在 fetch_docs 完成后崩溃；错误文本保留。
        raise RuntimeError("simulated crash after fetch_docs")
    summary = call_llm(log, doc_count)
    if crash_after == 2:
        # 模拟在 call_llm 完成后崩溃；错误文本保留。
        raise RuntimeError("simulated crash after call_llm")
    report = write_report(log, summary)
    return report


# ---------- 演示入口 ----------

def reset_log(path: str) -> EventLog:
    if os.path.exists(path):
        os.remove(path)
    return EventLog(path)


def count_runs(log: EventLog) -> int:
    return sum(1 for ev in log.events() if ev["status"] == "started")


def main() -> None:
    print("=" * 70)
    print("持久执行（阶段 15，第 12 课）")
    print("=" * 70)

    tmpdir = tempfile.mkdtemp()

    # 简单重试：崩溃后丢弃事件日志，因此每次重新启动
    # 都要重新执行所有活动。
    print("\n简单重试（不保留事件日志）")
    print("-" * 70)
    for attempt in range(1, 4):
        log = reset_log(os.path.join(tmpdir, "naive.json"))
        print(f"  尝试次数 {attempt}:")
        try:
            crash = 2 if attempt == 1 else -1
            r = workflow(log, "hello", crash_after=crash)
            print(f"    -> 结果 {r}")
            print(f"    -> {count_runs(log)} 次活动在本次尝试中启动")
            break
        except RuntimeError as e:
            print(f"    -> 崩溃：{e}; {count_runs(log)} 次活动启动需要在重试时重复")

    # 持久重试：不同尝试间保留事件日志，
    # 重放时不再次执行已记录完成的活动。
    print("\n持久重试（跨尝试保留事件日志）")
    print("-" * 70)
    durable_path = os.path.join(tmpdir, "durable.json")
    if os.path.exists(durable_path):
        os.remove(durable_path)

    for attempt in range(1, 4):
        log = EventLog(durable_path)
        print(f"  尝试次数 {attempt}:")
        try:
            crash = 2 if attempt == 1 else -1
            r = workflow(log, "hello", crash_after=crash)
            print(f"    -> 结果 {r}")
            print(f"    -> {count_runs(log)} 次活动启动（所有尝试合计）")
            break
        except RuntimeError as e:
            print(f"    -> 崩溃：{e}")

    print()
    print("=" * 70)
    print("要点：持久化降低长时任务失败后的重复成本")
    print("-" * 70)
    print("  简单重试在每次尝试时重新执行全部活动。")
    print("  保留日志后，可以从日志重放已完成活动的结果，")
    print("  只执行缺少完成记录的活动。这演示持久工作流的基本思路，")
    print("  不等于复现 Temporal、LangGraph 或其他框架的全部保证。")
    print("  在这种设计中，LLM 调用也可以作为活动记录；真实外部")
    print("  副作用仍需要幂等处理与可靠存储，不能仅靠此 JSON 日志。")


if __name__ == "__main__":
    main()
