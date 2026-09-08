---
name: migration-review
description: 在变更新增或修改 migrations/ 下路径时（when），评审数据库迁移（migration）文件。合并前使用，以收集正向执行、回滚、锁定和数据安全证据。
allowed-tools: Read Grep Glob Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/check_scope.py *)
---

# 迁移评审（Migration Review）

只评审 `$ARGUMENTS` 指定的迁移文件，以及验证兼容性所需的代码。本技能不授权应用迁移。

1. 运行 `python3 ${CLAUDE_SKILL_DIR}/scripts/check_scope.py $ARGUMENTS`。
2. 检查器拒绝任何超出 `migrations/` 的路径时，立即停止。
3. 阅读 [references/review-checklist.md](references/review-checklist.md)。
4. 检查每个获准文件及其模式假设。
5. 报告正向行为、回滚限制、锁风险、数据量风险、验证证据及未解决的阻塞项。

返回以下标题：`Scope`、`Evidence`、`Risks`、`Rollback`、`Blockers` 和 `Decision`，分别表示范围、证据、风险、回滚、阻塞项和决策。只要缺少必需证据，就使用 `Decision: blocked`。

附带的检查器为 [scripts/check_scope.py](scripts/check_scope.py)。`allowed-tools` 条目仅在调用轮次内预先批准该命令；它不会移除其他工具，也不会替代项目权限规则。
