---
name: oauth-scope-planner
description: 使用 CIMD、签发者隔离、资源指示符和提升作用域设计 MCP 2026-07-28 授权。
version: 2.0.0
phase: 13
lesson: 16
tags: [mcp, oauth, cimd, pkce, issuer, resource-indicators]
---

给定远程 HTTP MCP 服务器及其工具列表，设计完整授权边界。

## 必需输入（Required inputs）

- 规范 MCP 资源 URI 和受保护资源元数据位置。
- 允许的授权服务器签发者。
- 客户端运行时：原生或 Web，以及精确重定向 URI。
- 工具到作用域的映射及会产生实际后果的操作。
- 令牌、刷新和凭据存储约束。
- 不支持 CIMD 的旧授权服务器（如有）。

## 生成内容（Produce）

1. 资源元数据。拟定 RFC 9728 `resource`、`authorization_servers` 和 `scopes_supported`。在 well-known 段之后保留资源路径，例如对 `https://notes.example.com/mcp` 使用 `https://notes.example.com/.well-known/oauth-protected-resource/mcp`。
2. 签发者策略。说明精确允许的签发者、元数据验证、变更处理和 RFC 9207 `iss` 比较。
3. 登记。有预注册时使用预注册，否则优先使用客户端 ID 元数据文档。带路径的 HTTPS URL 就是 `client_id`；要求精确重定向 URI，并将显示元数据视为不可信。`application_type` 在这里是可选的。
4. DCR 回退。如有需要，标记为已弃用，声明 `application_type`，并定义允许回退的精确条件。不要在一般性的 CIMD 安全失败后降级。
5. 凭据键。按签发者存储预注册和 DCR 凭据，按 `(issuer, resource)` 存储令牌。禁止跨签发者复用。说明自行托管的 CIMD URL 可迁移使用，在可信签发者变化时无需重新进行 DCR 注册。
6. PKCE 流程。要求 S256、精确重定向 URI、授权响应签发者验证，以及授权请求和令牌请求中相同的资源。
7. 作用域模型。将每个工具映射到最小作用域。将当前 `WWW-Authenticate` 作用域质询视为权威。
8. 权限提升体验。标识额外作用域、对用户的解释、同意点、新授权以及使用全新 MCP 请求 id 的重试。
9. 资源服务器检查。实现已声明的 `tools/list`，包含有效的对象根模式、确定性顺序、结果类型、服务器身份和缓存提示。在工具分发前验证签发者、受众、到期时间、作用域、当前 MCP 请求头和请求元数据。
10. 令牌卫生。只使用 Bearer 请求头，不在查询参数中放令牌，不透传令牌，保密存储刷新令牌，并制定轮换计划。
11. 错误契约。在 JSON-RPC 错误信封中保留每个请求 id，包括 OAuth 失败。在 HTTP 400 `-32022` 版本支持检查之前，要求请求头不匹配返回 HTTP 400 `-32020`；要求精确的支持与请求版本数据、未知方法返回 HTTP 404 `-32601`、接受的通知返回 202 和空正文。
12. 传输边界。将已解析正文的示例标为进程内协议模型，并接入第 09 课的完整 Streamable HTTP 适配器，以验证 JSON Content-Type 和同时包含 JSON、SSE 的 Accept。

## 必须拒绝（Hard rejects）

- 将 DCR 呈现为首选的新登记机制。
- DCR 缺少 `application_type`。
- 签发者变化后复用签发者生成的注册凭据、访问令牌或刷新令牌。自行托管的 CIMD URL 是可迁移的例外，不是签发者生成的秘密。
- 比较前规范化授权响应 `iss`。
- 缺少 PKCE S256，或授权请求和令牌请求缺少 `resource`。
- 接受其他受众的令牌，或向下游转发 MCP 令牌。
- 将 `clientInfo`、`serverInfo`、能力或已移除的协议会话用作认证。
- 仅为模仿远程 HTTP 而向本地 stdio 添加 OAuth。
- 构造 RFC 9728 元数据 URL 时丢弃受保护资源路径。
- 对 MCP 请求错误返回纯文本或临时对象，而非具有相同 id 的 JSON-RPC 信封。

## 输出格式（Output format）

返回以下章节：资源（Resource）、签发者（Issuers）、登记（Enrollment）、凭据存储（Credential Store）、PKCE 流程（PKCE Flow）、作用域矩阵（Scope Matrix）、权限提升（Step-Up）、服务器验证（Server Validation）、令牌卫生（Token Hygiene）和兼容性（Compatibility）。最后给出迫使签发者审查、并对签发者生成凭据的客户端重新登记的确切事件。
