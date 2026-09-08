# 无状态 MCP 网关与注册表准入（Stateless MCP Gateways and Registry Admission）

> 网关应让每条路由明确。2026-07-28 协议无需传输会话，就能提供方法、名称、版本、能力、身份、缓存和追踪边界。

**Type:** Learn
**Languages:** Python
**Prerequisites:** Phase 13 · 15（安全），Phase 13 · 16（授权）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 在一个 2026-07-28 端点后聚合多个 MCP 服务器，无需会话亲和性。
- 在策略或转发之前验证逐请求元数据与路由请求头。
- 通过稳定命名空间、确定性顺序、描述符固定、RBAC 和私有缓存合并工具。
- 将注册表记录视为仍需准入策略的发现证据。
- 正确路由请求范围内 SSE、`subscriptions/listen`、MRTR 重试和 Tasks 扩展调用。
- 将旧版握手和会话支持与现代路径隔离。

## 问题（The Problem）

一个客户端直连一个服务器很简单。更大规模的部署需要对更难的问题给出一致答案：

- 允许哪些服务器？
- 哪些主体可以看到和调用每个工具？
- 两个后端暴露相同名称时怎么办？
- 如何审查描述符变化？
- 在哪里应用速率限制和审计事件？
- 任意实例能否处理下一个请求？

网关位于客户端和后端 MCP 服务器之间。它呈现一个 MCP 端点，应用横切策略，并转发已批准请求。

旧网关设计常将一个客户端会话多路复用到多个后端会话，并重写 `Mcp-Session-Id`。这是旧版兼容设计。2026-07-28 核心没有协议会话。

## 概念（The Concept）

### 现代网关路径（The modern gateway path）

对每个请求：

1. 根据传输授权认证主体。
2. 验证 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name` 和 `params._meta`。
3. 对主体、资源、方法、工具和参数授权。
4. 应用描述符、注册表、速率及数据策略。
5. 为选定后端创建新的自包含请求。
6. 验证后端结果并返回网关结果。
7. 记录审计事件，但不记录秘密。

没有哪一步需要隐藏的协议会话。应用状态仍可存在于数据库、显式句柄、Tasks 或完整性受保护的 MRTR 状态中。

### 运行时策略是网关的首要决定（Runtime policy is the primary gateway decision）

准入决定哪个后端版本可以进入网关，不授权实时调用。对于每个请求，网关根据已认证主体、签发者和资源、租户、匹配的方法和名称、规范化参数、获准描述符固定值、当前后端健康状态、能力交集、数据分类、速率状态以及任何与操作绑定的批准，重新计算策略。

这个顺序很重要。用户角色被撤销时，Registry 记录可能仍处于活动状态。目的地参数跨越租户边界时，描述符可能仍被固定。事件响应策略隔离状态变更调用时，后端可能仍获批准。因此运行时策略才是主要的允许或拒绝决定，Registry 和描述符证据只是输入。

不要以连接或已移除的会话标识符缓存允许决定。策略不可用时，按操作类别遵循已声明的失败策略。安全默认值是对状态变更和敏感读取采取失败关闭；明确批准的公共读取路径，仅在其风险模型允许时，才可短暂使用最后已知策略。记录由哪个策略版本和失败路径作出决定，并在返回前验证后端结果。

### 单个 POST 端点（One POST endpoint）

现代 Streamable HTTP 通过 POST 发送每条 JSON-RPC 消息：

```text
POST /mcp
Authorization: Bearer <gateway-token>
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.search
Accept: application/json, text/event-stream
```

网关可为该 POST 返回 JSON 或请求范围内 SSE。现代请求的 GET 和 DELETE 返回 405。`Mcp-Session-Id` 和 `Last-Event-ID` 不产生权限、亲和性或重放行为。

请求头与正文值必须一致。在查找后端前以 `-32020` 拒绝不匹配。这让负载均衡器、网关和限流器无需解析完整正文即可路由，同时保留端到端完整性。

遵循一个精确验证顺序：JSON-RPC 和元数据类型、请求头与正文相等，然后检查匹配版本的支持情况。不匹配返回 HTTP 400 和 `-32020`。若请求头与正文一致但版本不支持，返回 HTTP 400 和 `-32022`，且 `data` 必须恰为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

`ProtocolError` 携带可选 `data`，网关将其序列化到 JSON-RPC 错误对象。通知没有 `id`，因此绝不接收 JSON-RPC 成功或错误响应。接受的 HTTP 通知返回 202 和空正文。

### 每一层都实现发现（Implement discovery at every layer）

网关为客户端实现 `server/discover`。它也发现每个后端，以了解协议版本、能力和扩展。

网关结果示例：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {"listChanged": true}
  },
  "ttlMs": 30000,
  "cacheScope": "private",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "enterprise-gateway",
      "version": "2.0.0"
    }
  }
}
```

