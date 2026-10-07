# OAuth 授权流程检查清单（OAuth Authorization Flow Checklist）

用于 HTTP MCP 服务器授权的一页参考，对齐 MCP 2026-07-28。

## 三个角色

- MCP 服务器：OAuth 2.1 资源服务器，接受或拒绝 bearer 令牌。
- MCP 客户端：OAuth 2.1 客户端，驱动授权流程并将令牌附到请求中。
- 授权服务器：认证用户并签发令牌的独立服务。
- stdio 服务器不应运行这套流程，应从环境读取凭据。

## 受保护资源元数据发现（收到 401 后）

1. 解析 `WWW-Authenticate` 中的 `resource_metadata="..."`；存在时获取该 URL，无须再尝试回退地址。
2. 否则按以下顺序尝试 well-known URI：
   - `https://<host>/.well-known/oauth-protected-resource<path>`（路径专用）
   - `https://<host>/.well-known/oauth-protected-resource`（根位置）

文档包含 `resource`，以及至少有一项的 `authorization_servers`。

## 授权服务器元数据发现

签发者含路径时（`https://auth.example.com/tenant1`）：

1. `https://auth.example.com/.well-known/oauth-authorization-server/tenant1`
2. `https://auth.example.com/.well-known/openid-configuration/tenant1`
3. `https://auth.example.com/tenant1/.well-known/openid-configuration`

签发者不含路径时（`https://auth.example.com`）：

1. `https://auth.example.com/.well-known/oauth-authorization-server`
2. `https://auth.example.com/.well-known/openid-configuration`

返回文档的 `issuer` 必须与构造 URL 所用的签发者标识一致。即使获取成功，不匹配的文档也必须拒绝。

## PKCE

- 必须使用 PKCE；具备相应技术能力时使用 `S256`。
- 授权服务器元数据缺少 `code_challenge_methods_supported` 时停止，不能假定其支持 PKCE。
- 使用标准库 `hashlib` 和 `base64` 计算 `code_challenge = base64url(sha256(code_verifier))`。

## 资源指示符（RFC 8707）

- 授权请求与令牌请求都发送 `resource`，即使授权服务器忽略它。
- 值为 MCP 服务器的规范 URI：方案和主机名小写，无片段标识；除非有实际意义，否则不含末尾斜杠。
- 示例：`https://mcp.example.com/mcp`。

## iss 校验（RFC 9207）：四行决策表

| 服务器声明 `authorization_response_iss_parameter_supported` | 响应中的 `iss` | 客户端动作 |
|---|---|---|
| true | 存在 | 与记录的签发者精确比较 |
| true | 缺失 | 拒绝响应 |
| false 或缺失 | 存在 | 与记录的签发者精确比较 |
| false 或缺失 | 缺失 | 继续 |

重定向前记录预期签发者。错误响应也应用此检查。

## 令牌使用

- 每个 HTTP 请求附加 `Authorization: Bearer <token>`，绝不放入查询字符串。
- 服务器必须将令牌受众与自身规范 URI 比较，不匹配则拒绝。
- 禁止向上游 API 透传令牌；上游调用使用独立令牌。
- 不保证一定签发刷新令牌；公共客户端使用的刷新令牌应轮换。

## 状态码

| 代码 | 名称 | 情形 |
|---|---|---|
| 401 | 未授权（Unauthorized） | 令牌缺失、无效、过期或受众错误 |
| 403 | 禁止访问（Forbidden） | 令牌有效，但缺少所需权限范围 |
| 400 | 错误请求（Bad Request） | 授权请求本身格式错误 |

## 考试要点

- 令牌缺失或无效的拒绝发生在 HTTP 层，不带 JSON-RPC 错误正文。
- 未声明支持 `S256` 时必须停止 PKCE 流程，不能只给出警告后继续。
- 格式正确且未过期的令牌，受众错误时仍返回 401。
- 客户端注册，即如何取得 `client_id`，以及运行时增量授权，分别由其他课程介绍。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 12 节。
