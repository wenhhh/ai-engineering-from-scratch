"""在 Gloo 后端上从零实现分布式数据并行。

不要求 CUDA。演示使用 torch.multiprocessing 启动多个工作进程，
通过 Gloo CPU 后端连接，在本机执行真实的 all_reduce、broadcast
等集合通信，以说明多 rank 协作。

三项练习：
1. 比较 N 个 rank 手工 all_reduce 后的平均梯度与单进程对拼接输入
   计算的梯度。
2. 用自制 DDP 包装器在构造时广播参数，反向传播后显式同步梯度。
3. 通过切分和收集参数张量，示意 FSDP 的分片往返过程。

运行：python3 code/main.py

译注：原文第 2 项称使用反向钩子，实际由训练器显式调用 sync_grads。
第 3 项保留完整模型及多个副本，没有把前向计算接入真实分片生命周期，
不能证明每个 rank 的模型内存降为 1/world_size。这里只验证本地 CPU
进程间行为，不是多机、多 GPU、通信重叠或生产 FSDP 的完整验证。
设备名称、JSON 字段、参数和错误消息保持原值。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional

import torch
import torch.distributed as dist
import torch.multiprocessing as mp
from torch import nn


HERE = Path(__file__).parent
OUT_DIR = HERE.parent / "outputs"
DEMO_PATH = OUT_DIR / "ddp-demo.json"


@dataclass
class RankResult:
    rank: int
    world_size: int
    backend: str
    final_loss: float
    pre_param_sum: float
    post_param_sum: float
    grad_norm_after_all_reduce: float
    fsdp_round_trip_ok: bool


def init_process_group(rank: int, world_size: int, backend: str, master_port: int) -> None:
    os.environ["MASTER_ADDR"] = "127.0.0.1"
    os.environ["MASTER_PORT"] = str(master_port)
    loopback = "lo0" if sys.platform == "darwin" else "lo"
    os.environ.setdefault("GLOO_SOCKET_IFNAME", loopback)
    os.environ.setdefault("TP_SOCKET_IFNAME", loopback)
    dist.init_process_group(backend=backend, rank=rank, world_size=world_size)


def shutdown_process_group() -> None:
    if dist.is_initialized():
        dist.destroy_process_group()


def make_model(in_dim: int, hidden: int, out_dim: int) -> nn.Module:
    return nn.Sequential(
        nn.Linear(in_dim, hidden),
        nn.GELU(),
        nn.Linear(hidden, out_dim),
    )


def broadcast_module(module: nn.Module, src: int = 0) -> None:
    for tensor in list(module.parameters()) + list(module.buffers()):
        dist.broadcast(tensor.data, src=src)


def all_reduce_grads_(module: nn.Module, world_size: int) -> float:
    """跨 rank 累加梯度，再除以 world_size，返回所得梯度的 L2 范数。"""
    total_sq = 0.0
    for p in module.parameters():
        if p.grad is None:
            p.grad = torch.zeros_like(p.data)
        dist.all_reduce(p.grad.data, op=dist.ReduceOp.SUM)
        p.grad.data.div_(world_size)
        total_sq += float(p.grad.data.pow(2).sum().item())
    return total_sq ** 0.5


def shard_for_rank(x: torch.Tensor, rank: int, world_size: int) -> torch.Tensor:
    total = x.shape[0]
    per = total // world_size
    remainder = total - per * world_size
    start = rank * per + min(rank, remainder)
    end = start + per + (1 if rank < remainder else 0)
    return x[start:end]


class MinimalDDP(nn.Module):
    """教学用的 DistributedDataParallel 包装器。

    构造时从 rank 0 广播参数，使各 rank 从相同权重开始；前向调用
    被包装模块。反向传播后，由训练器调用 sync_grads() 归约梯度。

    生产 DDP 通常借助梯度钩子和分桶，将通信与反向传播重叠。
    本例只说明广播、计算和同步的基本契约，没有实现这些优化机制。
    """

    def __init__(self, module: nn.Module, world_size: int):
        super().__init__()
        self.module = module
        self.world_size = world_size
        if dist.is_initialized() and world_size > 1:
            broadcast_module(self.module, src=0)

    def forward(self, *args, **kwargs):
        return self.module(*args, **kwargs)

    def sync_grads(self) -> float:
        if not dist.is_initialized() or self.world_size == 1:
            return _grad_norm(self.module)
        return all_reduce_grads_(self.module, self.world_size)


def _grad_norm(module: nn.Module) -> float:
    total_sq = 0.0
    for p in module.parameters():
        if p.grad is None:
            continue
        total_sq += float(p.grad.data.pow(2).sum().item())
    return total_sq ** 0.5


def fsdp_round_trip_sketch(module: nn.Module, world_size: int, rank: int) -> bool:
    """示意参数切分与 all_gather 重建。

    每个 rank 取每个参数的一段，再通过 all_gather 重建完整张量。
    原文用这一过程解释“前向前收集、使用后释放完整副本”的 FSDP
    思路；当前函数仅做往返相等检查，原模型和完整克隆都仍在内存中，
    因此没有实现所声称的 1/world_size 内存占用。

    此处 all_gather 的输出采用相同长度，所以展平张量先在右侧
    补零到 world_size 的倍数，收集后再删除填充。

    本 rank 重建的所有参数都与原张量接近时返回 True；调用方随后
    汇总各 rank 的结果。本函数本身不归约这个布尔值。
    """
    ok = True
    for p in module.parameters():
        full = p.data.detach().clone()
        flat = full.flatten()
        total = flat.numel()
        per = (total + world_size - 1) // world_size
        padded_total = per * world_size
        pad = padded_total - total
        if pad > 0:
            padded = torch.cat([flat, torch.zeros(pad, dtype=flat.dtype)])
        else:
            padded = flat
        my_slice = padded[rank * per:(rank + 1) * per].clone()
        gathered = [torch.empty(per, dtype=flat.dtype) for _ in range(world_size)]
        dist.all_gather(gathered, my_slice)
        rebuilt_padded = torch.cat(gathered)
        rebuilt = rebuilt_padded[:total].view_as(full)
        if not torch.allclose(rebuilt, full):
            ok = False
            break
    return ok


def manual_all_reduce_matches_single_process(
    rank: int,
    world_size: int,
    in_dim: int,
    out_dim: int,
    batch_size: int,
) -> tuple[float, float]:
    """各 rank 在自己的等大数据切片上计算梯度；取 all-reduce 均值后，
    应在数值误差范围内复现完整批次梯度。本函数在 rank 0 计算
    逐元素差异，其余 rank 返回占位差异值。
    """
    torch.manual_seed(0)
    full_x = torch.randn(batch_size * world_size, in_dim)
    full_y = torch.randint(low=0, high=out_dim, size=(batch_size * world_size,))
    my_x = shard_for_rank(full_x, rank, world_size)
    my_y = shard_for_rank(full_y, rank, world_size)

    torch.manual_seed(7)
    model = make_model(in_dim, hidden=16, out_dim=out_dim)
    broadcast_module(model, src=0)
    loss_fn = nn.CrossEntropyLoss()
    for p in model.parameters():
        p.grad = None
    out = model(my_x)
    loss = loss_fn(out, my_y)
    loss.backward()
    norm_after = all_reduce_grads_(model, world_size)

    if rank == 0:
        torch.manual_seed(7)
        ref_model = make_model(in_dim, hidden=16, out_dim=out_dim)
        for p in ref_model.parameters():
            p.grad = None
        ref_loss = loss_fn(ref_model(full_x), full_y)
        ref_loss.backward()
        ref_norm = _grad_norm(ref_model)
        diffs = []
        for p, q in zip(model.parameters(), ref_model.parameters()):
            diffs.append(float((p.grad.data - q.grad.data).abs().max().item()))
        max_diff = max(diffs)
    else:
        ref_norm = 0.0
        max_diff = 0.0
    return norm_after, max_diff


def rank_main(
    rank: int,
    world_size: int,
    backend: str,
    master_port: int,
    result_queue,
    in_dim: int,
    hidden: int,
    out_dim: int,
    batch_size: int,
    num_steps: int,
    lr: float,
    seed: int,
) -> None:
    try:
        init_process_group(rank, world_size, backend, master_port)
        torch.manual_seed(seed + rank)

        grad_norm, max_diff = manual_all_reduce_matches_single_process(
            rank, world_size, in_dim, out_dim, batch_size
        )

        torch.manual_seed(seed)
        base = make_model(in_dim, hidden, out_dim)
        ddp_model = MinimalDDP(base, world_size)
        optimizer = torch.optim.SGD(ddp_model.parameters(), lr=lr)
        loss_fn = nn.CrossEntropyLoss()
        pre_param_sum = sum(float(p.data.sum().item()) for p in ddp_model.parameters())
        torch.manual_seed(seed * 31 + rank)
        local_loss = 0.0
        for step in range(num_steps):
            x = torch.randn(batch_size, in_dim)
            y = torch.randint(low=0, high=out_dim, size=(batch_size,))
            optimizer.zero_grad()
            out = ddp_model(x)
            loss = loss_fn(out, y)
            loss.backward()
            ddp_model.sync_grads()
            optimizer.step()
            local_loss = float(loss.detach().item())

        fsdp_ok = fsdp_round_trip_sketch(ddp_model.module, world_size, rank)
        post_param_sum = sum(float(p.data.sum().item()) for p in ddp_model.parameters())

        result = RankResult(
            rank=rank,
            world_size=world_size,
            backend=backend,
            final_loss=local_loss,
            pre_param_sum=pre_param_sum,
            post_param_sum=post_param_sum,
            grad_norm_after_all_reduce=grad_norm,
            fsdp_round_trip_ok=fsdp_ok,
        )
        result_queue.put((rank, result.__dict__, max_diff))
    except Exception as exc:
        result_queue.put((rank, {"error": str(exc), "rank": rank}, -1.0))
    finally:
        shutdown_process_group()


def free_port() -> int:
    import socket

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def run_distributed_demo(
    world_size: int = 2,
    *,
    backend: str = "gloo",
    in_dim: int = 32,
    hidden: int = 16,
    out_dim: int = 4,
    batch_size: int = 8,
    num_steps: int = 6,
    lr: float = 0.05,
    seed: int = 0,
    timeout: float = 60.0,
) -> Dict[str, object]:
    ctx = mp.get_context("spawn")
    result_queue = ctx.Queue()
    port = free_port()
    procs = []
    for rank in range(world_size):
        p = ctx.Process(
            target=rank_main,
            args=(
                rank,
                world_size,
                backend,
                port,
                result_queue,
                in_dim,
                hidden,
                out_dim,
                batch_size,
                num_steps,
                lr,
                seed,
            ),
        )
        p.start()
        procs.append(p)
    results: Dict[int, dict] = {}
    max_diff = 0.0
    deadline = time.time() + timeout
    collected = 0
    while collected < world_size and time.time() < deadline:
        try:
            rank, payload, diff = result_queue.get(timeout=1.0)
        except Exception:
            continue
        results[rank] = payload
        if diff > max_diff:
            max_diff = diff
        collected += 1
    for p in procs:
        p.join(timeout=max(1.0, deadline - time.time()))
    if any(p.is_alive() for p in procs):
        for p in procs:
            if p.is_alive():
                p.terminate()
        # 工作进程未在时限内完成。
        raise RuntimeError("ranks did not finish in time")
    if collected < world_size:
        # 收到的 rank 结果数量不足。
        raise RuntimeError(f"only got {collected}/{world_size} results: {results}")
    for rank, payload in results.items():
        if "error" in payload:
            # 某个 rank 报告失败；保留原错误格式。
            raise RuntimeError(f"rank {rank} failed: {payload['error']}")
    param_sums = {r: results[r]["post_param_sum"] for r in results}
    spread = max(param_sums.values()) - min(param_sums.values())
    losses = [results[r]["final_loss"] for r in results]
    grad_norm = results[0]["grad_norm_after_all_reduce"]
    return {
        "world_size": world_size,
        "backend": backend,
        "param_sum_per_rank": param_sums,
        "param_sum_spread": spread,
        "losses": losses,
        "grad_norm_after_all_reduce": grad_norm,
        "manual_all_reduce_max_diff_vs_single_process": max_diff,
        "fsdp_round_trip_all_ranks_ok": all(results[r]["fsdp_round_trip_ok"] for r in results),
    }


def write_demo(payload: Dict[str, object], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"schema": "ddp-demo.v1", **payload}, indent=2) + "\n")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--world-size", type=int, default=2)
    p.add_argument("--backend", type=str, default="gloo")
    p.add_argument("--num-steps", type=int, default=6)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--no-write", action="store_true")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if not dist.is_available():
        print("torch.distributed 不可用，跳过演示。")
        return 0
    if args.backend == "gloo" and not dist.is_gloo_available():
        print("当前构建未编译 Gloo 后端，无法执行本 CPU 演示；需要支持 Gloo 的构建。")
        return 1
    print(f"运行分布式演示：后端={args.backend}，进程总数={args.world_size}")
    result = run_distributed_demo(
        world_size=args.world_size,
        backend=args.backend,
        num_steps=args.num_steps,
        batch_size=args.batch_size,
        seed=args.seed,
    )
    print(json.dumps(result, indent=2))
    # 各 rank 的参数和差异超过阈值；这不是逐参数完整等值检查。
    assert result["param_sum_spread"] < 1e-3, "parameters diverged across ranks"
    # FSDP 分片示意的往返检查失败。
    assert result["fsdp_round_trip_all_ranks_ok"], "FSDP sketch round trip failed"
    # 手工 all-reduce 后的梯度与单进程参考差异过大。
    assert result["manual_all_reduce_max_diff_vs_single_process"] < 1e-4, "manual all-reduce mismatched single-process gradient"
    if not args.no_write:
        write_demo(result, DEMO_PATH)
        print(f"已写入 {DEMO_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
