# MCP 任务扩展：无状态核心上的持久工作（MCP Tasks Extension: Durable Work on a Stateless Core）

> 无状态 MCP 不要求每项操作都在一次请求中完成。官方任务（Tasks）扩展为长时间工作提供显式持久句柄。服务器可从 `tools/call` 返回句柄，任意实例均可回答 `tasks/get`，客户端通过 `tasks/update` 提供输入，无需恢复协议会话。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13 · 09（传输），阶段 13 · 11（无状态 MRTR），阶段 13 · 12（信息征询）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 区分无状态协议传输与持久应用任务状态。
- 在逐请求能力和 `server/discover` 中协商 `io.modelcontextprotocol/tasks` 扩展。
- 仅在持久创建后返回服务器主导的 `CreateTaskResult`，其 `resultType: "task"`。
- 用 `tasks/get` 轮询、`tasks/update` 满足任务输入、`tasks/cancel` 请求协作式取消。
- 移除旧的 `tasks/status`、`tasks/result`、`tasks/list` 假设。
- 通过 POST 响应 SSE 流上的 `subscriptions/listen` 订阅可选任务通知。
- 正确建模任务过期、重启恢复、输入键去重与执行错误。

## 为什么任务是扩展（Why Tasks Are an Extension）

任务最初在 2025-11-25 作为实验性核心功能出现。2026 年 7 月的重设计将其移入官方 `io.modelcontextprotocol/tasks` 扩展，让客户端与服务器选择加入额外生命周期，不必为所有使用者扩展核心协议。

扩展规范虽是当前官方任务归属，仍属草案接口。固定 SDK 支持的扩展版本，运行一致性场景，并隔离传输适配器与工作器、存储领域。

操作具备以下一项或多项性质时使用任务：

- 可能超过普通请求超时。
- 工作队列或外部作业系统已负责执行。
- 客户端需要在自身重启后恢复。
- 执行期间暂停以等待用户或模型输入。
- 产品要求取消和持久结果获取。

不要为廉价确定性查找创建任务。句柄、持久化、轮询、过期和取消都带来真实复杂度。

## 无状态核心，有状态应用（Stateless Core, Stateful Application）

MCP 2026-07-28 移除了 `initialize`、`notifications/initialized`、协议会话与 `Mcp-Session-Id`，但不禁止有状态产品。

任务 id 是显式应用状态：

- 服务器返回前将其持久化。
- 客户端可保存并在重启后再次轮询。
- id 可路由到共享同一持久存储的任意副本。
- 每个任务方法都检查授权。
- 过期和删除由任务字段定义，不由传输生命周期定义。

这在运维上不同于附着连接的隐藏状态。

区分四种生命周期：

| 状态 | 生命周期 | 所属位置 |
|---|---|---|
| 协议元数据 | 一次请求 | `params._meta`，每次调用重新校验 |
| 传输工作 | 一次 stdio 请求或 HTTP 响应 | 有期限的在途协调器 |
| MRTR 续接 | 一段重试序列 | 完整性保护的 `requestState`，必要时加重放控制 |
| 持久任务 | 跨请求、副本、重启和重连 | 以已授权 `taskId` 为键的共享应用存储 |

把任务记录放进进程内存不会让 MCP 有状态，只会让应用不可靠。协议仍无状态，但路由到另一副本的后续 `tasks/get` 无法恢复记录。先持久化再返回句柄，让每个任务方法在租户与主体检查下解析同一共享记录。

## 能力协商（Capability Negotiation）

客户端在每个符合条件的请求中公布支持：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": {
        "io.modelcontextprotocol/tasks": {}
      }
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "lesson-client",
      "version": "1.0.0"
    }
  }
}
```

服务器从 `server/discover` 返回确切 `supportedVersions`、能力、`ttlMs` 和 `cacheScope`，能力中含相同扩展。由于公布工具，还实现必需的 `tools/list`，返回确定性 `generate_report` 描述符、有效对象 `inputSchema`、`resultType: "complete"`、服务器身份元数据和公开缓存提示。

未声明扩展的客户端调用任务方法，返回缺少所需客户端能力错误 `-32021`，`data.requiredCapabilities` 为 `{"extensions":{"io.modelcontextprotocol/tasks":{}}}`。不支持的协议字符串返回 `-32022`，附确切 `supported` 与 `requested` 数据；缺失或非字符串版本返回 `-32602`。

无 JSON-RPC `id` 的封装是通知。接收方可处理，但不输出 JSON-RPC 结果或错误。Streamable HTTP 适配器对接受的通知返回无正文 `202 Accepted`。

目前只有 `tools/call` 支持任务增强执行。设计内部抽象时，使未来请求类型无需重写存储。

## 服务器主导的任务创建（Server-Directed Task Creation）

旧客户端标志 `params._meta.task.required` 已移除。客户端声明扩展支持，服务器再决定某个 `tools/call` 是否成为任务。

请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_report",
    "arguments": {"size": "large"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "task",
    "taskId": "tsk_786512e29e0d",
    "status": "working",
    "statusMessage": "Preparing report outline.",
    "createdAt": "2026-08-21T10:30:00Z",
    "lastUpdatedAt": "2026-08-21T10:30:00Z",
    "ttlMs": 900000,
    "pollIntervalMs": 1000
  }
}
```

