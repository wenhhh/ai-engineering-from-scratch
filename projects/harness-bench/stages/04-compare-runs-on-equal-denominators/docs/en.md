# 在相同分母下比较运行结果

> 排名之前，先证明各次运行可以比较。

**Type:** Build
**Languages:** Go
**Stage:** 第 4 阶段，共 4 阶段
**Prerequisites:** 完成第 1 至第 3 阶段。阅读[提示词回归测试器](../../../../prompt-regression-tester/README.md)，了解配对输出比较。
**Time:** 约 2 小时

## 构建目标

实现 `Leaderboard`，先校验结果再排序。要求总数相等，且执行框架名称唯一。带凭据的结果必须具有相同的有序数据集 SHA-256、模型配置 SHA-256 和调用预算。带凭据的对比中，不允许混入缺少凭据的结果。

`Fingerprint` 先序列化带类型的值，再计算哈希。数据集键顺序与空白差异被消除，但用例顺序、提示词、预期答案和证据仍属于凭据内容。模型凭据包括适配器、模型 ID、生成设置、在线端点，以及回放时完整响应记录的摘要。

## 示例推演

Orchard 原创记录使基线策略调用三次得到 `1/3`，重试策略调用四次得到 `2/3`，证据策略调用三次得到 `3/3`。这些响应为演示机制而特意构造，不用于对真实模型排名。

现在替换有效期问题，但仍保留三个用例。虽然分母仍同为 `3`，数据集摘要却不同，必须用 `ErrConflict` 拒绝比较。将 `max_tokens` 从 128 改为 256 后，即使模型名称不变，也必须拒绝混合比较。

```figure
pj-harness-bench-4
```

## 实现契约

```go
func Leaderboard(results []Result) (string, error)
```

先校验计数器，再对副本排序：满足 `Correct + Errors <= Attempted <= Total`；带凭据的运行还必须满足 `Attempted <= Calls <= CallBudget`。依次按正确答案更多、最终错误更少、名称排序。没有任何凭据的手动旧版结果保留原有仅检查计数器的 API；记录回放或在线比较应使用 `EvaluatePolicy`。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 4 --path /tmp/harness-bench-work --strict
```

在该工作区的 `stage4.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

在完成的工作区中运行 `go run . --cases fixtures/orchard-cases.json --recording fixtures/orchard-recording.json --out /tmp/orchard-runs.json`，分别查看每种策略的一条轨迹。HTTP 适配器接收完整 chat-completions 端点以及 `--model`、`--key-env`、`--temperature`、`--max-tokens`；命令见 README。估计方差需要重复在线运行，且这些未经签名的凭据不能证明远程模型始终不变。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
