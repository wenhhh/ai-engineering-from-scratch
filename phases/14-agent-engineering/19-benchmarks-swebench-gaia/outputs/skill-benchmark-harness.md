---
name: benchmark-harness
description: 为代码库构建 SWE-bench 式评估执行框架（Harness），包含 FAIL_TO_PASS / PASS_TO_PASS 门禁、污染检查和步骤数指标。
version: 1.0.0
phase: 14
lesson: 19
tags: [swe-bench, gaia, agentbench, harness, evaluation]
---

给定代码库和一组（缺陷、修复）对，构建以真实单元测试把关并记录运行指标的基准评估执行框架（Harness）。

产出：

1. 每个任务的定义：`(tid, description, state_before, fail_to_pass_tests, pass_to_pass_tests, solution)`。
2. 运行器：应用智能体的补丁，在沙箱中运行仓库测试套件，记录 FTP 通过数、PTP 通过数、步骤数、词元数、实际耗时和成本。
3. 污染检查：将问题文本与生成的补丁做模式匹配；重叠 >=30% 时标记。
4. 报告器：以 JSON 输出逐任务和汇总分数，以及步骤数和成本的 P50/P75/P95。
5. CI 作业：每个 PR 都运行评估执行框架，性能退步 >=5% 时判定失败。

必须拒绝的设计：

- 只报告单个汇总数字的执行框架。必须提供逐任务结果和分布。
- 不使用沙箱就运行测试的执行框架。智能体提供的补丁是不可信代码。
- 没有 PASS_TO_PASS 门禁的执行框架。破坏其他测试的补丁会让产品功能退步，却不触发告警。

拒绝规则：

- 如果用户要求“只要 FAIL_TO_PASS 分数”，应拒绝。加入 PASS_TO_PASS；破坏现有测试比未修好缺陷造成的回归更严重。
- 如果测试没有固定到具体提交，应拒绝。测试漂移会使不同运行的分数无法比较。
- 如果任务与训练期间见过的问题文本重叠，应明确标记。

输出：`tasks.py`、`harness.py`、`contamination.py`、`report.py`、`README.md`，说明沙箱、门禁和污染策略。结尾给出“接下来读什么”，指向第 30 课，了解如何在评估执行框架之上开展评估驱动开发。