只有该 id 的 `tasks/get` 能解析成功，服务器才可返回句柄。最终一致存储应等待读取可见再回答，否则客户端可能收到看似有效 id，立即查询却“未找到”。

任务响应是非主动请求的，因为客户端没有请求任务模式；但并非未经协商，当前请求仍须公布扩展。

## 任务形态（The Task Shape）

每个任务携带：

- `taskId`：服务器生成的稳定标识符；
- `status`：`working`、`input_required`、`completed`、`cancelled` 或 `failed`；
- `createdAt` 与 `lastUpdatedAt`：ISO 8601 时间戳；
- `ttlMs`：从创建起计算的过期时长，`null` 表示未公布限制；
- 可选 `pollIntervalMs`：服务器当前建议的最小轮询间隔；
- 可选 `statusMessage`：面向用户或模型的上下文。

状态专属字段只在相关时出现：

- `input_required` 包含 `inputRequests`。
- `completed` 包含原请求的 `result` 形态。
- `failed` 包含 JSON-RPC `error` 对象。

客户端应遵守 `pollIntervalMs`。服务器可限制更频繁的轮询，也可在任务生命周期中改变间隔。

## 用 tasks/get 轮询（Poll with `tasks/get`）

客户端请求当前快照：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/get
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tasks/get",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

`tasks/get` 本身已完成，因此结果始终有 `resultType: "complete"`。嵌套任务仍可为 `status: "working"` 或 `status: "input_required"`。

这种区分避免常见解析器错误：

```text
result.resultType = complete    表示 tasks/get RPC 已完成
result.status = working        表示所代表的作业仍在运行
```

没有 `tasks/result` 调用。任务完成后，下次 `tasks/get` 响应在 `result` 下内联原始 `CallToolResult`：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "completed",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:34:12Z",
  "ttlMs": 900000,
  "result": {
    "resultType": "complete",
    "content": [
      {"type": "text", "text": "Generated large report with approved outline."}
    ],
    "structuredContent": {"size": "large", "approved": true},
    "isError": false,
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "tasks-demo",
        "version": "1.0.0"
      }
    }
  },
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "tasks-demo",
      "version": "1.0.0"
    }
  }
}
```

外层 `resultType` 表示 `tasks/get` RPC 完成。嵌套 `result.resultType` 表示原工具调用完成，该嵌套判别字段必需。嵌套 `CallToolResult` 也应（SHOULD）携带自己的 `io.modelcontextprotocol/serverInfo`；本课包含它，而非存储无类型载荷。

没有 `tasks/list`。无会话服务器不能安全推断连接作用域列表应包含哪些任务。需要历史记录的应用应暴露已授权领域工具，具备显式过滤器与所有权规则。

## 任务执行期间的输入（Input During Task Execution）

任务输入与核心 MRTR 看似相似，但续接方式不同。

### 创建任务前需要输入（Input needed before task creation）

从原 `tools/call` 返回核心 `resultType: "input_required"`。客户端满足请求并重试原调用。同步 MRTR 轮次完成后才创建任务。

### 创建任务后需要输入（Input needed after task creation）

将任务设为 `input_required`。`tasks/get` 暴露待处理 `inputRequests`，客户端经 `tasks/update` 发送响应，不重试原 `tools/call`。

快照：

```json
{
  "resultType": "complete",
  "taskId": "tsk_786512e29e0d",
  "status": "input_required",
  "createdAt": "2026-08-21T10:30:00Z",
  "lastUpdatedAt": "2026-08-21T10:31:00Z",
  "ttlMs": 900000,
  "inputRequests": {
    "approve_outline": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Approve the generated report outline?",
        "requestedSchema": {
          "type": "object",
          "properties": {"approved": {"type": "boolean"}},
          "required": ["approved"]
        }
      }
    }
  }
}
```

更新：

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/update
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tasks/update",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "inputResponses": {
      "approve_outline": {
        "action": "accept",
        "content": {"approved": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

成功响应是空确认加 `resultType: "complete"`。状态变化可能最终一致，因此客户端继续轮询或监听。

每个 `inputRequests` 键在整个任务生命周期必须唯一。重复 `tasks/get` 快照可能显示同一待处理键；客户端对界面去重，服务器忽略未知、被替代或已满足键的响应。部分更新可让任务保持 `input_required`，直到全部必需键得到回答。

## 取消是协作式的（Cancellation Is Cooperative）

`tasks/cancel` 表达意图，返回空完整确认。确认不保证工作器已停止：工作可能先完成、忽略取消或稍后才转换状态。

```http
POST /mcp HTTP/1.1
Content-Type: application/json
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tasks/cancel
Mcp-Name: tsk_786512e29e0d
```

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tasks/cancel",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/tasks": {}
        }
      }
    }
  }
}
```

