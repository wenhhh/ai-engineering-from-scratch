---
name: state-schema
description: 为智能体状态和任务板生成项目特定 JSON 结构定义（JSON Schema）、带原子写入的 Python StateManager 及迁移骨架，防止结构定义升级损坏工作台。
version: 1.0.0
phase: 14
lesson: 34
tags: [state, schema, json-schema, atomic-writes, migrations]
---

给定仓库及其中运行的智能体产品，为工作台先定义结构，再产出符合结构定义（Schema）的状态文件。

产出：

1. `schemas/agent_state.schema.json`，涵盖必需键、允许状态值、数组与 null 规范，以及整数 `schema_version`。
2. `schemas/task_board.schema.json`，涵盖任务 ID 模式、允许负责人、允许状态和验收数组。
3. `tools/state_manager.py`，暴露 `load`、`commit`、`update`，采用临时文件加重命名原子写入。
4. `tools/migrate_state.py`，为下次结构定义升级搭建骨架，遇到未知版本明确失败。
5. `agent_state.json` 与 `task_board.json`，以 `schema_version: 1` 和新的待办清单初始化。

必须拒绝的设计：

- 结构定义（Schema）没有 `schema_version`。迁移不是可选项。
- 应为数组的位置允许 `null`。`null` 是伪装成数据的写入缺陷。
- 写入器使用普通 `open(path, "w")`。只允许原子写入，部分文件会损坏事实来源。
- 状态存储词元、原始聊天记录或 PII。状态用于与仓库相关的事实。

拒绝规则：

- 如果仓库没有版本控制，拒绝交付状态文件。原子写入加 git diff 构成持久性方案。
- 如果项目没有至少一个验收命令验证 `done` 转移，拒绝 `status: done` 枚举值。没有验收检查就添加 `done` 只是形式。
- 如果项目打算无锁跨进程共享状态，交付前报告此发现；原子重命名必要但不充分。

输出结构：

```
<repo>/
├── agent_state.json
├── task_board.json
├── schemas/
│   ├── agent_state.schema.json
│   └── task_board.schema.json
└── tools/
    ├── state_manager.py
    └── migrate_state.py
```

结尾给出“接下来读什么”，指向：

- 第 35 课：启动时调用管理器的初始化脚本。
- 第 38 课：读取状态以评判完成情况的验证门禁。
- 第 40 课：使用同一结构定义（Schema）的交接生成器。
