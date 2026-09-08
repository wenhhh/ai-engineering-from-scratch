---
name: sampling-loop-designer
description: 将模型辅助 MCP 工具迁移到直接推理，或采用有界兼容采样的无状态 2026-07-28 MRTR。
version: 2.0.0
phase: 13
lesson: 11
tags: [mcp, mrtr, sampling, stateless, migration]
---

为面向协议修订版 `2026-07-28` 的 MCP 服务器设计模型辅助行为。

先做一个决策：服务器能否直接集成模型提供商？采样（Sampling）对新设计已弃用。除非使用客户端模型和凭据是显式产品需求，否则优先直接集成。

产出：

1. 架构决策（Architecture decision）。选择直接推理或兼容采样，说明原因。
2. 发现契约（Discovery contract）。展示 `server/discover`，包含确切 `supportedVersions`、公布能力、`ttlMs` 与 `cacheScope`。公布工具时，包含必需的确定性 `tools/list` 描述符，具有有效对象 `inputSchema`、`resultType: "complete"`、服务器身份元数据和缓存提示。
3. 请求封装（Request envelope）。每次请求在 `_meta` 中包含协议版本与客户端能力。缺少或非字符串版本用 `-32602`；不支持版本用 `-32022` 并附确切 `supported`、`requested` 数据；缺少采样时用 `-32021` 并附 `requiredCapabilities` 对象。客户端身份元数据仅供参考。无 id 通知绝不输出 JSON-RPC 响应，接受的 HTTP 通知收到无正文 `202`。
4. 轮次表（Round table）。每轮 MRTR 指明 `inputRequests` 键、嵌入请求方法、预期响应模式、校验与预算。
5. 重试契约（Retry contract）。要求原始方法与参数、新 JSON-RPC id、当前轮 `inputResponses` 和逐字节一致的 `requestState`。
6. 状态保护（State protection）。用 HMAC 或认证加密绑定已认证主体、方法、参数摘要、阶段和短过期时间。
7. 安全策略（Safety policy）。定义审批、最大轮数、词元和字节限制、响应校验、日志与拒绝行为。
8. 移除计划（Removal plan）。保留采样时，指出替换为直接集成的条件与日期。

硬性拒绝条件：

- 没有记录需求就采用已弃用采样的新设计。
- 2026-07-28 服务器将 `sampling/createMessage` 作为实时服务器到客户端请求发送。
- 任何 `initialize`、`notifications/initialized`、`Mcp-Session-Id` 或隐藏协议会话状态的使用。
- 影响授权、资源访问或业务逻辑的未签名 `requestState`。
- 复用原 JSON-RPC id 或改变原参数的重试。
- 没有能力检查、审批策略、校验和硬轮次上限的客户端模型循环。
- `includeContext: "allServers"` 或隐式跨服务器上下文。

拒绝规则：

- 拒绝隐蔽模型调用，或向用户隐藏服务器意图的设计。
- 拒绝把模型输出当作身份、授权或用户同意的证明。
- 一次确定性工具调用足够时，拒绝多轮设计。
- 拒绝把客户端和服务器元数据称为已认证身份。

输出一页架构，包含决策、传输流程、轮次表、签名状态内容、安全预算、失败用例与迁移计划。最后给出结论：`direct inference`、`temporary MRTR compatibility` 或 `no model required`。
