# 传输与 HTTP 请求头契约（Transports and the HTTP Header Contract）

> 传输只决定消息如何到达，不改变消息含义：stdio 向子进程交付一行 JSON-RPC，Streamable HTTP 则逐条 POST，并把少数字段镜像到网关无须解析正文即可读取的请求头。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 18 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 按 stdio 传输要求封装和解析换行分隔的 JSON-RPC 消息，并解释消息内部的实际换行为何会破坏分帧
- 描述 Streamable HTTP 请求与响应：每条消息一个 POST，响应为 JSON 对象或每请求 SSE 流，接受通知时返回 `202 Accepted`，且没有 GET 端点
- 构建并校验必需 HTTP 请求头 `MCP-Protocol-Version`、`Mcp-Method` 和 `Mcp-Name`，使用 `x-mcp-header` 及 base64 标记编码镜像工具参数
- 解释 Origin 校验和本地主机绑定如何防御 DNS 重绑定，以及现代服务器如何处理 GET、DELETE 和不允许的 Origin
- 区分 `HeaderMismatch`（`-32020`）协议错误，与那些根本不形成 JSON-RPC 消息、仅由 HTTP 状态表达的传输结果

## 问题（The Problem）

每条 MCP 消息已经携带理解它所需的信息：方法、参数，以及 `_meta` 中的每请求元数据。这些内容不取决于字节如何在客户端和服务器之间传输。但仍需要某种机制搬运字节、区分相邻消息、告知连接何时中断，并让负载均衡器或网关无须自行成为 JSON-RPC 解析器也能路由流量。这就是传输的职责。MCP 2026-07-28 定义两种标准传输：stdio 用于客户端启动的子进程，Streamable HTTP 用于可供多个客户端访问的网络服务。

只把传输当作附带知识，会留下考试专门考查的缺口。第 04 课的无状态核心，只有在底层绑定不暗中引入额外状态时，才能端到端成立：不能偷偷依赖会话 id、可恢复流，或服务器记住连接上的上一次请求。本课每项规则都服务于这个约束：传输负责分帧与交付消息，不附加隐式会话语义。

## 概念（The Concept）

### stdio：通过三个标准流连接子进程

在 stdio 绑定中，客户端启动服务器子进程，双方通过该进程的标准流通信。服务器从 `stdin` 读取 JSON-RPC 请求和通知，向 `stdout` 写出响应和通知，每行一条消息，消息内部不能包含实际换行。`stdout` 只承载合法 MCP 消息；服务器不会向其中写入 JSON-RPC 请求，因为第 14 课的 MRTR 已将服务器主动请求替换为 `input_required` 结果。`stderr` 可以记录任意严重级别的日志，客户端不能因为有内容出现在这里就一概认定发生错误。

stdio 没有请求头层。Streamable HTTP 镜像到请求头的元数据仍然存在，但在 stdio 中只出现在正文的 `params._meta` 等对应字段里。取消在途请求时，客户端发送指定请求 id 的 `notifications/cancelled`，因为没有独立的每请求流可直接关闭。关闭进程采用协作方式：客户端先关闭 `stdin` 并等待，服务器仍未退出时才升级为进程信号。如果服务器意外退出，客户端重启它，原先在途请求随之丢失；仍需要的订阅则重新发送 `subscriptions/listen`。协议保持无状态，新进程不必继承旧进程的隐式协议会话就能处理新请求。

### Streamable HTTP：单个端点，每个 POST 一条消息

Streamable HTTP 服务器暴露一个 MCP 端点，例如 `/mcp`，在协议层只接受 POST。每个 JSON-RPC 请求或通知对应独立 POST，客户端的 `Accept` 同时列出 `application/json` 和 `text/event-stream`，因为服务器可以返回一个 JSON 对象，也可以打开只属于当前请求的 SSE 流，在最终响应之前发送进度或日志通知。服务器接受通知 POST 时，返回无正文的 `202 Accepted`；通知不会收到 JSON-RPC 回复。

