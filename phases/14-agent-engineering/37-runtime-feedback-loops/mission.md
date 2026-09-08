# 任务：运行时反馈循环（Mission - Runtime Feedback Loops）

## 目标（Goal）
构建 `run_with_feedback`，封装 `subprocess.run`，捕获标准输出、标准错误、退出码与耗时，确定性截断输出，并追加下一轮和验证关卡都会读取的 JSONL 记录。

## 输入（Inputs）
- 用于演练运行器的三条演示命令：一条成功、一条失败、一条缓慢
- 词元预算：确定性保留头尾，使用 `...truncated N lines...` 标记

## 交付物（Deliverables）
- 向 `feedback_record.jsonl` 写入的 `run_with_feedback(command, agent_note)`
- 将 JSONL 流式加载为 Python 列表的加载器
- 显示各命令最后一条记录的打印器

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 多次重跑时，`feedback_record.jsonl` 为每条命令累积一条记录
- 循环不能将 `exit_code: null` 的命令标记为成功

## 范围外（Out of scope）
- 遥测管道（OTel、Langfuse）。反馈供下一轮使用；遥测供操作者使用。
- 脱敏处理与轮转策略。本课练习涵盖这些内容。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-feedback-runner.md`：提炼出的技能
