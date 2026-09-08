# 生产环境中的 MCP 授权：签发者绑定登记与令牌（MCP Auth in Production: Issuer-Bound Enrollment and Tokens）

> 第 16 课构建了 OAuth 2.1 状态机。本课为 MCP 2026-07-28 加固其生产边界：优先使用客户端 ID 元数据文档，已弃用的动态注册仅用于兼容，验证授权响应签发者，按签发者索引客户端凭据，刷新 JWKS，并在每个无状态请求上使用受众固定的令牌。
>
> **规范说明（Spec note，2026-07-28）：** 动态客户端注册已弃用，改为优先使用客户端 ID 元数据文档。DCR 仍是兼容机制。使用时，客户端声明正确的 `application_type`。客户端验证出现的 RFC 9207 `iss` 值，绝不跨授权服务器签发者复用凭据。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 13 · 16（OAuth 2.1 状态机），Phase 13 · 17（网关）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 通过 RFC 8414 元数据发现授权服务器并验证契约。
- 通过客户端 ID 元数据文档登记，并将已弃用 DCR 隔离为回退。
- 验证 RFC 9207 `iss`，按授权服务器签发者索引注册，并按签发者加资源索引资源绑定令牌。
- 定时缓存并刷新 JWKS 密钥，使签名验证能度过密钥轮换。
- 用 RFC 8707 资源指示符将令牌固定到单个 MCP 资源，并拒绝混淆代理式复用。
- 选择 JWT 验证或令牌内省，定义撤销新鲜度，并在身份依赖不可用时安全失败。
- 分离授权服务器、资源服务器和客户端，让各方仅执行自己的检查。
- 根据部署清单审计授权服务器，拒绝不安全登记或令牌复用。

## 问题（The Problem）

第 16 课模拟器在内存中运行 OAuth 2.1。生产环境有三个纯内存模拟器看不到的运维缺口。

第一个是登记和凭据隔离。真实组织可能运行数百个 MCP 服务器和数千个 MCP 客户端。2026-07-28 修订优先采用**客户端 ID 元数据文档（Client ID Metadata Document）**：客户端使用自己控制的、带路径的 HTTPS URL 作为标识符，由授权服务器拉取元数据。RFC 7591 动态注册仅作为已弃用的兼容路径保留。DCR 无法避免时，请求声明正确的 `application_type`。客户端按授权服务器签发者存储注册，按 `(issuer, resource)` 对存储访问令牌。签发者变化意味着新登记，不同资源意味着单独绑定受众的令牌。

第二个是密钥轮换。JWT 验证依赖授权服务器的签名密钥，它们以 JSON Web 密钥集（JWKS）发布。授权服务器定期轮换密钥，通常每小时一次，事件响应时可能更快。仅在启动时获取一次 JWKS 的 MCP 服务器，在轮换窗口到来前验证正常，随后每个请求都会失败直到重启。生产环境将 JWKS 接为缓存值，通过刷新作业在旧密钥到期前覆盖缓存，并在缓存未命中时回退获取，以处理比缓存更新的密钥签发的令牌。

第三个是受众绑定。第 16 课介绍了 RFC 8707 资源指示符。在生产中，该指示符成为每个请求上的硬性声明检查。MCP 服务器将 `token.aud` 与自身规范资源 URL 比较，不匹配则以 HTTP 401 拒绝。这是阻止上游 MCP 服务器，或持有面向一个服务器令牌的恶意客户端，将令牌重放到同一信任网络中另一个服务器的唯一防御。

本课将每个缺口映射到具体实现面。元数据文档是 HTTP 端点。JWKS 缓存刷新是定时作业加键值缓存。JWT 验证是资源服务器分发任何工具前运行的例程。分离三个角色，各自只执行拥有的检查：授权服务器签发并轮换密钥，资源服务器缓存并验证，客户端发现并登记。

## 范围：第 16 课之后的生产执行（Scope: Production Enforcement After Lesson 16）

[第 16 课：使用 OAuth 2.1 的 MCP 安全](../../16-mcp-security-oauth-2-1/docs/en.md) 负责授权码状态机、PKCE、受保护资源发现、资源指示符和作用域决定。本课不定义第二套 OAuth 流程，而是从这些契约已经存在之后开始，考察已部署的资源服务器如何在密钥轮换、不透明令牌验证、撤销、依赖故障、发布和事件响应期间持续执行它们。

