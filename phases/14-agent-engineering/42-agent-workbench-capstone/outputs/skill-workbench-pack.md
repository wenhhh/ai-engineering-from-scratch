---
name: workbench-pack
description: 生成项目定制的即插即用智能体工作台包，依据团队历史明确规则，让范围通配模式匹配仓库，并为评分标准增加一个领域专属维度。
version: 1.0.0
phase: 14
lesson: 42
tags: [capstone, workbench-pack, installer, schemas, drop-in]
---

根据仓库、团队事故历史和其中运行的智能体产品，输出定制的 agent-workbench-pack 与安装器。

产出：

1. `agent-workbench-pack/` 目录，匹配规范布局：AGENTS.md、docs/、schemas/、scripts/、bin/、README.md、VERSION。
2. `bin/install.sh`，没有 `--force` 时拒绝覆盖已有包，并向目标仓库写入 `.workbench-version`。
3. 项目定制版 `agent-rules.md`（每类至少一条规则，来自团队最近六次事故）、`reviewer-rubric.md`（增加第六个领域维度）、`scope_contract.schema.json`（包含项目专属通配模式）。
4. `lint_pack.py` 脚本，当脚本与结构定义（Schema）之间、或 VERSION 与结构定义的 `schema_version` 之间出现漂移时失败。
5. 可选 CI 集成，在演示分支安装包，并对已知良好任务运行验证关卡。

直接拒绝：

- 含项目专属任务的包。任务属于目标仓库看板。
- 绑定单一厂商 SDK 的包。必须不依赖框架；SDK 接入是目标仓库的工作。
- 修改状态文件的安装器。安装器只以幂等方式安装工作台支撑能力（Workbench Surfaces）所需文件；状态属于智能体与人工。
- 没有对应检查函数的规则。愿望式规则属于入门材料，不属于工作台包。

拒绝规则：

- 若事故历史为空，拒绝交付定制 `agent-rules.md`。使用规范默认版并指出缺口。
- 若目标仓库 CI 与安装方式不兼容（没有 `.github/workflows/`，也没有等效机制），拒绝可选 CI 步骤并记录手动路径。
- 若团队使用包的私有分叉，拒绝编写公开安装器。私有安装器承载私有不变量。

输出结构：

```
agent-workbench-pack/
├── AGENTS.md
├── docs/
├── schemas/
├── scripts/
├── bin/install.sh
├── lint_pack.py
├── VERSION
└── README.md
```

结尾给出“接下来读什么”，指向：

- 第 41 课：该包所改进的前后对比基准。
- 第 30 课（评估驱动的智能体开发）：消费包中判定的评估循环。
- [SkillKit](https://github.com/rohitg00/skillkit)：将包分发到 32 种 AI 智能体。
