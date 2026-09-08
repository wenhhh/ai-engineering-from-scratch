---
name: mcp-client-harness
description: 搭建多服务器 MCP 客户端，具有现代元数据、安全时期协商、确定性合并与路由。
version: 2.1.0
phase: 13
lesson: 08
tags: [mcp, client, stateless, compatibility, routing]
---

给定 MCP 服务器传输列表，生成优先采用 MCP `2026-07-28`、隔离旧版兼容的客户端运行框架（Harness）。

产出：

1. 对端配置（Peer configuration）。将稳定服务器名称映射到固定命令或端点、参数、环境允许列表、授权上下文、传输种类，以及默认 false 的显式 `allow_legacy` 标志。
2. 现代请求构建器（Modern request builder）。在序列化前立即向每个 `params._meta` 写入协议版本、当前客户端能力与推荐客户端身份。
3. stdio 时期探测（stdio era probe）。先发 `server/discover`。接受有效 DiscoverResult，在双方支持的现代版本上重试 `-32022`，将 `-32020` 与 `-32021` 当作可纠正的现代错误。
4. 旧版兼容探测（Legacy compatibility probe）。将未识别错误、超时、连接关闭或空响应视为歧义。仅在确切对端具有 `allow_legacy: true` 时，发送一次带期限的 `initialize`。只有关联匹配的 JSON-RPC 成功结果包含配置的旧版修订版、对象能力和非空服务器身份，才选择旧版。否则失败关闭。
5. 工具缓存（Tool cache）。在协商的授权上下文中遵守 `ttlMs` 与 `cacheScope`，将缺失的旧版 `resultType` 视为 `"complete"`。
6. 命名空间合并（Namespace merge）。对对端和工具排序；冲突时加前缀或拒绝，禁止静默覆盖。
7. 路由器（Router）。将规范工具名映射到对端与本地名，创建新请求 id，发送时期正确的请求，校验响应 id。
8. 恢复（Recovery）。传输丢失时让在途工作失败，重启或重连，重新发现和列举，重开订阅，只重试安全策略允许的操作。

硬性拒绝条件：

- 发送没有当前 `_meta` 的现代请求。
- 遇到已识别现代错误后回退到初始化。
- 向未显式列入旧版兼容允许列表的对端发送 `initialize`。
- 把超时、连接关闭、空响应、未识别错误、格式错误结果或不支持的修订版当成旧版行为证明。
- 把进程、连接或 `Mcp-Session-Id` 当作现代协议状态。
- 跨授权上下文共享私有缓存列表。
- 静默覆盖重复工具名。
- 接受没有 `resultType` 的现代成功结果。

拒绝规则：

- 拒绝启动固定允许列表之外的命令。
- 工具所有者含糊时拒绝路由。
- 没有应用幂等键或用户决策时，拒绝自动重试非幂等调用。

输出完整 Python 运行框架、至少六项一致性测试，以及列出对端、选定时期、选定版本、缓存范围和规范工具名的启动报告。
