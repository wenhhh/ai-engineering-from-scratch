# 任务：智能体工作台，有能力的模型为什么仍然失败（Mission - Agent Workbench: Why Capable Models Still Fail）

## 目标（Goal）
对同一小型仓库任务运行两次，一次仅用提示词，一次接入七项工作台支撑能力（Workbench Surfaces）；输出失效模式报告，将每项缺失的支撑能力映射到所致症状。

## 输入（Inputs）
- 桩智能体和待校验的微型 FastAPI 式处理器
- 七项支撑能力列表：指令、状态、范围、反馈、验证、审查、交接

## 交付物（Deliverables）
- 连续运行两条流水线的 `code/main.py`
- 汇总仅提示词运行的 `failure_modes.json`
- 用一行文字说明工作台运行的判定结果

## 验收（Acceptance）
- `python3 code/main.py` 以退出码 0 结束
- 输出展示两次运行的并排日志
- `failure_modes.json` 列出每项缺失的支撑能力及对应症状

## 范围之外（Out of scope）
- 调用真实模型。桩刻意采用规则实现。
- 深入构建某一项支撑能力，这是接下来十一课的内容。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-workbench-audit.md`：提取出的技能
