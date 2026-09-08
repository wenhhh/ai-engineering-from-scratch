---
name: elicitation-form-designer
description: 设计显式资源范围和无状态 MCP 2026-07-28 信息征询，具有授权、安全表单和签名重试状态。
version: 2.0.0
phase: 13
lesson: 12
tags: [mcp, elicitation, mrtr, scope, authorization]
---

为面向协议修订版 `2026-07-28` 的 MCP 操作设计用户输入步骤。

产出：

1. 范围契约（Scope contract）。将工作区、目录或资源 URI 放入可见工具参数或服务器配置，说明哪些已认证主体可使用。
2. 边界检查（Boundary checks）。定义 URI 规范化、路径组件包含性、符号链接策略与操作系统沙箱。
3. 触发条件（Trigger condition）。指出需要用户输入的确切歧义、确认或外部交互。
4. 发现与能力门禁（Discovery and capability gate）。从 `server/discover` 返回确切 `supportedVersions`、能力、`ttlMs` 与 `cacheScope`。公布工具时，包含必需确定性 `tools/list` 描述符，具有有效对象 `inputSchema`、服务器身份元数据和缓存提示。将 `elicitation: {}` 与显式 `elicitation.form` 视为表单支持。缺失或仅 URL 支持时，返回 `-32021` 和 `data.requiredCapabilities.elicitation.form`；不支持版本用 `-32022`，附确切 `supported` 与 `requested` 数据。
5. MRTR 结果（MRTR result）。返回 `resultType: "input_required"`，带稳定 `inputRequests` 键和 `elicitation/create` 请求。
6. 交互设计（Interaction design）。表单模式提供清楚消息与受限扁平模式；URL 模式展示 HTTPS 目的地与带外完成规则。
7. 重试契约（Retry contract）。要求新 JSON-RPC id、原方法与参数、当前 `inputResponses`、逐请求 `_meta` 和原样 `requestState` 回传。
   无 id 通知绝不收到 JSON-RPC 结果或错误；接受的 Streamable HTTP 通知收到无正文 `202`。
8. 分支处理（Branch handling）。将 `accept`、`decline` 和 `cancel` 映射到不同安全结果。
9. 状态保护（State protection）。用 HMAC 或认证加密绑定已认证主体、原参数摘要、候选集合、操作阶段、过期时间与一次性 nonce。在每个处理器实例共享的有界、按 TTL 清理的重放存储中原子消费 nonce。
10. 最终复验（Final revalidation）。修改前立即重新检查授权、实时记录状态和包含性。

硬性拒绝条件：

- 把已弃用根目录当作授权、包含性或沙箱。
- 新的 2026-07-28 设计使用 `roots/list` 或 `notifications/roots/list_changed`。
- 发送反向 `elicitation/create` 请求，而不是通过 MRTR 返回。
- 在表单模式收集密码、API 密钥、访问令牌或支付凭据。
- 发送当前逐请求能力未包含的信息征询模式。
- 把 `clientInfo` 当作已认证用户身份。
- 未经校验接受和最终授权检查就执行破坏性动作。
- 未签名的 `requestState` 携带候选项或权限相关数据。

拒绝规则：

- 明确拒绝后，拒绝重复提示。
- 服务器无需用户即可推导或校验的值，拒绝信息征询。
- 拒绝包含凭据、用户秘密或预认证持有者值的 URL。
- 拒绝使用隐藏协议会话状态、`initialize` 或 `Mcp-Session-Id` 的请求。

输出一页设计，包含范围、授权、包含性、交互模式、模式或 URL、MRTR 传输形态、状态字段、响应分支、重放策略与最终复验清单。
