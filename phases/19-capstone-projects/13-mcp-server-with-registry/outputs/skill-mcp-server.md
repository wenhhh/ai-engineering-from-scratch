---
name: mcp-server-platform
description: 设计无状态 MCP 2026-07-28 服务器，具备注册中心元数据、实时发现、授权、策略、审计与扩展证据。
version: 2.0.0
phase: 19
lesson: 13
tags: [capstone, mcp, stateless, streamable-http, oauth, registry, governance]
---

给定内部平台需求，设计目标协议修订版为 `2026-07-28` 的无状态 MCP 服务器及治理边界（Governance Boundary）。

构建计划（Build Plan）：

1. 模式有效的 `server.json`，其反向域名（Reverse-DNS）名称匹配发布者已认证命名空间。
2. 必需的 `server/discover`，用于实时版本、能力、扩展与服务器身份。
3. 每个请求 `_meta` 中含版本与客户端能力；每个结果中含 `resultType` 与服务器身份。
4. 确定性 `tools/list`，带 `ttlMs` 和 `cacheScope`。
5. 仅 POST 的可流式 HTTP（Streamable HTTP），具有必需的版本、方法、名称请求头；没有协议会话、GET 流、会话 DELETE 或重放请求头。
6. 授权（Authorization）在每次调用中验证签发者、受众、有效期与权限范围。
7. 对主体、工具、目标和规范化参数制定策略。将高风险审批绑定到精确操作与有效期，然后证明更改一个参数就会拒绝重放。
8. 脱敏审计与轨迹证据放在模型可见上下文之外。
9. 注册中心适配器验证 `server.json`、探测 `server/discover`，并报告元数据／运行时漂移。
10. 两个可互换副本，以及无会话亲和性（Session Affinity）的并发负载探测。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 协议正确性 | 无状态封装、发现、结果、请求头和负例 |
| 20 | 授权 | 签发者、受众、有效期、权限范围和精确操作审批案例 |
| 15 | 注册中心完整性 | 有效 `server.json`、实时探测和漂移报告 |
| 15 | 策略与安全 | 允许、拒绝、格式错误、过期审批和敏感数据案例 |
| 15 | 规模 | 两个副本不依赖亲和性，另有取消与恢复 |
| 10 | 可审计性 | 接收端脱敏审计与轨迹证据 |

直接判定不合格的情况（Hard Rejects）：

- 当前 MCP 设计使用 `initialize`、`notifications/initialized` 或 `Mcp-Session-Id`。
- 将 `server.json` 当作实时能力发现，或自创 `.well-known/mcp-capabilities` 为 MCP 要求。
- 发布的服务器名不属于该发布者已认证命名空间。
- 未验证签发者及受众或资源，就接受令牌。
- 将工具注解或聊天审批当作授权。
- 审计记录持久保存密钥或原始敏感数据。

拒绝规则（Refusal Rules）：

- 拒绝仅凭本地模拟声称生产就绪。
- 没有策略和操作绑定审批证据时，拒绝暴露状态变更工具。
- 拒绝发布指向无法验证实时发现的端点的元数据。

输出：构建计划与证据矩阵，涵盖发布元数据、实时发现、无状态传输、工具模式、授权、策略、审批、审计和规模。最后指出风险最高的边界，以及证明该边界在失败时默认拒绝（Fail Closed）的确切失败测试。