生产边界更窄，也更偏向运维：

- JWT 路径在每个请求上验证固定签发者、算法、签名密钥、受众、时间声明和作用域，同时安全刷新 JWKS。
- 不透明令牌路径调用签发者的已认证内省端点，验证返回的活动状态、受众或资源、到期时间、主体和作用域。
- 撤销策略定义凭据必须多快停止工作，以及哪个缓存可能延迟这一事实。
- 失败策略决定发现、JWKS、内省或撤销基础设施不可用时如何处理。
- 证据记录哪些签发者元数据、密钥集或内省响应、令牌声明、策略版本和拒绝原因驱动了结果，但不存储令牌。

这种区分让课程可组合。第 16 课证明流程，第 18 课证明令牌到达真实 MCP 请求路径后仍可信，或被拒绝。

## 概念（The Concept）

### RFC 8414：OAuth 授权服务器元数据（OAuth Authorization Server Metadata）

位于 `/.well-known/oauth-authorization-server` 的文档描述客户端所需的一切：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "client_id_metadata_document_supported": true,
  "registration_endpoint": "https://auth.example.com/register",
  "authorization_response_iss_parameter_supported": true,
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
  "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
```

给定 MCP 资源 URL，客户端串联发现：RFC 9728 的 `oauth-protected-resource`（资源服务器文档）指出签发者，然后本 RFC 的 `oauth-authorization-server` 指出每个端点。客户端绝不硬编码授权 URL。

对于带路径的资源标识符，在该路径之前插入 well-known 段。例如，`https://mcp.example.com/team/server` 在 `https://mcp.example.com/.well-known/oauth-protected-resource/team/server` 解析受保护资源元数据。在资源路径后追加 `/.well-known/...` 是错误的。

信任身份提供者（IdP）用于 MCP 前，应验证以下契约：

- `code_challenge_methods_supported` 包含 `S256`（RFC 7636 的 PKCE）。规范明确：若此字段**缺失**，授权服务器不支持 PKCE，客户端**必须**拒绝继续。
- `grant_types_supported` 包含 `authorization_code`，拒绝 `password` 和 `implicit`。
- 至少有一条登记路径可用：`client_id_metadata_document_supported: true`（CIMD，首选）、预注册客户端，或 `registration_endpoint`（已弃用的 RFC 7591 兼容）。
- 若 `authorization_response_iss_parameter_supported` 为 true，客户端要求返回 RFC 9207 `iss`，并与重定向前记录的签发者精确比较。
- 对 OAuth 2.1，`response_types_supported` 必须恰为 `["code"]`。

如果缺少 `S256`，MCP 服务器拒绝针对该 IdP 部署，PKCE 没有降级模式。如果两种登记路径都未声明，且没有预注册 `client_id`，也无法登记；错的是部署清单，不是代码。

### RFC 9728 回顾：受保护资源元数据（Protected Resource Metadata）

第 16 课已介绍 RFC 9728。生产中的变化是：客户端只在此文档中查找**这个** MCP 服务器信任的授权服务器。单个 MCP 服务器可接受多个 IdP 的令牌，例如一个面向员工，一个面向合作伙伴。RFC 9728 声明这个集合；RFC 8414 描述每个 IdP 支持什么。

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com", "https://partners.example.com"],
  "scopes_supported": ["mcp:tools.invoke"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://notes.example.com/docs"
}
```

### 客户端 ID 元数据文档：推荐默认值（Client ID Metadata Documents）

CIMD 将注册从*推送*反转为*拉取*。客户端不再要求授权服务器生成 `client_id`，而是将自己控制的 HTTPS URL **用作** `client_id`。URL 解析为 JSON 元数据文档，授权服务器在 OAuth 流程中按需获取。信任根植于 DNS：如果服务器运营者信任 `app.example.com`，就信任由 `https://app.example.com/client.json` 提供的客户端。没有注册往返，没有可耗尽的 `client_id` 命名空间，也没有要同步的逐服务器状态。

客户端托管的元数据文档：

