# 消息结构速查（Message Shapes Reference）

MCP 2026-07-28 报文的一页参考：四种 JSON-RPC 结构、resultType，以及 `_meta` 键规则。

## 四种消息结构

| 结构 | 包含 `id`？ | 包含 `method`？ | 携带内容 | 是否接收回复？ |
|---|---|---|---|---|
| 请求 | 是，非 null，且在尚未完成的请求 id 中唯一 | 是 | `params`（可选） | 是，恰好一次 |
| 通知 | 否，绝不能包含 | 是 | `params`（可选） | 否，绝不回复 |
| 结果响应 | 是，回传请求 id | 否 | 含 `resultType` 的 `result` | 本身就是回复 |
| 错误响应 | 是，除非无法读出 id | 否 | 含 `code` 和 `message` 的 `error` | 本身就是回复 |

## `resultType` 取值

| 值 | 含义 |
|---|---|
| `complete` | 结果包含最终内容 |
| `input_required` | `InputRequiredResult`；客户端须携带更多输入重试（MRTR） |
| 缺失（服务器使用更早协议版本） | 客户端必须按 `complete` 处理 |
| 无法识别 | 客户端必须将结果视为无效 |
| 扩展值（例如 `task`） | 仅在相应能力已声明时有效 |

## `_meta` 键语法

- 可选前缀：以点分隔的标签，后接斜杠。每个标签以字母开头，以字母或数字结尾，中间允许连字符。
- 名称：非空时，以字母或数字开头和结尾，中间允许连字符、下划线和点。
- 仅当前缀的第二个标签为 `modelcontextprotocol` 或 `mcp` 时，才保留给 MCP 使用。检查的是位置，不能仅看文字是否出现。
  - 保留：`io.modelcontextprotocol/`、`dev.mcp/`、`org.modelcontextprotocol.api/`、`com.mcp.tools/`
  - 不保留：`com.example.mcp/`（第二个标签是 `example`）；`mcp.example/`（第二个标签不匹配，`mcp` 仅在第一个位置）

## 保留的 `_meta` 键

| 键 | 所在消息 | 说明 |
|---|---|---|
| `progressToken` | 请求 | 无前缀；让该请求接收进度通知 |
| `io.modelcontextprotocol/protocolVersion` | 请求，必需 | 当前请求使用的协议版本 |
| `io.modelcontextprotocol/clientCapabilities` | 请求，必需 | 与当前请求相关的客户端能力，可以为 `{}` |
| `io.modelcontextprotocol/clientInfo` | 请求，应携带 | 客户端自报名称与版本 |
| `io.modelcontextprotocol/logLevel` | 请求，可选 | 启用已弃用的日志功能；2026-07-28 中仍有效 |
| `io.modelcontextprotocol/serverInfo` | 结果，应携带 | 服务器自报名称与版本 |
| `io.modelcontextprotocol/subscriptionId` | `subscriptions/listen` 流中的通知 | 将通知关联到对应订阅 |
| `traceparent`、`tracestate`、`baggage` | 任意消息 | OpenTelemetry 跟踪上下文；前缀规则的特例（SEP-414） |

## 拒绝规则

请求的 `_meta` 缺少 `protocolVersion` 或 `clientCapabilities` 时，格式无效：返回 JSON-RPC 错误 `-32602`，HTTP 上同时返回 `400 Bad Request`。

## 考试要点

- `clientInfo` 和 `serverInfo` 都由发送方自行报告，不能用于安全或路由决策。
- 保留前缀检查针对第二个标签，不检查第一个标签，也不采用“字符串中任意位置出现 mcp”这种判断。
- 不支持批处理：每个 Streamable HTTP POST 请求体只承载一个请求或通知，每行 stdio 只承载一条消息。
- 旧服务器缺少 `resultType` 时按 `complete` 处理；任何服务器返回无法识别的 `resultType` 都无效。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 2、3 节。