本版本没有 GET 端点、协议会话或流恢复机制。现代服务器对 MCP 端点上的 GET 或 DELETE 返回 `405 Method Not Allowed`。它不生成或读取会话请求头，SSE 流断开后，客户端也不能携带重放 id 重新连接恢复；该请求的响应已丢失，只能在确认重试安全后使用新 JSON-RPC id 重新发起。服务器打开长时间流时，应发送 `X-Accel-Buffering: no`，避免反向代理缓冲事件，并适时发送 SSE 注释行保持活动，防止安静期间被空闲超时关闭。

Origin 校验针对一个具体风险：即使 MCP 服务器绑定 `127.0.0.1`，如果不检查请求来源，恶意网页仍可能通过 DNS 重绑定访问它。请求存在 `Origin` 且不在服务器允许范围内时，返回 `403 Forbidden`。非浏览器 HTTP 客户端等调用方可能没有 `Origin`，缺少该头本身不自动构成可疑行为。来源校验也不能代替身份认证，服务器仍需要独立执行 bearer 令牌检查。

### 请求头镜像及其契约

Streamable HTTP 将少量正文字段镜像到请求头，使网关或负载均衡器无须解析 JSON 即可路由 MCP 流量。每个 POST 携带 `MCP-Protocol-Version`，必须等于 `params._meta["io.modelcontextprotocol/protocolVersion"]`。每个请求携带 `Mcp-Method`，必须等于 JSON-RPC 的 `method`。`tools/call`、`resources/read` 和 `prompts/get` 还携带 `Mcp-Name`，对应 `params.name`；资源读取则对应 `params.uri`。任何必需镜像头缺失或与正文不一致，服务器都以 HTTP `400` 和 JSON-RPC 错误 `-32020`（`HeaderMismatch`）拒绝。必须严格执行，是因为不同网络组件可能依据不同值行动：网关按头部路由，服务器按正文执行，两者之间的缝隙正是攻击者可能利用的位置。

工具还可以在参数的结构定义属性上设置 `x-mcp-header`，要求客户端把参数值镜像到请求头。标记 `"x-mcp-header": "Region"` 的参数变成 `Mcp-Param-Region`，其值与正文 `arguments.region` 相同。请求头值必须满足安全的可见 ASCII 表达要求；非 ASCII 字符、控制字符、首尾空白，或本身看起来像编码标记的值，都应在发送前编码为 `=?base64?{value}?=`，服务器比较正文前先解码。请求头名称不区分大小写，但值区分大小写，包括方法名和工具名。镜像还有独立限制：仅适用于从结构定义根部静态可达的 integer、string 和 boolean 参数，不能用于 `number`；Streamable HTTP 客户端必须将 `x-mcp-header` 违反这些约束的工具从 `tools/list` 结果中排除，不能继续调用。服务器开发者也不应标记 API 密钥、令牌等敏感参数，因为沿途代理、负载均衡器及日志都能看到头部值。

运行在可靠字节流上的自定义传输，应复用 stdio 分帧，不另行发明格式，因为 stdio 本身就是字节流上的换行分隔 JSON-RPC。2024-11-05 的旧 HTTP+SSE 传输已弃用，新服务器不应采用，既有服务器应迁移到 Streamable HTTP。

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: run_report
Mcp-Param-Region: us-west1

