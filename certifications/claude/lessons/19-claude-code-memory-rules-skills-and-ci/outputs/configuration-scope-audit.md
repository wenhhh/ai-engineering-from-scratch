# 配置作用域审计：Python 服务（Configuration Scope Audit: Python Service）

## 指令层级（Instruction Hierarchy） <!-- ## Instruction Hierarchy -->

根指南包含用途、布局、标准命令、安全边界和链接。API、迁移和文档指导仍放在路径作用域。

## 路径规则夹具（Path Rule Fixtures） <!-- ## Path Rule Fixtures -->

API 允许（allow）夹具 `src/api/orders.py` 加载契约与授权指导，拒绝（deny）夹具 `docs/orders.md` 不加载。迁移夹具证明仅追加指导只在 `migrations/**` 下加载。

## 技能与命令（Skill and Command） <!-- ## Skill and Command -->

迁移评审技能打包可复用的证据收集流程。旧的显式 ADR 命令仍兼容，但新的多步骤流程使用技能，让辅助文件按需加载。两者都不授予授权。

## 技能包（Skill Package） <!-- ## Skill Package -->

`migration-review-skill/SKILL.md` 定义触发描述和窄范围的 `allowed-tools` 预批准。它通过 `references/review-checklist.md` 提供详细证据指导，并使用 `scripts/check_scope.py` 验证每个参数。这项预批准只在调用轮次内批准附带检查器，不限制所有其他工具，也不覆盖拒绝规则。

## 子智能体契约（Subagent Contract） <!-- ## Subagent Contract -->

`/agents` 注册迁移审计者，使用只读（read-only）工具、`maxTurns: 10`，并在请求编辑时采用 `isolation: worktree`。响应包含 `status`、`evidence`、`blockers` 和 `next_step`。达到轮次上限后停止并报告障碍，不宣称成功或扩大范围。

## 插件分发（Plugin Distribution） <!-- ## Plugin Distribution -->

项目技能和智能体提交在 `.claude/` 下。共享插件来源和默认值通过 `extraKnownMarketplaces` 与 `enabledPlugins` 放在 `.claude/settings.json`，并接受文件夹信任与评审。组织托管设置（managed settings）限制允许的市场和不可协商的权限。上线前记录版本与回滚方式。

## 钩子（Hooks） <!-- ## Hooks -->

确定性的（deterministic）写入前钩子（pre-write hook）阻止超出声明范围的路径。编辑后钩子只格式化改动文件。命令前钩子阻止打印密钥和破坏性操作。`PreToolUse` 的结构化决策采用 exit 0 并输出 JSON；采用 exit 2 的钩子向 stderr 写入阻止原因，不打印 JSON。`PermissionRequest` 钩子使用自己的嵌套决策结构。

## 无头 CI（Headless CI） <!-- ## Headless CI -->

CI 从全新检出（fresh checkout）开始，使用版本化项目配置、只读评审工具、有边界的运行时间、结构化（structured）发现和独立的确定性测试。它绝不继承交互会话。截至 2026-08-09 核实，托管 Code Review 是面向 Team 和 Enterprise 的研究预览版；它报告发现，不替代门禁。仓库自动化使用 `anthropics/claude-code-action@v1`，明确指定工作流权限与工具。

## 修复（Remediation） <!-- ## Remediation -->

将稳定发现 ID、原始证据、当前差异、测试和验收规则传给修复评审，排除本地偏好。
