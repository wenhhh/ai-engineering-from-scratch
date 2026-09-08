# 交接协议（Handoff Protocol）

每次会话结束都必须提供包含以下内容的交接包：

- summary：摘要
- changed_files：变更文件
- commands_run：已运行命令
- failed_attempts：失败尝试
- open_risks：未解决风险（严重度与详情）
- next_action：下一步动作（一个具体步骤）
- verdict_pointer：判定指针（验证与审查报告的路径）

交接包同时提供 handoff.md（供人工）和 handoff.json（供下一个智能体）。
字段缺失会中止会话结束钩子。
