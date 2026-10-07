# 校验服务商端点

> 将服务商列表视为受信任的配置。

**Type:** Build
**Languages:** Go
**Stage:** 第 1 阶段，共 4 阶段
**Prerequisites:** 掌握 Go 结构体、切片、错误处理和基本 HTTP 请求。阅读[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)，了解严格 JSON 契约。
**Time:** 约 2 小时

## 构建目标

建立连接前，先实现 `Endpoints(values)`。允许 HTTPS；对于本地服务，仅允许主机恰为 `localhost`、`127.0.0.1` 或 `::1` 时使用 HTTP。拒绝用户信息、片段、查询参数、换行、缺失主机及其他协议。删除完全相同的重复项，同时保留服务商顺序。

命令行配置包含服务商名称、URL、可选模型覆盖值及凭据环境变量名，绝不接收凭据值。拒绝查询字符串可防止持有者密钥进入端点 URL 和轨迹；这个小型网关不支持通过查询参数选择 API 版本。

## 示例推演

输入顺序为主端点 `https://primary.example/v1/chat/completions`、再次出现的主端点，以及 `http://127.0.0.1:11434/v1/chat/completions`。校验后列表包含两个端点，顺序不变。因此，主服务商失败后可以切换到本地备用服务。

将最后一个主机改为 `local-model.example`，同时保留 HTTP，此时应拒绝整个列表。主机名含有“local”并不能证明连接指向回环地址。包含 `user:password@host` 的 URL 必须在发送请求之前被拒绝。

```figure
pj-llm-gateway-with-fallbacks-1
```

## 实现契约

```go
func Endpoints(values []string) ([]string, error)
```

使用 `net/url` 解析，检查 `Hostname`，并维护独立的已见集合。不要排序端点，因为其顺序决定故障切换策略。服务器只从操作者配置中接收端点，不从传入 JSON 请求字段中读取。

## 运行你的实现

从仓库根目录初始化一次；评分器会保留工作区中已有的文件：

```bash
python3 scripts/project_test.py llm-gateway-with-fallbacks --init /tmp/llm-gateway-with-fallbacks-work
python3 scripts/project_test.py llm-gateway-with-fallbacks --stage 1 --path /tmp/llm-gateway-with-fallbacks-work --strict
```

在该工作区的 `stage1.go` 中编写实现。随附适配器调用学习者实现的函数，不会导入参考解答。阶段测试包含独立于 Orchard 演示的用例。

## 检查与扩展

通过控件加入重复项或改变 URL 协议。为什么 `https://a.example?api_key=...` 必须失败？端点校验不能证明已配置的 HTTPS 服务值得信任；服务选择由操作者负责。

[Go 标准库参考](https://pkg.go.dev/context)。可运行核心仅使用 Go 标准库。外部模型调用为可选项，常规评分不会执行。
