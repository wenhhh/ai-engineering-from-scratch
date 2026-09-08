---
name: scope-contract
description: 为每个任务生成包含允许／禁止通配模式、验收标准与回滚计划的范围契约，并生成可接入 CI、对每份智能体差异运行的通配模式检查器。
version: 1.0.0
phase: 14
lesson: 36
tags: [scope, contract, globs, diff-check, ci]
---

根据任务描述与仓库布局，生成范围契约（Scope Contract）和能够检查差异的检查器。

产出：

1. 任务的 `scope_contract.json`，字段包括：`task_id`、`goal`、`allowed_files`（通配模式）、`forbidden_files`（通配模式）、`acceptance_criteria`、`rollback_plan`、`approvals_required`。
2. `tools/scope_check.py`，接收契约路径和变更文件列表，返回 `ScopeReport`；存在任何违规时以非零状态退出。
3. CI 步骤（`.github/workflows/scope-check.yml` 或等效实现），对合并差异运行检查器。
4. `outputs/scope/closed/<task_id>.json` 归档约定，让契约随变更历史一起交付。

直接拒绝：

- 缺少 `forbidden_files` 的契约。禁止事项是契约的一部分。
- 对代码目录列原始路径而非通配模式的契约。一次重构就可能使原始路径失效。
- 为空或只写“参见操作手册”的 `rollback_plan` 字段。必须写明具体步骤。
- 将审批列为“视情况而定”。审批边界必须能够逐项列举。

拒绝规则：

- 若任务描述没有限定仓库区域，拒绝仅凭描述编写 `allowed_files`。询问任务所在目录。
- 若仓库没有测试命令，在提供命令或桩实现前拒绝添加 `acceptance_criteria`。无法验证的契约只是愿望。
- 若智能体运行时无法执行审批边界（没有人工介入机制），交付前指出缺口；越界执行需审批的操作将成为主要失败模式。

输出结构：

```
<repo>/
├── scope_contract.json
├── outputs/scope/closed/
│   └── T-XXX.json
├── tools/
│   └── scope_check.py
└── .github/
    └── workflows/
        └── scope-check.yml
```

结尾给出“接下来读什么”，指向：

- 第 37 课：将已运行命令关联回契约的运行时反馈（Runtime Feedback）。
- 第 38 课：消费范围报告的验证关卡（Verification Gate）。
- 第 39 课：审计已关闭契约归档的审查智能体（Reviewer Agent）。
