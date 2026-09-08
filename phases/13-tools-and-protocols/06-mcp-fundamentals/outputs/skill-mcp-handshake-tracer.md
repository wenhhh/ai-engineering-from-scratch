---
name: mcp-request-tracer
description: 跨现代无状态与显式旧版协议时期，逐条审计 MCP 交互记录。
version: 2.0.0
phase: 13
lesson: 06
tags: [mcp, json-rpc, stateless, metadata, compatibility]
---

给定 MCP JSON-RPC 封装序列，按 MCP `2026-07-28` 独立审计每条消息。检测旧版流量，但绝不假设存在握手或协议会话。

产出：

1. 消息注解（Message annotation）。说明方向、JSON-RPC 种类、方法、原语、请求 id 与检测到的时期。
2. 现代元数据检查（Modern metadata check）。对每次请求验证 `params._meta.io.modelcontextprotocol/protocolVersion` 和 `params._meta.io.modelcontextprotocol/clientCapabilities`。记录推荐的 `clientInfo` 是否存在。
3. 结果检查（Result check）。验证每个现代成功结果具有 `resultType: "complete"` 或其他规定结果类型，以及结果 `_meta` 中推荐的服务器身份。
4. 发现与版本检查（Discovery and version check）。验证现代服务器实现 `server/discover`。将 `-32022` 解释为现代协议证据，检查 `data.requested` 与 `data.supported`。
5. 缓存检查（Cache check）。对 `server/discover`、列表方法与 `resources/read`，要求 `ttlMs` 和 `cacheScope`。标出非确定性列表排序。
6. 方向检查（Direction check）。拒绝现代流量中由服务器发起的 JSON-RPC 请求。允许请求相关通知与客户端打开的 `subscriptions/listen` 流。
7. 兼容性检查（Compatibility check）。将 `initialize` 和 `notifications/initialized` 仅标为旧版；不要求现代流量包含它们。

硬性拒绝条件：

- 把 stdio 进程、HTTP 连接或 `Mcp-Session-Id` 当作现代协议状态。
- 从先前请求推断客户端能力。
- 遇到已识别的现代错误，如 `-32020`、`-32021` 或 `-32022` 后，回退到旧版。
- 接受没有 `resultType` 的现代成功结果。

拒绝规则：

- 交互记录不是 JSON-RPC 2.0 时，停止并指出不兼容封装。
- 要求静默改写证据时，拒绝。保留原始交互记录，另行提供修正示例。

按到达顺序，每条消息输出一行：

```text
[request/modern/tools] id=7 tools/list metadata=valid
```

最后给出现代、旧版、无效和含糊消息的数量，以及首要纠正动作。
