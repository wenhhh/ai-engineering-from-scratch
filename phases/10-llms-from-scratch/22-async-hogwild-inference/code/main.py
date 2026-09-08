"""Hogwild! 推理小型模拟器（Inference toy simulator），使用 Python 标准库。

两个工作单元（Worker）并发访问共享词元缓存。每个工作单元读取缓存，决定向
类别 A 还是 B 添加工作词元（Work-token）。协调启发式很简单:
如果另一个工作单元已为某类别生成足够词元，就切换类别。

输出:
  - 固定步数预算内生成的工作词元总数
  - 相对单工作单元基线的实际耗时加速比
  - 记录哪个工作单元写入哪个词元及其类别的轨迹（Trace）
  - 协调权重扫描，展示协调不足的影响

这不是忠实的 LLM 模拟。重点是演示读取共享缓存所驱动的自发分工。
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import List, Literal


Category = Literal["A", "B", "noise", "coord"]


@dataclass
class SharedCache:
    tokens: List[tuple[int, Category]] = field(default_factory=list)

    def counts(self) -> dict:
        c = {"A": 0, "B": 0, "noise": 0, "coord": 0}
        for _, cat in self.tokens:
            c[cat] += 1
        return c


@dataclass
class Worker:
    id: int
    intended: Category
    coordination_weight: float
    rng: random.Random


def decide_next_category(worker: Worker, cache: SharedCache,
                         target_per_category: int) -> Category:
    """读取共享缓存。以 coordination_weight 的概率切换到词元最少的工作类别
    （注意到冗余），否则保留工作单元的原定类别。coordination_weight = 0
    模拟无法协调的工作单元（完全冗余）。weight = 1 模拟理想的推理模型协调。
    """
    if worker.rng.random() < 0.05:
        return "noise"

    counts = cache.counts()
    base = worker.intended

    if worker.rng.random() < worker.coordination_weight:
        candidates = sorted(("A", "B"), key=lambda c: counts[c])
        return candidates[0]

    if worker.rng.random() < 0.1:
        return "coord"

    return base


def run_hogwild(n_workers: int, step_budget: int, target_per_category: int,
                coordination_weight: float, seed: int = 42) -> dict:
    """所有工作单元默认使用类别 A，协调会让它们分流。没有协调时，冗余词元
    （多个工作单元生成的同类别词元）只计一次。有协调时，工作单元选择不同类别，
    因而每个词元都是独有的，都能推动总体进度。"""
    cache = SharedCache()
    workers = []
    for i in range(n_workers):
        workers.append(Worker(
            id=i, intended="A",
            coordination_weight=coordination_weight,
            rng=random.Random(seed + i),
        ))

    trace: List[tuple[int, Category, str]] = []
    step = 0
    progress = 0
    while step < step_budget:
        this_step_categories: List[tuple[int, Category]] = []
        for w in workers:
            cat = decide_next_category(w, cache, target_per_category)
            cache.tokens.append((w.id, cat))
            this_step_categories.append((w.id, cat))

        seen_work_categories = set()
        for w_id, cat in this_step_categories:
            tag = "redundant"
            if cat in ("A", "B") and cat not in seen_work_categories:
                seen_work_categories.add(cat)
                progress += 1
                tag = "unique"
            trace.append((w_id, cat, tag))
        step += 1

    counts = cache.counts()
    work_tokens = counts["A"] + counts["B"]
    return {
        "workers": n_workers,
        "step_budget": step_budget,
        "tokens_emitted": len(cache.tokens),
        "work_tokens": work_tokens,
        "unique_progress": progress,
        "category_counts": counts,
        "coord_tokens": counts["coord"],
        "noise_tokens": counts["noise"],
        "tokens_per_step": len(cache.tokens) / step_budget,
        "work_per_step": work_tokens / step_budget,
        "progress_per_step": progress / step_budget,
        "sample_trace": trace[:12],
    }


def expected_speedup(T_serial: int, p: float, c: int, N: int,
                     steps_per_worker: int) -> float:
    parallel = T_serial * ((1 - p) + p / N) + c * N
    return T_serial / parallel


def main() -> None:
    print("=" * 70)
    print("Hogwild! 推理小型模拟器（阶段 10，第 22 课）")
    print("=" * 70)
    print()

    print("-" * 70)
    print("步骤 1: 基线，单工作单元，200 步")
    print("-" * 70)
    r_1 = run_hogwild(n_workers=1, step_budget=200, target_per_category=100,
                      coordination_weight=0.8)
    print(f"  发出词元数 : {r_1['tokens_emitted']}")
    print(f"  工作词元数（Work-tokens） : {r_1['work_tokens']}  ({r_1['work_per_step']:.2f} / 步）")
    print(f"  去重后的进度（Unique progress） : {r_1['unique_progress']}  ({r_1['progress_per_step']:.2f} / 步）")
    print(f"  各类别数量 : {r_1['category_counts']}")
    print()

    print("-" * 70)
    print("步骤 2: Hogwild，2 个工作单元，共享缓存，强协调")
    print("-" * 70)
    r_2 = run_hogwild(n_workers=2, step_budget=200, target_per_category=100,
                      coordination_weight=0.8)
    print(f"  发出词元数 : {r_2['tokens_emitted']}  ({r_2['tokens_per_step']:.2f} / 步）")
    print(f"  工作词元数（Work-tokens） : {r_2['work_tokens']}  ({r_2['work_per_step']:.2f} / 步）")
    print(f"  去重后的进度（Unique progress） : {r_2['unique_progress']}  ({r_2['progress_per_step']:.2f} / 步）")
    print(f"  各类别数量 : {r_2['category_counts']}")
    print(f"  相对 N=1 的加速比 : {r_2['unique_progress'] / r_1['unique_progress']:.2f}x")
    print()

    print("-" * 70)
    print("步骤 3: 协调权重扫描（N=2，相同步数预算）")
    print("-" * 70)
    print(f"  {'协调权重（coord weight）':>14}  {'进度（progress）':>10}  {'相对 N=1 的加速比':>15}")
    for cw in (0.0, 0.2, 0.5, 0.8, 1.0):
        r = run_hogwild(n_workers=2, step_budget=200, target_per_category=100,
                        coordination_weight=cw)
        speedup = r["unique_progress"] / r_1["unique_progress"]
        print(f"  {cw:>14.2f}  {r['unique_progress']:>10}  {speedup:>15.2f}x")
    print("  （协调权重 0.0 = 两个工作单元都停留在类别 A = 完全冗余）")
    print()

    print("-" * 70)
    print("步骤 4: Amdahl 式理论加速比")
    print("-" * 70)
    T_serial = 10_000
    print(f"  推理任务 = 10000 个解码词元")
    print(f"  c = 每个工作单元的协调开销")
    print(f"  {'p':>5}  " + "".join(
        f"{f'N={N}':>10}" for N in (2, 4, 8)))
    for p in (0.3, 0.5, 0.7, 0.9):
        row = f"  {p:>5.2f}  "
        for N in (2, 4, 8):
            s = expected_speedup(T_serial=T_serial, p=p, c=200, N=N,
                                 steps_per_worker=T_serial // N)
            row += f"{s:>9.2f}x"
        print(row)
    print("  （数值: Hogwild! 相对串行单工作单元的加速比）")
    print()

    print("-" * 70)
    print("步骤 5: 最坏情况（短任务、弱协调）")
    print("-" * 70)
    print(f"  {'p':>5}  " + "".join(
        f"{f'N={N}':>10}" for N in (2, 4, 8)))
    for p in (0.1, 0.3, 0.5):
        row = f"  {p:>5.2f}  "
        for N in (2, 4, 8):
            s = expected_speedup(T_serial=1000, p=p, c=150, N=N,
                                 steps_per_worker=1000 // N)
            row += f"{s:>9.2f}x"
        print(row)
    print("  （1000 词元短任务，150 词元协调开销）")
    print("  低于 1.0 的值表示并行推理比串行更慢")
    print()

    print("要点: Hogwild! 的加速比取决于可并行比例 p 和")
    print("          协调开销 c。p > 0.5 且每步开销低的")
    print("          推理任务最适用。如果短对话的 c 与")
    print("          T_serial 相近，就不适合使用它。")


if __name__ == "__main__":
    main()
