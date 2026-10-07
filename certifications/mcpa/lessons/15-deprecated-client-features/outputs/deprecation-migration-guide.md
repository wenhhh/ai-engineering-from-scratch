# 已弃用客户端功能迁移指南（Deprecated Client Feature Migration Guide）

面向 MCPA“交互与执行”领域的一页参考，对齐 MCP 2026-07-28。

## 已弃用的含义

- 启用（Active）：当前版本仍有完整规范，按其要求实现。
- 已弃用（Deprecated）：仍有完整规范且正常可用，已有文档化迁移路径；从标记弃用的版本发布起，至少经过十二个月才具备移除资格。
- 已移除（Removed）：已从规范草案删除，下一份 Current 版本不再包含。
- 最早可移除时间对应等待期结束当天或之后发布为 Current 的首个版本。实际移除由核心维护者另行决定，可能更晚。

## SEP-2577 弃用的三项面向客户端的功能

| 功能 | 原有用途 | 迁移路径 | 最早可移除时间 |
|---|---|---|---|
| Roots | 客户端向服务器提供说明性的目录提示 | 通过工具参数、资源 URI 或服务器配置传递目录或文件 | 2027-07-28 当天或之后的首个版本 |
| Sampling | 服务器请求客户端代为执行大语言模型生成 | 直接集成大语言模型服务商 API | 2027-07-28 当天或之后的首个版本 |
| Logging | 服务器向客户端发送结构化日志通知 | stdio 上使用 stderr，或通过 OpenTelemetry 实现可观测性 | 2027-07-28 当天或之后的首个版本 |

## 同样列入弃用登记表的功能

| 功能 | 弃用版本 | 迁移路径 | 最早可移除时间 |
|---|---|---|---|
| 动态客户端注册（Dynamic Client Registration） | 2026-07-28 | 客户端 ID 元数据文档（Client ID Metadata Documents） | 2027-07-28 当天或之后的首个版本 |
| `includeContext: "thisServer" / "allServers"` | 2025-11-25 | 省略字段，或发送默认值 `"none"` | 跟随 Sampling |
| HTTP+SSE 传输 | 2025-03-26 | Streamable HTTP | SEP-2596 达到 Final 后三个月 |

## 当前仍合法的报文行为：不要加旧版包装

- `roots/list` 作为 MRTR 的 `inputRequests` 条目，前提是客户端已声明 `roots` 能力。
- `sampling/createMessage` 作为 MRTR 的 `inputRequests` 条目，前提是客户端已声明 `sampling` 能力。
- 请求 `_meta` 中的 `io.modelcontextprotocol/logLevel`，允许服务器在该请求自己的响应流中发送 `notifications/message`；只发送达到或高于指定级别的日志，且仅限请求尚未结束期间。

## 2026-07-28 真正移除的内容

- `initialize` 与 `notifications/initialized`
- `Mcp-Session-Id`，以及 Streamable HTTP 的 GET、DELETE 会话端点
- `resources/subscribe` 与 `resources/unsubscribe`，改用 `subscriptions/listen`
- 心跳方法 `ping`
- `logging/setLevel`，原为连接级日志设置，已没有会话可保存该级别
- 根目录变更通知 `notifications/roots/list_changed`
- `Last-Event-ID` 与 SSE 恢复能力
- MRTR 之外的任何服务器主动请求
- `tasks/result` 与 `tasks/list`，任务已迁入 `io.modelcontextprotocol/tasks` 扩展
- `notifications/elicitation/complete` 与 URL 模式的 `elicitationId` 字段
- 错误码 `-32002` 与 `-32042`

## 考试要点

- 弃用后仍可正常工作，同时等待未来可能的移除；两种状态不能混同。
- `roots/list`、`sampling/createMessage` 和每请求 `logLevel` 不加旧版包装也能通过 2026-07-28 报文检查。
- `logging/setLevel` 与 `notifications/roots/list_changed` 在 2026-07-28 已不存在。
- 若干扰选项直接指定某个日历日自动移除，而不说“该日或之后的首个版本”，就误解了等待期。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 11、15 节。