```json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

文档中的 `client_id` 值**必须**等于提供该文档的 URL，授权服务器会验证并拒绝不匹配。授权服务器在 RFC 8414 元数据中以 `client_id_metadata_document_supported: true` 声明支持。

当前 CIMD 契约要求 `client_id`、`client_name` 和非空 `redirect_uris` 数组。客户端标识符是带路径的绝对 HTTPS URL。可以包含 `application_type`，但它不是 CIMD 必需字段。不要把 DCR 的 `application_type` 要求复制到首选 CIMD 路径。

规范明确指出两个安全事实：

- **服务器端请求伪造（SSRF）。** 授权服务器获取攻击者提供的 URL，必须防御 SSRF，不得访问内部或管理端点。
- **localhost 冒充（localhost impersonation）。** 仅靠 CIMD 无法阻止本地攻击者声称使用合法客户端元数据 URL，并绑定任意 `localhost` 重定向。授权服务器**必须**在同意期间清楚显示重定向 URI 主机名，并**应当**警告仅使用 `localhost` 的重定向。

由于 CIMD 不需要服务器端状态，无需像 DCR 那样搭建注册服务。客户端一侧是只读的：通过静态 HTTPS 端点提供元数据文档，让授权服务器拉取。

如果授权服务器运营者已经配置客户端标识符，在尝试自动登记前使用该签发者范围内的注册。否则优先 CIMD。只有签发者既不能使用预注册也不能使用 CIMD 时，才用已弃用 DCR。

### RFC 7591：已弃用的兼容登记（Deprecated compatibility enrollment）

DCR 在 2026-07-28 修订中已弃用。仅为无法消费 CIMD 且预注册不切实际的授权服务器保留。兼容客户端提交：

```json
POST /register
Content-Type: application/json

{
  "application_type": "native",
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "mcp:tools.invoke",
  "client_name": "Cursor",
  "software_id": "com.cursor.cursor",
  "software_version": "0.42.0"
}
```

服务器返回 `client_id` 和用于后续更新的 `registration_access_token`：

```json
{
  "client_id": "c_3e7f1a",
  "client_id_issued_at": 1769472000,
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "registration_access_token": "regt_b2...",
  "registration_client_uri": "https://auth.example.com/register/c_3e7f1a"
}
```

`application_type` 不是装饰。环回桌面客户端声明 `native`；服务器托管客户端声明 `web` 并使用 HTTPS 重定向 URI。`token_endpoint_auth_method: none` 是公共原生客户端的正确默认值。它只获得 `client_id`，由 PKCE 提供持有证明。

三个生产陷阱：

- 注册端点必须按来源 IP 限流。否则恶意行为者可脚本化创建数百万假注册，耗尽 `client_id` 命名空间。在注册服务处理请求前执行限流检查。
- 某些企业 IdP 要求 `software_statement`，即为客户端担保的已签名 JWT。本课模拟省略它；生产中接入验证步骤，拒绝除 localhost 重定向 URI 之外的未签名注册。
- `registration_access_token` 必须存为哈希，不能明文存储。此令牌被盗意味着攻击者可重写客户端重定向 URI。

### RFC 8707 回顾：资源指示符（Resource Indicators）

第 16 课确立了结构。生产规则是：每个令牌请求包含 `resource=<canonical-mcp-url>`，MCP 服务器在每次调用验证 `token.aud` 匹配自身资源 URL。规范 URI 是服务器*最具体*的标识符：协议方案和主机小写，没有片段，通常没有尾部斜杠。路径部分**不是**一律剥离；规范在需要标识独立 MCP 服务器时保留它。`https://mcp.example.com`、`https://mcp.example.com/mcp`、`https://mcp.example.com:8443` 和 `https://mcp.example.com/server/mcp` 都是有效规范 URI。每个服务器选定一个，并将 `aud` 精确固定到它。本课为简洁使用 `https://notes.example.com` 这样的纯主机受众；在同一来源共同托管多个 MCP 服务器的部署通过路径区分它们。

### RFC 7636 回顾：PKCE（PKCE）

OAuth 2.1 强制要求 PKCE。本课授权码流程始终携带 `code_challenge` 和 `code_verifier`。服务器拒绝缺少验证器，或验证器哈希不等于已存质询的任何令牌请求。

### MCP 2026-07-28 授权配置（Authorization profile）

