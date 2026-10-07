# 对故障分类，避免无差别重试

> 区分可以恢复的服务故障与有问题的请求。

**Type:** Build
**Languages:** Go
**Stage:** 第 2 阶段，共 4 阶段
**Prerequisites:** 完成第 1 阶段，并了解 HTTP 状态码分类。
**Time:** 约 2 小时

## 构建目标

实现 `ClassifyStatus(status)`，产生三类结果：2xx 响应成功；429 和 5xx 允许故障切换；其余有效状态码终止路由。小于 100 或大于 599 的整数无效。

401 通常意味着配置的凭据需要修正。把相同请求继续发送给多个服务商可能掩盖这个错误，因此本项目选择停止。503 表示服务商暂时无法处理请求，此时尝试另一个已配置服务商可能有效。

## 示例推演

跟踪状态序列 `[503, 200]`：先将第一个分类为 `retry`，再将第二个分类为 `success`。对于 `[401, 200]`，401 被分类为 `terminal`，不会联系第二个服务商。307 同样终止，因为请求层拒绝重定向。

此路由策略最多访问每个服务商一次，不等待 `Retry-After`，不重试同一端点，也不保证超时的生成从未计费。

```figure
pj-llm-gateway-with-fallbacks-2
```

## 实现契约

```go
func ClassifyStatus(status int) (string, error)
```

先校验数值范围，再检查成功状态，最后检查两个允许重试的条件。不要用 `status >= 400` 作为重试规则，否则会把格式错误的请求和认证失败也包括进来。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 2 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

在该工作区的 `stage2.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

预测 204、301、408、429、500 和 600 的结果。本策略中 408 会终止路由。将来扩展为允许重试时，应先写下新契约及副作用假设，再修改实现。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
