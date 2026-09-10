"""基于 multiprocessing.Queue 从零实现集合通信，并与 Gloo 结果核对。

在将 N 个 rank 接成队列网格的教学实现上提供 ring allreduce、树形广播、
allgather 与 reduce_scatter。每种原语都与相同 world size、相同张量上的
torch.distributed Gloo 参考结果比较；另外统计每 rank 发送的字节数，检查
ring allreduce 的 2T(N-1)/N 通信量公式。

运行：python3 code/main.py

队列网格工作进程使用 fork，使子进程继承 Queue 文件描述符；Gloo 参考
进程使用 spawn，以获得干净的分布式进程环境。两者均来自标准库
multiprocessing。

译注：这是单机 CPU 教学实现；“逐字节验证”最终实际按张量数值比较与
容差判断，通信字节计数也只覆盖本例显式 send 的载荷，不代表真实网络
协议总开销或多机性能。后端、rank、操作名和张量输入保持原值。
"""

from __future__ import annotations

import multiprocessing as mp
import os
import tempfile
from dataclasses import dataclass

import torch
import torch.distributed as dist


PRIMITIVES = ("allreduce", "broadcast", "allgather", "reduce_scatter")
RECV_TIMEOUT_S = 30.0


def _loopback_iface() -> str:
    """返回回环网卡名；macOS 使用 lo0，Linux 使用 lo。"""
    import sys as _sys
    return "lo0" if _sys.platform == "darwin" else "lo"


@dataclass
class Mesh:
    """由队列构成的点对点全连接网格。

    每个 rank 持有 out_queues[dst] 和 in_queues[src]。环形算法只使用
    相邻边；保留全连接网格是为了让后续课程可尝试树形拓扑而无需重接线。
    """

    rank: int
    world_size: int
    out_queues: list
    in_queues: list
    byte_counter: object = None

    def send(self, dst: int, tensor: torch.Tensor) -> None:
        if dst == self.rank:
            raise ValueError("rank cannot send to itself")
        payload = tensor.detach().clone().contiguous()
        nbytes = payload.numel() * payload.element_size()
        if self.byte_counter is not None:
            with self.byte_counter.get_lock():
                self.byte_counter.value += nbytes
        self.out_queues[dst].put(payload)

    def recv(self, src: int) -> torch.Tensor:
        if src == self.rank:
            raise ValueError("rank cannot recv from itself")
        return self.in_queues[src].get(timeout=RECV_TIMEOUT_S)


def build_queue_grid(ctx, world_size: int):
    """使用给定 multiprocessing context 分配 world_size × world_size 的队列网格。"""
    grid = [[None] * world_size for _ in range(world_size)]
    for src in range(world_size):
        for dst in range(world_size):
            if src != dst:
                grid[src][dst] = ctx.Queue()
    return grid


def mesh_from_grid(rank: int, world_size: int, grid, byte_counter) -> Mesh:
    out_qs = [grid[rank][d] for d in range(world_size)]
    in_qs = [grid[s][rank] for s in range(world_size)]
    return Mesh(rank=rank, world_size=world_size,
                out_queues=out_qs, in_queues=in_qs,
                byte_counter=byte_counter)


def ring_allreduce(mesh: Mesh, tensor: torch.Tensor) -> torch.Tensor:
    """两阶段 ring allreduce：先 reduce-scatter，再 allgather。

    将张量切成 world_size 个等长分块；必要时在末尾补零。完成后，
    每个 rank 都持有恢复为原始形状的同一求和张量。
    """
    w = mesh.world_size
    r = mesh.rank
    if w == 1:
        return tensor.clone()
    n = tensor.numel()
    pad = (-n) % w
    flat = torch.zeros(n + pad, dtype=tensor.dtype)
    flat[:n] = tensor.flatten()
    chunks = [c.clone() for c in flat.chunk(w)]
    next_rank = (r + 1) % w
    prev_rank = (r - 1) % w
    for step in range(w - 1):
        send_idx = (r - step) % w
        recv_idx = (r - step - 1) % w
        mesh.send(next_rank, chunks[send_idx])
        incoming = mesh.recv(prev_rank)
        chunks[recv_idx] = chunks[recv_idx] + incoming
    for step in range(w - 1):
        send_idx = (r - step + 1) % w
        recv_idx = (r - step) % w
        mesh.send(next_rank, chunks[send_idx])
        incoming = mesh.recv(prev_rank)
        chunks[recv_idx] = incoming
    return torch.cat(chunks)[:n].reshape(tensor.shape)