当前 MCP 修订保留 OAuth 资源服务器边界，同时让 MCP 传输无状态。没有可缓存身份决定的协议会话。因此授权层独立验证每个请求：

- 实现 RFC 9728 受保护资源元数据，并通过 401 上的 `WWW-Authenticate: Bearer resource_metadata="..."` 请求头**或** well-known URI `/.well-known/oauth-protected-resource` 提供位置。SEP-985 通过 well-known 回退使该请求头可选。元数据的 `authorization_servers` 字段**必须**至少指定一个服务器。
- 在**每个**请求上仅通过 `Authorization: Bearer ...` 接受令牌，绝不放入查询字符串，也绝不仅在会话开始时验证。
- 逐请求验证 `aud`、`iss`、`exp` 和所需作用域。服务器**必须**验证令牌专门为自身签发，即受众；缺少或不匹配的 `aud` 被拒绝，绝不视为通配符。
- 401/403 时返回 `WWW-Authenticate: Bearer`，携带 `error=...`、`resource_metadata="<PRM-URL>"` 参数，以及 `insufficient_scope`（403）时的 `scope="..."`。该 URL 指向元数据文档，*不是*裸资源。注意参数是作为发现指针的 `resource_metadata`，质询中没有 `resource` 参数。
- 授权服务器发现接受 RFC 8414 OAuth 元数据**或** OpenID Connect Discovery 1.0；客户端必须按优先顺序尝试两个 well-known 后缀。
- 客户端而非服务器防御**混淆攻击（mix-up attacks）**：重定向前记录期望的 `issuer`，并在兑换授权码前验证真实授权响应返回的 `iss` 值（RFC 9207）。PKCE 本身不能阻止混淆，因为客户端会将 `code_verifier` 交给被引导到的任何令牌端点。
- 客户端凭据属于一个授权服务器签发者。如果发现解析到不同签发者，客户端重新登记，而非出示旧 `client_id`、注册令牌或访问令牌。
- CIMD 是首选登记机制。DCR 已弃用；兼容 DCR 请求仍声明正确的 `application_type`。

OAuth 2.1 草案是基础；RFC 8414/7591/8707/9728/9207 + RFC 7636 + CIMD 是接口面；MCP 规范是配置约束。

### 部署能力清单（Deployment capability checklist）

供应商功能表很快过时。应检查实际部署的授权服务器返回的元数据。门槛是机械可检验的：

| 检查 | 必需决定 |
|---|---|
| 发现的签发者 | 策略期望的精确 HTTPS 签发者 |
| PKCE | 声明 `S256`，否则停止 |
| 登记 | 优先 CIMD，接受预注册，DCR 仅作已弃用兼容 |
| 授权响应 | `iss` 出现或被声明支持时，按 RFC 9207 验证 |
| 资源绑定 | 令牌请求携带 `resource`；资源服务器要求匹配 `aud` |
| 凭据存储 | 按签发者索引客户端 ID 和注册凭据；按签发者加资源索引访问令牌 |
| DCR 兼容 | 声明 `native` 或 `web`；拒绝不符合声明应用类型的重定向 URI |

不要从产品名或定价层级推断支持情况。将发现文档纳入部署证据，必需字段缺失时失败关闭。

### JWKS 刷新模式：AS 轮换，资源服务器刷新（JWKS refresh pattern）

分清两个动作，混淆它们是真实的生产缺陷：

- **轮换（Rotate）**由*授权服务器*执行：生成新签名密钥，将其发布到 JWKS，稍后退役旧密钥。资源服务器不参与，也不能做，因为它不持有 IdP 私钥。
- **刷新（Refresh）**由*资源服务器*执行：重新 `GET` 已发布 JWKS 到缓存。这是资源服务器唯一执行的 JWKS 操作。

生产失败模式是缓存过期。通过定时刷新作业加键值缓存解决。资源服务器运行作业，使用 cron、定时器或运行时提供的机制，按固定间隔获取 `<issuer>/.well-known/jwks.json`，覆盖 `cache[issuer] = {keys, fetched_at}`。验证器读取缓存。令牌的 `kid` 在缓存中缺失时，触发**一次**同步刷新回退，再重新检查。这同时处理定时刷新和密钥重叠窗口：全新密钥签名的令牌可能在下次定时刷新之前到达。

