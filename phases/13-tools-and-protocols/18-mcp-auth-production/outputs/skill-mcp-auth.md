---
name: mcp-auth-wiring
description: 通过签发者绑定登记、CIMD、受保护资源元数据、JWKS 刷新、受众固定和逐请求验证，设计 MCP 2026-07-28 授权。
version: 2.0.0
phase: 13
lesson: 18
tags: [mcp, oauth, cimd, dcr, jwks, rfc8414, rfc7591, rfc8707, rfc7636, rfc9728, rfc9207]
---

给定 MCP 服务器配置和 IdP 能力集，输出组成生产 MCP 授权层的授权接口面和拒绝规则。

输入（Inputs）：

- `mcp_resource_url`：规范资源 URL，即最具体标识符；仅当路径区分共同托管服务器时保留路径。用作 `aud` 和受保护资源元数据 `resource` 值。
- `idp_metadata_url`：IdP 的 `/.well-known/oauth-authorization-server` 或 OpenID Connect Discovery URL。
- `idp_capabilities`：观察到的 `issuer`、`code_challenge_methods_supported`、`grant_types_supported`、`client_id_metadata_document_supported`、已弃用的 `registration_endpoint`、`response_types_supported` 和 `authorization_response_iss_parameter_supported` 值。
- `pre_registered_client_ids`：可选的签发者到客户端 ID 映射，由授权服务器运营者配置。优先使用此签发者范围内身份，再用 CIMD，最后才将已弃用 DCR 作为兼容路径。
- `application_type`：`native` 或 `web`，选择已弃用 DCR 兼容时必需。
- `credential_store`：按授权服务器签发者索引客户端 ID 和注册凭据，按 `(issuer, mcp_resource_url)` 索引访问令牌。
- `tools`：MCP 工具列表及每个工具所需作用域。

生成内容（Produce）：

1. **拒绝门槛（Refusal gate）。** 任何硬条件失败时拒绝接入并停止：
   - `code_challenge_methods_supported` 缺少 `S256`，PKCE 没有降级模式。
   - `grant_types_supported` 缺少 `authorization_code`。
   - `response_types_supported` 不是精确的 `["code"]`。
   - 没有登记路径：预注册 `client_id`、`client_id_metadata_document_supported: true` 和已弃用 DCR 兼容端点都不可用。
   - 选择 CIMD，但 `client_id` 不是带路径的绝对 HTTPS 文档 URL、不匹配文档 URL，或文档缺少非空 `client_name` 或 `redirect_uris` 数组。CIMD 的 `application_type` 可选。
   - 返回的 RFC 9207 `iss` 不同于重定向前记录签发者，或服务器声明支持却省略它。
   - 已弃用 DCR 缺少 `application_type`，或其重定向 URI 策略与 `native` 或 `web` 冲突。

2. MCP 服务器的**受保护资源元数据文档（Protected-resource metadata document）**，遵循 RFC 9728。资源带路径时，在路径前插入 well-known 段：`https://host/team/mcp` 映射到 `https://host/.well-known/oauth-protected-resource/team/mcp`。包含 `resource`、`authorization_servers`（签发者允许列表）、`scopes_supported` 和 `bearer_methods_supported: ["header"]`。

3. **HTTP 端点（HTTP endpoints）。**
   - `GET /.well-known/oauth-protected-resource`：返回第 2 项文档。
   - `POST /mcp`：无状态 MCP 传输，在任何工具分发前验证本请求的持有者令牌。
   - 仅限 DCR 兼容：`POST /register`，前置应用类型和速率限制检查。

4. **后台作业与例程（Background job + routines）。**
   - 定时 JWKS 刷新，重新获取 `jwks_uri` 到缓存 `{keys, fetched_at}`。必须幂等，绝不生成密钥。AS 轮换，资源服务器只刷新。默认 `0 */6 * * *`；高频轮换 IdP 收紧为 `*/15 * * * *`。
   - `validate` 例程：检查 `iss` 允许列表、对照缓存 JWKS 验证签名、检查 `aud == mcp_resource_url`、`exp` 和所需作用域。
   - 权限提升签发路径：仅当工具列表包含由用户最初未授予作用域把关的操作时需要。

5. **缓存计划（Cache plan）。** 每个接受的签发者一个条目，以 `issuer` 为键，保存 `{keys, fetched_at}`。记录读取模式：验证器读取缓存，`kid` 未命中时回退到一次同步刷新，即重新获取，不是轮换；重新获取是幂等的，不能被变成密钥创建 DoS。

6. **作用域映射（Scope mapping）。** 将每个工具映射到所需作用域。输出表格：
   `| tool | required_scope | rationale |`。将破坏性工具归到独立作用域；绝不为写工具复用读作用域。

7. **运行时拒绝规则（Refusal rules at runtime）**，验证器必须编码：
   - `aud != mcp_resource_url` 时拒绝，返回 401 `Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="<prm_url>"`。
   - `iss not in authorization_servers` 时拒绝。
   - 单次重新获取回退后，`kid` 仍不在缓存 JWKS 中时拒绝。
   - 所需作用域缺失时拒绝，返回 403 `Bearer error="insufficient_scope", scope="<required>", resource_metadata="<prm_url>"`。
   - 拒绝缺少 S256 `code_challenge` 的任何授权请求，并拒绝 `code_verifier`、客户端、重定向 URI 或 `resource` 不匹配一次性授权码记录的任何令牌请求。
   - 拒绝签发者不匹配凭据存储键的任何凭据或令牌。签发者变化要求新登记。

必须拒绝（Hard rejects，绝不接入以下任何情况，拒绝请求并说明原因）：

- 明文存储 `client_secret`。公共客户端使用 `token_endpoint_auth_method: none`；机密客户端使用 `private_key_jwt`。静态存储或注册响应日志都不得有明文共享秘密。
- 验证器跳过 `aud` 检查。受众绑定，即访问令牌权限限制，是 RFC 8707 + RFC 9728 的全部目的。
- 将 JWKS 缓存未命中回退接到轮换并生成，而非重新获取。它不会生成缺失 `kid`，并让攻击者控制的 `kid` 迫使无界密钥创建。回退必须为幂等刷新。
- 允许不带 PKCE 的授权码请求。OAuth 2.1 禁止此行为；验证器必须拒绝已存授权码记录缺少 `code_challenge` 的任何 `/token` 交换。
- 缓存 JWKS 却没有刷新作业。要么交付定时刷新，要么不部署授权接口面。
- 没有允许列表就信任 `iss` 声明。接受任意 `iss` 令牌的验证器让攻击者可以自建 IdP 并伪造令牌。
- 将入站 MCP 令牌转发到上游 API，即令牌透传。如果 MCP 服务器调用上游 API，就必须取得独立令牌；透传会产生混淆代理问题。
- 明文存储 `registration_access_token`。静态存储使用哈希，每次更新要求明文。
- 将 MCP 请求元数据或已移除的协议会话当作授权状态。2026-07-28 传输无状态，每个请求都要认证和授权。

输出（Output）：一页计划，包含受保护资源文档、签发者键控登记布局、签发者与资源键控令牌布局、所选登记路径、HTTP 端点、JWKS 刷新作业、作用域映射和运行时拒绝规则。最后指出授权服务器实际元数据中发现的第一个未满足部署门槛。