def broadcast(mesh: Mesh, tensor: torch.Tensor, src: int) -> torch.Tensor:
    """在 ceil(log2(world_size)) 轮内完成树形广播。

    每轮让持有值的 rank 数量近似翻倍。源 rank 提供初始值；其他 rank
    忽略自己的输入，从已经持有值的对端接收。
    """
    w = mesh.world_size
    r = mesh.rank
    if w == 1:
        return tensor.clone()
    has_value = {src}
    out = tensor.clone() if r == src else torch.zeros_like(tensor)
    round_idx = 0
    while len(has_value) < w:
        new_holders = set()
        for h in sorted(has_value):
            partner = h + (1 << round_idx)
            if partner < w and partner not in has_value:
                if r == h:
                    mesh.send(partner, out)
                elif r == partner:
                    out = mesh.recv(h)
                new_holders.add(partner)
        has_value |= new_holders
        round_idx += 1
    return out


def allgather(mesh: Mesh, tensor: torch.Tensor) -> torch.Tensor:
    """通过 N-1 次环形轮转实现 allgather。

    每个 rank 输入长度为 T 的分片，输出按 rank 顺序拼接的全部分片，
    总长度为 T × world_size。
    """
    w = mesh.world_size
    r = mesh.rank
    if w == 1:
        return tensor.clone()
    shards = [torch.zeros_like(tensor) for _ in range(w)]
    shards[r] = tensor.clone()
    next_rank = (r + 1) % w
    prev_rank = (r - 1) % w
    for step in range(w - 1):
        send_idx = (r - step) % w
        recv_idx = (r - step - 1) % w
        mesh.send(next_rank, shards[send_idx])
        shards[recv_idx] = mesh.recv(prev_rank)
    return torch.cat(shards)


def reduce_scatter(mesh: Mesh, tensor: torch.Tensor) -> torch.Tensor:
    """将 ring allreduce 的前半段作为 reduce-scatter。

    输入长度为 world_size × T；输出为长度 T 的 rank 分块，其中包含所有
    rank 在对应索引范围上的求和。底层环算法最终把完整和停在
    (r + 1) % W 位置；这里取出对应分块，并按 torch.distributed 的契约
    将它标记为 rank r 拥有的 chunks[r]。
    """
    w = mesh.world_size
    r = mesh.rank
    n = tensor.numel()
    if n % w != 0:
        raise ValueError(f"reduce_scatter needs numel divisible by world_size, got {n} / {w}")
    if w == 1:
        return tensor.clone()
    rotated = list(tensor.chunk(w))
    rotated = [rotated[(i - 1) % w].clone() for i in range(w)]
    chunks = rotated
    next_rank = (r + 1) % w
    prev_rank = (r - 1) % w
    for step in range(w - 1):
        send_idx = (r - step) % w
        recv_idx = (r - step - 1) % w
        mesh.send(next_rank, chunks[send_idx])
        incoming = mesh.recv(prev_rank)
        chunks[recv_idx] = chunks[recv_idx] + incoming
    return chunks[(r + 1) % w]


def _gloo_worker(rank: int, world_size: int, op: str, tensor_bytes: bytes,
                 shape, dtype_str: str, init_file: str,
                 iface: str, out_queue) -> None:
    os.environ["GLOO_SOCKET_IFNAME"] = iface
    dist.init_process_group(
        backend="gloo",
        init_method=f"file://{init_file}",
        rank=rank,
        world_size=world_size,
    )
    dtype = getattr(torch, dtype_str)
    tensor = torch.frombuffer(bytearray(tensor_bytes), dtype=dtype).reshape(shape).clone()
    if op == "allreduce":
        dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
        out = tensor
    elif op == "broadcast":
        dist.broadcast(tensor, src=0)
        out = tensor
    elif op == "allgather":
        gathered = [torch.zeros_like(tensor) for _ in range(world_size)]
        dist.all_gather(gathered, tensor)
        out = torch.cat(gathered)
    elif op == "reduce_scatter":
        chunks = [c.contiguous() for c in tensor.chunk(world_size)]
        recv = torch.zeros_like(chunks[0])
        dist.reduce_scatter(recv, chunks, op=dist.ReduceOp.SUM)
        out = recv
    else:
        raise ValueError(f"unknown op {op}")
    out_queue.put((rank, out.clone()))
    out_queue.close()
    out_queue.join_thread()
    os._exit(0)


