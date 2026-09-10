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

## 教学实现边界

此包是结构练习，不是已完成安全验收的生产工作台。安装器仅以 AGENTS.md 的存在作为
覆盖保护条件；复制 docs、schemas、scripts 时仍可能覆盖同名文件。请先在临时仓库
或完整备份中试用，不要直接运行于含未提交改动的工作区。--force 会允许覆盖 AGENTS.md。
安装器不会生成 agent_state.json 或 task_board.json，须另行准备。

打包的验证器在输入文件缺失时使用空对象/列表，可能在证据缺失时仍报告 passed=true；
它没有第 38 课的覆盖率、严格模式和签名例外。反馈脚本也没有第 37 课的脱敏、轮转及命令链。
文档中的完整可靠性与交接政策是设计目标，不代表这些简化脚本已经全部强制执行。
