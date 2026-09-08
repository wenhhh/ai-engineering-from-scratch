"""三层 GPU 自动扩缩容（Autoscaling）模拟器，仅使用 Python 标准库。

在同一组突发工作负载下对比三种扩缩容策略：
  DUTY_CYCLE   ：水平 Pod 自动扩缩容（HPA）依据 DCGM_FI_DEV_GPU_UTIL，默认信号不适用
  QUEUE_DEPTH  ：HPA 依据请求队列深度（Queue Depth），使用正确的信号
  KAI_GANG     ：具备拓扑感知（Topology Awareness）的成组调度（Gang Scheduling），避免仅分配部分资源

报告丢弃请求数、GPU 空闲分钟数和综合得分。
本例用于教学，延迟与资源就绪时间仅作示意。
"""

from __future__ import annotations

from dataclasses import dataclass
import random


NODE_PROVISION_SEC = 50       # Karpenter 约需 45–60 秒
CLUSTER_AUTOSCALER_SEC = 110  # 较慢的对照方案
MODEL_LOAD_SEC = 45           # 加载 70B 模型权重并初始化引擎
REQUEST_PREFILL_SEC = 0.6
REQUEST_DECODE_SEC = 1.8
MIN_WARM_REPLICAS = 1
MAX_REPLICAS = 16
GPU_PER_REPLICA = 1
HPA_TICK_SEC = 15
TARGET_GPU_UTIL = 70          # 占空比（Duty Cycle）目标


@dataclass
class Request:
    arrived_at: float
    started_at: float | None = None
    completed_at: float | None = None
    dropped: bool = False


def make_workload(duration_sec: int = 3600, seed: int = 7) -> list[Request]:
    rng = random.Random(seed)
    reqs = []
    # 模拟早间突发流量：0–600 秒平稳，600–1800 秒高峰，1800–3600 秒回落。
    for _ in range(int(duration_sec)):
        t = _
        if t < 600:
            rate = 0.5
        elif t < 1800:
            rate = 4.0
        else:
            rate = 1.2
        if rng.random() < rate / 10:
            reqs.append(Request(arrived_at=float(t)))
    return reqs


def simulate(strategy: str, reqs: list[Request]) -> dict:
    replicas_ready = MIN_WARM_REPLICAS
    replicas_target = MIN_WARM_REPLICAS
    replica_available_at = {i: 0.0 for i in range(MIN_WARM_REPLICAS)}
    queue: list[Request] = []
    reqs = sorted(reqs, key=lambda r: r.arrived_at)
    cursor = 0
    now = 0.0
    sim_end = max(r.arrived_at for r in reqs) + 60
    idle_gpu_sec = 0.0
    pending_replicas: list[tuple[float, int]] = []  # （就绪时间 ready_at，副本编号 replica_id）
    next_replica_id = MIN_WARM_REPLICAS
    peak_replicas = replicas_ready

    while now < sim_end:
        while cursor < len(reqs) and reqs[cursor].arrived_at <= now:
            queue.append(reqs[cursor])
            cursor += 1
        for ready_at, rid in list(pending_replicas):
            if ready_at <= now:
                replica_available_at[rid] = now
                replicas_ready += 1
                pending_replicas.remove((ready_at, rid))

        free_replicas = [rid for rid, t in replica_available_at.items() if t <= now]
        for rid in free_replicas:
            if queue:
                r = queue.pop(0)
                r.started_at = now
                service_time = REQUEST_PREFILL_SEC + REQUEST_DECODE_SEC
                r.completed_at = now + service_time
                replica_available_at[rid] = r.completed_at
            else:
                idle_gpu_sec += HPA_TICK_SEC

        if strategy == "DUTY_CYCLE":
            pending_ids = {rid for _, rid in pending_replicas}
            busy = sum(
                1
                for rid, t in replica_available_at.items()
                if t > now and rid not in pending_ids
            )
            util = busy / max(replicas_ready, 1) * 100
            if util > TARGET_GPU_UTIL and replicas_target < MAX_REPLICAS:
                replicas_target += 1
            elif util < 20 and replicas_target > MIN_WARM_REPLICAS:
                replicas_target -= 1
        elif strategy == "QUEUE_DEPTH":
            qd = len(queue)
            if qd > 5 and replicas_target < MAX_REPLICAS:
                replicas_target = min(MAX_REPLICAS, replicas_target + max(1, qd // 5))
            elif qd == 0 and replicas_target > MIN_WARM_REPLICAS:
                replicas_target = max(MIN_WARM_REPLICAS, replicas_target - 1)
        elif strategy == "KAI_GANG":
            qd = len(queue)
            if qd > 3 and replicas_target < MAX_REPLICAS:
                replicas_target = min(MAX_REPLICAS, replicas_target + max(2, qd // 3))
            elif qd == 0 and replicas_target > MIN_WARM_REPLICAS:
                replicas_target = max(MIN_WARM_REPLICAS, replicas_target - 1)

        while replicas_ready + len(pending_replicas) < replicas_target:
            ready_at = now + NODE_PROVISION_SEC + MODEL_LOAD_SEC
            pending_replicas.append((ready_at, next_replica_id))
            replica_available_at[next_replica_id] = ready_at
            next_replica_id += 1
        peak_replicas = max(peak_replicas, replicas_ready + len(pending_replicas))
        if replicas_ready > replicas_target:
            idle = [rid for rid, t in replica_available_at.items() if t <= now]
            if idle:
                replica_available_at.pop(idle[0])
                replicas_ready -= 1

        for r in queue[:]:
            if now - r.arrived_at > 30:  # 超过服务等级协议（SLA）的超时阈值
                r.dropped = True
                queue.remove(r)

        now += HPA_TICK_SEC

    dropped = sum(1 for r in reqs if r.dropped)
    completed = sum(1 for r in reqs if r.completed_at is not None)
    started = [r for r in reqs if r.started_at is not None]
    mean_wait = (
        sum(r.started_at - r.arrived_at for r in started) / len(started)
        if started else 0.0
    )
    return {
        "strategy": strategy,
        "total": len(reqs),
        "completed": completed,
        "dropped": dropped,
        "mean_wait_s": mean_wait,
        "idle_gpu_min": idle_gpu_sec / 60,
        "peak_replicas": peak_replicas,
    }


def report(row: dict) -> None:
    print(f"{row['strategy']:14}  请求={row['total']:4}  "
          f"完成={row['completed']:4}  丢弃={row['dropped']:3}  "
          f"平均等待={row['mean_wait_s']:5.1f} 秒  "
          f"GPU 空闲={row['idle_gpu_min']:6.1f} 分钟  峰值副本数={row['peak_replicas']:2}")


def main() -> None:
    print("=" * 80)
    print("GPU 自动扩缩容（Autoscaling）：突发工作负载下的三种策略，模拟 1 小时")
    print("=" * 80)
    base = make_workload()
    header = f"{'策略':14}  请求数  完成数  丢弃数  平均等待时间  GPU 空闲时间  峰值副本数"
    print(header)
    print("-" * len(header))
    for strategy in ("DUTY_CYCLE", "QUEUE_DEPTH", "KAI_GANG"):
        reqs = [Request(arrived_at=r.arrived_at) for r in base]
        result = simulate(strategy, reqs)
        report(result)

    print("\n结果解读：DUTY_CYCLE 会丢弃请求，因为 DCGM_FI_DEV_GPU_UTIL 衡量的是占空比。")
    print("QUEUE_DEPTH 根据实际积压请求扩缩容。")
    print("KAI_GANG 扩容更积极，并避免仅分配部分资源导致的停滞。")


if __name__ == "__main__":
    main()