三个任务方法的 `Mcp-Name` 都镜像 `params.taskId`，不重复 JSON-RPC 方法名称。`code/main.py` 在 `make_http_request` 集中实现此规则。

本课工作器立即遵守取消，使重复调用幂等。生产客户端仍须把取消当作协作式行为，不从确认推断最终任务状态。

不要用 `notifications/cancelled` 取消任务。该通知属于请求取消，不是持久任务取消。

这一区别在路由边界很重要。请求取消针对一个在途 JSON-RPC 操作或其请求作用域 HTTP 响应。`tools/call` 一旦返回 `resultType: "task"`，请求已完成，关闭传输不能命名或停止持久作业。`tasks/cancel` 是新的已授权 RPC，携带 `params.taskId`，在 `Mcp-Name` 镜像该 id，解析任务所属后端，记录协作取消意图，返回确认，但不声称工作器停止。

因此网关必须将请求协调器与任务路由放在不同表中。响应完成后请求表可消失，任务路由必须保留到终态与保留期限结束。[第 29 课：MCP 可靠性、取消与流量控制（Lesson 29: MCP Reliability, Cancellation, and Flow Control）](../../29-mcp-reliability-cancellation-and-flow-control/docs/en.md)为两条路径建立竞态、超时、幂等、背压与重试规则。

## 可选通知（Optional Notifications）

轮询是基线。需要推送更新的客户端携任务 id 发送 `subscriptions/listen`。在 Streamable HTTP 上，这是 POST，响应为请求作用域 SSE 流。没有独立 GET 事件流，也没有需保活的协议会话。

服务器用 `notifications/subscriptions/acknowledged` 确认接受的 id，再可通过 `notifications/tasks` 发送完整快照。确认与每条任务通知在 `_meta` 携带 `io.modelcontextprotocol/subscriptionId`，等于 `subscriptions/listen` 请求 id。除此之外，每条通知等价于该时刻 `tasks/get` 会返回的内容。

客户端仍须声明任务扩展。应重连并从持久任务 id 恢复，而非依赖事件重放或 `Last-Event-ID`。

## 失败语义（Failure Semantics）

正确使用两层错误。

### 协议错误（Protocol error）

无效方法参数或未知任务 id 返回 JSON-RPC 错误，通常为 `-32602`。缺少扩展支持返回 `-32021`，附所需能力对象。

### 任务执行结果（Task execution outcome）

- 带 `isError: true` 的普通工具结果仍是 `completed` 任务，因为工具调用产生了定义的结果。
- 延后执行期间的 JSON-RPC 错误使任务 `failed`，并将错误存入 `error`。
- 用户拒绝可产生 `cancelled`、完整拒绝结果或其他领域安全结果。记录选择。

## 持久性、过期与所有权（Durability, Expiry, and Ownership）

至少持久化任务 id、状态、时间戳、ttl、轮询间隔、原操作所有权、结果或错误、待处理输入请求和全部已发输入键。

存储键必须包含或解析权威租户与主体。知道任务 id 不应授予访问权。每次 `tasks/get`、`tasks/update`、`tasks/cancel` 和订阅都检查所有权。

