---
name: mcp-server-designer
description: 设计无状态 MCP 2026-07-28 服务器，明确发现、状态、传输与安全契约。
version: 2.0.0
phase: 11
lesson: 14
tags: [llm-engineering, mcp, stateless, tool-use]
---

给定一个领域（内部 API、数据库、文件源），以及将挂载该服务器的宿主（Host），输出以下内容：

1. 原语映射（Primitive map）。哪些能力成为 `tools`（动作），哪些成为 `resources`（只读数据），哪些成为 `prompts`（用户调用的模板）。每个原语一行。
2. 发现契约（Discovery contract）。起草 `server/discover`，包含实现实际支持的精确版本、能力、服务器身份、说明、`ttlMs` 和 `cacheScope`。
3. 请求契约（Request contract）。要求每个请求的 `params._meta` 都包含字符串类型的协议版本和对象类型的客户端能力。建议提供客户端身份。必需元数据缺失或类型错误时，返回无效参数（Invalid Params，`-32602`）。只有提供了服务器未实现的版本字符串时，才返回 `UnsupportedProtocolVersionError`（`-32022`），并附带 `data.supported` 和 `data.requested`。
4. 结果契约（Result contract）。为每个适用结果添加 `resultType`、服务器身份元数据、确定性的列表排序和缓存策略。
5. 多轮往返请求（MRTR）方案。只在 `tools/call`、`resources/read` 或 `prompts/get` 中使用 `input_required`。至少包含 `inputRequests` 或不透明的 `requestState` 之一；使用新的 JSON-RPC ID 重试原方法，如请求了输入则携带对应的输入响应，如提供了状态则原样携带状态值。
6. 状态方案（State plan）。为每个多调用工作流定义由服务器生成、作为普通工具参数传递的不透明句柄（Opaque Handle）。不要将状态隐藏在连接或协议会话后面。
7. 传输与授权方案（Transport and auth plan）。选择 stdio 或 2026-07-28 的可流式 HTTP（Streamable HTTP）POST 端点。对于 HTTP，定义 Origin 校验和逐请求授权。POST 请求必须包含 `MCP-Protocol-Version`，JSON-RPC 请求必须包含 `Mcp-Method`，而只有 `tools/call`、`resources/read` 和 `prompts/get` 需要 `Mcp-Name`。已接受的通知 POST 返回没有响应体的 HTTP 202。
8. 模式草案（Schema draft）。为每个工具参数编写 JSON Schema，描述应便于模型选择工具，并为不可信输入设置明确边界。
9. 破坏性动作清单（Destructive-action list）。为每个会修改状态的工具标记 `destructiveHint: true`，并要求人工批准。
10. 验证方案（Verification plan）。覆盖通知不产生 JSON-RPC 响应、格式错误的消息封装和请求 ID、元数据拒绝、发现、确定性列表、版本不匹配、缓存字段、请求头与请求体不匹配、授权、审批，以及一个提示注入（Prompt Injection）案例。

拒绝将 `initialize`、`notifications/initialized`、`Mcp-Session-Id`、独立 HTTP GET、HTTP DELETE 或 `Last-Event-ID` 用作现代路径的设计。只允许在明确隔离、面向截至 2025-11-25 的协议版本的适配器（Adapter）中使用这些机制。新实现不要添加已弃用的根目录（Roots）、采样（Sampling）或日志（Logging）功能；兼容支持必须明确标注，Roots 或 Sampling 输入必须使用 MRTR。拒绝没有授权、校验和审批路径却会写入磁盘或调用外部 API 的服务器。
