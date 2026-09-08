---
name: skill-frame-sampler-auditor
description: 审计视频流水线帧采样器的索引差一错误、短片段处理和裁剪一致性
version: 1.0.0
phase: 4
lesson: 12
tags: [computer-vision, video, sampling, debugging]
---

# 帧采样器审计（Frame Sampler Auditor）

帧采样是视频流水线容易出错的环节。这里的错误会传播到所有下游指标。

## 使用时机（When to use）

- 编写新的视频数据加载器。
- 复现论文结果，但训练准确率低于报告值。
- 排查评估准确率在多次运行间不稳定的视频模型。

## 输入（Inputs）

- `sampler_code`：接收 (num_frames_total, T) 并返回 T 个索引的 Python 函数。
- `T`：目标片段长度。
- 可选测试用例：需要覆盖的 `num_frames_total` 值，例如 `[3, T-1, T, T+1, 30, 300, 3000]`。

## 检查项（Checks）

### 1. 短片段处理（Short clip handling）
输入 `num_frames_total < T`。所有返回索引必须位于 `[0, num_frames_total - 1]`。标准填充策略是在剩余位置重复最后一帧。

### 2. 边界索引（Boundary indices）
输入 `num_frames_total == T`。返回索引应严格为 `[0, 1, ..., T-1]`。

### 3. 均匀分布（Uniform distribution）
输入 `num_frames_total == 10 * T`。返回索引应单调递增，间距大致均匀。

### 4. 密集窗口边界（Dense window bounds）
对于密集采样，输入 `num_frames_total == 3 * T`。返回索引应构成连续窗口，绝不超过片段末尾。

### 5. 确定性（Determinism）
使用相同输入调用采样器两次；对于确定性采样器，也使用相同的随机数生成器（Random Number Generator，RNG）。索引应一致。

### 6. 裁剪一致性（Crop consistency）
如果流水线还为每帧返回空间裁剪，对同一片段使用同一种子运行采样器两次，确认所有帧使用相同裁剪框，即相同的 `(x, y, w, h)`。同一片段内逐帧采用不同裁剪会破坏时序连贯性，是一种典型的静默错误。可接受的变化是按*片段*应用增强，同时在片段内部保持一致。

## 报告（Report）

```
[sampler audit]
  name: <函数名>
  T:    <int>

[short-clip handling]
  passed | failed (<详情>)

[boundary]
  passed | failed

[uniform spacing]
  passed | failed (<间距标准差>)

[dense window]
  passed | failed (<详情>)

[determinism]
  passed | failed

[crop consistency]
  passed | failed (<各帧裁剪是否变化：yes/no>)

[verdict]
  ok | fix required
```

## 规则（Rules）

- 如果短片段处理返回越界索引，不得将采样器标记为“ok”。
- 密集采样器绝不能返回超出 `num_frames_total - 1` 的窗口。
- 如果采样器是随机的（密集采样），只能使用显式设置种子的 RNG 测试确定性。
- 对标准策略提出建议，但不要静默修复：用最后一帧填充、将窗口限制在末尾内、对半开区间取整。