仅声明网关能够端到端兑现的能力交集。后端功能不意味着可安全公开；没有后端路径的网关功能也没有声明价值。

`serverInfo` 是自行报告的显示和诊断数据。不要将其用作注册表或发布者证明。

### 逐请求客户端能力（Per-request client capabilities）

每个转发请求都需要当前 `_meta` 信封：

```json
{
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": {
    "name": "enterprise-gateway",
    "version": "1.0.0"
  }
}
```

不要盲目把外层客户端能力复制到后端。网关才是后端的客户端。仅声明网关会正确调解的功能。

### 确定性命名空间（Deterministic namespacing）

将后端工具合并到稳定公开名称下：

```text
notes.search
notes.create
issues.list
issues.open
```

保留从公开名称到后端和原工具名的映射。绝不在冲突中选择第一个或最后一个。公开名称是批准和审计契约的一部分，因此更名是一项迁移。

`tools/list` 必须具有确定性。可见性因主体而异时，返回 `cacheScope: private`。有界的 `ttlMs` 可降低后端发现负载，同时避免用户特定列表跨授权上下文泄露。

每个公开工具描述符包含稳定名称、描述和以对象为根的 `inputSchema`。命名空间不能移除必需的描述符字段。完整列表结果还包含 `resultType`、服务器身份元数据及缓存提示。

### 固定已批准描述符（Pin approved descriptors）

准入时，规范化完整描述符，并将摘要存储在限定公开名称下。列出和调用时，将实时描述符与已批准摘要比较。

如果变化：

- 从 `tools/list` 移除。
- 拒绝直接调用。
- 发出审计事件。
- 更新固定值前要求策略或人工重新批准。

网关是有用的集中执行点，却不能让首次看到的描述符自动安全。初始审查仍不可少。

### 注册表帮助发现，不替你决定（Registries help discover, not decide）

