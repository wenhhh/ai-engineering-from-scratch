"""在 Gloo 后端上从零实现 DistributedDataParallel。

对 nn.Module 做薄包装：构造时由 rank 0 广播全部参数，使各 rank 从相同
权重开始；反向传播后，对每个参数梯度执行 allreduce 求和并除以
world_size，使各 rank 用同一平均梯度更新。

演示在 4 个 rank 上用合成数据训练三层 MLP 20 步，并与单进程参考路径
比较。参考路径每一步按 rank 顺序遍历相同微批，从而检查损失轨迹的一致性。

运行：python3 code/main.py

译注：这是显式调用 sync_grads 的课程实现，不包含生产 DDP 的梯度桶、
反向钩子、通信重叠和容错；所谓 float epsilon 一致性只针对固定模型、
数据顺序与 CPU/Gloo 环境。不能据此外推多 GPU 性能或通用数值等价。
"""

from __future__ import annotations

import multiprocessing as mp
import os
import sys
import tempfile

import torch
import torch.distributed as dist
import torch.nn as nn


SEED = 7
WORLD_SIZE = 4
STEPS = 20
BATCH = 8
IN_DIM = 16
HID_DIM = 32
OUT_DIM = 4


def _loopback_iface() -> str:
    return "lo0" if sys.platform == "darwin" else "lo"


class MiniMLP(nn.Module):
    """规模足够小，可在数秒内运行，同时仍能展示 DDP 接线。"""

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


class DistributedDataParallel:
    """构造时广播参数，反向传播后 allreduce 并取梯度均值。

    这不是完整的 nn.Module 包装器；API 只暴露训练循环需要的 sync_init
    和 sync_grads。包装保持刻意简化，使每次通信成本在循环中可见。
    """

    def __init__(self, module: nn.Module, world_size: int):
        self.module = module
        self.world_size = world_size
        self._broadcast_params()

    def _broadcast_params(self) -> None:
        for p in self.module.parameters():
            dist.broadcast(p.data, src=0)

    def sync_grads(self) -> None:
        for p in self.module.parameters():
            if p.grad is None:
                continue
            dist.all_reduce(p.grad.data, op=dist.ReduceOp.SUM)
            p.grad.data.div_(self.world_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.module(x)

    def parameters(self):
        return self.module.parameters()


def make_dataset(seed: int, n_total: int) -> tuple:
    """生成所有 rank 与单进程参考路径共享的合成回归数据集。"""
    g = torch.Generator().manual_seed(seed)
    x = torch.randn(n_total, IN_DIM, generator=g)
    w = torch.randn(IN_DIM, OUT_DIM, generator=g)
    y = x @ w + 0.1 * torch.randn(n_total, OUT_DIM, generator=g)
    return x, y


def _ddp_worker(rank: int, world_size: int, init_file: str, iface: str,
                steps: int, batch: int, lr: float, out_queue) -> None:
    os.environ["GLOO_SOCKET_IFNAME"] = iface
    dist.init_process_group(
        backend="gloo",
        init_method=f"file://{init_file}",
        rank=rank,
        world_size=world_size,
    )
    torch.manual_seed(SEED)
    model = MiniMLP()
    ddp = DistributedDataParallel(model, world_size=world_size)
    optim = torch.optim.SGD(ddp.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    x_all, y_all = make_dataset(SEED + 1000, n_total=world_size * batch * steps)
    losses = []
    for step in range(steps):
        offset = step * world_size * batch + rank * batch
        x = x_all[offset:offset + batch]
        y = y_all[offset:offset + batch]
        optim.zero_grad(set_to_none=True)
        pred = ddp.forward(x)
        loss = loss_fn(pred, y)
        loss.backward()
        ddp.sync_grads()
        optim.step()
        losses.append(loss.item())

    final_norm = sum(p.detach().pow(2).sum().item() for p in ddp.parameters()) ** 0.5
    out_queue.put((rank, losses, final_norm))
    out_queue.close()
    out_queue.join_thread()
    os._exit(0)


def run_ddp(world_size: int = WORLD_SIZE, steps: int = STEPS,
            batch: int = BATCH, lr: float = 0.05) -> tuple:
    """启动 world_size 个 rank，返回各 rank 的损失历史和参数范数。"""
    ctx = mp.get_context("spawn")
    out_queue = ctx.Queue()
    init_dir = tempfile.mkdtemp(prefix="aie_ddp_")
    init_file = os.path.join(init_dir, "rendezvous")
    iface = _loopback_iface()
    procs = []
    try:
        for r in range(world_size):
            p = ctx.Process(
                target=_ddp_worker,
                args=(r, world_size, init_file, iface, steps, batch, lr, out_queue),
            )
            p.start()
            procs.append(p)
        results = {}
        for _ in range(world_size):
            rank, losses, norm = out_queue.get(timeout=120)
            results[rank] = (losses, norm)
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


def reference_single_process(world_size: int = WORLD_SIZE, steps: int = STEPS,
                             batch: int = BATCH, lr: float = 0.05) -> tuple:
    """在单进程中按每步拼接后的相同批次训练同一模型。

    一个“不使用 DDP”的参考路径每一步按 rank 顺序处理全部微批；在本例
    的等权平均约定下，它应与 DDP allreduce-mean 产生相同更新。
    """
    torch.manual_seed(SEED)
    model = MiniMLP()
    optim = torch.optim.SGD(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()
    x_all, y_all = make_dataset(SEED + 1000, n_total=world_size * batch * steps)
    losses = []
    for step in range(steps):
        optim.zero_grad(set_to_none=True)
        rank0_loss = None
        for r in range(world_size):
            offset = step * world_size * batch + r * batch
            x = x_all[offset:offset + batch]
            y = y_all[offset:offset + batch]
            pred = model(x)
            loss = loss_fn(pred, y) / world_size
            loss.backward()
            if r == 0:
                rank0_loss = loss.item() * world_size
        optim.step()
        losses.append(rank0_loss)
    final_norm = sum(p.detach().pow(2).sum().item() for p in model.parameters()) ** 0.5
    return losses, final_norm


def main() -> int:
    print(f"进程数={WORLD_SIZE}，步数={STEPS}，批大小={BATCH}, model=MiniMLP")
    print("正在跨 rank 运行 DDP……")
    ddp_results = run_ddp()
    print("正在运行单进程参考……")
    ref_losses, ref_norm = reference_single_process()
    print(f"\n{'step':<6}{'ref_loss':<14}{'ddp_rank0':<14}{'ddp_rank3':<14}{'rank_drift':<14}")
    rank0_losses, rank0_norm = ddp_results[0]
    rank3_losses, _ = ddp_results[WORLD_SIZE - 1]
    for s in range(STEPS):
        drift = abs(rank0_losses[s] - rank3_losses[s])
        print(f"{s:<6}{ref_losses[s]:<14.6f}{rank0_losses[s]:<14.6f}{rank3_losses[s]:<14.6f}{drift:<14.2e}")
    print(f"\n最终参数范数：参考={ref_norm:.6f}，ddp_rank0={rank0_norm:.6f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
