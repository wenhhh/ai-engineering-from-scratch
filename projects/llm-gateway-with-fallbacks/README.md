# 支持故障切换的 LLM 网关（LLM Gateway With Fallbacks）

构建本地非流式 HTTP 代理，实现服务商故障切换、各服务商独立的环境变量凭据、响应大小限制，以及统一的总期限。通过回环服务器验证完整的 HTTP 通信链路。

需要 Go 1.22 或更新版本，仅使用标准库。共四个阶段，预计约八小时。你需要掌握结构体、切片、回调、错误处理和基本 JSON；各阶段的先修要求链接到相关课程。连接服务商之前，先运行离线示例。

## 动手构建

1. [校验服务商端点](stages/01-validate-provider-endpoints/docs/en.md)
2. [对故障分类，避免无差别重试](stages/02-classify-failures-without-retrying-everything/docs/en.md)
3. [发送一次有界 HTTP 请求](stages/03-send-one-bounded-http-request/docs/en.md)
4. [在总尝试预算内路由](stages/04-route-with-a-total-attempt-budget/docs/en.md)

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 1 --path /tmp/llm-gateway-with-fallbacks-work --strict
python3 scripts/project_test.py llm-gateway-with-fallbacks --all --solution --strict
```

全新的起始代码会明确报错，直到你完成各阶段实现。所有适配器和测试夹具都会复制到学习者工作区。评分器调用工作区中的函数，包括命令行程序使用的函数。

## 运行实际 HTTP 演示

```bash
cd projects/llm-gateway-with-fallbacks/solution
go run .
```

演示启动三个临时回环 HTTP 服务器：返回 503 的主服务商、返回 chat-completions 响应的备用服务商，以及网关。一个实际请求经过代理和两个服务商，打印 `HTTP 200`、`ATTEMPTS 2`、`PROVIDER backup`，然后关闭所有服务器。服务商答案采用人工编写的夹具；HTTP 通信链路实际执行。

## 连接自己的服务商

将 `fixtures/providers.example.json` 复制为 `/tmp/providers.json`，替换其中的 URL 和模型标识。每个服务商具有唯一的 `name`、`url`、可选的 `model` 覆盖值，以及可选的 `key_env`，用于指向已存在的环境变量。本地服务不需要密钥时，省略 `key_env`。示例使用占位模型名称，不假定这些模型已经安装。

```bash
go run . --config /tmp/providers.json --request fixtures/request.json
go run . --config /tmp/providers.json --listen 127.0.0.1:8088
```

第一条命令发送请求文件并打印 JSON 路由轨迹；第二条命令启动本地代理，直到你将其停止。在另一个终端运行：

```bash
curl --fail-with-body http://127.0.0.1:8088/v1/chat/completions -H 'Content-Type: application/json' --data-binary @fixtures/request.json
```

现有客户端可将 `http://127.0.0.1:8088/v1` 设为基础 URL，并关闭流式输出。调用方的 Authorization 请求头会被丢弃；每个服务商只接收为其单独配置的环境变量凭据。程序不复制任何调用方请求头。缺少已配置的密钥时，在第一次上游调用前失败。查询字符串、URL 内嵌凭据和重定向均被拒绝。

## 契约与限制

`max_attempts` 为 1 至 16，每个服务商最多访问一次。`max_response_bytes` 为 1 字节至 16 MiB。`timeout_ms` 为 1 至 5000，约束整条路由，包括所有故障切换尝试。传入请求 JSON 上限为一 MiB，且必须是非流式对象。单独调用 `Attempt` 或 `Route` 时，若调用方没有设置期限，均添加五秒期限；调用方更早的期限仍优先。自定义传输必须遵守 Go 上下文取消机制。

2xx 表示完成；429 和 5xx 允许切换到备用服务商；其他 HTTP 状态停止路由。响应超限也会停止。传输错误可能允许切换，但取消必须立即停止。本策略不会重复调用同一服务商，不等待 `Retry-After`，也不保证已取消的生成不被计费。

成功的代理响应保留上游状态和正文，并添加 `X-Gateway-Attempts` 与 `X-Gateway-Provider`。失败时返回本地 502；取消时返回 504，不回显上游错误正文。命令行凭据包含端点、状态、耗时和故障类别。库接口为 `Endpoints`、`ClassifyStatus`、`Attempt`、`Route`、`RouteConfigured` 和 `GatewayHandler`。

监听服务器只绑定回环地址，不提供客户端认证、流式输出、共享限流、持久化轨迹存储或高可用保证。将其作为本地集成组件使用。实际回环测试覆盖服务商认证隔离、总期限、重定向、请求与响应上限，以及模型改写。评分不需要任何外部账户。

## 完成证据

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --all --path /tmp/llm-gateway-with-fallbacks-work --strict --report /tmp/llm-gateway-with-fallbacks-result.json
```

参考实现通过测试不会授予学习者证书。本地报告是未经签名的自报证据。浏览器图表根据可编辑输入计算结果，用于演示算法，不会调用模型。

[Go HTTP 包](https://pkg.go.dev/net/http)、[Go 上下文](https://pkg.go.dev/context)和 [JSON 解码](https://pkg.go.dev/encoding/json)说明了本项目所用标准库的边界。所有示例场景与练习均为原创。

译注：HTTP 字段、状态、失败类别、示例请求与响应，以及命令行通信记录保留原值；参数帮助已译。回环 HTTP 验证不需要连接真实服务商。
