# MCP 传输：stdio 与无状态 Streamable HTTP（MCP Transports: stdio and Stateless Streamable HTTP）

> 传输承载 MCP 消息，不补充缺失的协议状态。在 `2026-07-28` 中，本地 stdio 与远程 Streamable HTTP 都承载自描述请求。

**Type:** Learn
**Languages:** Python
**Prerequisites:** 阶段 13，第 07、08 课
**Time:** ~65 分钟

## 学习目标（Learning Objectives）

- 本地子进程选择 stdio，网络服务选择 Streamable HTTP。
- 实现现代单端点、仅 POST 的 Streamable HTTP 契约。
- 将 MCP 版本、方法和名称头与 JSON-RPC 正文中的对应值镜像，并校验一致性。
- 正确投递请求作用域 SSE 与长时间保持的 `subscriptions/listen` 流。
- 迁移基于会话和旧版 HTTP+SSE 的部署，不把旧版行为说成现代行为。

## 问题（The Problem）

早期 Streamable HTTP 修订版将协议协商与连接、会话行为结合。服务器可以签发 `Mcp-Session-Id`，暴露独立 GET 流，接受 DELETE 终止会话，并用 `Last-Event-ID` 恢复 SSE。

MCP `2026-07-28` 从现代线上传输中移除这些机制。每次请求都能落到任意健康工作进程，因为协议版本和客户端能力随请求正文传送。HTTP 头镜像部分字段，供路由与策略使用，但服务器在执行前会验证这些头与正文一致。

结果更易扩展，也更易推理。这也意味着，把 2025 年的传输当作当前规范教授的服务器示例，教的是错误的故障与安全模型。

## 概念（The Concept）

### 标准输入输出（stdio）

stdio 绑定适用于客户端启动的子进程：

- 客户端向 stdin 每行写一条 UTF-8 JSON-RPC 消息。
- 服务器向 stdout 每行写一条 UTF-8 JSON-RPC 消息。
- 服务器向 stderr 写诊断信息。
- stdin 到达 EOF 时服务器立即退出。
- 每个现代请求在 `params._meta` 中携带版本与客户端能力。

进程可持续处理多次调用，但不是现代协议会话。意外退出会丢失在途请求。应重启进程、重新发现、重新列举、重开订阅，并用新请求 id 重试安全操作。

### 2026-07-28 中的 Streamable HTTP（Streamable HTTP in 2026-07-28）

现代服务器暴露一个接受 POST 的 MCP 端点，例如 `/mcp`。

每条 JSON-RPC 请求或通知都是一个新的 HTTP POST，正文含一条 JSON-RPC 消息。客户端不向服务器发送 JSON-RPC 响应。

对于请求，服务器返回以下之一：

- `Content-Type: application/json`，含一条 JSON-RPC 响应；或
- `Content-Type: text/event-stream`，包含该请求相关通知，最后是最终 JSON-RPC 响应。

对于接受的通知，服务器返回无正文的 `202 Accepted`。

客户端声明接受两种响应类型：

```http
Accept: application/json, text/event-stream
```

### 仅 POST 就是仅 POST（POST-only means POST-only）

现代 Streamable HTTP 没有独立 GET 流，也没有 DELETE 会话端点。

- `GET /mcp` 返回 `405 Method Not Allowed`。
- `DELETE /mcp` 返回 `405 Method Not Allowed`。
- 忽略 `Mcp-Session-Id`，绝不签发或回传。
- 忽略 `Last-Event-ID`，因为现代流不可恢复。

请求作用域流在最终响应前中断时，客户端丢失该在途请求。重试安全时可以用新 JSON-RPC id 发新请求，但不得尝试恢复流。

### 来源校验（Origin validation）

服务器校验传入连接的 `Origin`，防止 DNS 重绑定（DNS rebinding）。头存在但未被显式允许时，返回 `403 Forbidden`。非浏览器客户端可省略 `Origin`，官方传输规则允许如此。

本地服务器应绑定 `127.0.0.1`，而非所有接口。网络服务仍需对每次请求认证与授权。Origin 校验不是身份认证。

