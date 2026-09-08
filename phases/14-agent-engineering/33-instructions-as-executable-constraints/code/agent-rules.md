# 智能体规则（Agent Rules）

## startup/state-file-fresh
- category: startup
- check: state_file_fresh
智能体必须在任何工具调用前读取 agent_state.json。

## forbidden/no-release-script-edits
- category: forbidden
- check: no_release_script_edits
除已批准的发布任务外，绝不修改 scripts/release.sh。

## done/tests-pass
- category: definition_of_done
- check: tests_pass
只有验收命令以退出码 0 结束，任务才算完成。

## uncertainty/open-question-note
- category: uncertainty
- check: opened_question_when_unsure
置信度低于阈值时，写问题笔记而不是猜测。

## approval/new-dependency
- category: approval
- check: new_dependency_approved
增加运行时依赖需要明确的人工批准。
