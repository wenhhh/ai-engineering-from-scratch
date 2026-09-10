"""在 Gloo 后端上演示 ZeRO stage 1 优化器状态分片。

每个 rank 只持有 fp32 主参数副本和 Adam 一阶／二阶矩中的 1/N。反向传播
后，对完整 fp16 梯度执行 reduce_scatter，每个 rank 得到自己的梯度分片；
Adam 只更新本 rank 的主参数分片，然后 allgather 更新后的 fp16 参数分片，
让下一次前向传播前所有 rank 重新拥有完整模型参数。

运行：python3 code/main.py

可与第 77 课的普通 DDP 损失和本课的每 rank 优化器内存估算对照，观察
状态分片的 1/N 缩放。

译注：完整模型参数和梯度仍在每个 rank 上，因此本例只演示 stage 1
优化器状态节省，不是 ZeRO-2/3 或 FSDP 的完整参数／梯度分片。内存表是
按张量 dtype 与元素数计算的理论字节，不是进程 RSS 或 GPU 实测峰值。
"""

from __future__ import annotations

import multiprocessing as mp
import os
import sys
import tempfile

import torch
import torch.distributed as dist
import torch.nn as nn


SEED = 13
WORLD_SIZE = 4
STEPS = 20
BATCH = 8
IN_DIM = 16
HID_DIM = 32
OUT_DIM = 4


def _loopback_iface() -> str:
    return "lo0" if sys.platform == "darwin" else "lo"


