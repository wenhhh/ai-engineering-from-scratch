---
name: permission-mode-picker
description: 开始运行前，将 Claude Code 任务匹配到正确权限模式、预算上限与所需隔离。
version: 1.0.0
phase: 15
lesson: 10
tags: [claude-code, permission-modes, auto-mode, budgets, isolation]
---

给定拟议 Claude Code 任务，选择权限模式（Permission mode）、设置预算，并在允许智能体开始前规定最低隔离要求。

请输出：

1. **任务特征（Task profile）。** 一句话说明任务做什么，一句话说明出错后的影响范围。
2. **模式建议（Mode recommendation）。** 从 `plan`、`default`、`acceptEdits`、`auto`、`dontAsk`、`bypassPermissions` 中选择，以一句涉及影响范围的话解释。
3. **预算数字（Budget numbers）。** 为 `max_turns`、`max_budget_usd` 和每工具上限给出具体值。超过一小时的无人值守运行，美元上限须不高于你愿为无法回滚的人类失误支付的费用。
4. **隔离要求（Isolation requirements）。** 明确文件系统范围（仅项目目录、临时工作目录、临时容器）、网络策略（禁止出站访问、仅允许列表、完全开放）及可访问的凭据（无、限定范围的令牌、权限宽泛的令牌）。使用 `bypassPermissions` 或 `dontAsk` 时，必须在未挂载生产凭据的临时容器内运行。
5. **轨迹审计计划（Trajectory audit plan）。** 人类如何在运行后审查轨迹？`auto`、`dontAsk` 和任何超过 30 分钟时程的运行都必须有计划。

必须拒绝：
- 在有未提交改动的仓库上使用 `bypassPermissions`。
- 没有预算上限的 `auto`。
- 环境有宽权限凭据（AWS、GCP、带 repo 范围的 GitHub PAT）时，使用比 `acceptEdits` 更高的模式。
- 无人值守超过一小时却未安排轨迹审计。
- 声称仅靠 Auto Mode 分类器足以应对新任务分布。

拒绝规则：
- 若用户无法说明失败影响范围，拒绝，要求开始前明确写出最坏情况。
- 若用户要求在可访问生产数据库凭据的工作区使用 `auto`，拒绝，要求先使用限定范围凭据或临时容器。
- 若预算上限超过用户愿在糟糕运行中损失的金额，拒绝并要求降低上限。

输出格式：

返回一页运行卡，包含：
- **任务摘要（Task summary）**：一句话
- **影响范围（Blast radius）**：一句话，最坏情况
- **模式（Mode）**：明确给出
- **预算（Budgets）**：`max_turns`、`max_budget_usd`、每工具上限
- **隔离（Isolation）**：文件系统范围、网络策略、可访问的凭据
- **审计计划（Audit plan）**：谁在何时按何种标准审查轨迹
