# 执行框架评测台（Harness Bench）

使用相同且顺序固定的用例和模型配置，对比基线、错误重试与证据补充三种策略。统计实际调用次数，拒绝不可比较的凭据，并支持回放有限响应记录或调用已配置的 HTTP 模型。

需要 Go 1.22 或更新版本，仅使用标准库。共四个阶段，预计约八小时。你需要掌握结构体、切片、回调、错误处理和基本 JSON；各阶段的先修要求链接到相关课程。连接服务商之前，先运行离线示例。

## 动手构建

1. [加载未见过的基准用例](stages/01-load-unseen-benchmark-cases/docs/en.md)
2. [精确定义正确答案](stages/02-define-exactly-what-a-correct-answer-means/docs/en.md)
3. [在调用预算内运行执行框架](stages/03-run-a-harness-under-a-call-budget/docs/en.md)
4. [在相同分母下比较运行结果](stages/04-compare-runs-on-equal-denominators/docs/en.md)

```bash
python3 scripts/project_test.py harness-bench --init /tmp/harness-bench-work
python3 scripts/project_test.py harness-bench --stage 1 --path /tmp/harness-bench-work --strict
python3 scripts/project_test.py harness-bench --all --solution --strict
```

全新的起始代码会明确报错，直到你完成各阶段实现。所有适配器和测试夹具都会复制到学习者工作区。评分器调用工作区中的函数，包括命令行程序使用的函数。

## 运行自己的对比实验

```bash
cd projects/harness-bench/solution
go run . --cases fixtures/orchard-cases.json --recording fixtures/orchard-recording.json --budget 4 --out /tmp/orchard-runs.json
```

Orchard 原创场景展示三种不同的失败模式：过期时间知识陈旧、恢复操作暂时出错，以及价格信息缺失。同一份响应记录使基线策略调用三次得到 1/3，错误重试策略调用四次得到 2/3，证据策略调用三次得到 3/3。这些答案是为讲解策略行为而特意构造的，不能作为模型性能证据。

创建 JSON 数组，包含 `ID`、`Prompt`、`Expected`，以及可选的 `Evidence` 字符串数组。文件上限为一 MiB，最多包含 1000 个用例。评分忽略大小写和空白差异，同时保留标点、数字与单位。它不判断语义等价，也不对组合形式的 Unicode 重音字符做规范化。

响应记录声明 `kind`（`authored_fixture` 或 `recorded_provider`）、`model`、生成 `settings`，以及 `responses`：将精确提示词映射到有限的 `{answer, error?}` 数组。每种策略都从同一份记录的新游标开始。缺失的提示词或已耗尽的响应数组产生错误，并计入调用次数。证据请求在提示词后追加 `\n\nEvidence:\n`，再追加以换行连接的证据。示例记录包含这些精确请求。

```bash
go run . --cases fixtures/orchard-cases.json --endpoint http://127.0.0.1:11434/v1/chat/completions --model YOUR_LOCAL_MODEL --budget 4 --timeout 30s --out /tmp/live-runs.json
```

连接远程 HTTPS 服务时，提供完整的 chat-completions 端点和 `--key-env YOUR_PROVIDER_KEY_VARIABLE`。密钥必须预先存在于环境中，不会写入凭据。`--temperature` 默认为 0，`--max-tokens` 默认为 128。每个 HTTP 请求最长十秒，且受该策略的总期限约束；响应体上限为一 MiB。程序拒绝重定向及带查询参数的端点。外部服务商可能对每次尝试的请求收费。

## 阅读运行凭据

JSON 包含模型配置、数据集与配置的 SHA-256 摘要，以及每次调用的提示词、答案、错误标记和分数。数据集序列化会忽略 JSON 空白和键顺序，同时保留执行顺序。模型配置包含端点或响应记录摘要、模型标识及生成设置。排行榜要求凭据和调用预算一致，因此无法悄悄混入大小相同但内容不同的数据集。

`Attempted` 统计已尝试的用例；`Calls` 统计实际模型调用；`Errors` 统计最终失败的用例。尚未尝试的用例仍计入 `Total`。错误重试绝不查看预期答案。只有收到响应后才应用精确匹配评分。

库的入口为 `Cases`、`Correct`、`EvaluatePolicy` 和 `Leaderboard`。`Evaluate` 保留简单的基线回调 API，并使用旧版模型标签；需要配置证据的调用方应使用带明确凭据的 `EvaluatePolicy`。为兼容旧接口，手动构造且没有凭据的旧版结果仍仅根据计数器排名。凭据是未经签名的本地证据，不能证明远程模型身份，也不足以建立受控统计实验。在线策略按顺序运行；估计方差时应重复实验并轮换策略顺序。

## 完成证据

```bash
python3 scripts/project_test.py harness-bench --all --path /tmp/harness-bench-work --strict --report /tmp/harness-bench-result.json
```

参考实现通过测试不会授予学习者证书。本地报告是未经签名的自报证据。浏览器图表根据可编辑输入计算结果，用于演示算法，不会调用模型。

[Go HTTP 包](https://pkg.go.dev/net/http)、[Go 上下文](https://pkg.go.dev/context)和 [JSON 解码](https://pkg.go.dev/encoding/json)说明了本项目所用标准库的边界。所有示例场景与练习均为原创。

译注：提示词、响应记录、状态和命令行报告字段参与评分或程序集成，保留原值；命令行参数帮助已译。
