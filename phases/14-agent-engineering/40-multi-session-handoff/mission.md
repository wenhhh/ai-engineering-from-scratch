# 任务：多会话交接（Mission - Multi-Session Handoff）

## 目标（Goal）
会话结束时从工作台产物生成 `handoff.md` 与 `handoff.json`，使下一次会话第一分钟就能产出。两种形式包含相同七个字段；有分歧时以 JSON 为准。

## 输入（Inputs）
- 前面课程的 `agent_state.json`、`verification_report.json`、`review_report.json`、`feedback_record.jsonl`
- 七个字段：summary、changed_files、commands_run、failed_attempts、open_risks、next_action、verdict_pointer

## 交付物（Deliverables）
- 打包四类产物的 `WorkbenchSnapshot` 加载器
- `generate_handoff(snapshot) -> (markdown, payload)`
- 选取最后 K 条记录与所有非零退出记录的反馈筛选器
- 在脚本旁写入的 `handoff.md` 和 `handoff.json`

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 两个文件均包含全部七个字段，以及非空 `next_action`
- 相同输入重跑脚本会产生完全一致的交接包

## 范围外（Out of scope）
- 压缩策略（Codex compact 端点、Claude Code 五阶段）。交接关闭会话，压缩延长会话。
- PR 模板化。Markdown 可复用为 PR 正文，但本课到文件产出为止。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-handoff-generator.md`：提炼出的技能
