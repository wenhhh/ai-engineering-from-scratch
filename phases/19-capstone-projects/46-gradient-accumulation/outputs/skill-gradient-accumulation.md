---
name: gradient-accumulation
description: 缩放微批次损失，每窗口只更新一次优化器，以超过设备内存容量的有效批量训练。
version: 1.0.0
phase: 19
lesson: 46
tags: [training, batch-size, distributed, scaling]
---

## 何时使用（When to use）

有效批量（Effective batch）用于平滑梯度、匹配学习率调度。单次前向传播容纳不了所需批量时，采用此方案。

## 操作方案（Recipe）

1. 将 `micro_batch` 设为内存能容纳且能充分利用加速器的最大值。
2. 根据学习率调度选择 `effective_batch`。
3. 设置 `accum_steps = effective_batch // (micro_batch * world_size)`，断言可以整除。
4. 每微批次执行：`loss = criterion(model(x), y) / accum_steps; loss.backward()`。
5. 非末微批次进入 `model.no_sync()`，跳过 DDP 梯度全归约（All-reduce）。
6. 最后微批次后，运行一次 `optimizer.step()`。下个窗口前清空梯度。
7. 优化器状态和学习率调度都每有效批次推进一次。

## 日志（Logging）

每有效步骤输出一条小型 JSON 记录，包含 `samples_per_sec`、`median_step_ms`、`sync_calls`、`accum_steps`、`effective_batch`。否则成本权衡不可见。

## 失败模式（Failure modes）

- 忘记 `/ accum_steps` 缩放：梯度放大 N 倍。
- 窗口中途更新：参数漂移。
- 每微批次同步：受网络限制，却没有统计收益。
- 与混合精度反缩放混用：仅缩放尚未缩放的损失。
