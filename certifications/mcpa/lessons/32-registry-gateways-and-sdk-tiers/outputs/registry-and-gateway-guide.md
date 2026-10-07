# 注册目录与网关指南（Registry and Gateway Guide）

面向 MCPA“用例与生态”领域的一页参考，对齐 MCP 2026-07-28。本课固定资料将 MCP Registry 列为预览阶段，正式可用前可能发生破坏性变更或数据重置。

## 注册目录准入清单

server.json 条目需要满足下列条件：

- [ ] 名称为反向 DNS 与服务器名组合，例如 GitHub 认证的 `io.github.username/server`，或域名认证的 `com.example/server`。
- [ ] 发布者通过 GitHub OAuth、DNS TXT 或 well-known HTTP 文件证明控制该精确 authority；未验证或属于他人的命名空间被拒绝。
- [ ] 服务器公开可访问：公开 npm、PyPI、NuGet、Cargo、OCI 软件包，或公网远程 URL；私网及私有源条目不进入公共目录。
- [ ] 发布版本唯一且不可变，不用 `^1.2.3`、`~1.2.3`、`>=1.2.3`、`1.x` 等范围。
- [ ] 制品所有权标记与 server.json 相符：npm 的 `mcpName`；PyPI、NuGet、Cargo README 的 `mcp-name: name`（Cargo 要求可见文本）；Docker／OCI 的 `io.modelcontextprotocol.server.name` 标签。

## packages 与 remotes

| 字段 | 指向 | 何时选择 |
|---|---|---|
| `packages` | npm、PyPI、NuGet、Cargo、OCI 或 MCPB 上可在本地启动的制品 | 希望本地运行服务器 |
| `remotes` | 直接提供服务的 `streamable-http` 或已弃用 `sse` URL | 希望通过网络调用托管服务 |

同一条目可同时包含两者，由宿主选择。顶层 `version` 应与底层软件包或远程 API 版本含义保持一致。

## 必须区分的版本

server.json 的 `$schema` URL，例如 `.../schemas/2025-12-11/server.schema.json`，描述元数据格式；它独立于运行服务器在 `server/discover` 中声明的 MCP 协议版本 `2026-07-28`。两者不能互相证明。

## 网关请求处理顺序

1. 解析 `params._meta`，确认 `io.modelcontextprotocol/protocolVersion` 和 `io.modelcontextprotocol/clientCapabilities` 存在。
2. 核对 `MCP-Protocol-Version`、`Mcp-Method`，以及 `tools/call`、`resources/read`、`prompts/get` 的 `Mcp-Name`。不一致时在第 3 步前返回 `HeaderMismatch`、`-32020` 和 HTTP `400`。
3. 使用已核对的镜像头选择路由。
4. 检查调用方是否有权访问相应后端、工具或资源。
5. 转发新的、自描述请求，不把调用方令牌塞进 JSON-RPC 正文；分跳授权仍须单独正确实现。
6. 向客户端保留 `resultType`、`ttlMs` 和 `cacheScope`。

## cacheScope 规则

`"private"` 结果只能在相同授权上下文中复用；`"public"` 可跨调用方共享。`cacheScope` 只是缓存提示，不替代访问控制。

## SDK 等级要求

| 要求 | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| 符合性通过率 | 100% | 80% | 无最低值 |
| 新协议功能 | 规范发布前或同时 | 6 个月内 | 无时间承诺 |
| Issue 分诊 | 2 个工作日内 | 1 个月内 | 无要求 |
| P0 关键缺陷修复 | 7 天内 | 2 周内 | 无要求 |
| 稳定版本 | 必需 | 至少一个 | 不要求 |
| 路线图 | 公开 | 公开，或说明保留 Tier 2 的理由 | 不要求 |

任何等级都不强制实现 Tasks、MCP Apps、Skills 等扩展。

## 降级阈值

- Tier 1 到 Tier 2：当前稳定版本任一符合性测试连续失败 4 周。
- Tier 2 到 Tier 3：超过 20% 测试连续失败 4 周。
- 两个等级均可能因问题持续 2 个月无人处理而降级。
- 晋级须自评、附证据提出 issue、通过符合性测试，并获 SDK 工作组认可。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 9、10、15 节。
