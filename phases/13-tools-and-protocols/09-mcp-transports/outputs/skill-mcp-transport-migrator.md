---
name: mcp-transport-migrator
description: 将旧版 MCP HTTP 传输迁移到无状态、仅 POST 的 2026-07-28 契约。
version: 2.0.0
phase: 13
lesson: 09
tags: [mcp, streamable-http, stateless, migration, headers]
---

给定基于会话的 Streamable HTTP 或 HTTP+SSE 服务器，生成 MCP `2026-07-28` 迁移操作手册（Migration runbook）。

产出：

1. 端点映射（Endpoint map）。定义一个接受 POST 的现代 MCP 端点。每条 JSON-RPC 请求或通知对应新的 POST。
2. 响应映射（Response map）。单一响应使用 `application/json`；相关通知后跟最终响应用请求作用域的 `text/event-stream`。
3. 移除行为（Removed behavior）。现代 GET 和 DELETE 返回 `405`。忽略 `Mcp-Session-Id` 与 `Last-Event-ID`，绝不签发、回传、撤销或恢复它们。
4. 请求元数据（Request metadata）。要求每个正文 `_meta` 包含协议版本和客户端能力，推荐包含客户端身份。
5. 头校验（Header validation）。要求 `MCP-Protocol-Version`、`Mcp-Method` 和条件性 `Mcp-Name`。解码 Base64 哨兵值并比较头与正文。不匹配返回 `-32020`。版本匹配但不受支持时返回 `-32022`，附确切数据键 `supported` 与 `requested`。
6. 订阅迁移（Subscription migration）。用 POST `subscriptions/listen` 替代独立 GET、`resources/subscribe` 和 `resources/unsubscribe`。给确认、每条通知与最终结果标记 `io.modelcontextprotocol/subscriptionId`，等于监听请求 id。
7. 状态迁移（State migration）。用绑定到已认证主体的显式不透明应用句柄替代连接亲和性。
8. 兼容窗口（Compatibility window）。旧端点保持隔离并清楚标注。任何旧版回退前都必须检查现代 POST 错误。不要用 `301` 或 `302` 重定向 POST，因为不能安全保证方法与正文保留。
9. 验证（Verification）。测试 Origin 拒绝、POST 媒体协商、正文元数据、镜像头、JSON 响应、无正文的接受通知 `202`、作用域 SSE 订阅元数据、GET 与 DELETE 的 `405`、忽略已移除头，以及断流后使用新 id 重试。

硬性拒绝条件：

- 把会话 id、独立 GET、DELETE 或重放呈现为现代行为。
- 通过进程或连接内存共享逐请求能力。
- 发送服务器发起的 JSON-RPC 请求。
- 用 `Last-Event-ID` 恢复现代 SSE 流。
- 遇到已识别现代错误后回退到旧版。
- 迁移期间用重定向转移 JSON-RPC POST。

拒绝规则：

- 没有认证、授权和精确 Origin 策略时，拒绝公开暴露服务。
- 拒绝用隐藏粘性路由替代显式工作流状态。
- 非幂等操作没有应用幂等控制时，拒绝自动重试。

输出迁移前后端点表、分阶段发布、回滚边界和可执行一致性检查清单。最后给出移除旧路由的确切日期。
