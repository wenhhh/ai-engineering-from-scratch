# 运行时反馈循环（Runtime Feedback Loops）

> 看不到真实命令输出的智能体只能猜测。反馈运行器将标准输出、标准错误、退出码与耗时捕获为结构化记录，供下一轮读取。这样，智能体回应的是事实，而非自己对事实的预测。

**Type:** Build
**Languages:** Python（标准库）
**Prerequisites:** 阶段 14 · 32（最小工作台），阶段 14 · 35（初始化脚本）
**Time:** 约 50 分钟

## 学习目标（Learning Objectives）

- 区分运行时反馈与可观测性遥测。
- 构建封装 shell 命令并持久化结构化记录的反馈运行器。
- 确定性地截断大型输出，使循环保持在词元预算内。
- 缺少反馈时拒绝推进循环。

## 问题（The Problem）

智能体说“现在运行测试”，下一条消息说“全部测试通过”。实际却没有运行任何测试。它可能想象了输出，也可能运行了命令却没读取结果，或者读取后悄悄截掉了失败行。

反馈运行器（Feedback Runner）消除这一缺口。每条命令都经过运行器。每条记录包含命令、捕获的标准输出与标准错误、退出码、实际耗时，以及智能体的一行备注。智能体在下一轮读取记录，验证关卡在任务结束时读取这些记录。

## 概念（The Concept）

```mermaid
flowchart LR
  Agent[智能体循环] --> Runner[run_with_feedback.py]
  Runner --> Shell[subprocess]
  Shell --> Capture[stdout / stderr / exit / duration]
  Capture --> Record[feedback_record.jsonl]
  Record --> Agent
  Record --> Gate[验证关卡]
```

### 反馈记录包含什么（What goes in a feedback record）

| 字段 | 重要性 |
|-------|----------------|
| `command` | 确切的参数数组，避免 shell 展开带来的意外 |
| `stdout_tail` | 最后 N 行，确定性截断 |
| `stderr_tail` | 最后 N 行，与标准输出分开 |
| `exit_code` | 明确的成功信号 |
| `duration_ms` | 暴露缓慢探测与失控进程 |
| `started_at` | 用于回放的时间戳 |
| `agent_note` | 智能体记录预期结果的一行备注 |

### 截断是确定性的（Truncation is deterministic）

50 MB 的日志会让循环无法正常运转。运行器保留头尾，并用 `...truncated N lines...` 标记省略部分，确保同一输出始终产生同一记录。不使用采样；智能体需要查看的最后一条错误和最终摘要位于输出尾部。

### 反馈与遥测（Feedback versus telemetry）

遥测（Telemetry，阶段 14 · 23，OTel GenAI 约定）面向跨时间审查运行情况的人工操作者。反馈面向本次运行的下一轮。两者共享字段，但保存在不同文件中，采用不同保留策略。

### 缺少反馈时拒绝推进（Refuse to advance without feedback）

若运行器在捕获退出状态前出错，记录携带 `exit_code: null` 和 `error: <reason>`。退出状态为 `null` 时，智能体循环必须拒绝宣称成功。没有退出结果，就不能推进。

```figure
wb-feedback-loop
```

## 动手实现（Build It）

`code/main.py` 实现：

- `run_with_feedback(command, agent_note)`，封装 `subprocess.run`，捕获标准输出／标准错误／退出码／耗时，确定性截断，再追加到 `feedback_record.jsonl`。
- 将 JSONL 流式加载为 Python 列表的小型加载器。
- 运行三条命令（成功、失败、缓慢）并打印各命令最后一条记录的演示。

运行：

```
python3 code/main.py
```

输出：向 `feedback_record.jsonl` 追加三条反馈记录，并直接打印各命令的最后一条记录。多次重跑时查看文件尾部，可观察循环记录的累积。

## 实际生产中的模式（Production patterns in the wild）

三种模式能强化运行器，使其达到可交付程度。

**写入时脱敏（Redaction），而非读取时。** 任何涉及标准输出或标准错误的记录都可能泄露秘密。运行器在追加 JSONL 前执行脱敏：移除匹配 `^Bearer `、`password=`、`api[_-]?key=`、`AKIA[0-9A-Z]{16}`（AWS）、`xox[baprs]-`（Slack）的行。读取时才脱敏容易埋下隐患；攻击者接触的是磁盘文件。每季度根据生产运行时实际观察到的秘密格式审计脱敏模式。

