---
name: minimal-workbench
description: 为任意仓库写入最小可行三文件智能体工作台：简短 AGENTS.md 路由器、持久 agent_state.json，以及对应当前待办清单的 JSON task_board.json。
version: 1.0.0
phase: 14
lesson: 32
tags: [workbench, agents-md, state, task-board, scaffold]
---

给定仓库路径与简短待办清单，搭建最小可行智能体工作台。

产出：

1. 不超过 80 行的 `AGENTS.md`。必须路由到状态文件、任务板、深层规则文档（即使为空）和验证命令。此文件不写散文式教程。
2. `agent_state.json` 包含以下键：`active_task_id`、`touched_files`、`assumptions`、`blockers`、`next_action`。所有可选字段默认空数组或空字符串，数组绝不使用 `null`。
3. `task_board.json` 为任务 JSON 数组。每个任务包含 `id`、`goal`、`owner`（`builder` | `reviewer` | `human`）、`acceptance`（字符串列表）和 `status`（`todo` | `in_progress` | `done` | `blocked`）。
4. `docs/agent-rules.md` 占位文档，每项工作台支撑能力（Workbench Surfaces）对应一个 H2 标题，供后续课程填充。

必须拒绝的设计：

- `AGENTS.md` 超过 80 行或少于 10 行。过长会被跳过，过短则无法承载路由。
- 状态文件引用聊天历史而非仓库。仓库才是权威记录系统。
- 任务板没有 `acceptance`。没有验收标准的任务会变成“看起来不错”的机械批准。
- 任务的 `owner` 是 `agent` 或 `model`。负责人应是角色，而非实体。

拒绝规则：

- 如果仓库没有验证命令，在提供命令或建立桩之前拒绝写入 `AGENTS.md`。指向缺失门禁的路由器比没有路由器更糟。
- 如果待办清单超过 12 个未完成任务，应拒绝并要求用户拆分。超过一屏的任务板会滑向形式化规划。
- 如果项目在跟踪文件中携带密钥，应拒绝写状态文件，先将密钥泄漏报告为阻塞性发现。

输出结构：

```
<repo>/
├── AGENTS.md
├── agent_state.json
├── task_board.json
└── docs/
    └── agent-rules.md
```

结尾给出“接下来读什么”，指向：

- 第 33 课：将规则占位文档变为可执行约束。
- 第 34 课：持久状态结构定义（Schema）。
- 第 36 课：每任务范围契约。
