# 任务：仓库记忆与持久状态（Mission - Repo Memory and Durable State）

## 目标（Goal）
为 `agent_state.json` 和 `task_board.json` 编写 JSON 结构定义（JSON Schema），构建可加载、校验、修改并原子写入的 `StateManager`，证明跨两轮的往返一致性。

## 输入（Inputs）
- 第 32 课的三文件工作台结构
- 仅标准库的验证器，覆盖 required、type、enum、pattern、items

## 交付物（Deliverables）
- 代码旁的 `agent_state.schema.json` 和 `task_board.schema.json`
- 采用临时文件加重命名写入的 `StateManager.load`、`StateManager.update`、`StateManager.commit`
- 跨两轮修改状态并正常重载的演示运行

## 验收（Acceptance）
- `python3 code/main.py` 退出码为 0
- 错误写入，如缺失必需字段、错误枚举，被拒绝而非持久化
- 运行后的 `workdir/agent_state.json` 通过结构定义（Schema）校验

## 范围之外（Out of scope）
- SQLite 或外部存储后端。本课聚焦本地文件。
- LangGraph 检查点存储器、Letta 记忆块。同样思想，不同存储，不在本课范围。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-state-schema.md`：提取出的技能
