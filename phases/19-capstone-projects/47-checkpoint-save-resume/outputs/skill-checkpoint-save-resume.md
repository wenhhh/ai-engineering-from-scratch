---
name: checkpoint-save-resume
description: 原子分片检查点，完整捕获 RNG，让被终止的运行在轮中恢复并保持相同损失轨迹。
version: 1.0.0
phase: 19
lesson: 47
tags: [training, durability, resume, sharded-state]
---

## 何时使用（When to use）

任何超过集群实际运行时限的训练、必须经受节点重启的运行，或大到无法放进单个载荷的模型。

## 载荷结构（Payload shape）

```python
{
  "schema": "ckpt.v1",
  "model": model.state_dict(),
  "optimizer": opt.state_dict(),
  "scheduler": sched.state_dict(),
  "state": {"step": int, "epoch": int, "batch_in_epoch": int, "losses": [float, ...]},
  "rng": {"python": ..., "numpy": ..., "torch_cpu": ..., "torch_cuda": ...},
  "wall_saved_at": time.time(),
}
```

## 原子保存（Atomic save）

1. 将载荷写入与目标同目录的唯一临时文件。
2. 用 `os.replace(tmp, target)` 原子替换。
3. 绝不直接写目标名。

## 分片布局（Sharded layout）

- 每分片一个 `model.shard-NNN.pt`，按键轮询或按参数组拆分。
- `meta.pt` 保存优化器、调度器、训练状态、RNG 和分片清单。
- `index.json` 保存每分片及 `meta.pt` 的 `sha256`。
- 加载器在合并前校验每个哈希值，并拒绝位于检查点目录之外的分片路径。
- 使用 `torch.load(path, map_location="cpu", weights_only=True)` 加载每个文件。将 RNG 状态保存为普通列表，以便通过仅权重加载器恢复。

## 轮中恢复（Mid-epoch resume）

- 在 `step` 旁保存 `(epoch, batch_in_epoch)`。
- 恢复轮次的首批数据前恢复 RNG 状态。
- 让生成器快进越过已处理批次。

## 失败模式（Failure modes）

- 跨设备重命名：不原子，丢失之前文件。临时文件应放同目录。
- 忘记 RNG：恢复损失偏离基线。运行演示断言。
- 忘记优化器状态：下一步突然偏移，同样导致差值暴增。
- 清理错误检查点：保留最近 K 个及最佳检查点。
- 使用 `weights_only=False` 加载：`.pt` 文件采用 pickle 格式，不可信检查点会在加载时执行代码。
