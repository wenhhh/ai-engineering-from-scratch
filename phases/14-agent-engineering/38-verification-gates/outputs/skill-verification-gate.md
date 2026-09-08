---
name: verification-gate
description: 生成确定性验证关卡，将范围、规则与反馈产物合并为每任务唯一的 verification_report.json，并接入 CI，在没有通过判定时拒绝合并。
version: 1.0.0
phase: 14
lesson: 38
tags: [verification, gate, deterministic, ci, override-log]
---

根据项目验收标准与现有工作台产物，生成验证关卡（Verification Gate）和例外放行审计日志（Override Audit Log）。

产出：

1. `tools/verify_agent.py`，公开 `verify(task_id, artifacts) -> VerdictReport`。纯函数、确定性、不调用 LLM。
2. `outputs/verification/<task_id>.json`，作为唯一权威判定。
3. `tools/override.py`，向 `outputs/verification/overrides.jsonl` 追加签署的放行条目（必须包含原因、用户 ID、时间戳、发现代码）。
4. CI 工作流，在 `passed: false` 时失败，并直接展示报告。
5. `docs/verification.md`，列出每项检查、严重度、来源产物及例外放行政策。

直接拒绝：

- 调用 LLM 的检查。关卡是确定性基础设施；LLM 判断属于审查者。
- 智能体无需签署条目即可使用的放行路径。只有人工可以放行。
- 遗漏所消费产物路径的验证报告。报告必须可审计。
- 工作流能悄悄降低严重度的阻断级发现。严重度在写入时固定，而非读取时。

拒绝规则：

- 若项目没有验收命令，在具备命令前拒绝交付关卡。什么也证明不了的关卡只是摆设。
- 若规则报告不存在，拒绝跳过规则检查；按默认拒绝（Fail Closed）处理。
- 若反馈日志不存在，拒绝跳过验收检查；日志缺失本身就是阻止项。
- 若例外放行条目未纳入版本控制，拒绝接通放行路径；不留记录的放行会使关卡失效。

输出结构：

```
<repo>/
├── tools/
│   ├── verify_agent.py
│   └── override.py
├── outputs/verification/
│   ├── overrides.jsonl
│   └── <task_id>.json
├── docs/verification.md
└── .github/workflows/verify.yml
```

结尾给出“接下来读什么”，指向：

- 第 39 课：在通过判定后接手的审查智能体。
- 第 40 课：把判定纳入交接包的交接生成器。
- 第 41 课：对贴近真实项目的示例应用运行关卡。
