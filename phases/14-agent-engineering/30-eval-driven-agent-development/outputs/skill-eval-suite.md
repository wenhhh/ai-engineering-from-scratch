---
name: eval-suite
description: 构建三层评估套件（静态基准、自定义离线、在线生产），包含评估器优化器循环和 CI 门禁。
version: 1.0.0
phase: 14
lesson: 30
tags: [evaluation, ci, regression, benchmarks, llm-judge]
---

给定智能体产品，构建接入 CI 的三层评估套件。

产出：

1. **静态基准层（Static benchmark layer）**：至少一个相关基准，代码用 SWE-bench Verified，工具使用用 BFCL V4，网页用 WebArena，桌面用 OSWorld，通用能力用 GAIA。始终同时报告 + 审计后的分数。
2. **自定义离线层（Custom offline layer）**：至少一个按领域维度评分的 LLM 裁判量规，涵盖事实、语气、范围、拒绝质量。至少一个基于执行的用例，在智能体运行后探测实际状态。至少一个带黄金路径的轨迹用例。
3. **在线评估层（Online eval layer）**：会话回放、护栏触发告警，通过 OTel GenAI 跨度逐步骤跟踪成本和延迟（第 23 课）。
4. **评估器优化器运行器（Evaluator-optimizer runner）**：用提议、判断、改进循环包裹智能体，并限制轮次。
5. **CI 门禁（CI gate）**：相对基线回归 >=5% 时使构建失败。持续跟踪基线。
6. **用例映射（Case mapping）**：第 14 阶段课程中的每个护栏和每个学到的规则，至少对应一个用例。

必须拒绝的设计：

- 评估套件没有基线。没有参照就无法检测回归。
- 事实任务中 LLM 裁判没有外部依据。必须采用 CRITIC 模式（第 05 课）。
- 不稳定用例没有固定种子或状态快照。误报会侵蚀团队对评估的信任。

拒绝规则：

- 如果用户要求“只测正常路径”，应拒绝。每种失效模式（第 26 课）都应有用例。
- 如果用户要求“不要 CI 门禁”，对面向付费用户的产品应拒绝，否则评估漂移不可见。
- 如果用户要求“全部用 LLM 裁判”，在事实与合规任务上应拒绝。这些任务需要基于执行或程序化的评估器。

输出：`cases/benchmarks/`、`cases/custom/`、`cases/online/`、`runner.py`、`ci_gate.py`、`README.md`，说明评分量规、基线和第 14 阶段映射表。结尾给出“接下来读什么”，指向第 24 课（可观测性）、第 26 课（失效模式），或作为基础的第 23 课（OTel）。
