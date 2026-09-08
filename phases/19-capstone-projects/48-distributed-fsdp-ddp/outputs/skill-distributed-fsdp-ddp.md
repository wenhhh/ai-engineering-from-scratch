---
name: distributed-fsdp-ddp
description: 在 gloo 或 nccl 后端用从零实现的 DDP 包装器与 FSDP 参数分片示意启动多进程训练。
version: 1.0.0
phase: 19
lesson: 48
tags: [distributed, ddp, fsdp, collectives]
---

## 何时使用（When to use）

模型能放进一台设备但需要更高吞吐量（DDP），或模型放不进一台设备（FSDP）。两种情况都用同一代码路径配置多进程训练。

## 建立进程组（Bring up the process group）

```python
os.environ["MASTER_ADDR"] = "127.0.0.1"
os.environ["MASTER_PORT"] = str(port)
dist.init_process_group(backend="gloo", rank=rank, world_size=world_size)
```

`gloo` 是 CPU 后端，`nccl` 是 GPU 后端，两者实现相同集合通信接口。

## 包装模型（Wrap the model）

1. 在 rank 0，按种子构建模型。
2. 用 DDP 外层包装。
3. 外层 `__init__` 对所有参数与缓冲区调用 `dist.broadcast(p.data, src=0)`。
4. 每次 `loss.backward()` 后，训练器调用 `sync_grads()`。
5. `sync_grads()` 调用 `dist.all_reduce(p.grad, op=SUM)` 和 `p.grad.div_(world_size)`。
6. 每进程以相同平均梯度更新优化器。

## 分片参数：FSDP 示意（Shard parameters (FSDP sketch)）

1. 展平各参数，填充至 `world_size` 的倍数。
2. 本地保留自己的分片，释放其余。
3. 前向传播前用 `dist.all_gather(...)` 在每进程重建完整张量。
4. 前向传播后释放完整张量。

## 失败模式（Failure modes）

- 跳过广播：各进程从不同初始化开始，静默分歧。
- 求和后忘记除法：梯度放大 world_size 倍，优化器步长过大。
- 检查点跨设备重命名：不原子，与第 47 课同一陷阱。
- 同一集合通信混用 CPU 与 CUDA 张量：后端不匹配，运行挂起。
