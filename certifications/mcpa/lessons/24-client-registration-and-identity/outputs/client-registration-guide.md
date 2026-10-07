# 客户端注册指南（Client Registration Guide）

面向 MCPA“安全与治理”领域的一页参考，对齐 MCP 2026-07-28。

## 注册优先级

1. 已为该授权服务器保存的预注册凭据。
2. 授权服务器声明 `client_id_metadata_document_supported` 时，使用客户端 ID 元数据文档（CIMD）。
3. CIMD 不可用但存在 `registration_endpoint` 时，回退到已弃用的动态客户端注册（DCR）。
4. 请用户手动输入客户端信息。

## 授权服务器对 CIMD 的检查

| 检查 | 要求 |
|-------|-------------|
| 方案与路径 | client_id 是含实际路径的 HTTPS URL |
| 精确匹配 | 文档内 client_id 与获取文档的 URL 完全相同 |
| 必需字段 | client_id、client_name 和 redirect_uris 均存在 |
| 重定向 URI | 使用 HTTPS，或 localhost 上的 HTTP，并与授权请求相符 |
| 获取安全 | 防御 SSRF，遵循 HTTP 缓存头，对仅有 localhost 回调的情况强化警告 |

## DCR 的 application_type

- `native`：桌面应用、移动应用、CLI，以及通过 localhost 访问的本地托管应用。
- `web`：远程浏览器应用。
- OIDC 在省略字段时默认为 `web`，可能因此拒绝 localhost 重定向 URI。

## 授权服务器绑定

- 持久凭据按签发它们的 issuer 索引。
- 通过受保护资源元数据更新发现授权服务器变化。
- 不将一台授权服务器的凭据用于另一台；应重新注册。
- CIMD id 可跨授权服务器移植，DCR id 不具备这一属性。

## 混淆代理

代理通过共享静态 client id，代表多个动态注册下游客户端向第三方授权服务器转发请求时，必须先分别取得用户对每个下游客户端的同意。

## 授权扩展

| 扩展 | 适用场景 | 工作方式 |
|-----------|------|---------------|
| OAuth 客户端凭据 | CI 流水线、守护进程、后台服务，无交互式用户 | 客户端使用 JWT bearer assertion（推荐）或 client secret 认证 |
| 企业托管授权 | 通过企业身份提供方登录的员工 | 客户端将 SSO 身份断言换为 ID-JAG，再交换 MCP 访问令牌 |

两个扩展都需显式选择，通过 `clientCapabilities.extensions` 声明，不会默认启用。

## 考试要点

- DCR 已弃用；预注册之后，应优先采用 CIMD。
- CIMD 文档的 client_id 必须与获取 URL 精确匹配，否则授权服务器拒绝。
- 凭据按签发者索引，不能在不同授权服务器之间共享。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 12 节。
