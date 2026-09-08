"""阶段 13 第 03 课：并行与流式工具调用（Parallel and streaming tool calls）。

两个仅使用标准库的示例：
  1. 查询三个城市的天气，对比串行与并行（线程池，Thread pool）执行。
     测量实际耗时（Wall-clock time），展示最大值与总和两种耗时规律。
  2. 为乱序参数块实现流式累加器（Stream accumulator）。
     回放三个交错并行调用构成的模拟 OpenAI 格式流，
     按 ID 分别重新组装，然后执行。

运行： python code/main.py
"""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field


# ------------------------------------------------------------------
# 示例 1：串行与并行天气查询
# ------------------------------------------------------------------

SIMULATED_LATENCY_MS = {"Bengaluru": 400, "Tokyo": 600, "Zurich": 800}


def executor_weather(city: str) -> dict:
    latency = SIMULATED_LATENCY_MS.get(city, 500)
    time.sleep(latency / 1000.0)
    return {"city": city, "temp_c": hash(city) % 35}


def run_sequential(cities: list[str]) -> tuple[float, list[dict]]:
    start = time.perf_counter()
    results = [executor_weather(c) for c in cities]
    dt_ms = (time.perf_counter() - start) * 1000
    return dt_ms, results


def run_parallel(cities: list[str]) -> tuple[float, list[dict]]:
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=len(cities)) as pool:
        results = list(pool.map(executor_weather, cities))
    dt_ms = (time.perf_counter() - start) * 1000
    return dt_ms, results


# ------------------------------------------------------------------
# 示例 2：流式累加器（Stream accumulator）
# ------------------------------------------------------------------

@dataclass
class CallBuffer:
    id: str
    name: str = ""
    args_buf: str = ""
    done: bool = False

    def try_parse(self) -> dict | None:
        if not self.done:
            return None
        return json.loads(self.args_buf)


@dataclass
class StreamAccumulator:
    buffers: dict[str, CallBuffer] = field(default_factory=dict)

    def on_event(self, event: dict) -> list[CallBuffer]:
        kind = event["type"]
        idx = event.get("id")
        completed: list[CallBuffer] = []
        if kind == "call_start":
            self.buffers[idx] = CallBuffer(id=idx, name=event["name"])
        elif kind == "args_delta":
            buf = self.buffers[idx]
            buf.args_buf += event["chunk"]
        elif kind == "call_stop":
            buf = self.buffers[idx]
            buf.done = True
            completed.append(buf)
        return completed


def fake_openai_stream():
    """三个交错的并行调用。真实流也具有这种形态。"""
    yield {"type": "call_start", "id": "call_A", "name": "get_weather"}
    yield {"type": "call_start", "id": "call_B", "name": "get_weather"}
    yield {"type": "call_start", "id": "call_C", "name": "get_weather"}
    yield {"type": "args_delta", "id": "call_A", "chunk": '{"city"'}
    yield {"type": "args_delta", "id": "call_B", "chunk": '{"city'}
    yield {"type": "args_delta", "id": "call_A", "chunk": ':"Beng'}
    yield {"type": "args_delta", "id": "call_C", "chunk": '{"city":"Zu'}
    yield {"type": "args_delta", "id": "call_A", "chunk": 'aluru"}'}
    yield {"type": "call_stop", "id": "call_A"}
    yield {"type": "args_delta", "id": "call_B", "chunk": '":"Tokyo"}'}
    yield {"type": "call_stop", "id": "call_B"}
    yield {"type": "args_delta", "id": "call_C", "chunk": 'rich"}'}
    yield {"type": "call_stop", "id": "call_C"}


def replay_and_execute() -> dict[str, dict]:
    acc = StreamAccumulator()
    results: dict[str, dict] = {}
    in_flight: dict[str, "Future"] = {}  # type: ignore
    with ThreadPoolExecutor(max_workers=4) as pool:
        for event in fake_openai_stream():
            completed = acc.on_event(event)
            for buf in completed:
                args = buf.try_parse()
                print(f"  调用 {buf.id} 的参数接收完整 -> {args}")
                in_flight[buf.id] = pool.submit(executor_weather, args["city"])
        for cid, fut in in_flight.items():
            results[cid] = fut.result()
    return results


# ------------------------------------------------------------------
# 主入口
# ------------------------------------------------------------------

def main() -> None:
    print("=" * 72)
    print("阶段 13 第 03 课：并行与流式工具调用（Parallel and Streaming Tool Calls）")
    print("=" * 72)

    cities = ["Bengaluru", "Tokyo", "Zurich"]
    sum_lat = sum(SIMULATED_LATENCY_MS.values())
    max_lat = max(SIMULATED_LATENCY_MS.values())

    print("\n--- 示例 1：三个城市的天气（模拟） ---")
    print(f"各城市的模拟延迟 : {SIMULATED_LATENCY_MS}")
    print(f"理论串行耗时     : {sum_lat} ms  （总和）")
    print(f"理论并行耗时       : {max_lat} ms  （最大值）")

    seq_ms, seq_res = run_sequential(cities)
    par_ms, par_res = run_parallel(cities)
    print(f"\n实际串行耗时 : {seq_ms:.0f} ms")
    print(f"实际并行耗时   : {par_ms:.0f} ms")
    speedup = seq_ms / par_ms if par_ms else 0
    print(f"加速比（Speedup） : {speedup:.2f}x")

    print("\n--- 示例 2：流式累加器（Stream accumulator） ---")
    print("正在回放三个并行调用交错构成的模拟流……")
    results = replay_and_execute()
    print("\n最终结果（以 tool_call_id 为键）：")
    for cid, r in results.items():
        print(f"  {cid} -> {r}")


if __name__ == "__main__":
    main()
