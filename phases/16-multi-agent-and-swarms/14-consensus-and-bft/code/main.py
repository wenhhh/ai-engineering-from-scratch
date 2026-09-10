"""LLM 智能体的共识与拜占庭容错概念演示，仅使用 Python 标准库。

比较相对多数票、置信度加权阈值，以及以 DecentLLMs 命名的简化聚类评分，
在无攻击、恶意错误、附和和同质化错误四种预设场景下的结果。

译注：这些是本文件中的教学聚合函数，不是完整 BFT 协议或论文算法复现。
canonical 只是大小写与字符归一化，不理解语义；decentllms 按各簇置信度相对
中位数的绝对偏差评分，不是通用几何中位数求解器。答案和置信度均由夹具提供。
一致意见或高置信度并不自动证明正确；平票按字典首次插入顺序处理。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from statistics import median
from typing import Callable


@dataclass
class Vote:
    agent: str
    answer: str
    confidence: float

    def canonical(self) -> str:
        """近似分组键：转小写，并去除空白和大部分标点；并非真正的语义聚类。"""
        return "".join(c for c in self.answer.lower().strip() if c.isalnum() or c == "." or c == "%")


def plurality(votes: list[Vote]) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    rep: dict[str, str] = {}
    for v in votes:
        key = v.canonical()
        counts[key] = counts.get(key, 0) + 1
        rep.setdefault(key, v.answer)
    winner_key = max(counts, key=counts.get)
    return rep[winner_key], counts


def cp_wbft(votes: list[Vote], threshold: float = 0.5) -> tuple[str | None, dict[str, float]]:
    weights: dict[str, float] = {}
    rep: dict[str, str] = {}
    for v in votes:
        key = v.canonical()
        weights[key] = weights.get(key, 0.0) + v.confidence
        rep.setdefault(key, v.answer)
    total = sum(weights.values()) or 1.0
    winner_key = max(weights, key=weights.get)
    if weights[winner_key] / total < threshold:
        return None, weights
    return rep[winner_key], weights


def decentllms(votes: list[Vote]) -> tuple[str | None, dict[str, float]]:
    """依据候选答案分簇，并以置信度分布为各簇评分。

    本例没有独立评估智能体。对每个簇计算置信度中位数 med，
    再以 len(cluster) * max(0, 1 - sum(abs(confidence - med))) 评分。
    这不是完整的几何中位数算法；同分时按字典插入顺序选取，而非另做规模判定。
    """
    clusters: dict[str, list[Vote]] = {}
    for v in votes:
        clusters.setdefault(v.canonical(), []).append(v)

    scores: dict[str, float] = {}
    for key, cluster in clusters.items():
        med = median([v.confidence for v in cluster])
        dist = sum(abs(v.confidence - med) for v in cluster)
        scores[key] = len(cluster) * max(0.0, 1.0 - dist)

    winner_key = max(scores, key=scores.get)
    rep = clusters[winner_key][0].answer
    return rep, scores


def scenario(name: str, correct: str, votes: list[Vote]) -> None:
    print("\n" + "=" * 72)
    print(f"场景：{name}")
    print(f"  正确答案：{correct!r}")
    print("=" * 72)
    for v in votes:
        print(f"  {v.agent:12s} -> {v.answer!r:20s}  置信度={v.confidence:.2f}")

    plural, counts = plurality(votes)
    cp, weights = cp_wbft(votes)
    dec, scores = decentllms(votes)

    def mark(a: str | None) -> str:
        if a is None:
            return "［低于阈值，拒绝给出答案］"
        return "［正确］" if a == correct else "［错误］"

    print(f"\n  plurality    -> {plural!r:22s} {mark(plural)}")
    print(f"  CP-WBFT      -> {str(cp)!r:22s} {mark(cp)}")
    print(f"  DecentLLMs   -> {dec!r:22s} {mark(dec)}")


def main() -> None:
    # 场景 1：多数给出正确答案，没有攻击
    scenario(
        "没有攻击",
        correct="4.2%",
        votes=[
            Vote("agent-a", "4.2%", 0.85),
            Vote("agent-b", "4.2%", 0.80),
            Vote("agent-c", "4.2%", 0.75),
            Vote("agent-d", "5%", 0.40),
            Vote("agent-e", "4.2%", 0.70),
        ],
    )

    # 场景 2：一个恶意智能体以高置信度给出错误答案
    scenario(
        "拜占庭式恶意错误",
        correct="4.2%",
        votes=[
            Vote("agent-a", "4.2%", 0.75),
            Vote("agent-b", "4.2%", 0.70),
            Vote("agent-c", "4.2%", 0.80),
            Vote("agent-d", "42%", 0.95),
            Vote("agent-e", "4.2%", 0.65),
        ],
    )

    # 场景 3：附和。两个智能体跟随最先出现的 42% 错误答案，
    # 因为没有独立推导，所以夹具将其置信度设得较低。
    scenario(
        "附和式从众",
        correct="4.2%",
        votes=[
            Vote("agent-a", "42%", 0.35),
            Vote("agent-b", "42%", 0.30),
            Vote("agent-c", "4.2%", 0.85),
            Vote("agent-d", "4.2%", 0.80),
            Vote("agent-e", "4.2%", 0.82),
        ],
    )

    # 场景 4：同质化带来的相关错误。原文设定三个智能体共享模型，
    # 并高置信度地给出同一个错误答案；这里直接用夹具表示。
    scenario(
        "同质化（相关错误）",
        correct="4.2%",
        votes=[
            Vote("agent-a", "42%", 0.70),
            Vote("agent-b", "42%", 0.68),
            Vote("agent-c", "42%", 0.72),
            Vote("agent-d", "4.2%", 0.85),
            Vote("agent-e", "4.2%", 0.82),
        ],
    )

    print("\n要点：")
    print("  当同一种错误答案占据相对多数时，多数票可能失败；恰好平票还取决于平票规则。")
    print("  在本例将附和者设为低置信度的前提下，加权聚合可减轻其影响。")
    print("  此简化聚类评分惩罚簇内置信度分散，但同质化的错误簇也可能十分一致，")
    print("  因此不能仅凭少数异议者置信度较高，就推断它能纠正多数错误。")
    print("  这些聚合规则不保证解决“错误簇更大、又更自信”的情况；")
    print("  还需要独立核验或真正多样化的证据来源。")


if __name__ == "__main__":
    main()