配置规范化后，采用精确来源匹配。`origin.startswith("https://trusted.example")` 这样的前缀检查不安全，因为可能接受攻击者控制的后缀。

### 必需的 HTTP 元数据头（Required HTTP metadata headers）

每个现代 POST 请求包含：

```http
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes_search
```

头规则：

- `MCP-Protocol-Version` 必需，必须等于 `params._meta.io.modelcontextprotocol/protocolVersion`。
- `Mcp-Method` 必需，必须等于 JSON-RPC `method`。
- `tools/call`、`resources/read` 和 `prompts/get` 必须包含 `Mcp-Name`。
- `Mcp-Name` 等于 `params.name`；对于 `resources/read`，等于 `params.uri`。
- 头名称不区分大小写，但头值区分大小写。

不安全或非 ASCII 的 `Mcp-Name` 值采用确切的 UTF-8 Base64 哨兵格式：

```text
=?base64?{Base64EncodedValue}?=
```

服务器先解码，再与正文比较。

镜像头缺失、格式错误或不匹配时，返回 HTTP `400` 和 JSON-RPC 错误码 `-32020`。头与正文版本一致但服务器不支持时，返回 HTTP `400` 与 `-32022`，并附确切错误数据，如 `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。

未知现代方法返回 HTTP `404` 与 JSON-RPC `-32601`。JSON-RPC 正文很重要，因为双时期客户端靠它区分现代错误与旧版端点未命中。

### 请求作用域 SSE（Request-scoped SSE）

服务器可以为一个长时间运行的请求选择 SSE：

```text
POST tools/call id=41
  <- 与 id=41 相关的 notifications/progress
  <- 与 id=41 相关的 notifications/progress
  <- JSON-RPC 响应 id=41
