# 加载未见过的基准用例

> 比较策略之前，先固定用例。

**Type:** Build
**Languages:** Go
**Stage:** 第 1 阶段，共 4 阶段
**Prerequisites:** 掌握 Go 结构体、切片和 JSON 解码。阅读[模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)，了解留出样本的作用。
**Time:** 约 2 小时

## 构建目标

导出链接助手记住的仍是旧的 60 分钟有效期，而你的运行手册规定为 15 分钟。将问题、预期答案和允许使用的证据分开存放，便于准确查看每种策略收到的内容。

`Cases(data, max)` 接收由 `Case{ID, Prompt, Expected, Evidence}` 构成的 JSON 数组。`Evidence` 是可选的字符串数组。拒绝未知字段、重复 ID、空白必填字段、尾随 JSON，以及超过 `max` 的用例数量。解码前先将输入文件限制在一 MiB 以内。

## 示例推演

从 `fixtures/orchard-cases.json` 中的第一条记录开始。其 ID 为 `orchard-ttl`，预期答案为 `15 minutes`，证据是运行手册中的一句话。解码后，状态中应有一条带类型的记录，以及一个包含 `orchard-ttl` 的已见 ID 集合。

追加第二条记录，使用相同 ID 和不同问题。返回 `ErrConflict`，不要静默替换第一条记录。当 `max=0` 时，连第一条记录都会超过声明的用例预算。空数组可以解析，但最终命令行程序会拒绝不含用例的基准。

```figure
pj-harness-bench-1
```

## 实现契约

```go
func Cases(data []byte, max int) ([]Case, error)
```

使用 `json.Decoder.DisallowUnknownFields`，然后再次解码并要求返回 `io.EOF`。分别执行记录计数和字段校验。拼错 `Expected` 键必须报错，避免空答案悄悄改变评分。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 1 --path /tmp/harness-bench-work --strict
```

在该工作区的 `stage1.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

ID 冲突与两个用例具有相同预期答案有何不同？尝试只改变 JSON 空白、不改任何字段：最终数据集凭据应保持一致。改变用例顺序必须改变凭据，因为有限预算会按顺序访问用例。

[Go 标准库参考](https://pkg.go.dev/encoding/json)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