**使用轮转策略（Rotation Policy），不要只用单一文件。** 将 `feedback_record.jsonl` 限为每文件 1 MB；溢出后轮转为 `.1`、`.2`，丢弃 `.5`。智能体循环只读取当前文件，因此运行时成本有界。CI 产物存储保存完整轮转集合。若不轮转，每次加载器调用都会受制于不断增长的文件。

**用父命令 ID 连接重试链（Retry Chains）。** 每条记录获得 `command_id`；重试携带指向上一次尝试的 `parent_command_id`。审查者的“失败尝试”列表（阶段 14 · 40）与验证关卡审计都沿链追踪。没有这条关联，重试看起来像独立的成功，审计就会隐藏失败历史。

## 实际应用（Use It）

生产模式：

- **Claude Code Bash 工具。** 该工具已捕获标准输出、标准错误、退出码和耗时。本课运行器是适用于任意智能体产品、不依赖框架的等效实现。
- **LangGraph 节点（Nodes）。** 用运行器封装任何 shell 节点，让记录持久保存在图状态之外。
- **CI 日志。** 将 JSONL 传入 CI 产物存储；审查者无需重跑会话即可回放任意命令。

运行器只是薄封装，但由于它拥有记录格式，能在每次框架迁移后继续使用。

## 交付成果（Ship It）

`outputs/skill-feedback-runner.md` 生成项目专属的 `run_with_feedback.py`，配置合适的截断预算、接入工作台的 JSONL 写入器，以及智能体每轮读取的加载器。

## 练习（Exercises）

1. 为每条记录添加 `cwd` 字段，区分在不同目录运行的同一命令。
2. 添加 `redaction` 步骤，移除匹配 `^Bearer ` 或 `password=` 的行。用固定样例记录测试。
3. 通过轮转到 `.1`、`.2` 文件，将 `feedback_record.jsonl` 总大小限制为 1 MB。说明轮转策略的依据。
4. 添加 `parent_command_id`，让重试链可见：哪个命令生成了下一个命令消费的输入。
5. 将 JSONL 传入小型终端用户界面（TUI），突出最近的非零退出结果。列出该界面要对审查有用就必须展示的八项关键功能。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 反馈记录（Feedback Record） | “运行日志” | 包含命令、输出、退出码、耗时的结构化 JSONL 条目 |
| 尾部截断（Tail Truncation） | “裁剪日志” | 确定性地捕获头尾，让记录适配词元预算 |
| 空值即拒绝（Refuse-on-null） | “缺数据就阻止” | `exit_code` 为 null 时循环不得推进 |
| 智能体备注（Agent Note） | “预期标签” | 智能体读取结果前写下的一行预测 |
| 遥测分离（Telemetry Split） | “两个日志文件” | 反馈供下一轮使用，遥测供操作者使用 |

## 延伸阅读（Further Reading）

- [OpenTelemetry GenAI 语义约定（Semantic Conventions）](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [Anthropic：长时间运行智能体的有效执行框架（Effective Harnesses for Long-running Agents）](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Guardrails AI x MLflow：确定性安全、个人身份信息与质量验证器（Deterministic Safety, PII, Quality Validators）](https://guardrailsai.com/blog/guardrails-mlflow) —— 将脱敏模式作为回归测试
- [Aport.io：2026 年最佳 AI 智能体护栏，行动前授权比较（Best AI Agent Guardrails 2026: Pre-Action Authorization Compared）](https://aport.io/blog/best-ai-agent-guardrails-2026-pre-action-authorization-compared/) —— 工具调用前后捕获
- [Andrii Furmanets：2026 年 AI 智能体，工具、记忆、评估与护栏的实用架构（AI Agents in 2026: Practical Architecture for Tools, Memory, Evals, Guardrails）](https://andriifurmanets.com/blogs/ai-agents-2026-practical-architecture-tools-memory-evals-guardrails) —— 可观测性支撑能力
- 阶段 14 · 23 —— 遥测侧的 OTel GenAI 约定
- 阶段 14 · 24 —— 智能体可观测性平台（Langfuse、Phoenix、Opik）
- 阶段 14 · 33 —— 要求宣称完成前必须有反馈的规则
- 阶段 14 · 38 —— 读取 JSONL 的验证关卡
