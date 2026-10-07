# 用例决策矩阵（Use Case Decision Matrix）

面向 MCPA“用例与生态”领域的一页参考，对齐 MCP 2026-07-28。先回答四个问题，再选择对应行。

## 四个问题

1. 谁发起操作：模型、应用、用户，还是无人值守系统？
2. 数据多敏感：公开，还是某个用户或组织私有？
3. 工作持续多久：一次请求响应，还是数分钟以上？
4. 结果是否需要交互界面，现场是否有人进行授权或同意？

## 决策矩阵

| 用例 | 原语 | 传输 | 授权路径 | 扩展 | 缓存范围 |
|---|---|---|---|---|---|
| 开发工具：本地代码搜索、文件访问 | 工具 | stdio | 环境凭据，无 OAuth 流程 | 无 | private |
| 数据访问：工单、文档、记录等只读上下文 | 资源 | Streamable HTTP | 交互式 OAuth 2.1 与 PKCE | 无 | 用户特定时 private，否则 public |
| 企业业务记录系统 | 工具或资源 | Streamable HTTP | 企业托管授权 | `io.modelcontextprotocol/enterprise-managed-authorization` | private |
| 工作流自动化和长时间任务 | 工具 | Streamable HTTP | 交互式 OAuth 2.1，或无人值守客户端凭据 | `io.modelcontextprotocol/tasks` | private |
| 仪表盘、表单、查看器等交互 UI | 工具 | Streamable HTTP | 交互式 OAuth 2.1 | `io.modelcontextprotocol/ui`，保留文本回退 | private |
| 可复用工作流与技能 | 提示词，配合 Skills over MCP | Streamable HTTP | 交互式 OAuth 2.1 | `io.modelcontextprotocol/skills` | 按内容 public 或 private |
| 机器间集成 | 工具 | Streamable HTTP | 无人参与的客户端凭据授权 | `io.modelcontextprotocol/oauth-client-credentials` | private |

## 不需要 MCP 的情况

没有外部系统和第二个消费者的字符串格式化、算术、本地变量拼接提示词，无需协议边界。只有客户端和服务器确需跨进程或组织互操作时，JSON-RPC、发现和授权开销才有价值。没有这类边界时，直接调用函数。

## 每个用例都要考虑的四类运维问题

| 问题 | 需要决定 |
|---|---|
| 授权路径 | stdio 环境凭据；有人参与的 OAuth 2.1；无人值守客户端凭据；中央 IdP 管理的企业授权 |
| 缓存范围 | 无用户敏感信息为 `public`，存在则为 `private`；仅用于六种可缓存操作，不独立执行访问控制 |
| 同意 | 有人参与的敏感或缓慢操作可用 MRTR；无人值守时使用预授权范围，不等待信息征询 |
| 可观测性 | 经 `_meta` 传播 `traceparent` 和 `tracestate`；审计按已认证主体记录，不采用自报 `clientInfo` |

## 考试要点

- 工具由模型控制，资源由应用驱动，提示词由用户控制；控制方决定原语，传输或数据格式不替它作决定。
- 扩展需主动启用，默认关闭；不支持时应提供适当核心回退。
- cacheScope 控制跨授权上下文共享，不构成访问控制。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10、14 节。
