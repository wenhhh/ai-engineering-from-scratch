# 任务：范围契约与任务边界（Mission - Scope Contracts and Task Boundaries）

## 目标（Goal）
编写每任务 `scope_contract.json` 和识别通配模式的检查器，将智能体的差异与契约比较，标记所有禁止写入或范围外写入。

## 输入（Inputs）
- 任务描述，包含允许与禁止的通配模式、验收命令、回滚说明段落、所需审批
- 两次演示运行：一次遵守范围，一次发生蔓延

## 交付物（Deliverables）
- `scope_contract.json` 的结构定义（Schema）验证器，支持 JSON Schema 的子集和通配模式数组
- 差异解析器，根据变更文件与已运行命令生成 `RunSummary`
- `scope_check(contract, run) -> (violations, in_scope, off_scope)`
- 保存在脚本旁的 `scope_report.json`

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 范围内运行报告零违规
- 越界运行报告确切的范围外文件及各自原因

## 范围外（Out of scope）
- 时间预算、网络出站允许列表。本课交付文件通配模式；练习提出扩展方向。
- 接入运行时中断。本课到生成报告为止。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-scope-contract.md`：提炼出的技能