流关闭
```

服务器不得在此流上发送独立 JSON-RPC 请求。采样、信息征询和根目录交互使用多轮往返请求结果。关闭响应流会取消该请求。

不要为重放增加 SSE 事件 id。`Last-Event-ID` 恢复不属于现代修订版。

### 长期变更使用 subscriptions/listen（Long-lived changes use subscriptions/listen）

变更通知使用客户端打开的请求，而非独立 GET：

```json
{
  "jsonrpc": "2.0",
  "id": "listen-1",
  "method": "subscriptions/listen",
  "params": {
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["notes://note-1"]
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    }
  }
}
```

POST 响应是长期保持的 SSE 流，首条协议消息是 `notifications/subscriptions/acknowledged`。确认、每条变更通知及最终结果都在 `_meta` 中携带 `io.modelcontextprotocol/subscriptionId`，其值等于监听请求 id。服务器可以输出 SSE 注释保活。流断开时，客户端以新请求 id 重新发送 `subscriptions/listen`，重新获取受影响数据。

`resources/subscribe` 和 `resources/unsubscribe` 属于旧版时期，不要在现代连接上使用。

### 显式应用状态（Explicit application state）

移除协议会话不禁止有状态工作流。服务器可以签发不透明状态句柄，作为普通工具结果返回。客户端在后续调用中将句柄作为显式参数传入。

句柄要绑定到已认证主体、不可猜测、设定过期时间，并在每次使用时授权。这让状态在应用层可见，而不是藏在传输亲和性（Transport affinity）中。

隐藏副本状态造成的失败过程很具体：

1. 请求 A 到达副本 1，在该进程内存中创建草稿。
2. 响应不返回草稿句柄，因为实现假定连接标识草稿。
3. 请求 B 是新的 POST，到达副本 2。
4. 副本 2 有有效协议元数据，却无法命名或加载草稿，工作流因此失败或读取错误本地对象。
5. 粘性路由看似修复症状，直到重启、发布、重新调度或故障转移改变下个请求的落点。

正确边界有两部分。协议上下文留在每次请求中；持久应用状态放在共享存储中，用服务器签发并返回客户端的句柄索引。下次调用提供句柄，任意副本加载同一记录，授权将记录绑定到已认证主体和租户。副本内存可缓存记录，但不能成为正确运行所必需的唯一副本。

按生命周期选择状态机制。请求局部变量可服务一次调用。短期多轮往返请求（MRTR）续接可使用完整性保护的 `requestState`。草稿或持久任务需要显式句柄，加上共享持久化、过期、并发控制与幂等性。这些对象都不是 MCP 协议会话。

### HTTP 双时期兼容（HTTP dual-era compatibility）

同时支持现代和旧版服务器的客户端先尝试现代 POST。收到 HTTP `400`、`404` 或 `405` 时，检查正文：

- 已识别现代 JSON-RPC 错误证明服务器是现代的。纠正请求或按公布版本重试，不降级。
- 空正文或未识别响应可能表明旧版 HTTP+SSE 服务器。只有此时才尝试旧 GET 端点，并期待其旧版 `endpoint` 事件。

迁移中，服务器可以将现代元数据路由到现代仅 POST 实现，为旧客户端保留独立旧版端点，从而支持两个时期。绝不把旧版 GET、DELETE、会话 id 或重放行为描述为 `2026-07-28` 的一部分。

```figure
tp-transport-handshake
```

## 实际应用（Use It）

`code/main.py` 用 Python 标准库实现有限的现代 Streamable HTTP 服务器。它校验 Origin 和镜像头，忽略已移除会话头，为普通调用返回 JSON，并演示有限的 `subscriptions/listen` SSE 流。

```bash
cd code
python3 main.py --probe
python3 -m unittest discover tests -v
```

探测检查：

- 拒绝无效 Origin；
- 没有会话 id 也能发现成功；
- 忽略 `Mcp-Session-Id` 和 `Last-Event-ID`；
- 头不匹配返回 `-32020`；
- 不支持的版本返回 `-32022`，附确切 `supported` 与 `requested` 数据；
- 接受的无 id 通知返回无正文 HTTP `202`；
- GET 和 DELETE 返回 `405`；
- `subscriptions/listen` 是 POST 响应流，其确认、通知与最终结果携带订阅 id。

## 交付成果（Ship It）

本课交付 `outputs/skill-mcp-transport-migrator.md`。它移除现代协议会话，增加头与正文校验，用 `subscriptions/listen` 替代独立 GET，并让所有旧版桥接保持可见隔离。

## 练习（Exercises）

1. 从 POST 移除 `Mcp-Method`，确认 HTTP `400` 与错误 `-32020`。
2. 发送一致的头与正文版本 `2027-01-01`，确认 HTTP `400`、错误 `-32022` 和确切数据 `{"supported":["2026-07-28"],"requested":"2027-01-01"}`。
3. 为非 ASCII 资源 URI 发送 Base64 哨兵形式的 `Mcp-Name`，确认解码值与 `params.uri` 比较。
4. 在最终响应前中断有限监听流。用新 JSON-RPC id 重新发送并重新获取工具。
5. 为 ping 工具增加显式工作流句柄，将其绑定到授权主体，不使用连接亲和性。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| stdio | 通过客户端启动的子进程传输换行分隔 JSON-RPC |
| Streamable HTTP | 每条现代消息都是新 POST 的单端点 |
| 请求作用域 SSE（Request-scoped SSE） | 包含相关通知与最终响应的 POST 响应流 |
| `subscriptions/listen` | 接收主动选择的变更通知的长期 POST 请求 |
| 头不匹配（Header mismatch） | 镜像头与正文不一致时的 HTTP `400` 和 JSON-RPC `-32020` |
| 来源校验（Origin validation） | 对传入连接的 DNS 重绑定防御，不是认证 |
| 显式状态句柄（Explicit state handle） | 作为普通参数传入的应用令牌，替代隐藏会话状态 |
| 旧版桥接（Legacy bridge） | 仅为兼容而保留的独立早期行为 |

## 延伸阅读（Further Reading）

- [MCP 传输概览（MCP Transport Overview）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [MCP stdio 传输（MCP stdio Transport）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [MCP 订阅（MCP Subscriptions）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 变更日志（MCP 2026-07-28 Changelog）](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
