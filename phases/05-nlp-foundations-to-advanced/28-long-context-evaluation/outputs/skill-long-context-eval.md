---
name: long-context-eval
description: 为给定模型和用例设计长上下文评估组合。
version: 1.0.0
phase: 5
lesson: 28
tags: [nlp, long-context, evaluation]
---

给定目标模型、目标上下文长度和用例，输出：

1. 测试（Tests）。NIAH 深度 × 长度网格、RULER 多跳、自定义领域任务。
2. 采样（Sampling）。每个长度都测试深度 0、0.25、0.5、0.75、1.0。
3. 指标（Metrics）。检索通过率、推理通过率、首词元延迟、每次查询成本。
4. 截止点（Cutoff）。有效检索长度（90% 通过）和有效推理长度（70% 通过），两者都报告。
5. 回归（Regression）。固定测试工具，每次模型升级重跑，展示差值。

拒绝仅凭模型卡信任上下文窗口。对任何多跳工作负载拒绝仅做 NIAH 评估。拒绝把供应商自报的长上下文分数当作独立证据。
