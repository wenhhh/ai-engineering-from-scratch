# 任务：最小智能体工作台（Mission - The Minimal Agent Workbench）

## 目标（Goal）
在新的 `workdir/` 中写入三文件最小工作台（路由器、状态、任务板），证明智能体单轮能够读取状态、领取任务、在范围内写入并持久化更新后的状态。

## 输入（Inputs）
- 课程代码旁的空 `workdir/` 目录
- 对三个文件的认识：`AGENTS.md`、`agent_state.json`、`task_board.json`

## 交付物（Deliverables）
- 创建三个文件并运行一轮的 `code/main.py`
- `workdir/AGENTS.md` 简短路由器，指向状态、任务板、验证命令
- `workdir/agent_state.json`，包含活跃任务 ID、改动文件、下一步动作
- `workdir/task_board.json`，包含小型待办清单和状态

## 验收（Acceptance）
- `python3 code/main.py` 首次和第二次运行均以退出码 0 结束
- 第二次从第一次停止处继续，而非从头开始
- 脚本打印的差异展示该轮修改的一个文件

## 范围之外（Out of scope）
- 范围契约、验证门禁、审查智能体。后续课程会在此基础上添加。
- 冗长单体 `AGENTS.md`。路由器刻意保持简短。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-minimal-workbench.md`：提取出的技能
