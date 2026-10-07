# 传输选择指南（Transport Selection Guide）

面向 MCPA“交互与执行”和“架构与组件”领域的一页参考，对齐 MCP 2026-07-28。

## 选择传输

| 场景 | 选择 | 原因 |
|---|---|---|
| 客户端启动服务器并管理其生命周期，如本地工具或 IDE 扩展 | stdio | 分帧简单，不新增网络入口，从环境读取凭据 |
| 服务器经网络供多个客户端访问 | Streamable HTTP | 单个端点、独立 POST，适配负载均衡器与网关 |
| 非子进程、非 HTTP 的可靠字节流，如 Unix socket 或 TCP 连接 | 复用 stdio 分帧 | stdio 本来就是流上的换行分隔 JSON-RPC，只有启动、`stderr` 和关闭流程与子进程有关 |
| 早于 2026-07-28 的客户端或服务器 | 先检测时代（第 05 课），再按需回退 | 不能直接假定，按服务器进程或源站探测并缓存结论 |

## stdio 概览

- 换行分隔 JSON-RPC，每行一条消息，内部没有实际换行。
- `stdout` 只承载 MCP 消息，服务器不向其中写出主动请求。
- `stderr` 可记录任意严重级别日志，不能仅凭有输出就判断失败。
- 没有额外请求头层，版本、能力和身份保存在 `_meta`。
- 用 `notifications/cancelled` 取消请求；关闭服务先关闭 `stdin`，必要时再升级处理。
- 意外退出后重启，原在途请求丢失，并重新发送 `subscriptions/listen`。

## Streamable HTTP 必需请求头

| 请求头 | 来源字段 | 适用请求 | 不一致时 |
|---|---|---|---|
| `MCP-Protocol-Version` | `params._meta["io.modelcontextprotocol/protocolVersion"]` | 每个 POST | `400` + `-32020` |
| `Mcp-Method` | `method` | 每个请求 | `400` + `-32020` |
| `Mcp-Name` | `params.name`，`resources/read` 使用 `params.uri` | `tools/call`、`resources/read`、`prompts/get` | `400` + `-32020` |
| `Mcp-Param-{Name}` | 结构定义中标有 `x-mcp-header` 的工具参数 | 仅声明该标记的工具 | `400` + `-32020` |

请求头名称不区分大小写，值区分大小写，包括方法名与工具名。

## Base64 标记编码

适用于 `Mcp-Name` 和任意 `Mcp-Param-{Name}` 值。出现以下情况时，编码为 `=?base64?{Base64EncodedValue}?=`：

- 包含可见 ASCII、空格和水平制表符之外的字符；
- 首尾有空白；或
- 本身已匹配编码标记格式，需要避免歧义。

其他情况原样发送。服务器先解码标记，再将请求头与正文比较。

## HTTP 状态与 JSON-RPC 正文

| 情况 | 状态 | JSON-RPC 正文 |
|---|---|---|
| MCP 端点上的 GET 或 DELETE | `405` | 不要求 |
| 存在不允许的 `Origin` 请求头 | `403` | 不要求 |
| 接受通知 POST | `202` | 无，通知不会获得 JSON-RPC 回复 |
| 请求头与正文不一致 | `400` | `-32020`，`HeaderMismatch` |
| 不支持的协议版本 | `400` | `-32022`，`UnsupportedProtocolVersionError` |
| 未知方法 | `404` | `-32601`，`Method not found` |

## 2026-07-28 从 Streamable HTTP 移除的机制

- 独立 GET 流及其 `endpoint` 事件。
- `Mcp-Session-Id` 与会话级状态，每个请求均自描述。
- 用于结束会话的 HTTP DELETE。
- 基于 `Last-Event-ID` 的流恢复；断流后丢失原请求的响应，仅在安全时以新 id 重新发起。

## 考试要点

- 正文始终是事实来源，请求头用于路由，不能成为冲突的第二套权威值。
- 不允许 Origin 的 `403`、GET 或 DELETE 的 `405`、接受通知的 `202` 都是 HTTP 层结果，不构成 JSON-RPC 结果或错误。
- `-32020` 是 `HeaderMismatch`，须与缺失能力的 `-32021`、不支持版本的 `-32022` 区分。
- 字节流上的自定义传输复用 stdio 分帧，无须另造格式。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 9 节。