class MiniMLP(nn.Module):
    def __init__(self, in_dim: int = IN_DIM, hid_dim: int = HID_DIM, out_dim: int = OUT_DIM):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hid_dim),
            nn.ReLU(),
            nn.Linear(hid_dim, hid_dim),
            nn.ReLU(),
            nn.Linear(hid_dim, out_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def flat_param_numel(module: nn.Module) -> int:
    return sum(p.numel() for p in module.parameters())


def gather_flat_params(module: nn.Module) -> torch.Tensor:
    """把全部参数拼接为一个连续的 fp32 向量。"""
    return torch.cat([p.detach().to(torch.float32).flatten() for p in module.parameters()])


def scatter_flat_to_params(module: nn.Module, flat: torch.Tensor) -> None:
    """把扁平 fp32 向量复制回模块的 fp32 参数。"""
    offset = 0
    for p in module.parameters():
        n = p.numel()
        p.data.copy_(flat[offset:offset + n].reshape(p.shape).to(p.dtype))
        offset += n


def gather_flat_grads(module: nn.Module) -> torch.Tensor:
    """把全部参数梯度拼接为一个连续的 fp32 向量。"""
    parts = []
    for p in module.parameters():
        if p.grad is None:
            parts.append(torch.zeros_like(p.data, dtype=torch.float32).flatten())
        else:
            parts.append(p.grad.detach().to(torch.float32).flatten())
    return torch.cat(parts)


def shard_bounds(total: int, world_size: int, rank: int) -> tuple:
    """返回长度为 total 的扁平张量中，本 rank 分片的 (start, end)。

    total 不能整除 world_size 时，最后按等长分片所需尺寸补零；写回完整
    参数时按 total 截断，因此填充值不会进入模型参数。
    """
    pad = (-total) % world_size
    padded = total + pad
    chunk = padded // world_size
    start = rank * chunk
    end = min(start + chunk, total)
    return start, end, chunk


class ZeroOptimizer:
    """Stage-1 分片 Adam。

    仅持有 fp32 主参数及 Adam (m, v) 的 1/N 分片。module.parameters()
    中的完整模型参数仍然保留，使前向和反向能看到完整网络；节省来自
    本对象只保存优化器状态分片。
    """

    def __init__(self, module: nn.Module, world_size: int, rank: int,
                 lr: float = 0.05, beta1: float = 0.9, beta2: float = 0.999,
                 eps: float = 1e-8):
        self.module = module
        self.world_size = world_size
        self.rank = rank
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.step_count = 0
        total = flat_param_numel(module)
        self.total = total
        start, end, chunk = shard_bounds(total, world_size, rank)
        self.shard_start = start
        self.shard_end = end
        self.shard_size = chunk
        full = gather_flat_params(module)
        padded = torch.zeros(chunk * world_size, dtype=torch.float32)
        padded[:total] = full
        self.master_shard = padded[rank * chunk:(rank + 1) * chunk].clone()
        self.m_shard = torch.zeros_like(self.master_shard)
        self.v_shard = torch.zeros_like(self.master_shard)

    def shard_bytes(self) -> int:
        """只统计本 rank 所持优化器分片张量的字节数。"""
        return (self.master_shard.numel()
                + self.m_shard.numel()
                + self.v_shard.numel()) * 4

    def step(self) -> None:
        """对梯度 reduce_scatter，更新本 rank Adam 分片，再 allgather 参数。"""
        flat_grad = gather_flat_grads(self.module)
        pad = (-self.total) % self.world_size
        padded_grad = torch.zeros(self.total + pad, dtype=torch.float32)
        padded_grad[:self.total] = flat_grad
        chunks = list(padded_grad.chunk(self.world_size))
        chunks = [c.contiguous() for c in chunks]
        local_grad = torch.zeros_like(chunks[0])
        dist.reduce_scatter(local_grad, chunks, op=dist.ReduceOp.SUM)
        local_grad.div_(self.world_size)
        self.step_count += 1
        self.m_shard.mul_(self.beta1).add_(local_grad, alpha=1 - self.beta1)
        self.v_shard.mul_(self.beta2).addcmul_(local_grad, local_grad, value=1 - self.beta2)
        bc1 = 1 - self.beta1 ** self.step_count
        bc2 = 1 - self.beta2 ** self.step_count
        m_hat = self.m_shard / bc1
        v_hat = self.v_shard / bc2
        self.master_shard.addcdiv_(m_hat, v_hat.sqrt().add_(self.eps), value=-self.lr)
        gathered = [torch.zeros_like(self.master_shard) for _ in range(self.world_size)]
        dist.all_gather(gathered, self.master_shard)
        flat_full = torch.cat(gathered)[:self.total]
        scatter_flat_to_params(self.module, flat_full)

    def zero_grad(self) -> None:
        for p in self.module.parameters():
            if p.grad is not None:
                p.grad.detach_()
                p.grad.zero_()


def make_dataset(seed: int, n_total: int) -> tuple:
    g = torch.Generator().manual_seed(seed)
    x = torch.randn(n_total, IN_DIM, generator=g)
    w = torch.randn(IN_DIM, OUT_DIM, generator=g)
    y = x @ w + 0.1 * torch.randn(n_total, OUT_DIM, generator=g)
    return x, y


def _zero_worker(rank: int, world_size: int, init_file: str, iface: str,
                 steps: int, batch: int, lr: float, out_queue) -> None:
    os.environ["GLOO_SOCKET_IFNAME"] = iface
    dist.init_process_group(
        backend="gloo", init_method=f"file://{init_file}",
        rank=rank, world_size=world_size,
    )
    torch.manual_seed(SEED)
    model = MiniMLP()
    for p in model.parameters():
        dist.broadcast(p.data, src=0)
    optim = ZeroOptimizer(model, world_size=world_size, rank=rank, lr=lr)
    loss_fn = nn.MSELoss()
    x_all, y_all = make_dataset(SEED + 1000, n_total=world_size * batch * steps)
    losses = []
    for step in range(steps):
        offset = step * world_size * batch + rank * batch
        x = x_all[offset:offset + batch]
        y = y_all[offset:offset + batch]
        optim.zero_grad()
        pred = model(x)
        loss = loss_fn(pred, y)
        loss.backward()
        optim.step()
        losses.append(loss.item())
    norm = sum(p.detach().pow(2).sum().item() for p in model.parameters()) ** 0.5
    out_queue.put((rank, losses, norm, optim.shard_bytes()))
    out_queue.close()
    out_queue.join_thread()
    os._exit(0)


def run_zero(world_size: int = WORLD_SIZE, steps: int = STEPS,
             batch: int = BATCH, lr: float = 0.05) -> dict:
    ctx = mp.get_context("spawn")
    out_queue = ctx.Queue()
    init_dir = tempfile.mkdtemp(prefix="aie_zero_")
    init_file = os.path.join(init_dir, "rendezvous")
    iface = _loopback_iface()
    procs = []
    try:
        for r in range(world_size):
            p = ctx.Process(
                target=_zero_worker,
                args=(r, world_size, init_file, iface, steps, batch, lr, out_queue),
            )
            p.start()
            procs.append(p)
        results = {}
        for _ in range(world_size):
            rank, losses, norm, shard_bytes = out_queue.get(timeout=120)
            results[rank] = (losses, norm, shard_bytes)
        return results
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


def memory_table(p_params: int, world_size: int) -> str:
    """估算普通 DDP 与 ZeRO stage 1 的每 rank 字节数。

    混合精度假设：fp16 参数 + fp16 梯度 + fp32 主参数 + fp32 m + fp32 v。
    """
    fp16 = 2
    fp32 = 4
    vanilla = (fp16 + fp16 + fp32 + fp32 + fp32) * p_params
    zero1 = (fp16 + fp16) * p_params + (fp32 * 3 * p_params) // world_size
    drop = 100 * (vanilla - zero1) / vanilla
    rows = [
        ("vanilla DDP", vanilla),
        (f"ZeRO-1 (N={world_size})", zero1),
    ]
    out = ["per-rank optimiser memory:"]
    for name, b in rows:
        out.append(f"  {name:<20} {b:>12} bytes")
    out.append(f"  drop: {drop:.1f}%")
    return "\n".join(out)


def main() -> int:
    print(f"进程数={WORLD_SIZE}，步数={STEPS}，批大小={BATCH}, model=MiniMLP")
    print("正在跨 rank 运行 ZeRO-1……")
    results = run_zero()
    print(f"\n{'step':<6}{'rank0_loss':<14}{'rank3_loss':<14}")
    r0_losses, r0_norm, r0_bytes = results[0]
    r3_losses, _, r3_bytes = results[WORLD_SIZE - 1]
    for s in range(STEPS):
        print(f"{s:<6}{r0_losses[s]:<14.6f}{r3_losses[s]:<14.6f}")
    print(f"\n最终参数范数（各 rank 应一致）：")
    for r in range(WORLD_SIZE):
        _, norm, shard_bytes = results[r]
        print(f"  rank {r}：范数={norm:.6f}，优化器分片字节={shard_bytes}")
    total_params = flat_param_numel(MiniMLP())
    print()
    print(memory_table(total_params, WORLD_SIZE))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
