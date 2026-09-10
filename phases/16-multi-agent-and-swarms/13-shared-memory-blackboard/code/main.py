"""共享记忆模式：消息池、黑板与记忆污染演示。

同一个三智能体研究流程运行两次。第一次把 4.2% 误写成 42%，错误经过共享消息
传播到报告；第二次加入只读验证者，对照内存中的来源夹具并报告差异。
黑板示例则按主题发布、订阅消息，避免每个智能体都读取所有内容。

译注：来源为 FAKE_SOURCES 字典，不实际抓取网页；prompt_hash 是提示词摘要，
不证明内容正确。验证者只返回发现，调用方再写入 flags；分析者没有检查 flags，
所以第二次运行仍会保留错误建议。summarizer 还会用英文句点分割文本，可能截断
小数，故检索语料和下游消息保留英文。消息池仅追加条目，但允许修改 flags；
read_all 是浅复制，不构成不可篡改存储。
"""
from __future__ import annotations

import hashlib
import threading
import time
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class ProvenanceEntry:
    id: int
    writer: str
    topic: str
    content: str
    timestamp: float
    prompt_hash: str
    source_uri: str | None = None
    supersedes: int | None = None
    flags: list[str] = field(default_factory=list)


class MessagePool:
    """完整共享消息池：只追加条目，但 flags 可修改，读取返回浅复制。"""

    def __init__(self) -> None:
        self.entries: list[ProvenanceEntry] = []
        self._lock = threading.Lock()
        self._next_id = 0

    def write(self, writer: str, content: str, prompt: str, source_uri: str | None = None,
              topic: str = "default", supersedes: int | None = None) -> int:
        with self._lock:
            eid = self._next_id
            self._next_id += 1
            e = ProvenanceEntry(
                id=eid,
                writer=writer,
                topic=topic,
                content=content,
                timestamp=time.time(),
                prompt_hash=hashlib.sha256(prompt.encode()).hexdigest()[:10],
                source_uri=source_uri,
                supersedes=supersedes,
            )
            self.entries.append(e)
            return eid

    def read_all(self) -> list[ProvenanceEntry]:
        with self._lock:
            return list(self.entries)

    def flag(self, entry_id: int, flag: str) -> None:
        with self._lock:
            for e in self.entries:
                if e.id == entry_id:
                    e.flags.append(flag)
                    return


class Blackboard:
    """按主题组织的发布—订阅黑板。"""

    def __init__(self) -> None:
        self.topics: dict[str, list[ProvenanceEntry]] = {}
        self.subscribers: dict[str, list[Callable[[ProvenanceEntry], None]]] = {}
        self._lock = threading.Lock()
        self._next_id = 0

    def publish(self, writer: str, topic: str, content: str, prompt: str,
                source_uri: str | None = None) -> int:
        with self._lock:
            eid = self._next_id
            self._next_id += 1
            e = ProvenanceEntry(
                id=eid,
                writer=writer,
                topic=topic,
                content=content,
                timestamp=time.time(),
                prompt_hash=hashlib.sha256(prompt.encode()).hexdigest()[:10],
                source_uri=source_uri,
            )
            self.topics.setdefault(topic, []).append(e)
            subs = list(self.subscribers.get(topic, []))
        for cb in subs:
            cb(e)
        return eid

    def subscribe(self, topic: str, cb: Callable[[ProvenanceEntry], None]) -> None:
        with self._lock:
            self.subscribers.setdefault(topic, []).append(cb)

    def read_topic(self, topic: str) -> list[ProvenanceEntry]:
        with self._lock:
            return list(self.topics.get(topic, []))


FAKE_SOURCES = {
    # 来源夹具：研究报告称，相比基线准确率提高 4.2%；并非真实论文抓取结果。
    "https://arxiv.org/paper-1": "The study reports a 4.2% accuracy improvement over the baseline.",
    # 来源夹具：数据集包含 12,500 个样本。
    "https://arxiv.org/paper-2": "Dataset size was 12,500 examples.",
}


def retrieval_agent(pool: MessagePool, uri: str, hallucinate: bool) -> int:
    content = FAKE_SOURCES[uri]
    if hallucinate and "4.2%" in content:
        content = content.replace("4.2%", "42%")
    return pool.write(
        writer="retriever",
        content=content,
        # 提示词：获取并总结指定来源。其原始字节参与 prompt_hash 计算。
        prompt=f"Fetch and summarize {uri}",
        source_uri=uri,
    )


def summarizer_agent(pool: MessagePool) -> int:
    retrieved = [e for e in pool.read_all() if e.writer == "retriever"]
    if not retrieved:
        # 消息：没有来源材料。
        # 提示词：总结检索结果；保留哈希输入。
        return pool.write("summarizer", "no source", "Summarize retrieval", None)
    latest = retrieved[-1].content
    # 摘要前缀：研究报告了显著结果；后面以英文句点截取来源文本。
    summary = f"Summary: study reports a significant result -- {latest.split('.')[0]}."
    # 提示词：总结检索结果；保留哈希输入。
    return pool.write("summarizer", summary, "Summarize retrieval", None)


