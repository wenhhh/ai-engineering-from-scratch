# 长时间运行的工作模式（Long Running Work Patterns）

面向 MCP 2026-07-28“交互与执行”领域的一页决策参考。工具可能无法在单次请求内完成时，可对照其描述使用本表。

## 按以下顺序判断

1. **普通调用。** 工作开销小、行为确定，并能在普通请求超时之前完成。直接返回 `resultType: "complete"`；大多数工具适用这一层。
2. **多轮往返请求（MRTR）。** 服务器需要客户端提供一个简短答案，例如信息征询、采样或根目录列表，才能完成同一逻辑请求。返回 `resultType: "input_required"`，客户端用新 id、`inputResponses` 和原样回传的 `requestState` 重试原请求。整段交互仍可在少量往返内结束。
3. **任务。** 工作可能超过请求超时，中途需要输入，需要在客户端重启后继续查询，或应支持协作式取消。客户端必须在当前请求声明 `io.modelcontextprotocol/tasks`，服务器也必须在 `server/discover` 中发布支持。
4. **服务器生成句柄。** 需要延续的是购物车、应用会话或事务等跨调用状态，模型将其作为普通参数继续传递，采用第 04 课的 SEP-2567 模式。任务的 `taskId` 是这个通用模式的一个实例，专用于轮询单项延后执行的工作。

## 能力协商检查清单

- 客户端在每个可能需要扩展的请求中，通过 `io.modelcontextprotocol/clientCapabilities.extensions["io.modelcontextprotocol/tasks"]` 声明；协议没有会话可保存一次性的声明。
- 服务器在 `server/discover` 的 `capabilities.extensions` 中声明相同扩展。
- 服务器不得向未声明扩展的请求返回 `CreateTaskResult`。能在该请求内完成时，返回普通结果；只有无法在不创建任务的情况下服务请求时，才返回 `-32021`，并在 `data.requiredCapabilities` 指出缺失能力。当前请求未声明扩展却调用 `tasks/get`、`tasks/update` 或 `tasks/cancel`，也返回 `-32021`。
- 是否创建任务由服务器逐请求决定。客户端声明扩展后，必须同时支持同一工具返回普通结果或 `resultType: "task"`。
- 当前版本仅允许对 `tools/call` 增加任务支持。

## CreateTaskResult 字段

| 字段 | 含义 |
|---|---|
| `resultType` | 此类结果始终为 `"task"` |
| `taskId` | 服务器生成、不可猜测且可持久保存的标识 |
| `status` | 创建时通常为 `"working"` |
| `createdAt`, `lastUpdatedAt` | ISO 8601 时间戳 |
| `ttlMs` | 从创建时刻计算的存续时长；`null` 表示未声明限制 |
| `pollIntervalMs` | 下次轮询前建议等待的最短时间 |
| `statusMessage` | 可选、面向用户或模型的说明 |

返回前持久可查：服务器交出 `taskId` 之前，用它执行 `tasks/get` 必须已能找到任务。

## 轮询与状态规则

- `tasks/get` 自身正常完成，故其 `resultType` 为 `"complete"`。内部 `status` 承载 `working`、`input_required`、`completed`、`failed` 或 `cancelled`，这些状态不放入外层 `resultType`。
- 没有 `tasks/result`。`completed` 快照在 `result` 内嵌原始结果；`failed` 快照在 `error` 内嵌 JSON-RPC 错误。
- 没有 `tasks/list`。无状态性移除了可安全限定通用任务列表的会话范围；产品需要历史记录时，应提供经过授权和过滤的领域工具。
- 返回 `isError: true` 的工具结果仍对应 `completed` 任务；`failed` 专用于执行期间的 JSON-RPC 协议错误。

## 执行中输入与 MRTR 的区别

| | 任务创建前 | 任务执行中 |
|---|---|---|
| 机制 | 原始请求上的核心 MRTR | 任务状态 `input_required` 加 `tasks/update` |
| 客户端动作 | 用新 id、`inputResponses` 和原样 `requestState` 重试原方法 | 发送带 `inputResponses` 的 `tasks/update`，不重试 `tools/call` |
| 从哪里看到需求 | `tools/call` 响应本身 | `tasks/get` 响应的 `inputRequests` 映射 |

`inputRequests` 的键在任务生命周期内唯一。服务器忽略未知、已回答或被替代键的 `inputResponses`。客户端应对重复轮询中的键去重，再决定是否展示。

## 取消

- `tasks/cancel` 采用协作方式：表达意图，返回空的 `resultType: "complete"` 确认。它不保证工作停止，任务仍可能进入其他终态。
- 不用 `notifications/cancelled` 取消任务。该通知只取消进行中的请求；请求返回 `resultType: "task"` 后已经结束，后续须通过 `tasks/cancel` 访问持久作业。

## 相对 2025-11-25 实验性功能的变化

| 2025-11-25（已移除） | 2026-07-28 扩展 |
|---|---|
| 客户端通过 `_meta` 的任务键生成 `taskId` | 服务器生成 `taskId`，通过 `CreateTaskResult` 返回 |
| `notifications/tasks/created` 通知就绪 | 创建任务的结果直接携带句柄 |
| 阻塞式 `tasks/result` 调用 | 内嵌到同一个 `tasks/get` 响应 |
| 分页 `tasks/list` | 移除；无会话时缺少安全的跨调用方范围 |
| 初始 `submitted` 状态 | 从 `working` 开始，立即执行时也可返回后续状态 |
| 建立连接时协商 `tasks` 能力 | 每请求声明 `io.modelcontextprotocol/tasks`，不再有连接初始化协商 |

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 4、14 节。