回退**必须重新获取，绝不能轮换**。若将缓存未命中路径接到轮换并生成密钥，会出现两个问题：一是新生成密钥的 `kid` *仍然*不匹配令牌，查找仍失败；二是攻击者散发随机 `kid` 令牌，迫使系统无限生成密钥，造成自我施加的拒绝服务（DoS）。重新获取是幂等的，因此伪造 `kid` 最多浪费一次获取。

缓存结构：

```json
{
  "https://auth.example.com": {
    "keys": [
      {"kid": "k_2026_03", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"},
      {"kid": "k_2026_04", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig"}
    ],
    "fetched_at": 1772668800
  }
}
```

同时有两个密钥是稳态。授权服务器在退役旧密钥 `k_2026_03` 前引入下一密钥 `k_2026_04`，因此旧密钥签发的令牌在到期前仍有效。缓存保存并集，验证器按 `kid` 选择。

### 验证例程（The validation routine）

MCP 服务器分发任何工具前运行验证。`code/main.py` 使用的结构：

```python
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
    return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
```

`validate` 解码 JWT，从 JWKS 缓存解析签名密钥，未命中时刷新一次，验证签名，再按允许列表检查 `iss`、按本服务器规范资源检查 `aud`，检查 `exp` 和所需作用域；首次失败时返回 `WWW-Authenticate` 质询。将其保留为资源服务器中的单个例程，意味着每个入口，即每次工具调用和每种传输，都经过相同检查；不存在不先验证就到达工具的路径。

### 不透明令牌使用内省，不靠猜测（Opaque tokens use introspection, not guesswork）

并非每个访问令牌都是 JWT。如果签发者说明令牌是不透明的，资源服务器不能将它解码成可信声明。它通过已认证后通道将令牌发往签发者的 RFC 7662 内省端点，要求 `active: true`、期望的签发者上下文、精确 MCP 受众或资源、未过期时间声明，以及具体工具要求的作用域。

按签发者、单向令牌摘要和 MCP 资源缓存内省。绝不把明文令牌用作日志或缓存标签。正向缓存条目的期限取令牌到期、签发者缓存指导和部署撤销新鲜度目标中最早者。负向缓存保持足够短，避免新签发令牌持续被误判为非活动。即使不透明令牌字符串相同，一个资源的结果也不能授权另一个资源。

不要从攻击者控制的令牌内容选择验证模式。根据已验证签发者元数据和部署配置固定 JWT 或内省行为。在 JWT 路径中，固定接受的算法和可信 `jwks_uri`；绝不跟随仅由令牌头选择的密钥 URL 或算法。

### 撤销是新鲜度契约（Revocation is a freshness contract）

RFC 7009 让客户端请求授权服务器撤销令牌。该请求不会抹掉每个资源服务器已经缓存的副本。定义最大可接受撤销延迟，并让每个缓存遵守它。

不透明令牌部署可通过对每次高风险调用内省，或使用短正向缓存，实现更紧的撤销时效。自包含 JWT 部署通常组合短访问令牌寿命、刷新令牌撤销、签发者整体事件中的密钥退役，以及可选的主体、会话或令牌 id 拒绝列表，以进行紧急本地拒绝。除非资源服务器持有当前外部撤销证据，签名 JWT 在到期前仍具密码学有效性。

退出登录、账户禁用、同意撤回和事件响应是不同触发器，但必须收敛到一个可测量陈述：最多经过声明的撤销窗口后，每个副本都拒绝凭据。通过负载均衡器测试它，而不只是对单个已预热进程测试。

### 依赖故障需要预先声明的决定（Dependency failure needs a declared decision）

绝不在异常处理器里临时编造可用性策略。

| 故障 | 安全的生产行为 |
|---|---|
| 定时 JWKS 刷新失败，已知 `kid` 仍在有效的有界缓存中 | 仅在声明的出错时允许过期窗口内继续，并发出健康降级证据 |
| 令牌具有未知 `kid`，且唯一允许的刷新失败 | 拒绝；绝不接受无法验证的签名 |
| 内省不可用 | 对受保护调用失败关闭；不把网络失败转成 `active: true` |
| 受保护资源或签发者元数据意外变化 | 停止新登记和令牌获取；仅在有界事件策略下保留显式固定且未过期的配置 |
| 撤销端点不可用 | 报告退出或撤销未完成；可行时在本地将凭据保留为不可用；不声称全局撤销成功 |
| 时钟源或声明类型无效 | 拒绝，而非不断放宽时钟偏差直到令牌通过 |