def analyst_agent(pool: MessagePool) -> int:
    summaries = [e for e in pool.read_all() if e.writer == "summarizer"]
    if not summaries:
        # 消息：没有摘要。
        # 提示词：得出结论；保留哈希输入。
        return pool.write("analyst", "no summary", "Draw conclusions", None)
    latest = summaries[-1].content
    # 建议采用；本例只因摘要包含 42% 就给出此结论。
    # 建议进一步审查。
    verdict = "Recommend adoption" if "42%" in latest else "Recommend further review"
    # 分析者结论。
    return pool.write("analyst", f"Analyst verdict: {verdict} (based on: {latest})",
                      # 提示词：得出结论；保留哈希输入。
                      "Draw conclusions", None)


def verifier_agent(pool: MessagePool) -> list[tuple[int, str]]:
    """只读验证者：对照引用的来源夹具，找出内容不一致的条目。

    返回 (entry_id, reason) 列表，由调用方决定如何处理。
    验证者自己不回写消息池；本例来源是字典，不进行网络抓取。
    """
    findings = []
    for e in pool.read_all():
        if e.source_uri and e.source_uri in FAKE_SOURCES:
            truth = FAKE_SOURCES[e.source_uri]
            if e.content != truth:
                # 验证诊断：内容与指定来源不一致。
                findings.append((e.id, f"mismatch with {e.source_uri}: fetched text was {truth!r}"))
    return findings


def run_without_verifier() -> None:
    print("=" * 72)
    print("运行 1——没有验证者，错误信息继续传播")
    print("=" * 72)
    pool = MessagePool()
    retrieval_agent(pool, "https://arxiv.org/paper-1", hallucinate=True)
    summarizer_agent(pool)
    analyst_agent(pool)
    for e in pool.read_all():
        print(f"  [{e.id}] {e.writer:11s} ({e.prompt_hash}) :: {e.content}")
    print("\n最终报告使用了错误的 42%，没有触发告警。")


def run_with_verifier() -> None:
    print("\n" + "=" * 72)
    print("运行 2——只读验证者对照来源，由调用方标记差异")
    print("=" * 72)
    pool = MessagePool()
    retrieval_agent(pool, "https://arxiv.org/paper-1", hallucinate=True)
    summarizer_agent(pool)
    findings = verifier_agent(pool)
    for eid, reason in findings:
        pool.flag(eid, reason)
    analyst_agent(pool)

    for e in pool.read_all():
        flag_str = f" ［已标记：{'; '.join(e.flags)}］" if e.flags else ""
        print(f"  [{e.id}] {e.writer:11s} ({e.prompt_hash}) :: {e.content}{flag_str}")
    if findings:
        print(f"\n验证者发现 {len(findings)} 处不一致。下游本可据此阻止结论，但本例分析者尚未读取这些标记。")


def demo_blackboard() -> None:
    print("\n" + "=" * 72)
    print("黑板演示——按主题发布和订阅，无须让每个智能体读取所有内容")
    print("=" * 72)
    bb = Blackboard()
    received = {"prices": [], "alerts": []}

    def on_prices(e: ProvenanceEntry) -> None:
        received["prices"].append(e.id)

    def on_alerts(e: ProvenanceEntry) -> None:
        received["alerts"].append(e.id)

    bb.subscribe("prices", on_prices)
    bb.subscribe("alerts", on_alerts)

    # 提示词夹具：轮询市场数据；参与哈希。
    bb.publish("scraper-1", "prices", "AAPL=192.4", "poll market")
    # 提示词夹具：轮询市场数据；参与哈希。
    bb.publish("scraper-2", "prices", "MSFT=401.2", "poll market")
    # 告警夹具：AAPL 在 60 秒内价格变化超过 2%；不是实时行情。
    # 提示词夹具：监测价格；参与哈希。
    bb.publish("risk-engine", "alerts", "ALERT: AAPL moved >2% in 60s", "watch prices")

    print(f"  价格订阅者收到的条目 ID：{received['prices']}")
    print(f"  告警订阅者收到的条目 ID：{received['alerts']}")
    print("  （注意：价格订阅者没有收到告警，这正是按主题分流的效果。）")


def main() -> None:
    run_without_verifier()
    run_with_verifier()
    demo_blackboard()
    print("\n要点：")
    print("  1. 共享状态若缺少来源追踪与核验，可能把错误包装成下游推理的可信输入。")
    print("  2. 能独立对照来源的只读验证者可发现本例的记忆污染，但仍需下游执行处置。")
    print("  3. 黑板按主题分发，减少每个智能体需要读取的消息；本例未做真实扩展性压测。")


if __name__ == "__main__":
    main()
