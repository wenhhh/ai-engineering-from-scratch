---
name: migration-agent
description: 构建仓库级代码迁移智能体（Code Migration Agent），结合确定性配方与智能体备用循环，通过 MigrationBench，并发布失败分类体系。
version: 1.0.0
phase: 19
lesson: 09
tags: [capstone, code-migration, openrewrite, libcst, migrationbench, agent, sandbox]
---

给定 Java 8 或 Python 2 仓库，生成迁移至 Java 17 或 Python 3.12 的分支，测试套件全部通过，覆盖率退化尽量小。在 MigrationBench 的 50 仓库子集上评估。

构建计划（Build Plan）：

1. 确定性处理（Deterministic Pass）：先由 OpenRewrite（Java）或 libcst（Python）运行机械重写。以清晰的差异保存为“recipe”提交。
2. Daytona 沙箱（Sandbox）：预装目标运行时；逐分支构建；源代码只读挂载。
3. 智能体循环（Agent Loop）：LangGraph 或 OpenAI Agents SDK，调用 Claude Opus 4.7 + GPT-5.4-Codex。工具：`run_build`、`read_file`、`edit_file`、`run_test`、`git_diff`。分类失败（依赖、语法、测试、构建工具），应用针对性修复并重跑。
4. 预算上限（Budget Caps）：30 分钟、8 美元、20 轮。任一超限即停止，归入 `budget_exhausted` 并附当前差异。
5. 测试与覆盖率关卡（Test + Coverage Gate）：先构建通过，再测试通过；覆盖率下降不得超过 2%。
6. 创建 PR，附配方提交、智能体提交和摘要评论。
7. 失败分类体系（Failure Taxonomy）：每仓库从 `{dep_upgrade_required, build_tool_drift, custom_annotation, test_flake, syntax_edge_case, budget_exhausted, coverage_regression}` 选择标签。
8. 在 MigrationBench 的 50 个仓库上运行；发布逐类别通过率、每仓库成本与覆盖率保留情况；对比纯确定性基线。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | MigrationBench 通过率 | 50 仓库子集的 pass@1 |
| 20 | 测试覆盖率保留 | 相比基础分支的平均覆盖率变化 |
| 20 | 每个已迁移仓库的成本 | 成功运行的平均每仓库美元成本 |
| 20 | 智能体／确定性工具集成 | OpenRewrite 与智能体处理的修复比例 |
| 15 | 失败分析报告 | 分类体系完整度，附代表性示例 |

直接判定不合格的情况（Hard Rejects）：

- 流水线跳过确定性处理。OpenRewrite 处理机械部分的 70–80%，比任何智能体更便宜、更可靠。
- 将覆盖率退化超过 2% 视为通过。
- PR 将机械修改和智能体编写的修改合并为一个提交。必须分开。
- 在相同 50 个仓库上没有匹配的纯确定性基线，却报告通过率。

拒绝规则（Refusal Rules）：

- 拒绝将迁移分支强制推送覆盖基础分支。始终使用新分支 + PR。
- 拒绝为沙箱中 CI 尚未通过的分支创建 PR。
- 没有明确修改许可时，拒绝在企业仓库上运行。

输出：一个仓库，包含双层迁移流水线、MigrationBench 50 仓库运行日志、失败分类仪表盘、匹配的纯确定性基线运行，以及说明三种最常见失败类别及分别能消除它们的配方改动的报告。
