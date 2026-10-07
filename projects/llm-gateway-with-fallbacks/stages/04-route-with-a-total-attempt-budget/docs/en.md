# 在总尝试预算内路由

> 转发调用方正文，同时保护凭据。

**Type:** Build
**Languages:** Go
**Stage:** 第 4 阶段，共 4 阶段
**Prerequisites:** 完成第 1 至第 3 阶段。添加用量统计前，阅读[词元计数与成本计量器](../../../../token-counter-and-cost-meter/README.md)。
**Time:** 约 2 小时

## 构建目标

实现 `Route`：按顺序遍历已校验端点一次，在调用 `Attempt` 前计入尝试次数，并记录状态、经过的毫秒数和故障类别。成功、终止状态、响应超限、取消或达到调用上限时停止。即使调用方没有期限，也将整条路由限制为最多五秒。

随附的 `RouteConfigured` 为你的路由组合更严格的操作者设置：1 至 5000 毫秒期限、响应上限和具名服务商。其传输从 `key_env` 创建服务商专属 Authorization 请求头，并可改写 `model`。`GatewayHandler` 只复制 JSON 正文；调用方请求头绝不会变成服务商凭据。随附传输改写模型后，Body、GetBody 和 ContentLength 必须描述同一组字节。在复用连接上发生零字节写入失败时，Go 可能重放请求；重放必须保留配置的模型。重定向仍被禁用。

## 示例推演

主服务商耗时 35 毫秒后返回 503。总期限为 65 毫秒时，备用服务商只剩约 30 毫秒，不会重新获得 65 毫秒。共享上下文过期后，返回 `State=cancelled`、截至当时的尝试次数及上下文错误。

成功的代理请求会带上 `X-Gateway-Attempts: 2` 与 `X-Gateway-Provider: backup`，正文为备用服务商的实际响应。错误返回本地 502，取消返回 504，不回显服务商错误正文。命令行输出更完整的轨迹，供操作者检查。

```figure
pj-llm-gateway-with-fallbacks-4
```

## 实现契约

```go
func Route(ctx context.Context, client *http.Client, providers []string, payload string, maxAttempts int, maxBytes int64) (Outcome, error)
```

每次失败尝试后立即检查 `ctx.Err()`，包括最后一个服务商的尝试。否则，超时可能被误标为普通耗尽。缺少已配置的环境变量时，应在任何服务商收到请求之前失败。集成测试使用不同的本地服务器观察两个凭据请求头。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 4 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

在该工作区的 `stage4.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

从已完成的工作区运行 `go run .`：它在临时回环端口启动主服务商、备用服务商和代理，并在一次请求后关闭。接入自己的端点时，复制 `fixtures/providers.example.json`，替换模型名称，然后运行 `go run . --config /tmp/providers.json --request fixtures/request.json`，或使用 `--listen 127.0.0.1:8088`。服务器仅供本地使用，采用非流式响应且没有认证；不可直接作为公开部署模板。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
