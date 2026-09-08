# 任务：智能体初始化脚本（Mission - Initialization Scripts for Agents）

## 目标（Goal）
构建 `init_agent.py`，探测运行时、依赖、测试命令、环境变量和状态新鲜度，写入 `init_report.json`；阻断级别的探测失败时明确报错并停止会话。

## 输入（Inputs）
- 仓库包含 `requirements.txt` 或等价文件、测试命令，以及第 34 课工作台状态文件
- 本课探测表：运行时、依赖、路径、环境、状态新鲜度、最后已知正常提交

## 交付物（Deliverables）
- `init_agent.py`，每项探测一个函数，返回 `(name, status, detail)`
- `init_report.json`，包含完整探测集和时间戳
- 任意阻断级别的探测失败时，以非零退出码退出

## 验收（Acceptance）
- `python3 code/main.py` 在正常路径下的退出码为 0
- 连续运行两次，除时间戳外不产生变化
- 模拟缺失环境变量的探测出现在报告中，并改变退出码

## 范围之外（Out of scope）
- 自动安装缺失依赖。脚本停止并报告，由人修复。
- 探测调用 LLM。探测保持确定性的基础工作。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-init-script.md`：提取出的技能
