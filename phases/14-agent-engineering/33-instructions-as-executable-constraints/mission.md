# 任务：将智能体指令变成可执行约束（Mission - Agent Instructions as Executable Constraints）

## 目标（Goal）
将散文式指令变成五类机器可检查规则，输出审查者可评分的规则报告。

## 输入（Inputs）
- `docs/agent-rules.md`，每个标题一条规则，包含短标识、类别、描述和 `check` 字段
- 故意违反两条规则的演示智能体运行

## 交付物（Deliverables）
- 将 `agent-rules.md` 加载为数据类的解析器
- `rule_checker.py` 式函数，每个被引用的 `check` 对应一个
- `rule_report.json`，包含逐规则通过或失败和汇总严重性

## 验收（Acceptance）
- `python3 code/main.py` 以退出码 0 结束
- 输出打印解析后的规则集、运行追踪、逐规则通过或失败
- `rule_report.json` 捕获两次故意违规

## 范围之外（Out of scope）
- 将检查器接入 CI。本课止于写出报告。
- 框架护栏，如 OpenAI SDK、LangGraph 中断。规则集是它们实现的人类可读契约。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-rule-set-builder.md`：提取出的技能
