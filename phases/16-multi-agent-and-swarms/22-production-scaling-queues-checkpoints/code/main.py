"""生产扩展概念演示：检查点、队列，以及异步与线程的对比。

全部使用 Python 标准库。CheckpointStore 用 SQLite 保存计数器状态；
AgentQueue 用空闲、处理中和响应三个状态处理内存队列；最后比较
500 次并发休眠在 asyncio 与逐个创建线程两种方式下的墙钟耗时。

译注：计数器恢复没有外部副作用，不能证明任意任务都能恰好执行一次。
队列没有持久化、背压或线程同步，也未测试上千真实智能体。性能实验只有休眠，
线程栈大小及相对速度依环境而异，原文约 1 MB 的固定说法没有在此测量。
"""
from __future__ import annotations

import asyncio
import enum
import json
import os
import sqlite3
import tempfile
import threading
import time
from dataclasses import dataclass, field


# ---------- CheckpointStore ----------

class CheckpointStore:
    def __init__(self, path: str) -> None:
        self.conn = sqlite3.connect(path)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS checkpoints (
                thread_id TEXT NOT NULL,
                super_step INTEGER NOT NULL,
                state_json TEXT NOT NULL,
                PRIMARY KEY (thread_id, super_step)
            )
        """)

    def write(self, thread_id: str, super_step: int, state: dict) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO checkpoints (thread_id, super_step, state_json) VALUES (?, ?, ?)",
            (thread_id, super_step, json.dumps(state)),
        )
        self.conn.commit()

    def latest(self, thread_id: str) -> tuple[int, dict] | None:
        row = self.conn.execute(
            "SELECT super_step, state_json FROM checkpoints WHERE thread_id = ? ORDER BY super_step DESC LIMIT 1",
            (thread_id,),
        ).fetchone()
        if row is None:
            return None
        return row[0], json.loads(row[1])


def run_agent_with_checkpoint(store: CheckpointStore, thread_id: str,
                              start: int = 0, crash_at: int | None = None, goal: int = 5) -> int:
    """运行最小计数器智能体，可在指定 super_step 模拟崩溃；默认目标为 5。"""
    restored = store.latest(thread_id)
    if restored:
        super_step, state = restored
        super_step += 1
    else:
        super_step = 0
        state = {"counter": start}

    while state["counter"] < goal:
        if crash_at is not None and super_step == crash_at:
            print(f"    工作者在 super_step 处模拟崩溃：{super_step}")
            # 预期异常：模拟崩溃；演示捕获后从检查点恢复。
            raise RuntimeError("simulated crash")
        state["counter"] += 1
        store.write(thread_id, super_step, dict(state))
        super_step += 1
    return state["counter"]


# ---------- AgentQueue ----------

class AgentState(enum.Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    RESPONSE = "response"


@dataclass
class AgentQueue:
    agent_id: str
    state: AgentState = AgentState.IDLE
    in_queue: list[dict] = field(default_factory=list)
    out_queue: list[dict] = field(default_factory=list)

    def enqueue(self, msg: dict) -> None:
        self.in_queue.append(msg)

    def step(self) -> None:
        if self.state == AgentState.IDLE and self.in_queue:
            self.state = AgentState.PROCESSING
        elif self.state == AgentState.PROCESSING:
            msg = self.in_queue.pop(0)
            # 响应体说明：指定智能体已处理该消息；保留队列响应夹具。
            self.out_queue.append({"reply_to": msg, "body": f"{self.agent_id} processed {msg}"})
            self.state = AgentState.RESPONSE
        elif self.state == AgentState.RESPONSE:
            self.state = AgentState.IDLE


def demo_queue() -> None:
    print("\n" + "=" * 72)
    print("每智能体独立队列——三态状态机（idle 空闲 / processing 处理 / response 响应）")
    print("=" * 72)
    a = AgentQueue("agent-a")
    # 队列任务夹具：压缩日志。
    a.enqueue({"task": "compress logs"})
    # 队列任务夹具：编写摘要。
    a.enqueue({"task": "write summary"})
    print(f"  初始状态：{a.state.value}  输入队列长度={len(a.in_queue)}")
    for _ in range(7):
        a.step()
        print(f"  状态={a.state.value:11s} 输入数={len(a.in_queue)} 输出数={len(a.out_queue)}")


# ---------- 异步与线程对比 ----------

async def sim_llm_call_async(delay: float = 0.05) -> None:
    await asyncio.sleep(delay)


def sim_llm_call_sync(delay: float = 0.05) -> None:
    time.sleep(delay)


async def bench_async(n: int) -> float:
    t0 = time.perf_counter()
    await asyncio.gather(*(sim_llm_call_async() for _ in range(n)))
    return time.perf_counter() - t0


def bench_threads(n: int) -> float:
    t0 = time.perf_counter()
    threads = [threading.Thread(target=sim_llm_call_sync) for _ in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return time.perf_counter() - t0


def demo_async_vs_threads() -> None:
    print("\n" + "=" * 72)
    print("异步与线程——500 次模拟“LLM 调用”（每次仅休眠 50 毫秒）")
    print("=" * 72)

    async_elapsed = asyncio.run(bench_async(500))
    print(f"  异步（asyncio）：{async_elapsed:.3f} s")

    thread_elapsed = bench_threads(500)
    print(f"  线程：{thread_elapsed:.3f} s")

    print("  耗时比：线程 / 异步 = {:.1f}；线程栈占用依环境而异，本例没有测量内存".format(
        thread_elapsed / async_elapsed if async_elapsed > 0 else float("inf")
    ))


def demo_checkpoint_resume() -> None:
    print("=" * 72)
    print("检查点恢复——一次执行中途崩溃，随后从保存状态继续")
    print("=" * 72)
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        store = CheckpointStore(db_path)

        print("  第一次执行启动逻辑线程 t-1，目标 counter=5")
        try:
            run_agent_with_checkpoint(store, "t-1", crash_at=3, goal=5)
        except RuntimeError:
            pass

        last = store.latest("t-1")
        assert last is not None
        print(f"  最近检查点：super_step={last[0]}，状态={last[1]}")

        print("  第二次执行恢复逻辑线程 t-1")
        final = run_agent_with_checkpoint(store, "t-1", goal=5)
        print(f"  第二次执行完成；最终计数器 = {final}")
    finally:
        os.unlink(db_path)


def main() -> None:
    demo_checkpoint_resume()
    demo_queue()
    demo_async_vs_threads()
    print("\n要点：")
    print("  本例逐步持久化计数器并恢复；真实副作用还需另行设计幂等与事务边界。")
    print("  三态队列可表达执行阶段，但本例未证明它可扩展到上千并发智能体。")
    print("  异步适合组织等待型工作负载；这里测量休眠调度，不代表真实模型服务的表现。")
    print("  原文引述 Bedi 的选型经验：先考虑 FastAPI + Postgres，再按实测需求升级；本例未做选型比较。")


if __name__ == "__main__":
    main()