{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "run_report", "arguments": {"region": "us-west1", "dataset": "signups"}, "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}
```

```json
{"jsonrpc": "2.0", "id": 7, "error": {"code": -32020, "message": "Header mismatch: Mcp-Method", "data": {"headers": ["Mcp-Method"]}}}
```

```figure
mcpa-19-transports
```

## 交互实验（Interactive Lab）

图中并排展示 stdio 与 Streamable HTTP。左侧，客户端和服务器经 `stdin`、`stdout` 及虚线表示的 `stderr` 交换内容，没有额外请求头层，协议元数据保留在 `_meta` 中。右侧，客户端 POST 到单个端点，服务器返回响应；箭头上的检查点表示服务器将镜像头与正文逐项比较。发现不一致时，调用被拦下，返回 `400` 与 `-32020`，不会进入工具。沿两条路径追踪同一调用，可以看到 JSON-RPC 正文本身几乎不变，变化的是外围传输包装。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构建一个提供 `run_report` 的服务器，工具的 `region` 参数标有 `x-mcp-header: Region`，再以三种方式驱动同一调用。`call_stdio` 直接将请求交给服务器，模拟子进程所见内容，并通过 `frame_message` 和 `parse_frames` 提供分帧。`call_http` 用 `build_http_headers` 构造镜像头，经 `handle_http_request` 验证后才分派给服务器，同时以 `{"http": {...}, "message": {...}}` 包装记录请求与响应。`call_http_with_header_mismatch` 保持同一请求，仅将 `Mcp-Method` 改为 `prompts/get`，展示 `400` 与 `-32020`。故意错误的条目用 `"violation"` 包装，让报文检查器不把它当作正常请求校验，而是继续检查随后的真实错误响应。

```bash
python3 code/main.py
```

不形成 JSON-RPC 消息的结果不会写入报文列表，包括 GET 或 DELETE 的 `405`、不允许 Origin 的 `403`，以及接受通知时无正文的 `202`，因为它们没有可记录的 `result` 或 `error` 对象。这些行为分别由 `handle_http_get_or_delete`、`validate_origin` 和 `handle_http_notification` 实现，并由测试直接覆盖。尝试将 `region` 改为带逗号或非 ASCII 字符的值再运行，观察 `encode_header_value` 切换到 base64 标记形式，并确认 `decode_header_value` 能精确还原。

## 交付物（Shipped Artifact）

`outputs/transport-selection-guide.md` 提供一页参考：何时选择 stdio 或 Streamable HTTP、列明来源字段和适用请求的完整请求头表、base64 标记规则，以及 GET、DELETE、不允许 Origin、头部不一致和接受通知时的状态码决策清单。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：stdio 帧能经 `parse_frames` 往返还原，带内部换行的美化 JSON 被拒绝；`tools/call` 的镜像头精确对应正文，包括 `x-mcp-header` 参数；base64 标记编码符合规范示例，并可解码回原值；`resources/read` 的 `Mcp-Name` 取自 `params.uri`，没有名称字段的方法则省略该头；头部一致时通过，`Mcp-Method` 改动时返回 `400` 与 `-32020`；不允许的 Origin 返回 `403`，允许或缺失 Origin 时不因此拒绝；GET 和 DELETE 都返回 `405`；接受通知返回 `202`；报文中的故意不一致请求由 violation 包装，之后紧跟真实错误响应。仓库报文检查器还会依据 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/19-transports-and-http-headers
```

## 与综合实践的联系（Capstone Connection）

综合实践的端到端交互必须经某种传输交付，其中所有请求头都要满足本课的正文一致性规则：镜像字段用于路由，不能成为与正文相冲突的第二套权威值。综合场景在报文层检查请求时，运行的就是这里实现的头部与正文比较；解释断开的流为何不能直接恢复时，也依赖本课 stdio 重启和 HTTP 重新发起所遵循的无状态原则。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| stdio | 客户端启动服务器子进程并与之通信的传输绑定 |
| Streamable HTTP | 每条 JSON-RPC 消息作为独立 POST 发送到单个 MCP 端点的传输绑定 |
| 帧（Frame） | stdio 上一条以换行分隔的 JSON-RPC 消息，其内部不能包含实际换行 |
| `MCP-Protocol-Version` | 必需请求头，必须等于请求 `_meta` 中的协议版本 |
| `Mcp-Method` | 镜像请求 JSON-RPC `method` 的必需请求头 |
| `Mcp-Name` | 在 `tools/call`、`resources/read` 和 `prompts/get` 中镜像 `params.name` 或 `params.uri` 的请求头 |
| `x-mcp-header` | 工具结构定义中的注解，将参数镜像到 `Mcp-Param-{Name}` 请求头 |
| Base64 标记（Base64 sentinel） | 无法安全表示为普通 ASCII 头部值时采用的 `=?base64?{value}?=` 编码 |
| `HeaderMismatch` | 镜像头与正文不一致时返回的 `-32020` 错误，同时使用 HTTP `400` |
| Origin 校验（Origin validation） | 以 `403` 拒绝不允许的 `Origin`，用于防御 DNS 重绑定的检查 |

## 延伸阅读（Further Reading）

- [传输概览](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [stdio 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [工具定义：x-mcp-header](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 9 节
- `phases/13-tools-and-protocols/09-mcp-transports`，更深入地实现同一套仅 POST 契约
