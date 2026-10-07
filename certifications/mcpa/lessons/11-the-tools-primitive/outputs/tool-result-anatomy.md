# 工具结果结构速查（Tool Result Anatomy）

面向 MCPA“交互与执行”领域的一页参考，对齐 MCP 2026-07-28。

## tools/list 概览

| 字段 | 位置 | 含义 |
|-------|-------|---------|
| `cursor` | 请求，可选 | 来自上一页的不透明值，首次请求省略 |
| `tools` | 结果 | 本页工具定义 |
| `nextCursor` | 结果，可选 | 还有后续工具时出现，值可以是空字符串 |
| `ttlMs` | 结果，必需 | 以毫秒计的新鲜度提示，可在到期前使用缓存 |
| `cacheScope` | 结果，必需 | `public` 可共享；`private` 限当前授权上下文 |

工具列表不能随连接变化，也不能因其他请求的副作用变化；可见范围可以依据当前请求自身的授权有所不同。

## tools/call 与 CallToolResult

| 字段 | 是否必需 | 含义 |
|-------|----------|---------|
| `content` | 是 | 内容块列表，不能省略，可以为空 |
| `structuredContent` | 否 | 任意 JSON 值；存在工具 `outputSchema` 时须符合它 |
| `isError` | 否 | 缺失或 false 表示成功，true 表示模型可读取并修正的工具执行错误 |

## 内容块类型

| 类型 | 必需字段 | 用途 |
|------------|------------------|----------|
| `text` | `text` | 普通自然语言输出 |
| `image` | base64 `data`、`mimeType` | 图像输出，例如供用户查看的图片 |
| `audio` | base64 `data`、`mimeType` | 语音或声音输出 |
| `resource_link` | `uri`、`name` | 指向资源，不内联内容 |
| `resource` | `resource` 对象，内含 `uri`、`mimeType`，以及 `text` 或 `blob` | 直接嵌入资源内容 |

任一内容块可携带 `annotations`：`audience` 为 `user`、`assistant` 或两者，`priority` 为 0 至 1，另有 `lastModified`。这些字段与 `data` 或 `resource` 并列，不能嵌入更深一级。

## 工具注解默认值

| 注解 | 默认值 | 说明 |
|------------|---------|------|
| `readOnlyHint` | false | true 声称工具不修改其环境 |
| `destructiveHint` | true | 仅在 `readOnlyHint` false 时有意义 |
| `idempotentHint` | false | true 声称相同参数重复调用不会增加新的影响 |
| `openWorldHint` | true | false 声称工具交互范围为封闭集合 |

四项都只是提示。除非服务器本身可信，否则应将它们视为不可信，不能仅凭注解作出安全决策。

## 工具调用的两个错误通道

| 情况 | 通道 | 示例 |
|-----------|---------|---------|
| 指定工具不存在 | JSON-RPC 错误 | `-32602` |
| 工具执行遇到模型可修正的问题 | 带 `isError: true` 的结果 | 日期错误、数值越界 |

## listChanged 流程概述

客户端以 `toolsListChanged: true` 打开 `subscriptions/listen`，先收到 `notifications/subscriptions/acknowledged`；工具集合变化时收到携带该流订阅 id 的 `notifications/tools/list_changed`，再通过普通 `tools/list` 重新获取。

## 考试要点

- 是否继续分页取决于 `nextCursor` 键是否存在，不取决于真假值；空字符串是合法游标。
- 工具注解描述意图，不强制落实行为；内容注解描述单个内容块，不描述整个工具。
- `isError` 是供模型读取的正常结果字段，与协议层错误分开。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节。
