# 任务：综合项目，交付可复用智能体工作台包（Mission - Capstone: Ship a Reusable Agent Workbench Pack）

## 目标（Goal）
将前面十一课组装为版本化的 `outputs/agent-workbench-pack/` 目录，配备可幂等安装到任意目标仓库的安装器。

## 输入（Inputs）
- 第 32 至 40 课的结构定义（Schema）、脚本与文档
- 包布局：`AGENTS.md`、`docs/`、`schemas/`、`scripts/`、`bin/`、`README.md`、`VERSION`

## 交付物（Deliverables）
- 内容齐全、布局完整的 `outputs/agent-workbench-pack/`
- 没有 `--force` 时拒绝覆盖的 `bin/install.sh`（或 `bin/install.py`）
- `VERSION` 文件，以及说明纳入／排除内容的 `README.md`

## 验收（Acceptance）
- `python3 code/main.py` 以退出码 0 退出并打印包目录树
- 重跑组装器具有幂等性
- 对全新目标运行 `bin/install.sh` 后，留下可工作的工作台：状态、看板、规则、范围、初始化、运行器、关卡、审查者、交接全部到位

## 范围外（Out of scope）
- 各项目任务内容。任务属于目标仓库看板，不属于包。
- 厂商 SDK 调用。包按设计不依赖框架。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-workbench-pack.md`：提炼出的技能
