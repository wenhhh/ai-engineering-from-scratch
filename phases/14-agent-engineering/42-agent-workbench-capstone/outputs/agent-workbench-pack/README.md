# 智能体工作台包（Agent Workbench Pack）

供任何希望智能体可靠工作的仓库使用的即插即用工作台。

## 包含内容（What you get）

- `AGENTS.md`：通向包内其余内容的简短路由入口。
- `docs/`：规则、可靠性政策、交接协议、审查评分标准。
- `schemas/`：状态、看板和范围契约的 JSON 结构定义（JSON Schema）。
- `scripts/`：初始化、反馈运行器、验证关卡、交接生成器。
- `bin/install.sh`：幂等安装器。

## 快速开始（Quickstart）

```
bin/install.sh
$EDITOR task_board.json
python3 scripts/init_agent.py
```

## 版本管理（Versioning）

`VERSION` 文件就是契约。主版本升级需要状态迁移。
