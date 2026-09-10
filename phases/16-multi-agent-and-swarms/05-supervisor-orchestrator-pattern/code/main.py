"""主管与编排器—工作者模式（原文类比 Anthropic Research）。

主管将问题拆成三个子问题，在并行线程中启动工作者，再汇总结果。
没有真实 LLM 或网络请求：工作者用固定休眠模拟抓取延迟，并返回预设摘要。
重点是观察并行协作结构及墙钟时间，而不是评价实际研究质量。

译注：词元消耗为手工常数，顺序执行耗时只是按三次休眠相加估算；
本例未单独测量顺序基线，实际并行耗时应以当次输出为准。线程异常和部分
结果缺失没有完整升级机制，因此不能把此示例当作生产级可靠执行器。
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field


@dataclass
class WorkerResult:
    sub_question: str
    summary: str
    tokens_spent: int
    wall_time: float


@dataclass
class TraceEntry:
    worker_id: int
    event: str
    t: float
    sub_question: str = ""


@dataclass
class Trace:
    entries: list[TraceEntry] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def log(self, worker_id: int, event: str, sub_question: str = "") -> None:
        with self._lock:
            self.entries.append(
                TraceEntry(worker_id=worker_id, event=event, t=time.time(), sub_question=sub_question)
            )


def fake_web_fetch(query: str) -> str:
    """模拟网页抓取与摘要生成的延迟；不实际访问网络。"""
    time.sleep(0.3)
    return f"关于“{query}”的摘要：从 5 个来源归纳出 3 条要点（预设文本）。"


class Worker:
    def __init__(self, worker_id: int, trace: Trace) -> None:
        self.worker_id = worker_id
        self.trace = trace

    def run(self, sub_question: str, results: list[WorkerResult | None], idx: int) -> None:
        start = time.time()
        self.trace.log(self.worker_id, "start", sub_question)
        summary = fake_web_fetch(sub_question)
        elapsed = time.time() - start
        results[idx] = WorkerResult(
            sub_question=sub_question,
            summary=summary,
            tokens_spent=800,
            wall_time=elapsed,
        )
        self.trace.log(self.worker_id, "done", sub_question)


class Lead:
    """主管：制定计划、并行启动工作者，然后汇总结果。"""

    def __init__(self, trace: Trace) -> None:
        self.trace = trace

    def plan(self, query: str) -> list[str]:
        """分解问题。实际主管可使用 LLM，本例只添加三个预设研究方向。"""
        return [
            f"{query}——历史起源",
            f"{query}——2026 年前沿进展（原文题设）",
            f"{query}——开放问题",
        ]

    def synthesize(self, query: str, results: list[WorkerResult]) -> str:
        ok = [r for r in results if r is not None]
        parts = [f"- {r.sub_question}: {r.summary}" for r in ok]
        return f"对“{query}”的回答：\n" + "\n".join(parts)

    def run(self, query: str) -> tuple[str, dict]:
        t0 = time.time()
        sub_questions = self.plan(query)
        self.trace.log(worker_id=-1, event="plan", sub_question=str(len(sub_questions)))

        results: list[WorkerResult | None] = [None] * len(sub_questions)
        threads: list[threading.Thread] = []
        for i, sq in enumerate(sub_questions):
            w = Worker(worker_id=i, trace=self.trace)
            th = threading.Thread(target=w.run, args=(sq, results, i))
            threads.append(th)
            th.start()

        for th in threads:
            th.join()

        self.trace.log(worker_id=-1, event="synthesize")
        synthesis = self.synthesize(query, [r for r in results if r is not None])
        total_wall = time.time() - t0
        total_tokens = sum((r.tokens_spent for r in results if r is not None)) + 1200
        return synthesis, {
            # 统计字段：墙钟耗时（秒）。
            "wall_clock_seconds": round(total_wall, 3),
            # 统计字段：预设的总词元消耗，不是真实模型计量。
            "total_tokens": total_tokens,
            # 统计字段：计划启动的工作者数量。
            "worker_count": len(sub_questions),
        }


def render_trace(trace: Trace, t0: float) -> None:
    for e in trace.entries:
        rel = round(e.t - t0, 3)
        sq = f" | {e.sub_question}" if e.sub_question else ""
        tag = "LEAD" if e.worker_id == -1 else f"W{e.worker_id}"
        print(f"  +{rel:>5}s  {tag:>4}  {e.event}{sq}")


def main() -> None:
    print("主管 / 编排器—工作者模式演示")
    print("-" * 42)

    trace = Trace()
    t0 = time.time()
    lead = Lead(trace=trace)
    answer, stats = lead.run("2023 至 2026 年，多智能体系统发生了哪些变化？")

    print("\n执行轨迹（相对于规划起点的秒数）：")
    render_trace(trace, t0)

    print("\n最终汇总：")
    print("  " + answer.replace("\n", "\n  "))

    print("\n统计信息：")
    for k, v in stats.items():
        print(f"  {k}: {v}")

    print("\n按休眠时间估算，顺序执行约需 0.9 秒（3 × 0.3 秒）。")
    print("并行执行可缩短等待时间；实际耗时以本次统计为准，而非固定的 0.35 秒。")


if __name__ == "__main__":
    main()