将故障与无效凭据分开分类。依赖中断是带健康和重试策略的运维错误。错误签名、签发者、受众、到期时间或作用域是授权拒绝。两者都不能到达工具处理器，也不应将令牌内容泄入审计证据。

### 受众重放演练：访问令牌权限限制（Audience-replay walkthrough）

服务器 A（`notes.example.com`）和服务器 B（`tasks.example.com`）都向同一授权服务器注册。A 被攻陷，攻击者取走用户的笔记令牌并向 B 重放。

服务器 B 的验证器：

1. 解码 JWT，按 `kid` 获取 JWKS，验证签名。
2. 按受保护资源元数据的 `authorization_servers` 检查 `iss`。通过，因为是同一 IdP。
3. 检查 `aud == "https://tasks.example.com"`。失败，因为令牌的 `aud` 是 `https://notes.example.com`。
4. 返回 401，包含 `WWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-protected-resource"`。

受众声明是协议层防御此攻击的唯一手段。为性能跳过它是最常见的生产错误；验证器必须在每个请求运行，而非仅会话开始时。规范称之为**访问令牌权限限制（access-token privilege restriction）**：MCP 服务器 `MUST` 拒绝任何受众中未指明自身的令牌。

> **命名说明（Naming note）。** 规范将*混淆代理（confused deputy）*保留给相关但不同的问题：MCP 服务器作为第三方 API 的 OAuth **代理**，使用静态客户端 ID，未取得逐客户端用户同意就转发令牌。受众绑定修复上述重放；混淆代理的修复是逐客户端同意，**加上**绝不将入站令牌透传给上游 API，MCP 服务器 `MUST` 获取独立的上游令牌。

### 混淆攻击：服务器无法提供的客户端防御（Mix-up attacks）

客户端在生命周期中会与许多授权服务器交互。恶意 AS 可能诱导客户端在攻击者令牌端点兑换诚实 AS 的授权码。受众绑定在此无效，因为攻击发生在令牌存在之前。防御位于客户端（RFC 9207）：

1. 重定向前，客户端从已验证 AS 元数据记录期望的 `issuer`。
2. 收到授权响应后，在将授权码发往任何地方之前，将返回的 `iss` 参数与记录签发者比较，采用简单字符串比较，不规范化。
3. 不匹配，或 AS 声明 `authorization_response_iss_parameter_supported` 却缺少 `iss`，则拒绝，甚至不显示 `error` 字段。

PKCE 本身不能阻止混淆，因为客户端会把 `code_verifier` 交给被引导到的任何令牌端点。因此规范逐请求记录签发者，并与 PKCE 验证器和 `state` 一同保存。

### 失败模式（Failure modes）

- **过期 JWKS（Stale JWKS）。** AS 轮换密钥后，验证器拒绝有效令牌。修复是上述定时刷新加未命中重新获取模式。绝不只缓存 JWKS 而没有刷新作业。
- **以轮换回退（Rotate-as-fall-back）。** 将未命中路径接到轮换并生成而非重新获取是真实缺陷：它永远不会产生缺失的 `kid`，还将攻击者控制的 `kid` 变成密钥创建 DoS。回退必须是幂等的 `refresh-jwks`。
- **缺少 `aud` 声明（Missing aud claim）。** 某些 IdP 默认省略 `aud`，除非令牌请求包含 `resource`。验证器必须拒绝缺少 `aud` 的令牌，不能将缺失当作通配符。
- **缺少 `iss` 检查导致混淆（Mix-up via missing iss check）。** 不将 RFC 9207 `iss` 授权响应参数与重定向前记录签发者比较的客户端，可能被引导到攻击者令牌端点兑换诚实 AS 的授权码。这是客户端故障，资源服务器无法补偿。
- **作用域升级竞态（Scope upgrade race）。** 同一用户的两个并发权限提升流程可同时成功，产生作用域不同的两个访问令牌。验证器必须使用请求出示的令牌，不能查找“用户当前作用域”，否则产生检查与使用时间差（TOCTOU）窗口。
- **注册令牌被盗（Registration token theft）。** 泄露的 `registration_access_token` 让攻击者重写重定向 URI。静态存储使用哈希，每次更新要求客户端出示明文，有疑虑时轮换。
- **未固定 `iss`（iss not pinned）。** 接受任意 `iss` 的验证器让攻击者可自建授权服务器，为目标受众注册客户端并签发令牌。受保护资源元数据的 `authorization_servers` 列表就是允许列表，必须执行。
- **凭据或令牌缓存冲突（Credential or token cache collision）。** 仅按资源索引注册的客户端可能向另一个授权服务器出示前者身份。仅按签发者索引访问令牌的客户端可能在错误受众处重放令牌。按已验证签发者索引注册，按 `(issuer, resource)` 索引访问令牌，签发者变化时重新登记。