Registry 的 `server.json` 提供发布元数据。基于软件包的记录可以如下所示：

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.example/notes",
  "description": "Example notes MCP server.",
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@example/notes-mcp",
      "version": "1.0.0",
      "transport": {"type": "stdio"}
    }
  ]
}
```

发布元数据不承载网关的安全决定。将已验证的发布者和来源证据保存在独立准入状态中：

```json
{
  "registryName": "com.example/notes",
  "registryVersion": "1.0.0",
  "publisher": {"namespace": "com.example", "status": "verified"},
  "provenance": {
    "source": "registry.modelcontextprotocol.io",
    "recordId": "com.example/notes@1.0.0"
  },
  "admission": {"status": "approved", "reviewedBy": "gateway-policy"}
}
```

网关检查 `server.json` 结构，并关联外部状态。网关仍需准入策略。

对每个获准后端，记录：

- 精确注册表和记录标识符。
- 已验证的发布者命名空间或域名证据。
- 允许的传输和端点。
- 固定版本或已批准升级策略。
- 制品或描述符摘要。
- 授权签发者和资源。
- 审查者、批准时间和到期时间。

不要因显示名称类似熟悉产品就接受服务器。不要把注册表中的存在当作运营安全审查。即使从不出现在公共注册表，私有服务器也可以通过同一证据模式准入。

本课实现网关接入边界：在后端可路由之前，将发布证据与本地准入关联。[第 30 课：MCP 注册表供应链、准入、漂移与回滚](../../30-mcp-registry-supply-chain-and-drift/docs/en.md) 构建完整控制平面，涵盖精确命名空间证明、制品来源、不可变固定值、实时描述符漂移、Registry 状态协调、防篡改准入账本及有证据支持的回滚。将供应链状态与前述逐请求运行时决定分离。

### 凭据调解（Credential mediation）

网关认证调用者，并单独向后端认证。后端凭据绝不交给客户端。

明确保留这些绑定：

```text
outer principal -> gateway role and policy
backend issuer + resource -> backend registration and token
```

绝不把外层网关令牌传给后端。绝不在不同签发者或资源处复用后端令牌。如果工具代表终端用户操作，应通过经过设计的交换或声明模型保留委托关系，而不是用共享服务凭据冒充用户。

### 无会话速率限制（Rate limits without sessions）

按已认证主体、签发者、资源、公开工具、成本类别和时间窗口设置限额键。会话 id 并不存在，即使存在也很容易轮换。

在消耗昂贵工作之前执行廉价验证。决定被拒绝调用计入滥用限制、业务配额，还是两者都计入。

### 审计决定链（Audit the decision chain）

记录足以重建调用的信息：

- 请求和追踪标识符。
- 已认证主体和签发者。
- 公开工具和后端路由。
- 描述符固定版本。
- 策略决定和原因。
- 延迟和结果类别。
- 适用时的 MRTR 轮次或任务标识符。

对持有者令牌、授权码、刷新令牌、原始秘密及不必要的敏感参数脱敏。

### 请求范围内 SSE（Request-scoped SSE）

普通 POST 在单次请求工作流式输出时，可以返回请求范围内 SSE。关闭响应流会取消该进行中的现代 HTTP 请求。

不要创建独立 GET 流，也不要承诺 Last-Event-ID 重放。那些是旧版传输假设。

### 长连接变更通知（Long-lived change notifications）

对于列表和资源变更通知，当前客户端通过 POST 发送 `subscriptions/listen` 并接收 SSE 响应。通知过滤器使用精确的扁平字段 `toolsListChanged`、`promptsListChanged`、`resourcesListChanged` 和 `resourceSubscriptions`：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-tools",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

首个事件确认支持的子集。其订阅标识符是打开此流的请求的 JSON-RPC id：

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": "listen-tools"
    },
    "notifications": {
      "toolsListChanged": true
    }
  }
}
```

随后网关仅转发已确认的变更类型。流上的每条通知都在 `params._meta` 中携带相同的 `io.modelcontextprotocol/subscriptionId`。没有自动重放或自动重新监听。重新连接时，客户端重新打开订阅，并刷新依赖的列表。服务器发起的优雅关闭返回标有相同订阅 id 的最终完整结果。

现代路径替代 `resources/subscribe`、`resources/unsubscribe` 和未经请求的独立 GET 流。仅在受版本门控的旧路径中保留它们。

### MRTR 经过网关（MRTR through a gateway）

后端返回 `resultType: input_required` 时，只有外层客户端支持所需输入请求，网关才可转发结果。除非网关刻意终止并重新发起交互，否则逐字节保留 `requestState`。

客户端使用全新 JSON-RPC id 和 `inputResponses` 重试原公开工具。网关重新授权重试，检查相同公开路由，再转发新的后端请求。不能假定早先轮次授予了无限批准。

### Tasks 扩展路由（Tasks extension routing）

Tasks 是标识符为 `io.modelcontextprotocol/tasks` 的官方扩展，不是核心会话替代品。

客户端在逐请求客户端能力中声明扩展；只有能端到端保留生命周期时，网关才在发现中声明它。对于支持的 `tools/call`，仅由后端决定返回普通结果还是 `resultType: task`。任务结果直接携带 `taskId`、`status`、时间戳、`ttlMs` 和可选 `pollIntervalMs`。发送结果前，任务必须已经可持久读取。

