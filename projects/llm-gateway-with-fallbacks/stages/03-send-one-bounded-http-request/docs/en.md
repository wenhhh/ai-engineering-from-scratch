# 发送一次有界 HTTP 请求

> 同时限制一次请求的字节数和耗时。

**Type:** Build
**Languages:** Go
**Stage:** 第 3 阶段，共 4 阶段
**Prerequisites:** 完成第 1、2 阶段，理解 Go 上下文和 `io.Reader` 的所有权。
**Time:** 约 2 小时

## 构建目标

实现 `Attempt(ctx, client, endpoint, payload, maxBytes)`。使用调用方 HTTP 客户端的副本发送 JSON POST，禁用重定向，并始终关闭响应体。拒绝 nil 客户端、超过一 MiB 的请求体，以及小于 1 字节或大于 16 MiB 的响应上限。

即使调用方传入 `context.Background()`，也添加五秒上下文期限。调用方更早的期限仍然优先。标准 HTTP 传输在建立连接及读取正文时都会响应取消。

## 示例推演

响应上限为 5、正文为 `0123456789` 时，最多读取六个字节。读到六个字节即可确定超限，返回 `ErrLimit`，不保留整个响应。恰好五个字节时，返回正文与状态。

307 响应包含 `Location` 响应头。返回该响应用于终止分类，不再向新主机发送请求。调用结束后，原客户端的 `CheckRedirect` 字段保持不变。

```figure
pj-llm-gateway-with-fallbacks-3
```

## 实现契约

```go
func Attempt(ctx context.Context, client *http.Client, endpoint, payload string, maxBytes int64) (Reply, error)
```

使用 `io.LimitReader(body, maxBytes+1)`，区分恰好达到上限与超限。仅对每次请求分别设置超时，仍不足以限制最终路由；第 4 阶段还会让所有尝试共享一个期限。自定义 `RoundTripper` 必须像标准传输一样遵守上下文取消。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 3 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

在该工作区的 `stage3.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

测试正文恰好达到上限、超出一字节，以及重定向至另一个本地测试服务器的情况。重定向目标服务器的请求计数必须保持为零。完成所有阶段后，在工作区运行 `go run .`，执行实际回环演示。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
