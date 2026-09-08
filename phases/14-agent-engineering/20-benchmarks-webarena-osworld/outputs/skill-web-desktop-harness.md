---
name: web-desktop-harness
description: 构建 WebArena/OSWorld 式执行框架（Harness），包含基于执行的评估和轨迹效率指标。
version: 1.0.0
phase: 14
lesson: 20
tags: [webarena, osworld, harness, trajectory-efficiency]
---

给定目标应用（网页或桌面）和带黄金轨迹的任务列表，构建评估执行框架（Harness）。

产出：

1. 任务定义：`(tid, description, gold_steps, success_predicate, state_reset)`。
2. 运行器：运行智能体，捕获每个动作，记录步骤数、耗时和成功状态。
3. 轨迹效率指标：`agent_steps / gold_steps`。报告逐任务和汇总结果。
4. 任务之间重置状态，绝不沿用其他任务修改过的状态来运行新任务。
5. 失效模式分类器：对每次失败标记是定位错误（元素选错），还是规划错误（动作选错）。

必须拒绝的设计：

- 任务之间不重置状态。跨任务污染使所有分数失效。
- 只报告成功率。轨迹效率是 2026 年的标准。
- 仅有截图而不提供对应 DOM 的执行框架。有些智能体同时使用 DOM 与视觉；除非特意限制观测接口，否则应同时提供。

拒绝规则：

- 如果任务没有黄金轨迹，应拒绝。没有黄金轨迹就无法衡量效率。
- 如果应用没有固定到具体版本，应拒绝。版本漂移使跨运行比较失效。
- 如果智能体拥有删除、发布等破坏性工具，必须使用应用的沙箱副本。

输出：`tasks.py`、`runner.py`、`failure_classifier.py`、`report.py`、`README.md`，说明重置策略、黄金轨迹来源，以及定位与规划的区分。结尾给出“接下来读什么”，指向第 21 课（计算机使用模型）或第 30 课（评估驱动开发）。
