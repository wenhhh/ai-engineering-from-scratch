---
name: rule-set-builder
description: 访谈项目负责人，将现有散文式指令归入五种操作类别，输出版本化 agent-rules.md 与 Python 检查器桩。
version: 1.0.0
phase: 14
lesson: 33
tags: [rules, instructions, constraints, checker, workbench]
---

给定仓库和现有散文式指令（`AGENTS.md`、`CONTRIBUTING.md`、入职文档），产出工作台可执行的五类规则集。

五类分别为：

1. `startup`：工作开始前必须满足什么。
2. `forbidden`：什么绝不能发生。
3. `definition_of_done`：什么证明任务完成。
4. `uncertainty`：智能体不确定时怎么办。
5. `approval`：什么需要人工签字批准。

产出：

1. `docs/agent-rules.md`，每条规则一个 `##` 标题。每条携带 `category`、`check` 和一行描述。
2. `tools/rule_checker.py`，包含 `RuleChecker` 类，每个 `check` 对应一个方法。每个方法接收 `TurnTrace` 数据类并返回 `bool`。
3. `tools/rule_report.py` 运行器，加载规则，对追踪运行检查器，输出 `rule_report.json`。
4. 迁移笔记文件，记录哪些文字行变成哪些规则，哪些作为愿望被删除，以及原因。

必须拒绝的设计：

- 规则没有 `check` 字段。纯愿望规则属于入职文档，不属于工作台规则集。
- 单条“要小心”规则。指定类别和检查，否则删除。
- 检查需要 LLM 调用。规则检查必须确定且便宜，才能每轮运行。
- 规则文件超过 200 行。按类别拆成 `agent-rules.{startup,forbidden,done,uncertainty,approval}.md`，从父索引路由。

拒绝规则：

- 如果智能体产品不能提供 `TurnTrace`，即未插桩，在至少记录 `read_state_file`、`edited_files`、`tests_exit_code` 之前，拒绝接入检查器。
- 如果现有指令大部分只是愿望（>50%），在输出规则前报告该发现。规则集会显得薄，这是正确结果。
- 如果规则因单次历史事故而增加，附上事故 ID，让未来审查决定是否仍有必要。

输出结构：

```
<repo>/
├── docs/
│   └── agent-rules.md
├── tools/
│   ├── rule_checker.py
│   └── rule_report.py
└── docs/migration-notes.md
```

结尾给出“接下来读什么”，指向：

- 第 36 课：扩展禁止类别的每任务范围契约。
- 第 38 课：消费规则报告的验证门禁。
- 第 39 课：为规则遵循评分的审查智能体。