```figure
t3-jwks-rotate
```

## 实际应用（Use It）

`code/main.py` 使用 Python 标准库和三个角色 `AuthorizationServer`、`ResourceServer`、`Client` 演示完整生产流程。流程如下：

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/18-mcp-auth-production
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

第一条命令打印签发者绑定登记和令牌验证过程。第二条报告十八项检查通过。两条命令都不打开网络监听器，也不写入凭据。

1. 授权服务器在 `/.well-known/oauth-authorization-server` 发布 RFC 8414 元数据。
2. MCP 客户端调用元数据端点，检查登记选项，即 CIMD 的 `client_id_metadata_document_supported`、DCR 的 `registration_endpoint`，以及 `S256` PKCE 支持。
3. 客户端检查签发者范围内的预注册，否则使用自己的 HTTPS 客户端 ID 元数据文档登记。已弃用 DCR 保留为可单独测试的兼容方法。
4. 客户端记录已验证签发者，创建 S256 质询，接收一次性授权码和 `iss`，验证返回签发者，并用原验证器及 RFC 8707 `resource` 指示符兑换授权码。
5. MCP 客户端通过 `Authorization: Bearer ...` 调用 MCP 服务器工具。
6. MCP 服务器运行 `validate`，从 JWKS 缓存解析签名密钥。
7. IdP 轮换密钥，定时刷新将 JWKS 重新拉入缓存。
8. 下次调用无需重启就按刷新后的密钥验证，旧令牌在重叠窗口期间仍可验证。
9. 向不同 MCP 资源发起的受众重放尝试得到 401，包含 `audience mismatch` 和 `resource_metadata` 指针。

这里的 JWT 使用带共享秘密的 HS256，使课程仅依赖标准库即可运行。生产使用 RS256 或 EdDSA 配合上述 JWKS 模式，其余验证逻辑相同。由于 IdP 和资源服务器位于同一进程，`refresh_jwks` 直接读取授权服务器密钥列表；在线上，它是对 `jwks_uri` 的 HTTP `GET`。

## 交付（Ship It）

本课生成 `outputs/skill-mcp-auth.md`。给定 MCP 服务器配置和 IdP 能力集，该技能输出要搭建的授权接口面：受保护资源元数据、所选登记路径（CIMD、预注册或 DCR 回退）、JWKS 刷新计划、作用域映射，以及 IdP 不支持完整 RFC 配置时的拒绝规则。

## 练习（Exercises）

1. 运行 `code/main.py`，追踪流程。注意 IdP 如何在第 6 步轮换密钥，定时 `refresh_jwks` 重新拉取已发布集合，以及旧令牌在重叠窗口内和新令牌如何无需重启都能验证。

2. 向受保护资源元数据的 `authorization_servers` 列表添加新 IdP。签发由新 IdP 签名的令牌，确认验证器接受。再签发由未列出 IdP 签名的令牌，确认验证器拒绝并返回 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"`。

3. 向 `register_client` 添加限流检查，在注册服务接受请求前运行。用一个按 IP 索引的小字典保存逐来源 IP 令牌桶。

4. 阅读 RFC 7591，找出本课 `/register` 处理器未验证的两个字段并添加验证。提示：`software_statement` 和 `redirect_uris` URI 方案。

5. 添加第二个授权服务器。确认客户端存储独立的签发者键控登记，并拒绝复用第一个签发者的令牌或 `client_id`。

