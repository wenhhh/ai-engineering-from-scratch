# MCP 授权：CIMD、签发者绑定、PKCE 与权限提升（MCP Authorization: CIMD, Issuer Binding, PKCE, and Step-Up）

> 远程 MCP 请求是无状态的，但其授权不是匿名的。将每份凭据绑定到创建它的签发者，将每个令牌绑定到接收它的资源。

**Type:** Build
**Languages:** Python
**Prerequisites:** Phase 13 · 09（传输），Phase 13 · 15（安全）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 通过受保护资源元数据发现授权服务器。
- 优先使用客户端 ID 元数据文档（Client ID Metadata Documents），而非已弃用的动态客户端注册（Dynamic Client Registration）。
- 当无法避免 DCR 兼容路径时，声明正确的 `application_type`。
- 验证授权响应 `iss`，并按签发者隔离凭据。
- 使用 PKCE、资源指示符、受众验证和增量作用域。
- 不使用协议会话，发送已授权的 MCP 2026-07-28 请求。

## 问题（The Problem）

远程 MCP 服务器可能读取私有记录、写入外部系统或触发昂贵工作。认证告诉它谁出示了凭据。授权还必须回答：

- 哪个授权服务器签发了凭据？
- 令牌面向哪个 MCP 资源？
- 哪个客户端和重定向 URI 完成了流程？
- 用户批准了哪些操作？
- 这个精确请求是否仍符合该批准？

2026-07-28 授权配置强化了客户端登记和签发者处理。它优先使用客户端 ID 元数据文档，弃用动态客户端注册，要求 DCR 提供正确的 `application_type`，验证 RFC 9207 签发者响应，并禁止跨签发者复用凭据。

这些规则补充无状态核心，不会恢复核心握手或 `Mcp-Session-Id`。

## 概念（The Concept）

### 认识三个角色（Know the three roles）

- **MCP 客户端（MCP client）：** 代表资源所有者发送请求。
- **MCP 资源服务器（MCP resource server）：** 接受访问令牌并提供 MCP 端点。
- **授权服务器（Authorization server）：** 认证资源所有者、收集同意并签发令牌。

资源服务器与授权服务器可以一同运营，但要分离其标识符和验证责任。

### 授权适用于 HTTP（Authorization applies to HTTP）

MCP 授权规范适用于基于 HTTP 的传输。本地 stdio 服务器运行在进程和操作系统的信任边界内。不要仅为形式对称就给 stdio 添加虚假的浏览器 OAuth 流程。

对于远程 Streamable HTTP，在每个请求的 `Authorization` 请求头中发送持有者令牌。绝不将其放入 URL。

### 从受保护资源元数据开始（Start with protected-resource metadata）

资源服务器发布 RFC 9728 元数据：

```json
{
  "resource": "https://notes.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:delete", "notes:read", "notes:write"]
}
```

客户端从 MCP 资源 URL 出发，获取此文档，选择已声明的授权服务器，再获取该服务器的 OAuth 或 OpenID Connect 元数据。

构造 RFC 9728 众所周知（well-known）URL 时，保留资源路径。对于资源 `https://notes.example.com/mcp`，本课使用 `https://notes.example.com/.well-known/oauth-protected-resource/mcp`。丢弃 `/mcp` 后缀可能选中同一来源下另一个受保护资源的元数据。

不要根据主机名猜测授权服务器。不要跟随从未验证错误正文中发现的签发者。为客户端愿意信任哪些签发者制定策略。

### 验证授权服务器元数据（Verify authorization server metadata）

