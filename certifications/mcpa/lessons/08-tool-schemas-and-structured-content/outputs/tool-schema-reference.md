# 工具模式速查（Tool Schema Reference）

面向 MCPA“架构与组件”领域的一页参考：工具定义字段、inputSchema 与 outputSchema 所遵循的 JSON Schema 规则，以及符合 2026-07-28 规范的服务器须区分的两个错误通道。

## 工具定义字段

- **name**：在单台服务器内唯一，见下方命名规则。
- **title**：可选、面向人阅读的展示名称。
- **description**：供模型判断相关性的自然语言描述。
- **icons**：可选，仅允许 https 或 data URI，与服务器同源。
- **inputSchema**：必需的 JSON Schema 对象，绝不能为 null。
- **outputSchema**：可选 JSON Schema 对象，约束 structuredContent。
- **annotations**：可选提示，包括 readOnlyHint、destructiveHint、idempotentHint、openWorldHint；除非服务器本身可信，否则这些提示不可信。

## JSON Schema 方言

- 没有 `$schema` 字段时，默认采用 JSON Schema 2020-12。
- 模式可以通过 `$schema` 显式声明其他方言。
- SEP-2106 之后，inputSchema 保留 `type: object`，但允许任意其他 2020-12 关键字（`oneOf`、`anyOf`、`allOf`、`if`/`then`/`else`、`$defs`）；outputSchema 允许任何合法 JSON Schema，无须限定 `type: object`。
- 无参数工具：推荐 `{"type": "object", "additionalProperties": false}`，只接受空对象。

## $ref 规则

- 不能自动解引用指向网络 URI 的 `$ref`；只有 `#/$defs/Foo` 这样的同文档指针适合自动跟随。
- 即使提供显式启用的获取模式，也必须默认关闭，并受允许列表、超时和大小上限约束。
- 模式因外部 `$ref` 无法解析而校验失败时，应拒绝该模式，不能将其当作宽松放行。
- 组合关键字（`anyOf`、`oneOf`、`allOf`、`if`/`then`/`else`）和 `$defs` 应设置深度、子模式数量或时间预算上限，防止拒绝服务。

## outputSchema 与 structuredContent

- `structuredContent` 接受任意 JSON 值：对象、数组、字符串、数字、布尔值或 null。
- 存在 outputSchema 时，服务器必须返回符合它的 structuredContent，客户端也应进行校验。
- 为兼容仅阅读文本的客户端，返回 structuredContent 的工具还应将相同值序列化到 `text` 内容块。

## 工具命名规则

- 长度为 1 至 128 个字符，区分大小写。
- 允许字符：`A-Z`、`a-z`、`0-9`、下划线、连字符和点。
- 不允许空格、逗号或其他特殊字符。
- 单台服务器内唯一；聚合器为名称添加服务器标识前缀，因为 `serverInfo.name` 不保证唯一。

## 两个错误通道

| 情况 | 通道 | 示例 |
|---|---|---|
| 指定工具在服务器上不存在 | JSON-RPC 错误 | `-32602` Invalid params |
| 请求本身不符合 CallToolRequest 模式 | JSON-RPC 错误 | `-32602` Invalid params |
| 参数不符合工具自己的 inputSchema | 工具执行错误 | 带有 `isError: true` 的 result |
| 处理器内的业务规则拒绝调用 | 工具执行错误 | 带有 `isError: true` 的 result |

不符合工具模式的参数绝不使用 `-32602`。该代码用于服务器连尝试执行都无法进行的请求，例如指定一个从未发布的工具名称。模型可以通过调整参数重试修复的问题，都属于带有 `isError: true` 的正常结果，因为只有这个通道能可靠地进入模型上下文（SEP-1303）。

## 本领域考试信息

- 架构与组件属于 MCPA 考试大纲的一部分。
- 考试对齐 MCP 规范 2026-07-28。
- 来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5、10 节。
