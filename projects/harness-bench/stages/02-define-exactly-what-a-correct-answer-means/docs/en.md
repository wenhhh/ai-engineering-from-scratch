# 精确定义正确答案

> 看到分数之前，先定义答案契约。

**Type:** Build
**Languages:** Go
**Stage:** 第 2 阶段，共 4 阶段
**Prerequisites:** 完成第 1 阶段并掌握字符串处理。评分器刻意采用精确答案契约。
**Time:** 约 2 小时

## 构建目标

实现 `Correct(actual, expected)`：先转小写、合并连续空白，再比较是否相等。空的预期答案永远不能通过。保留数字、单位和标点：15 分钟与 150 分钟的有效期会带来不同的实际后果。

当提示词要求返回时长、状态或明确表示无法作答时，这项指标适用。它不衡量自由形式长文的事实质量。

## 示例推演

对于 `actual = " 15   MINUTES\n"`，先拆分为 `["15", "MINUTES"]`，连接成 `15 MINUTES`，再转小写得到 `15 minutes`。规范化后的预期答案也是 `15 minutes`，因此该用例得一分。

用 `15 min` 对比 `15 minutes` 会失败。这是已声明的指标局限，不能据此判定模型错误。应用需要接受其他表达时，应通过另行制定的契约加入可接受变体；不要在查看获胜结果后放宽相等判断。

```figure
pj-harness-bench-2
```

## 实现契约

```go
func Correct(actual, expected string) bool
```

`strings.Fields` 处理连续空白。`strings.ToLower` 处理 Unicode 大小写，但不会合并规范等价的重音字符。应记录这一边界，不宣称实现了语义规范化或完整 Unicode 规范化。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 2 --path /tmp/harness-bench-work --strict
```

在该工作区的 `stage2.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

测试 `10 ms` 与 `100 ms`，以及 `ready!` 与 `ready`。根据此契约，哪些应当通过？先写下判断，再运行评分器。对于开放式答案，改用带来源证据的[报告评审器](../../../../report-judge/README.md)。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
