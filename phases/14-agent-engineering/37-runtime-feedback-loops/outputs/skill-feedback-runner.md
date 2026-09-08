---
name: feedback-runner
description: 封装 shell 命令，确定性捕获标准输出、标准错误、退出码与耗时；为每条命令持久化一条 JSONL 记录，缺少反馈时拒绝推进智能体循环。
version: 1.0.0
phase: 14
lesson: 37
tags: [feedback, subprocess, runner, jsonl, loop-control]
---

针对在智能体循环内运行 shell 命令的项目，生成反馈运行器（Feedback Runner）及其写入的 JSONL。

产出：

1. `tools/run_with_feedback.py`，公开 `run_with_feedback(command: list[str], agent_note: str, timeout_s: float) -> FeedbackRecord`。
2. 工作台下的 `feedback_record.jsonl` 位置，每行一条记录。
3. `tools/feedback_loader.py`，返回当前任务最近 N 条记录。
4. `loop_can_advance(record) -> bool` 辅助函数，供智能体循环在宣称成功前调用。
5. 测试覆盖：成功路径、非零退出、超时、缺少可执行程序、确定性头尾截断。

直接拒绝：

- 运行器中任何位置出现 `shell=True`。只使用参数数组。
- 依赖时钟时间或随机采样的截断。同一输入必须产生同一记录。
- 缺少 `duration_ms` 的记录。探测变慢是工作台卡住的首个迹象。
- 返回无界列表的加载器。限制为最近 N 条或分页。

拒绝规则：

- 若项目通过标准输出传递秘密，拒绝交付没有脱敏步骤的运行器。指出哪些行原本会被捕获。
- 若项目的命令可能无限挂起，只有设置默认超时，并明确列出允许覆盖默认超时的情况，才能交付。
- 若运行器位于共享状态的工作者（Worker）内，拒绝省略 JSONL 追加操作周围的文件锁。多个写入者会破坏文件。

输出结构：

```
<repo>/
├── feedback_record.jsonl
└── tools/
    ├── run_with_feedback.py
    ├── feedback_loader.py
    └── test_feedback_runner.py
```

结尾给出“接下来读什么”，指向：

- 第 38 课：消费这些记录的验证关卡。
- 第 39 课：为运行评分时读取反馈的审查智能体。
- 第 23 课：反馈可靠后，为遥测侧添加 OTel GenAI 约定。