元数据应公开端点及支持的控制措施：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "code_challenge_methods_supported": ["S256"],
  "authorization_response_iss_parameter_supported": true,
  "client_id_metadata_document_supported": true
}
```

要求 PKCE 使用 S256。记录精确签发者字符串。该精确值成为注册和令牌存储的键。

### 遵循注册优先级（Follow the registration priority）

当客户端已与选定签发者建立明确关系时，使用预注册客户端信息。否则，若授权服务器声明支持，优先使用客户端 ID 元数据文档。仅将 DCR 作为已弃用的兼容回退；若这些机制都不可用，再提示提供客户端信息。

### 优先使用客户端 ID 元数据文档（Prefer Client ID Metadata Documents）

客户端 ID 元数据文档向授权服务器提供一个 HTTPS URL，既作为客户端标识符，也作为其元数据的位置：

```json
{
  "client_id": "https://client.example.com/oauth/metadata.json",
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

授权服务器获取并验证文档。`client_id` 必须是带路径的 HTTPS URL，文档内的值必须与该 URL 完全相等。文档必需字段是 `client_id`、`client_name` 和 `redirect_uris`。此示例包含 `application_type`，但它不是 CIMD 的要求。新增的强制使用要求专门针对 DCR 路径。

将获取文档视为对服务器端请求伪造（SSRF）敏感的操作。解析并验证目的地，拒绝环回、私有、链路本地以及其他不允许的地址；在重定向和 DNS 变化后重新检查；限制重定向次数、字节数和耗时；要求 JSON，并仅按已验证的 HTTP 缓存控制进行缓存。将 `client_name` 和其他显示字段视为不可信文本。

CIMD 消除了每次首次接触都生成新动态标识符的需要，但不移除重定向 URI 验证、签发者策略或用户同意。

### DCR 是兼容路径（DCR is a compatibility path）

动态客户端注册仍可用于旧授权服务器，但对新的 MCP 实现已弃用。

使用 DCR 时，声明 `application_type`：

```json
{
  "client_name": "Notes desktop client",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"]
}
```

- 桌面、移动、命令行和环回客户端使用 `native`。
- 远程托管的浏览器应用使用 `web` 和远程 HTTPS 重定向。

省略此字段可能导致 OpenID Connect 注册实现默认采用 `web`，使合法的环回重定向失败。

将 DCR 代码置于显式回退决定之后。不要在任意 CIMD 验证失败后静默回退，否则可能把安全失败转成更弱的登记路径。

### 将凭据绑定到签发者（Bind credentials to the issuer）

以精确签发者为键存储该签发者生成的登记材料：

```text
issuer_credentials[issuer] = pre_registered_or_dcr_client
tokens[(issuer, resource)] = access_token
```

如果受保护资源发现从 `https://auth-one.example` 变为 `https://auth-two.example`，重新评估信任。绝不将第一个签发者的客户端秘密、DCR 客户端 id、注册访问令牌、刷新令牌或访问令牌发给第二个。预注册和 DCR 客户端必须使用为新签发者签发的凭据。

CIMD 客户端 id 不同，因为它是自行托管的 HTTPS URL，而非授权服务器生成的凭据。同一个 CIMD URL 可以迁移使用：新的可信签发者获取并验证文档，无需重新进行 DCR 注册。授权响应和令牌仍在新签发者名下验证和存储。

### 带 PKCE 的授权码（Authorization code with PKCE）

交互流程如下：

1. 生成高熵 `code_verifier`。
2. 派生 S256 `code_challenge`。
3. 发送授权请求，包含精确的 `client_id`、`redirect_uri`、`scope`、`code_challenge` 和 `resource`。
4. 接收包含 `code` 的授权响应，以及提供时的 `iss`。
5. 使用任何响应字段之前，将 `iss` 与记录的精确签发者比对。
6. 使用 `code_verifier`、相同的重定向 URI 和相同的 `resource` 交换授权码。
7. 将所得令牌存储在 `(issuer, resource)` 下。

RFC 8707 的 `resource` 参数同时出现在授权请求和令牌请求中。它标识规范的 MCP 服务器 URI。

### 精确验证 `iss`（Validate iss exactly）

RFC 9207 防止把一个签发者的授权响应与另一个签发者的响应混淆。

当 `iss` 存在时，将其与记录的签发者比较，不进行大小写折叠、尾部斜杠变更、默认端口移除或百分号编码规范化。不匹配时，不要使用授权码，甚至不要显示该响应中由攻击者控制的错误详情。

包含 `iss` 的授权服务器声明 `authorization_response_iss_parameter_supported: true`。即使缺少该声明，当前客户端仍验证已出现的 `iss`。

### 在 MCP 服务器验证受众（Validate audience at the MCP server）

资源服务器只接受签发给自身的令牌：

```text
token.issuer == configured_authorization_server
token.audience == canonical_mcp_resource
```

无效、过期、错误签发者或错误受众的令牌收到 401。MCP 服务器不得接受或转送面向其他服务的令牌。

### 请求当前所需的最小作用域（Request the smallest current scope）

从当前所需作用域开始。如果后续工具需要更多权限，服务器返回 403 和具有权威性的作用域质询：

```text
WWW-Authenticate: Bearer error="insufficient_scope",
  scope="notes:delete",
  resource_metadata="https://notes.example.com/.well-known/oauth-protected-resource/mcp"
```

客户端解释新增权限，取得同意，使用合并后的作用域集合执行新的授权流程，再以新的 JSON-RPC id 重试 MCP 请求。

不要假定质询中的作用域是 `scopes_supported` 的子集。该质询对当前操作具有权威性。

### 授权与无状态 MCP 线上协议（Authorization and the stateless MCP wire）

已授权工具调用仍携带完整的当前请求信封：

```text
POST /mcp
Authorization: Bearer <access-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.delete
```

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "notes.delete",
    "arguments": {"id": "note-7"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "oauth-lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

令牌授权主体。请求元数据协商协议行为。两者不能互相替代。

按固定顺序验证线上协议：JSON-RPC 和元数据类型、请求头与正文相等、然后检查协议支持。路由或版本请求头不匹配时，返回 HTTP 400 和 `-32020`。若请求头与正文一致但版本不受支持，返回 HTTP 400 和 `-32022`，且 `data` 必须恰为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

每个请求错误，包括 401 无效令牌和 403 作用域不足，都采用带原请求 `id` 的 JSON-RPC 错误信封。结构化恢复信息放入可选的错误 `data`；`WWW-Authenticate` 仍是 HTTP 响应头。通知没有 `id`，因此不接收 JSON-RPC 正文。接受的 HTTP 通知返回 202 和空正文。

服务器实现 `server/discover` 并声明工具，因此也实现必需的 `tools/list` 方法。工具描述符具有稳定名称、描述以及以对象为根的 `inputSchema` 值。列表具有确定性，并返回 `resultType`、服务器身份元数据、有界的 `ttlMs` 和 `cacheScope`。发现与不依赖用户的工具列表可在授权前提供。如果任一结果随主体变化，应应用正常策略和私有缓存。

### 不透传令牌（No token passthrough）

MCP 服务器不得将客户端的 MCP 访问令牌转发到下游 API。应获取具有正确受众的独立下游令牌，或采用显式的令牌交换设计。只有服务拒绝为别人签发的令牌，受众验证才有效。

### 刷新令牌（Refresh tokens）

刷新令牌是可选的。签发后应保密存储，并以签发者和资源为键。不要假定它们存在。当授权服务器支持轮换时进行轮换，并检测已失效值的复用。

```figure
t3-scope-stepup
```

## 动手实现（Build It）

`code/main.py` 是进程内协议与授权模拟器。它实现受保护资源发现、授权服务器元数据、CIMD 登记、受版本门控的 DCR 回退、应用类型检查、PKCE、签发者验证、资源绑定令牌、作用域提升、`server/discover`、`tools/list` 和无状态工具请求。

模型接收已解析的请求正文和路由请求头。它不是完整 HTTP 适配器，不解析 `Content-Type` 或 `Accept`。将其连接到第 09 课的 Streamable HTTP 适配器，该适配器要求 `Content-Type: application/json`，且 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/16-mcp-security-oauth-2-1
python3 code/main.py
python3 -m unittest discover code/tests -v
```

输出先展示发现，再展示 CIMD 登记、普通读取、两次独立的作用域提升，以及按签发者索引的凭据存储。

## 实际应用（Use It）

将模拟器对象映射到生产组件：

- `ResourceServer.protected_resource_metadata` 成为 RFC 9728 端点。
- `AuthorizationServer.metadata` 成为 RFC 8414 或 OpenID Connect 发现。
- `Client.enroll` 成为 CIMD 解析加显式 DCR 兼容分支。
- 签发者生成的客户端凭据和 `tokens_by_issuer_resource` 成为加密记录。CIMD URL 可以保持可迁移性，但其授权结果仍绑定签发者。
- `ResourceServer.handle` 成为中间件，在分发前验证当前 MCP 请求头、令牌和工具作用域，并让每个请求错误都保留在匹配的 JSON-RPC 信封中。

## 交付（Ship It）

本课交付 `outputs/skill-oauth-scope-planner.md`。它现在设计登记优先级、绑定签发者的凭据存储、应用类型、PKCE、资源指示符、作用域质询和当前无状态请求边界。

## 练习（Exercises）

1. 添加刷新令牌轮换，拒绝复用前一个刷新令牌。
2. 添加签发者允许列表。签发者变化时，仅复用可迁移的 CIMD URL；拒绝所有先前签发者生成的凭据和令牌。
3. 为授权码添加到期时间，确认延迟交换会失败。
4. 构建使用远程 HTTPS 重定向的 Web 客户端变体，比较其 DCR 元数据与原生客户端的差异。
5. 在同一签发者下添加第二个资源。确认其访问令牌不能用于第一个资源。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| 受保护资源元数据（Protected-resource metadata） | 标识资源和授权服务器的 RFC 9728 文档 |
| CIMD | URL 作为 OAuth 客户端标识符的 HTTPS 元数据文档 |
| DCR | 已弃用、为兼容而保留的动态客户端登记 |
| `application_type` | `native` 或 `web`，用于验证重定向 URI 规则 |
| PKCE | 通过验证器和 S256 质询保护被截获的授权码 |
| `iss` | RFC 9207 授权响应签发者标识符 |
| 资源指示符（Resource indicator） | 将令牌请求绑定到 MCP 资源的 RFC 8707 参数 |
| 受众（Audience） | 令牌对其有效的资源 |
| 权限提升（Step-up） | 为当前操作的额外作用域重新取得同意并签发令牌 |
| 签发者绑定凭据（Issuer-bound credentials） | 按精确授权服务器签发者隔离的注册与令牌记录 |

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 授权规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [RFC 9728：OAuth 2.0 受保护资源元数据](https://www.rfc-editor.org/rfc/rfc9728)
- [RFC 8707：OAuth 2.0 资源指示符](https://www.rfc-editor.org/rfc/rfc8707)
- [RFC 9207：OAuth 2.0 授权服务器签发者标识](https://www.rfc-editor.org/rfc/rfc9207)
- [OAuth 客户端 ID 元数据文档草案](https://datatracker.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/)
