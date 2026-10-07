# 能力协商速查（Capability Negotiation Cheatsheet）

面向 MCPA“架构与组件”领域的一页参考，对齐 MCP 2026-07-28。

## server/discover 概览

| 字段 | 位置 | 含义 |
|-------|-------|---------|
| `supportedVersions` | result | 服务器接受的协议版本，后续请求从中选择 |
| `capabilities` | result | `ServerCapabilities` 对象，描述服务器提供什么 |
| `instructions` | result，可选 | 为模型提供自然语言指引，不重复工具描述 |
| `io.modelcontextprotocol/serverInfo` | `result._meta` | 自报名称和版本，仅用于展示与日志 |
| `ttlMs` | result | 以毫秒计的新鲜度提示；`DiscoverResult` 属于 `CacheableResult` |
| `cacheScope` | result | `public` 或 `private`，本身不构成访问控制 |

所有服务器必须实现；客户端可选调用，也可以直接发送任意请求，收到版本错误时再处理。

## 并列比较 ServerCapabilities 与 ClientCapabilities

| ServerCapabilities 键 | 含义 | ClientCapabilities 键 | 含义 |
|---|---|---|---|
| `tools {listChanged}` | 提供工具，可以发送变更通知 | `elicitation {form, url}` | 能回答表单或 URL 模式的信息征询 |
| `resources {listChanged, subscribe}` | 提供资源，可以通知变更或接受订阅 | `sampling`（已弃用） | 能为服务器执行大语言模型补全 |
| `prompts {listChanged}` | 提供提示词模板 | `roots`（已弃用） | 能列出根目录 |
| `completions {}` | 提供参数补全 | `extensions {}` | 支持具名客户端扩展 |
| `logging {}`（已弃用） | 可以发送日志通知 | | |
| `extensions {}` | 支持具名服务器扩展 | | |

空对象表示支持且没有额外配置；整个键缺失表示完全不提供该原语或功能。

## 协商规则

`DiscoverResult.capabilities` 描述服务器，可以报告一次并缓存，但不说明某个客户端请求能够接收什么。`_meta["io.modelcontextprotocol/clientCapabilities"]` 描述客户端，必须在每个请求中存在、正确且反映当前能力，因为服务器不能从任何先前调用推断它，即使沿用同一连接。

## MissingRequiredClientCapabilityError（-32021）

- 处理请求需要其自身 `clientCapabilities` 未声明的能力时返回。
- `data.requiredCapabilities` 与 `ClientCapabilities` 同形，准确指出缺失能力。
- HTTP 状态：`400 Bad Request`。
- 修复：在这个请求自己的 `_meta` 中声明能力后重试，不能通过其他请求代为声明。

## UnsupportedProtocolVersionError（-32022）

- 请求声明服务器未实现的协议版本时返回。
- `data.supported` 列出服务器接受的版本；`data.requested` 回传请求所用版本。
- HTTP 状态：`400 Bad Request`。
- 修复：使用新的请求 id，从 `data.supported` 选择版本重试。
- 即使拒绝旧版 `initialize` 请求，现代专用服务器也应列出支持版本，因为旧版客户端无法自行前进到现代路径。

## 重试检查清单

1. 读取错误的 `data`，不猜测重试应使用的版本或能力。
2. 为重试分配全新 JSON-RPC id，不复用失败请求的 id。
3. 只修改错误要求修改的部分，保持请求其他内容不变。
4. 不把 `-32021` 或 `-32022` 响应当作正常结果缓存。
5. 不假定后续请求继承先前请求的任何声明。

## 考试要点

- `server/discover` 必须实现，但调用可选。
- 未知工具是 `-32602`；未知方法是 `-32601`；缺失能力是 `-32021`；不支持的版本是 `-32022`。
- `serverInfo` 和 `clientInfo` 是自报字段，用于展示和日志，不能用于安全决策。
- 通过现代 `_meta` 结构请求真实的旧协议版本，不等于旧版客户端；旧版客户端发送的是 `initialize`。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 6 节。