6. 证明 DoS 修复有效。向验证器发送随机 `kid` 的令牌，确认 `refresh_jwks` 最多运行一次，且授权服务器密钥数量不增长。然后刻意将回退重新接到轮换并生成，观察每个伪造令牌都让密钥数上升，之后恢复重新获取。

7. 用 `native` 和 `web` 客户端练习已弃用 DCR。确认使用 HTTP 重定向 URI 的 Web 客户端，以及没有精确环回重定向的原生客户端都会被拒绝。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| ASM | “OAuth 元数据文档” | RFC 8414 `/.well-known/oauth-authorization-server` JSON |
| CIMD | “客户端元数据 URL” | 客户端 ID 元数据文档：HTTPS URL 用作 `client_id`，AS 拉取 JSON。MCP 2026-07-28 首选登记方式 |
| DCR | “自助客户端注册” | RFC 7591 `POST /register`；当前 MCP 已弃用，仅为兼容保留 |
| JWKS | “JWT 验证公钥” | JSON Web 密钥集，从 `jwks_uri` 获取，按 `kid` 索引 |
| 轮换与刷新（Rotate vs refresh） | “更新密钥” | *轮换*是 AS 生成或退役签名密钥；*刷新*是资源服务器重新获取已发布集合。资源服务器只刷新 |
| 资源指示符（Resource indicator） | “受众参数” | RFC 8707 `resource` 参数，将令牌固定到一个服务器 |
| `aud` 声明（aud claim） | “受众” | 验证器与规范资源 URL 比较的 JWT 声明 |
| 受众重放（Audience replay） | “令牌重放” | 将为服务器 A 签发的令牌出示给 B；通过受众验证防御，规范称访问令牌权限限制 |
| 混淆代理（Confused deputy） | “代理令牌误用” | 使用静态客户端 ID 的 MCP 代理未经逐客户端同意转发令牌；不同于受众重放 |
| 混淆攻击（Mix-up attack） | “错误令牌端点” | 客户端被引导到攻击者端点兑换诚实 AS 的授权码；客户端通过 RFC 9207 `iss` 防御 |
| `iss` 允许列表（iss allow-list） | “可信授权服务器” | 受保护资源元数据 `authorization_servers` 指定的集合 |
| `resource_metadata` | “PRM 文档在哪里” | 401/403 上指出 RFC 9728 元数据 URL 的 `WWW-Authenticate` 参数 |
| 公共客户端（Public client） | “原生或浏览器客户端” | 没有 `client_secret` 的 OAuth 客户端，由 PKCE 补偿 |
| `WWW-Authenticate` | “401/403 响应头” | 携带驱动客户端恢复的 `Bearer error=...` 指令 |

## 延伸阅读（Further Reading）

- [MCP 授权规范（2026-07-28）](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) - 当前 MCP 授权配置
- [MCP 2026-07-28 变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog) - CIMD、签发者验证、DCR 弃用和签发者键控凭据变化
- [OAuth 客户端 ID 元数据文档（draft-ietf-oauth-client-id-metadata-document-00）](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00) - CIMD
- [RFC 8414：OAuth 2.0 授权服务器元数据](https://datatracker.ietf.org/doc/html/rfc8414) - 发现契约
- [RFC 7591：OAuth 2.0 动态客户端注册协议](https://datatracker.ietf.org/doc/html/rfc7591) - DCR 回退路径
- [RFC 7636：授权码交换证明密钥（PKCE）](https://datatracker.ietf.org/doc/html/rfc7636) - 公共客户端持有证明
- [RFC 8707：OAuth 2.0 资源指示符](https://datatracker.ietf.org/doc/html/rfc8707) - 受众固定
- [RFC 9728：OAuth 2.0 受保护资源元数据](https://datatracker.ietf.org/doc/html/rfc9728) - 资源服务器发现
- [RFC 9207：OAuth 2.0 授权服务器签发者标识](https://datatracker.ietf.org/doc/html/rfc9207) - 防御混淆攻击的 `iss` 参数
- [RFC 7662：OAuth 2.0 令牌内省](https://datatracker.ietf.org/doc/html/rfc7662)
- [RFC 7009：OAuth 2.0 令牌撤销](https://datatracker.ietf.org/doc/html/rfc7009)
