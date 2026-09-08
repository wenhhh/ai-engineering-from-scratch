---
name: skill-pipeline-budget-planner
description: 根据目标延迟与吞吐量，为每个流水线阶段分配时间预算，并标记哪个阶段最先超预算
version: 1.0.0
phase: 4
lesson: 16
tags: [vision, pipeline, performance, deployment]
---

# 流水线预算规划器（Pipeline Budget Planner）

将延迟与吞吐量目标转为逐阶段预算，让每位团队成员知道工程工作要达到什么数字。

## 使用时机（When to use）

- 构建新视觉服务之前，为各阶段设定预期。
- 首次基准测试之后，查看哪个阶段离预算最远。
- 服务级别协议（Service-Level Agreement，SLA）变化，需要重新协商预算时。

## 输入（Inputs）

- `p95_latency_target_ms`：每请求预算。
- `target_qps`：每副本每秒请求数（Queries per Second，QPS）。
- `stages`：由 `{ name: str, current_ms: float }` 组成的列表。

## 分配规则（Allocation rules）

没有当前测量结果时，七个标准阶段的默认分配如下：

| 阶段 | 占比 |
|-------|-------|
| 解码与预处理 | 15% |
| 检测器前向传播 | 55% |
| 检测后处理：非极大值抑制（Non-Maximum Suppression，NMS）、坐标限制 | 5% |
| 为分类器裁剪与缩放 | 5% |
| 分类器前向传播 | 15% |
| 模式校验 | <1% |
| 响应序列化 | 4% |

在受 GPU 限制的云端流水线中，检测器占比常升至 70%。在 CPU 上，预处理与分类器批处理占用更多时间。

## 报告（Report）

```
[budget plan]
  p95 target:  <毫秒>
  throughput:  <每副本 qps>

| stage               | target_ms | current_ms | headroom | gate |
|---------------------|-----------|------------|----------|------|
| decode+preprocess   | ...       | ...        | ...      | ok|X |
| detector            | ...       | ...        | ...      | ok|X |
| ...                 | ...       | ...        | ...      |      |

[bottleneck]
  stage:  <名称>
  miss:   <超预算毫秒数>
  lever:  <具体操作>

[levers]
  decode+preprocess:   Pillow-SIMD、libjpeg-turbo、通过 NVJPEG 在 GPU 上解码
  detector:            更小主干、更低输入分辨率、INT8、TensorRT
  postprocess:         GPU 端 NMS（torchvision.ops）、融合掩码
  crop+resize:         用 grid_sample 在 GPU 上裁剪，批量 interpolate
  classifier:          更小主干、INT8、预热缓存、批处理
  schema:              热路径跳过校验，仅在边界校验
  response:            orjson、流式 protobuf
```

## 规则（Rules）

- 不要建议从生产路径中删除模式校验；应建议将其移到边界。
- 预处理超预算时，始终先尝试 Pillow-SIMD 或 NVJPEG，再考虑换模型。
- 检测器超出目标 30% 以上时，应更换模型，而不是优化当前模型。
- current_ms > 1.1 * target_ms 时，将门禁标记为 `X`；处于预算 10% 范围内时，标记 `ok`。