`ttlMs` 从创建起计算且可改变。任务不再产生可观察更新时，客户端可将其作为兜底期限。服务器可使过期任务失败并随后删除。不要把它描述为完成后保证保留结果这么多毫秒。

采用原子写或事务。本课写临时文件，再原子重命名。多副本服务应使用共享持久存储和工作器租约或等价并发控制。

```figure
tp-task-lifecycle
```

## 动手实现（Build It）

`code/main.py` 实现确定性任务服务：

- `server/discover` 返回 `supportedVersions`、缓存提示与任务扩展。
- `tools/list` 返回确定性、可缓存的 `generate_report` 描述符，含有效输入模式。
- `tools/call` 先创建并持久化任务，再返回 `resultType: "task"`。
- 新服务实例重新加载同一任务，演示重启恢复。
- `tasks/get` 返回完整任务快照。
- 工作器从 `working` 转为 `input_required`。
- `tasks/update` 接受表单响应，返回空完整确认。
- 工作器存储具有独立 `resultType` 和服务器身份的嵌套 `CallToolResult`，再转为 `completed`。
- 本实现的 `tasks/cancel` 幂等。
- HTTP 构建器为 `tasks/get`、`tasks/update` 和 `tasks/cancel` 将 `Mcp-Name` 设为 `params.taskId`。
- 通知辅助函数使用 `notifications/subscriptions/acknowledged` 和 `notifications/tasks`，均标记监听请求 id。
- 无 id 通知不产生 JSON-RPC 响应。

工作器显式推进，不在后台线程休眠。这让每次状态转换确定，并将协议示例与队列机制分开。

## 实际应用（Use It）

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/13-mcp-async-tasks/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果序列：

```text
id=0 resultType=complete status=ack
id=1 resultType=task status=working
id=2 resultType=complete status=working
id=3 resultType=complete status=input_required
id=4 resultType=complete status=ack
id=5 resultType=complete status=completed
```

还要验证现代服务对 `tasks/status`、`tasks/result` 和 `tasks/list` 返回方法未找到。
验证 `tools/list` 确定性，以及每个当前 HTTP 任务方法通过 `Mcp-Name` 镜像任务 id。

## 交付成果（Ship It）

`outputs/skill-task-store-designer.md` 现在生成扩展感知设计：能力协商、返回前持久创建、当前方法、输入更新流程、所有权、过期、取消、订阅，以及从已移除实验方法的迁移。

## 练习（Exercises）

1. 增加第二个待处理输入键。发送部分 `tasks/update`，证明两个键都回答之前任务保持 `input_required`。
2. 为存储增加租户所有权，拒绝错误已认证主体提供的有效任务 id。
3. 增加有过期时间的工作器租约，展示两个服务实例不能并发完成同一任务。
4. 为 `subscriptions/listen` 实现 POST 响应 SSE 适配器。不要添加 GET、`Last-Event-ID` 或会话头。
5. 增加过期清理。区分过期任务与格式错误任务 id，不泄漏跨租户存在性。

## 关键术语（Key Terms）

| 术语 | 当前扩展中的含义 |
|------|----------------------------------|
| 任务扩展（Tasks extension） | 持久异步工作的可选 `io.modelcontextprotocol/tasks` 能力 |
| `CreateTaskResult` | 对符合条件请求返回的服务器主导 `resultType: "task"` 响应 |
| `tasks/get` | 轮询完整当前任务快照，含最终结果或待处理输入 |
| `tasks/update` | 提交任务待处理 `inputRequests` 的响应 |
| `tasks/cancel` | 确认协作取消意图 |
| `input_required` | 表示等待客户端输入的任务状态 |
| `pollIntervalMs` | 服务器建议的再次轮询前最短延迟 |
| `ttlMs` | 从任务创建起计算的过期时长 |
| 返回前持久化（Durable-before-return） | 发送句柄前任务 id 必须可解析的规则 |
| `notifications/tasks` | 在订阅 SSE 响应中投递的可选完整任务快照 |

## 旧版兼容（Legacy Compatibility）

2025-11-25 实验接口使用客户端请求的任务增强、`tasks/status`、`tasks/result` 和可选 `tasks/list`。这些名称只保留在固定版本的旧版适配器。当前客户端使用扩展能力，接受服务器主导句柄，轮询 `tasks/get`，用 `tasks/update` 提供输入，从任务快照读取最终结果。

## 延伸阅读（Further Reading）

- [官方 MCP 任务扩展（Official MCP Tasks extension）](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
- [MCP 2026-07-28 多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
