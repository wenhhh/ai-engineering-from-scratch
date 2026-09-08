# 任务：验证关卡（Mission - Verification Gates）

## 目标（Goal）
将 `verify(task_id, artifacts)` 实现为针对范围报告、规则报告、反馈日志与差异的确定性纯函数，每次任务收尾输出一份 `verification_report.json`。

## 输入（Inputs）
- `scope_report.json`、`rule_report.json`、`feedback_record.jsonl` 和差异的桩加载器
- 检查表：验收已运行、验收零退出、范围无违规、无 `null` 退出状态、所有阻断级规则通过

## 交付物（Deliverables）
- 纯函数 `verify(task_id, artifacts) -> VerdictReport`
- 显示逐项检查结果与最终通过／失败的打印器
- 写入磁盘的三个演示场景：全部通过、范围蔓延、缺少验收

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 全部通过场景报告 `passed: true`；另外两个报告 `passed: false`
- 每个场景在 `outputs/verification/` 下写入独立的 `verification_report.json`

## 范围外（Out of scope）
- LLM 裁判（LLM-as-judge）逻辑。关卡保持确定性；定性判断属于第 39 课的审查者。
- 签署的例外放行审计日志。练习向这一方向扩展关卡。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-verification-gate.md`：提炼出的技能
