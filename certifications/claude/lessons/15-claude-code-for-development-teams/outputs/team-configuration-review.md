# 团队配置审查：支持工单路由器（Team Configuration Review: Support Router）

状态（Status）：已准备好接受团队审查

## 范围（Scope） <!-- ## Scope -->

负责人（Owner）：developer-platform。被审查任务依据拉取请求差异提出补丁，不能合并、部署、发表评论或读取无关仓库。

## 能力清单（Capability Inventory） <!-- ## Capability Inventory -->

读取仅限隔离检出目录，编辑仅限补丁工作区。任务可以运行 `python3 -m unittest`，没有网络或生产凭据。合并和任何外部沟通均由人工负责。

## 权限模式（Permission Modes） <!-- ## Permission Modes -->

交互工作从 `default` 开始。`acceptEdits` 可以预先批准文件编辑，但不授权推送、部署、网络调用或外部消息。无界面审查使用 `dontAsk` 和范围狭窄的允许规则；拒绝规则（deny rule）在每种普通模式下阻止凭据访问和发布。本任务不允许 `bypassPermissions`。

## 上下文恢复（Context Recovery） <!-- ## Context Recovery -->

操作人员使用 `/context` 检查占用，使用带明确焦点的 `/compact` 继续同一任务。`/clear` 以空对话上下文开始无关工作。`/rewind` 可以恢复已跟踪编辑或对话，但 Git 与权威外部状态仍是恢复记录。

## 自主性边界（Autonomous Boundary） <!-- ## Autonomous Boundary -->

只有具备可测量验收条件、对评估器可见的轮数预算，以及外部强制执行的轮数上限（turn bound），才允许使用 `/goal`。`/loop` 可以在会话打开期间轮询 CI，但不能自行创造新工作或扩大发布权限。两者都保留当前权限边界。

## 工作树归属（Worktree Ownership） <!-- ## Worktree Ownership -->

每项并行变更通过 `claude --worktree <owner-task>` 开始。每个分支与文件范围由一名具名负责人（owner）控制。工作树隔离防止编辑冲突，不隔离凭据或网络访问，其共享 Git 元数据仍受仓库策略保护。

## 钩子决定（Hook Decision） <!-- ## Hook Decision -->

`permission-request-decision.json` 是 `PermissionRequest` 事件的退出码 0 结构化响应，通过消息说明拒绝外部发布。使用退出码 2 的命令钩子改由 stderr 实施阻止，绝不将 JSON 输出与退出码 2 混用。

## 定时执行（Scheduled Execution） <!-- ## Scheduled Execution -->

会话内 `/loop` 处理短期轮询。云端 Routine 作为自主身份接受审查，只配置必要仓库和连接器。GitHub Actions 以最小工作流权限负责由仓库管理的 cron 任务。

## 审查自动化（Review Automation） <!-- ## Review Automation -->

截至 2026-08-09 核验，托管 Code Review 是面向 Team 和 Enterprise 套餐的研究预览。它可以报告行内问题，但不会批准或阻止拉取请求。仓库自动化使用 `anthropics/claude-code-action@v1`，并配置固定提示词、明确工具、轮数限制和受保护合并路径。

## 允许夹具（Allowed Fixture） <!-- ## Allowed Fixture -->

允许（allow）夹具读取 `src/router.py`、编辑对应测试、运行针对性测试集，并生成包含精确测试证据的补丁产物。`acceptEdits` 可以加快这些本地编辑，但不授予任何公开操作权限。

## 拒绝夹具（Denied Fixture） <!-- ## Denied Fixture -->

拒绝（deny）夹具尝试读取 `.env`、推送受保护分支，以及调用未批准服务器。操作前策略在执行之前阻止这三项操作。

## 版本证据（Version Evidence） <!-- ## Version Evidence -->

Claude Code 配置版本（version）`team-review-1.2` 与审查流程已在仓库中固定（pinned）。每次运行都在产物元数据中记录模型别名、插件版本和测试命令。

## 回滚（Rollback） <!-- ## Rollback -->

回滚（rollback）会禁用任务、丢弃其隔离补丁、恢复配置 `team-review-1.1`，并在重新启用前重跑允许和拒绝夹具。