def gloo_reference(op: str, world_size: int,
                   per_rank_tensors: list) -> list:
    """通过 torch.distributed 的 Gloo 后端运行同一操作作为参考。

    使用 file:// 方式初始化，因为课程环境中 macOS 上并发创建进程组时，
    TCP/libuv 初始化可能出现兼容问题。
    """
    ctx = mp.get_context("spawn")
    out_queue = ctx.Queue()
    init_dir = tempfile.mkdtemp(prefix="aie_gloo_")
    init_file = os.path.join(init_dir, "rendezvous")
    iface = _loopback_iface()
    procs = []
    try:
        for r in range(world_size):
            t = per_rank_tensors[r].contiguous()
            p = ctx.Process(
                target=_gloo_worker,
                args=(r, world_size, op, bytes(t.numpy().tobytes()),
                      tuple(t.shape), str(t.dtype).split(".")[-1],
                      init_file, iface, out_queue),
            )
            p.start()
            procs.append(p)
        results = {}
        for _ in range(world_size):
            rank, tensor = out_queue.get(timeout=60)
            results[rank] = tensor
        return [results[r] for r in range(world_size)]
    finally:
        for p in procs:
            p.join(timeout=5)
            if p.is_alive():
                p.terminate()
                p.join(timeout=2)
        try:
            os.remove(init_file)
        except FileNotFoundError:
            pass
        try:
            os.rmdir(init_dir)
        except OSError:
            pass


def _mesh_worker(rank: int, world_size: int, op: str,
                 grid, byte_counter, tensor_bytes: bytes,
                 shape, dtype_str: str, src: int, out_queue) -> None:
    mesh = mesh_from_grid(rank, world_size, grid, byte_counter)
    dtype = getattr(torch, dtype_str)
    tensor = torch.frombuffer(bytearray(tensor_bytes), dtype=dtype).reshape(shape).clone()
    if op == "allreduce":
        result = ring_allreduce(mesh, tensor)
    elif op == "broadcast":
        result = broadcast(mesh, tensor, src=src)
    elif op == "allgather":
        result = allgather(mesh, tensor)
    elif op == "reduce_scatter":
        result = reduce_scatter(mesh, tensor)
    else:
        raise ValueError(f"unknown op {op}")
    out_queue.put((rank, result))


def run_mesh(op: str, world_size: int,
             per_rank_tensors: list,
             src: int = 0) -> tuple:
    """在队列网格上运行指定集合通信原语，返回各 rank 输出和总字节计数。"""
    ctx = mp.get_context("fork")
    grid = build_queue_grid(ctx, world_size)
    byte_counter = ctx.Value("q", 0)
    out_queue = ctx.Queue()
    procs = []
    try:
        for r in range(world_size):
            t = per_rank_tensors[r].contiguous()
            p = ctx.Process(
                target=_mesh_worker,
                args=(r, world_size, op, grid, byte_counter,
                      bytes(t.numpy().tobytes()), tuple(t.shape),
                      str(t.dtype).split(".")[-1], src, out_queue),
            )
            p.start()
            procs.append(p)
        results = {}
        for _ in range(world_size):
            rank, tensor = out_queue.get(timeout=60)
            results[rank] = tensor
        return [results[r] for r in range(world_size)], byte_counter.value
    finally:
        for p in procs:
            p.join(timeout=30)
            if p.is_alive():
                p.terminate()
                p.join(timeout=2)


def verify_against_gloo(op: str, world_size: int,
                        per_rank_tensors: list) -> tuple:
    """将队列实现与 Gloo 参考比较，返回 (是否匹配, 最大绝对差异)。"""
    mesh_out, _ = run_mesh(op, world_size, per_rank_tensors)
    gloo_out = gloo_reference(op, world_size, per_rank_tensors)
    max_diff = 0.0
    for m, g in zip(mesh_out, gloo_out):
        diff = (m - g).abs().max().item()
        if diff > max_diff:
            max_diff = diff
    return max_diff < 1e-5, max_diff


def main() -> int:
    world_size = 4
    n = 64
    torch.manual_seed(7)
    per_rank = [torch.randn(n, dtype=torch.float32) for _ in range(world_size)]
    print(f"进程数={world_size}，张量长度={n}, dtype=float32")
    print(f"{'op':<16} {'gloo_match':<12} {'max_abs_diff':<14}")
    for op in PRIMITIVES:
        if op == "broadcast":
            inputs = [per_rank[0].clone() if r == 0 else torch.zeros(n) for r in range(world_size)]
        elif op == "reduce_scatter":
            inputs = [torch.randn(n * world_size, dtype=torch.float32) for _ in range(world_size)]
        else:
            inputs = per_rank
        match, diff = verify_against_gloo(op, world_size, inputs)
        print(f"{op:<16} {str(match):<12} {diff:<14.3e}")
    expected_per_rank_bytes = 2 * (world_size - 1) * (n // world_size) * 4
    _, total_bytes = run_mesh("allreduce", world_size, per_rank)
    per_rank_bytes = total_bytes / world_size
    print(f"\nallreduce 每 rank 字节数：实测={per_rank_bytes:.0f} "
          f"期望={expected_per_rank_bytes} "
          f"公式 2T(N-1)/N，其中 T={n*4} 字节")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
