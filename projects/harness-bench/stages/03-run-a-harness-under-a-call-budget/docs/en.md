# 在调用预算内运行执行框架

> 将调用用于执行策略，避免预期答案泄漏。

**Type:** Build
**Languages:** Go
**Stage:** 第 3 阶段，共 4 阶段
**Prerequisites:** 完成第 1、2 阶段。加入在线模型前，理解 Go 回调和上下文取消机制。
**Time:** 约 2 小时

## 构建目标

实现 `EvaluatePolicy` 和 `PolicyPrompt`，保留 `Evaluate` 作为便捷的基线包装函数。三种策略接收相同的有序用例和模型配置。`baseline` 每个用例调用一次；`retry-errors` 允许在服务商出错后再调用一次；`evidence` 仅向提示词追加该用例声明的证据。

每次调用前先增加 `Calls`。`Attempted` 统计用例，`Errors` 统计最后一次调用失败的用例，`Total` 始终包含所有输入用例。在 `Trace` 中记录每次调用的提示词、答案、失败情况和正确性。绝不因答案未通过评分器而重试。

## 示例推演

恢复问题的第一条记录响应为错误，第二条为 `ready`。基线策略结束该用例时为 `Calls=1, Attempted=1, Errors=1`；重试策略则为 `Calls=2, Attempted=1, Errors=0, Correct=1`。

将预算减为一次。此时无法重试，用例仍为错误，状态为 `budget-exhausted`。后续用例仍保留在分母中。对于有效期问题，格式有效但错误的 `60 minutes` 答案绝不会触发依赖预期答案的重试。

```figure
pj-harness-bench-3
```

## 实现契约

```go
func PolicyPrompt(c Case, policy string) string
func EvaluatePolicy(ctx context.Context, name, policy string, cases []Case, model ContextModel, budget int, modelReceipt string) (Result, error)
func Evaluate(name string, cases []Case, model Model, budget int) (Result, error)
```

将每个用例的尝试次数与整次运行的调用计数分开。`ContextModel` 只接收模型提示词；`Expected` 留在评分侧。为每种策略创建新的记录适配器，避免先运行的策略消耗后运行策略的第一条响应。响应记录耗尽后返回错误，不得无限重复最后一条答案。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 3 --path /tmp/harness-bench-work --strict
```

在该工作区的 `stage3.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

在已完成的学习者工作区运行 `go run . --budget 2 --out /tmp/orchard-budget.json`。说明为什么为靠前用例花费一次重试，会使靠后的用例没有机会执行。上下文期限约束随附 HTTP 适配器；任意自定义回调也必须主动配合取消。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