网关为不透明任务标识符记录已认证主体和后端路由。后续 `tasks/get`、`tasks/update` 和 `tasks/cancel` 调用以 `params.taskId` 作为 `Mcp-Name`，为中间层提供路由键。`tasks/get` 返回 `resultType: complete` 和当前任务状态，并在终态中内联最终结果或协议错误。`tasks/update` 为未完成任务输入发送按键组织的 `inputResponses`，并返回空的完整确认。`tasks/cancel` 是协作式意图，返回空的完整确认，不保证工作停止。

不要实现新的 `tasks/list` 或 `tasks/result` 方法。它们属于旧实验模型。需要输入的任务通过 `tasks/get` 公开完整嵌入请求；客户端通过 `tasks/update` 回答，而非重试原工具调用。客户端仍按建议间隔轮询；创建任务仍由服务器决定。

持久化任务路由状态是以任务句柄为键的应用数据，不是协议会话。

### 兼容边界（Compatibility boundary）

如果网关必须服务旧客户端或后端：

- 显式检测所属时代。
- 将初始化、传输会话、GET 流、资源订阅和旧任务词汇保留在旧版适配器内。
- 绝不让旧会话 id 泄入现代路由或授权。
- 优先使用有界发现探测和显式回退策略，而非静默降级。

```figure
t3-gateway-funnel
```

## 动手实现（Build It）

`code/main.py` 实现进程内协议网关和两个后端服务器。每个后端接收新的当前协议请求。网关提供发现、按用户过滤的确定性 `tools/list`、命名空间路由、Registry `server.json` 加外部准入状态、描述符固定、RBAC、按主体索引的速率限制、审计决定，以及模拟的 `subscriptions/listen` SSE 确认。

模型接收已解析请求正文、路由请求头和已认证持有者身份。它不是完整 HTTP 适配器，不解析 `Content-Type` 或完整 `Accept` 契约。将其连接到第 09 课 Streamable HTTP 适配器，该适配器要求 `Content-Type: application/json`，且 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/17-mcp-gateways-and-registries
python3 code/main.py
python3 -m unittest discover code/tests -v
```

演示打印外层请求 id 和新的后端请求 id，让无状态跳转可见。

## 实际应用（Use It）

将进程内后端对象替换成真正的当前协议客户端。保留相同边界：

- 连接前具有准入记录。
- 公开能力前发现后端。
- 授权前确定限定公开名称。
- 列出或调用前固定描述符。
- 转发前生成新的逐请求元数据。
- 返回前验证结果。

## 交付（Ship It）

本课交付 `outputs/skill-gateway-bootstrap.md`。它生成现代网关设计，涵盖入口、发现、准入、命名空间、授权、缓存、流式输出、订阅、MRTR、Tasks、可观测性和旧版隔离。

## 练习（Exercises）

1. 向外层和转发请求元数据添加追踪上下文，并在审计事件中记录关联。
2. 添加支持 Tasks 的后端，并按 `Mcp-Name` 中的任务 id 路由 `tasks/get`。
3. 改变一个后端描述符，证明发现和直接调用都被阻止。
4. 添加主体特定服务器能力，并解释为何发现必须保持私有缓存。
5. 编写旧版适配器接口，不向现代 `Gateway` 类添加任何旧版状态。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| MCP 网关（MCP gateway） | 位于客户端与后端 MCP 服务器之间的策略与路由服务器 |
| 准入记录（Admission record） | 允许一个后端进入网关的证据与策略决定 |
| 限定工具名（Qualified tool name） | 稳定公开路由，例如 `notes.search` |
| 描述符固定（Descriptor pin） | 在发现和分发时检查的已批准摘要 |
| 私有缓存作用域（Private cache scope） | 限制在一个授权上下文中的缓存结果 |
| 请求范围内 SSE（Request-scoped SSE） | 附属于单个 POST 请求的流式响应 |
| `subscriptions/listen` | 客户端为选定长连接变更通知打开的 SSE 流 |
| 任务路由（Task route） | 从不透明任务 id 到后端的应用映射 |
| 旧版适配器（Legacy adapter） | 为旧握手和会话行为设置的显式版本门控边界 |

## 延伸阅读（Further Reading）

- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [官方 Registry server.json 要求](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md)
- [MCP Tasks 扩展](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
