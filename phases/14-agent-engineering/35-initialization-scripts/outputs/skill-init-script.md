---
name: init-script
description: 调研项目，输出确定性的 init_agent.py，包含五项探测和 CI 工作流，任何探测失败就拒绝启动智能体。
version: 1.0.0
phase: 14
lesson: 35
tags: [init, probes, ci, workbench, fail-loud]
---

给定仓库、智能体产品及其依赖范围，产出适用于该项目的初始化脚本及 CI 接入配置。

产出：

1. `tools/init_agent.py`，包含运行时版本、列出依赖、测试命令可解析性、必需环境变量、状态新鲜度探测。
2. 在脚本旁说明 `init_report.json` 的结构定义（Schema）。每项探测返回 `(name, status: pass|warn|fail, detail)`。
3. `.github/workflows/agent-init.yml` 或等价配置，运行脚本，任何失败级探测都阻止智能体作业。
4. 智能体运行时可在每个会话启动前调用的 `pre-task` 钩子脚本。
5. `docs/init.md` 文档，列出每项探测、严重性和修复失败的方法。

必须拒绝的设计：

- 无超时访问网络的探测。初始化必须快速且离线安全。
- 需要 LLM 调用的探测。初始化是确定性的基础工作。
- 包装器吞掉非零退出码。明确失败正是目的。
- 不具幂等性却修改状态的探测。连续两次报告除时间戳外必须相同。

拒绝规则：

- 如果项目没有测试命令，拒绝交付脚本，改将缺口记入工作台审计。
- 如果环境变量列表包含脚本会打印的密钥，应拒绝并强制脱敏。初始化报告绝不携带密钥。
- 如果试运行中探测超过三秒，交付前报告耗时发现。长探测使初始化沦为形式。

输出结构：

```
<repo>/
├── tools/
│   ├── init_agent.py
│   └── pre_task.sh
├── docs/
│   └── init.md
└── .github/
    └── workflows/
        └── agent-init.yml
```

结尾给出“接下来读什么”，指向：

- 第 36 课：使用初始化报告 `repo_paths` 的每任务范围契约。
- 第 37 课：消费已解析测试命令的运行时反馈循环。
- 第 38 课：依赖探测通过的验证门禁。
