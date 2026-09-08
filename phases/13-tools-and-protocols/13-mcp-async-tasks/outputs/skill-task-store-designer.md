---
name: task-store-designer
description: 使用当前任务扩展、无状态请求、显式所有权、轮询、输入更新与取消设计持久 MCP 工作。
version: 2.0.0
phase: 13
lesson: 13
tags: [mcp, tasks, extension, durable-state, stateless]
---

面向 `io.modelcontextprotocol/tasks` 扩展设计长时间 MCP 工作。

产出：

1. 适用性决策（Eligibility decision）。解释为何操作需要任务而非同步 `tools/call`。
2. 能力契约（Capability contract）。展示 `server/discover` 中确切 `supportedVersions`、能力、`ttlMs` 和 `cacheScope`，以及逐请求客户端能力中的任务扩展。公布工具时包含必需确定性 `tools/list` 描述符，具有有效对象 `inputSchema`、服务器身份元数据和缓存提示。缺少扩展时用 `-32021` 附 `requiredCapabilities` 对象；不支持版本用 `-32022` 附确切 `supported`、`requested` 数据。
3. 创建事务（Creation transaction）。持久化任务直到 `tasks/get` 能解析，再返回服务器主导的 `resultType: "task"`。
4. 状态形态（State shape）。包含 `taskId`、`status`、`statusMessage`、ISO 时间戳、`ttlMs`、`pollIntervalMs`、权威所有者、原操作引用、结果或错误、待处理输入请求和全部已发输入键。完成任务的嵌套 `CallToolResult` 必须有 `resultType: "complete"`，也应（SHOULD）包含自己的 `io.modelcontextprotocol/serverInfo` 元数据。
5. 当前方法（Current methods）。定义 `tasks/get`、`tasks/update` 和 `tasks/cancel`。Streamable HTTP 每次请求将 `Mcp-Name` 设为 `params.taskId`。不要引入 `tasks/status`、`tasks/result` 或 `tasks/list`。
6. 输入续接（Input continuation）。分开创建前 MRTR 与创建后 `tasks/get` 加 `tasks/update`。要求生命周期唯一输入键与部分响应处理。
7. 持久性计划（Durability plan）。选择原子文件系统存储、事务数据库或共享队列与存储。包含工作器租约与重启行为。
8. 所有权策略（Ownership policy）。按租户和主体授权每个任务方法与订阅。绝不把知道任务 id 当作权限。
9. 取消契约（Cancellation contract）。说明确认是协作式的，不一定导致 `cancelled`。
10. 通知选项（Notification option）。采用 POST 响应 SSE 流上的 `subscriptions/listen` 和 `notifications/tasks`，以轮询为基线。确认与每条任务通知包含 `io.modelcontextprotocol/subscriptionId`，等于监听请求 id。无 id 通知无 JSON-RPC 响应；接受的 HTTP 通知获得无正文 `202`。
11. 过期策略（Expiry policy）。从创建起解释 `ttlMs`，定义清除行为，避免泄漏其他租户任务是否存在。
12. 迁移映射（Migration map）。用当前扩展流程替代客户端请求任务标志和已移除实验方法。

硬性拒绝条件：

- 持久读取可见前返回任务句柄。
- 对未公布扩展的请求返回 `resultType: "task"`。
- 将 `params._meta.task.required`、`tasks/status`、`tasks/result` 或 `tasks/list` 用作当前 API。
- 用 `initialize`、`Mcp-Session-Id`、粘性路由或隐藏传输会话状态作任务存储。
- 把 `tasks/cancel` 确认当作工作器停止的证明。
- 同一任务生命周期复用 `inputRequests` 键。
- 向非权威所有者返回任务。
- 通过独立 GET、会话 SSE 或 `Last-Event-ID` 重放实现通知投递。

拒绝规则：

- 快速确定性查找若无具体持久性要求，拒绝任务化。
- 工作必须跨进程重启存活时，拒绝仅内存的生产存储。
- 拒绝无界结果载荷；大型交付物存到外部，返回已授权资源句柄。
- 历史端点若无显式租户所有权、过滤、分页和保留策略，拒绝。

输出一页设计，含生命周期表、传输方法、持久化事务、所有权规则、输入流程、轮询节奏、取消语义、订阅选项、过期清理、失败模型与旧版迁移映射。
