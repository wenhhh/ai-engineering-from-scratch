# 任务：审查智能体，分离构建者与评分者（Mission - Reviewer Agent: Separate Builder from Marker）

## 目标（Goal）
构建审查循环，以只读方式读取构建者产物，输出按五个维度评分的 `review_report.json`，总分 10 分，判定为 pass、soft_fail 或 hard_fail。

## 输入（Inputs）
- `ReviewerInputs`，打包前面课程的差异、状态、反馈与验证判定
- 评分维度：问题匹配度、范围纪律、假设、验证质量、交接就绪度

## 交付物（Deliverables）
- 每维一个评分函数（本课使用确定性桩评分）
- 包含五项分数、总分和判定的 `review_report.json` 写入器
- 两个演示案例：干净变更和“测试正确、问题错了”的变更

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 干净变更至少得 7 分，判定为 `pass`
- 问题错了的变更至少一个维度低于 5，判定转为 `hard_fail`

## 范围外（Out of scope）
- 真实 LLM 调用。本课为每维提供桩实现；技能稍后替换为模型。
- 编辑差异。审查者读取、评分、报告。修补属于构建者下一轮的工作。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-reviewer-agent.md`：提炼出的技能
