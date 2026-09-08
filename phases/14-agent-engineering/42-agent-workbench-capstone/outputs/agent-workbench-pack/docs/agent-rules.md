# 智能体规则（Agent Rules）

## startup/state-file-fresh
- category: startup
- check: state_file_fresh
智能体在任何工具调用前必须读取 agent_state.json。

## forbidden/no-out-of-scope-writes
- category: forbidden
- check: no_out_of_scope_writes
绝不编辑当前任务范围契约之外的文件。

## done/tests-pass
- category: definition_of_done
- check: tests_pass
只有每条验收命令的退出码都为 0，任务才算完成。

## uncertainty/open-question-note
- category: uncertainty
- check: opened_question_when_unsure
置信度低于阈值时，创建问题记录，而不是猜测。

## approval/new-dependency
- category: approval
- check: new_dependency_approved
添加运行时依赖需要人工明确批准。
