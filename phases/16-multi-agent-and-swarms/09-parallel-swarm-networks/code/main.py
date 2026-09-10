"""群体工作者调度演示：从共享队列领取任务。

在耗时不均的任务集合上比较三种策略：顺序执行、固定分配给工作者，以及
四个工作者从共享队列动态领取任务。动态领取可减少人为分配不均造成的等待。

译注：任务只调用 sleep，没有模型推理或真实业务；耗时与每个工作者领取的数量
可能随线程调度变化。固定分配故意不均衡，不能由这个场景推断动态队列普遍最优。
公式还使工作者 0 领取一个短任务，而非只领取四个长任务。缺少持久化与重试机制。
"""
from __future__ import annotations

import queue
import threading
import time
from dataclasses import dataclass


@dataclass
class Task:
    task_id: int
    duration: float
    pre_assigned: int  # 用于固定分配对照组的工作者编号


def fake_work(task: Task) -> str:
    time.sleep(task.duration)
    return f"task-{task.task_id}-done"


def run_sequential(tasks: list[Task]) -> tuple[float, dict[int, int]]:
    t0 = time.time()
    counts: dict[int, int] = {0: 0}
    for t in tasks:
        fake_work(t)
        counts[0] += 1
    return time.time() - t0, counts


def run_fixed_assignment(tasks: list[Task], n_workers: int) -> tuple[float, dict[int, int]]:
    """每个任务预先指定工作者；各工作者串行执行自己分到的任务。"""
    per_worker: dict[int, list[Task]] = {i: [] for i in range(n_workers)}
    for t in tasks:
        per_worker[t.pre_assigned].append(t)
    counts: dict[int, int] = {i: 0 for i in range(n_workers)}

    def worker(wid: int) -> None:
        for t in per_worker[wid]:
            fake_work(t)
            counts[wid] += 1

    t0 = time.time()
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_workers)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    return time.time() - t0, counts


def run_swarm(tasks: list[Task], n_workers: int) -> tuple[float, dict[int, int]]:
    """工作者从共享队列领取任务。"""
    q: queue.Queue = queue.Queue()
    for t in tasks:
        q.put(t)
    counts: dict[int, int] = {i: 0 for i in range(n_workers)}
    lock = threading.Lock()

    def worker(wid: int) -> None:
        while True:
            try:
                task = q.get_nowait()
            except queue.Empty:
                return
            fake_work(task)
            with lock:
                counts[wid] += 1
            q.task_done()

    t0 = time.time()
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_workers)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    return time.time() - t0, counts


def make_tasks(n_workers: int = 4) -> list[Task]:
    """共 8 个任务：4 个短任务（0.1 秒），4 个长任务（0.4 秒）。
    固定分配故意失衡：工作者 0 领取所有长任务，以及按编号轮转分配的一个短任务。"""
    tasks: list[Task] = []
    for i in range(8):
        is_slow = i < 4
        tasks.append(
            Task(
                task_id=i,
                duration=0.4 if is_slow else 0.1,
                pre_assigned=0 if is_slow else (i - 3) % n_workers,
            )
        )
    return tasks


def main() -> None:
    print("群体工作者架构演示——耗时不均的任务集合")
    print("-" * 56)
    n_workers = 4

    tasks = make_tasks(n_workers)
    total_work = sum(t.duration for t in tasks)
    print(f"{len(tasks)} 个任务：4 个长任务（0.4 秒）+ 4 个短任务（0.1 秒）")
    print(f"任务总耗时：{total_work:.2f}s")
    print(f"理想并行耗时（{n_workers} 个工作者）：{total_work / n_workers:.2f}s")

    seq_time, seq_counts = run_sequential(tasks)
    print(f"\n顺序执行（1 个工作者）：墙钟耗时={seq_time:.2f} 秒，完成数量={seq_counts}")

    fixed_time, fixed_counts = run_fixed_assignment(tasks, n_workers)
    print(f"固定分配（{n_workers} 个工作者）：墙钟耗时={fixed_time:.2f} 秒，完成数量={fixed_counts}")
    print("  工作者 0 分到了全部 4 个长任务和 1 个短任务，其他工作者完成短任务后就空闲。")

    swarm_time, swarm_counts = run_swarm(tasks, n_workers)
    print(f"共享队列（{n_workers} 个工作者）：墙钟耗时={swarm_time:.2f} 秒，完成数量={swarm_counts}")
    print("  工作者完成当前任务后继续领取下一项，使负载更均衡。")

    speedup_vs_seq = seq_time / swarm_time if swarm_time > 0 else float("inf")
    speedup_vs_fixed = fixed_time / swarm_time if swarm_time > 0 else float("inf")
    print(f"\n共享队列相对顺序执行的加速比：{speedup_vs_seq:.2f}x")
    print(f"共享队列相对固定分配的加速比：{speedup_vs_fixed:.2f}x")
    print("\n要点：任务耗时不均且难以提前分配时，共享队列可能更有优势。")
    print("权衡：本例没有集中式轨迹；调试需要任务 ID 和持久化日志。")


if __name__ == "__main__":
    main()
