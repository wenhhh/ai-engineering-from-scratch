# 长时间运行的工作与任务扩展（Long-Running Work and the Tasks Extension）

> 为等待数分钟甚至数小时的工作完成而阻塞连接，会失去无状态架构带来的好处：请求无法再由任意副本处理，连接中断也会使客户端失去任务线索。任务扩展用可持久保存的句柄替代这种阻塞调用。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 20 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释长时间工作为何不适合阻塞请求：请求与传输存在超时，执行中没有合适的输入通道，崩溃后也无法恢复
- 逐请求协商 `io.modelcontextprotocol/tasks` 扩展：在 `clientCapabilities.extensions` 中声明，并通过 `server/discover` 确认服务器支持
- 读懂由服务器决定返回的 `CreateTaskResult`（`resultType: "task"`），轮询 `tasks/get`，区分 RPC 自身的 `resultType` 与任务内部的 `status`
- 使用 `tasks/update` 提供执行中所需输入，使用 `tasks/cancel` 请求协作式取消，并解释为何两者只返回确认响应
- 区分当前扩展与已移除的 2025-11-25 实验性任务功能，包括 `tasks/result` 和 `tasks/list` 各自由什么机制替代
- 针对具体工作，在普通调用、多轮往返请求、任务和服务器生成句柄之间作出选择

## 问题（The Problem）

有些工具调用无法在单次请求的合理时限内完成。持续集成流水线、批量导入、执行到中途需要人工批准的报告生成，都可能耗时数秒、数分钟甚至更久。这种耗时本身未必是需要消除的设计缺陷。一直保持连接，直到最后一步工作完成，会同时遭遇三类问题。

首先，有些超时不由服务器控制。模型与服务器之间的客户端、代理和负载均衡器，各自限制单次请求可保持打开的时间；这些限制通常针对普通查询设定，很少按运行二十分钟的部署流水线设计。其次，阻塞的请求缺少供服务器向客户端追问信息的通道。工具执行到一半发现需要人工批准时，这个问题没有合适的去处：MRTR 往返可以为同一逻辑请求收集答案，但无法把一条打开的连接变成持续数小时的对话。最后是持久性。客户端进程重启或连接断开后，阻塞调用没有留下可供查询的线索。客户端无法询问工作是否完成，只能无限等待，或重新提交可能已经运行、甚至已经产生真实部署等副作用的工作。

无状态核心让这个问题更加明确。第 04 课解释过，协议没有会话可以回退使用：协议层不会在调用之间替请求保留上下文，因此服务器不能悄悄把作业附着于某条连接，日后再从该处恢复。长时间运行的工作必须明确回答同一个问题：跨越请求、重启和副本时，用什么标识这项工作，让任一副本都能继续处理它？

## 概念（The Concept）

MCP 通过官方扩展 `io.modelcontextprotocol/tasks`（SEP-2663）回答这个问题。支持该扩展的服务器可以对符合条件的请求返回可持久保存的句柄，也就是任务，以替代最终答案；客户端随后通过三个面向该句柄的方法轮询、提交输入和取消工作。

扩展逐请求协商，与协议中的其他能力相同。客户端在当前请求的 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明扩展，服务器则在 `server/discover` 返回的 `capabilities.extensions` 中发布相同标识。在一次调用中声明，不会自动延续到下一次：协议没有会话来记住它。因此，客户端若希望后续 `tasks/get` 调用按任务扩展处理，也必须在那次请求中重新声明。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "run_build_pipeline",
    "arguments": {"project": "web-storefront", "environment": "production"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/tasks": {}}
      }
    }
  }
}
```

是否创建任务，由服务器决定。声明扩展只表示客户端准备好接收两种结果形态；具体这一次调用是否成为任务，完全由服务器逐请求判断。同一个工具有时返回普通 `CallToolResult`，有时返回 `CreateTaskResult`，声明扩展的客户端必须能够处理两者。当前版本只允许为 `tools/call` 增加任务支持。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "task",
    "taskId": "tsk_786512e29e0d",
    "status": "working",
    "statusMessage": "Installing dependencies and running tests.",
    "createdAt": "2026-09-24T10:30:00Z",
    "lastUpdatedAt": "2026-09-24T10:30:00Z",
    "ttlMs": 900000,
    "pollIntervalMs": 2000
  }
}
```

服务器交出句柄之前，必须保证用它执行 `tasks/get` 已经能够找到任务。采用最终一致性存储时，需要等写入对读取方可见后再返回。跳过这一步，会让客户端刚拿到 `taskId` 就立即收到不存在的错误，比多等一小段时间更糟。

客户端使用 `tasks/get` 轮询，只需传入获得的 `taskId`。考试常考的细节在于：`tasks/get` 本身是会正常完成的普通请求，因此它自己的 `resultType` 始终为 `"complete"`。底层作业的状态，包括 `working`、`input_required`、`completed`、`failed` 和 `cancelled`，通过同一结果中的独立 `status` 字段表示，不放在 `resultType` 中。混淆两者的后果，是客户端一看到 `resultType: "complete"` 就停止轮询；实际上每次轮询都会出现这个值，无论作业是否还在运行。

协议没有 `tasks/result`。任务达到 `completed` 后，下一次 `tasks/get` 响应直接在 `result` 字段内嵌原始结果，其形态与同步执行原请求时返回的结果一致。任务达到 `failed` 后，同一个响应会在 `error` 字段内嵌 JSON-RPC 错误。工具调用即使以 `isError: true` 结束，任务状态仍为 `completed`，因为调用在协议层已经成功完成；`failed` 专门表示执行期间出现 JSON-RPC 错误，不表示普通工具级失败。

协议也没有 `tasks/list`。2025-11-25 的实验性版本曾提供它，但无会话服务器缺少安全的通用任务列表范围：没有会话或连接限定列表，简单列举可能把每个调用方的任务泄露给其他调用方，或者迫使实现发明基础协议未定义的授权模型。需要任务历史的产品，应自行提供经过授权和过滤的工具；通用列表调用因此被移除，避免默认交付不安全的行为。

任务可以在执行中暂停，索取创建时尚不需要的输入。此时状态变为 `input_required`，`tasks/get` 响应增加 `inputRequests` 映射，其中每项与 MRTR 输入请求具有相同形态：`elicitation/create`、`sampling/createMessage` 或 `roots/list`。客户端通过 `tasks/update` 作答，提交具有对应键的 `inputResponses`，只收到空的确认响应；更新后的状态要在下一次轮询中查看。这与核心 MRTR 的继续方式不同：MRTR 使用新 id 重试原始请求，`tasks/update` 则是针对 `taskId` 的独立方法，客户端不会重新发送最初的 `tools/call`。每个 `inputRequests` 键在任务整个生命周期内保持唯一，因此服务器会忽略从未签发或已经满足的键；客户端也会在重复轮询时去重，避免把同一个问题再次展示给用户。

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tasks/update",
  "params": {
    "taskId": "tsk_786512e29e0d",
    "inputResponses": {
      "approve_deploy": {"action": "accept", "content": {"approved": true}}
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/tasks": {}}
      }
    }
  }
}
```

取消遵循同样方式：`tasks/cancel` 只发送 `taskId`，得到空的确认响应。取消采用协作机制，无法保证工作一定停止；服务器记录取消意图后仍可能完成工作，因为中途停止未必安全或可行。这里不要使用 `notifications/cancelled`。该通知用于终止传输通道上某个仍未结束的请求，而任务的原始请求早在返回 `resultType: "task"` 时就已结束，已经没有相应的打开请求可供取消。持久作业创建后，必须通过 `tasks/cancel` 向它发送取消意图。

调用任务方法时，客户端若未在当前请求声明扩展，会收到 `-32021`，即缺少必需客户端能力，`data.requiredCapabilities` 会指出缺失的扩展。未知或已过期的 `taskId` 返回 `-32602`，与第 18 课介绍的参数无效错误码相同。`tasks/get`、`tasks/update` 和 `tasks/cancel` 都是普通 JSON-RPC 请求，必须遵守相同规则，包括逐请求元数据要求。

四种模式之间的选择，取决于什么需要跨越当前请求继续存在。工作快速且确定时，普通调用足够；服务器只需一个简短回答便可完成当前逻辑请求时，第 14 课的 MRTR 往返足够。工作可能超过超时限制、中途暂停等待输入，或需要在客户端重启后仍可查询和显式取消时，任务增加的复杂度才有价值。服务器生成句柄，即第 04 课的模式，解决的是跨调用应用状态问题：例如购物车或已打开的应用会话，通过普通工具参数继续引用。`taskId` 恰好也是这种思路的一个实例，专门用于轮询单项延后执行的工作，而非无限期维持任意状态。

```figure
mcpa-21-task-states
```

## 交互实验（Interactive Lab）

图中展示任务可能达到的各个状态，以及推动状态变化的操作。沿 `working` 向上追踪到 `input_required`，注意这条边描述服务器作出的判断，不对应客户端发送的某个请求；返回下方的边则标注客户端实际发送的 `tasks/update`。右侧从 `working` 分出三个终态：工作完成、响应客户端取消请求，以及执行遭遇协议错误而失败。三个终态都使用虚线边框。一旦进入其中之一，`tasks/get` 将继续返回相同快照。

## 实践实验（Practice Lab）

打开 `code/main.py`。`run_build_pipeline` 始终是同一个工具，使用相同输入结构，完成相同工作：安装、测试，并在获准后将项目部署到指定环境。区别只在于调用方是否声明 `io.modelcontextprotocol/tasks`。

```bash
python3 code/main.py
```

对照上面的概念部分阅读打印出的交互。未声明扩展的调用同步完成，并报告部署步骤需要扩展支持才能进行批准；声明扩展的调用则立即得到 `resultType: "task"`。本实验在轮询之间显式推进任务，模拟真实工作进程在独立请求之间继续运行，而不在后台线程中休眠，因此报文中的每次状态变化都确定且可复现。追踪同一个 `taskId`：第一次轮询为 `working`，随后进入 `input_required`，通过 `tasks/update` 提交 `{"approved": true}`，最终轮询得到 `completed`。将终态中内嵌的 `result` 与未声明扩展时直接返回的结果比较。最后找出两类错误：对从未创建的 `taskId` 调用 `tasks/get` 返回 `-32602`；对有效 `taskId` 轮询，但客户端省略扩展声明时，返回 `-32021`。

## 交付物（Shipped Artifact）

`outputs/long-running-work-patterns.md` 是一份决策参考：何时选择普通调用、MRTR 往返、任务或服务器生成句柄；能力协商检查清单；`CreateTaskResult` 字段；轮询和状态规则，尤其是 `tasks/get` 与内部 `status` 的区别；以及 2025-11-25 实验性方法的替代机制表。工具可能超出调用方耐心或传输超时限制时，可将它放在服务器工具描述旁边查阅。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：未声明扩展的调用仍返回普通结果；声明扩展的调用返回任务句柄；轮询可观察状态从 `working` 推进到 `input_required`；`input_required` 快照包含形态正确的 `inputRequests` 项；`tasks/update` 让任务继续；`completed` 快照内嵌原始结果；`tasks/cancel` 将运行中任务变为 `cancelled`；未知 `taskId` 产生协议错误；相同任务方法若缺少能力声明则返回 `-32021`。仓库的报文检查器还会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/21-long-running-work-and-tasks
```

## 与综合实践的联系（Capstone Connection）

综合实践中的受审计工具调用，可能因为耗时或执行中的审批需求而采用任务。此时直接应用本课的四个问题：客户端是否在当前请求声明扩展？服务器是否发布扩展支持？返回句柄前，任务是否已经持久可查？每次轮询是否区分了封装层自身的 `resultType` 与作业内部的 `status`？

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| `io.modelcontextprotocol/tasks` | 面向持久、由服务器决定创建的异步工作的官方扩展标识 |
| `CreateTaskResult` | 服务器可用于替代普通结果的 `resultType: "task"` 响应 |
| `tasks/get` | 根据 `taskId` 轮询单个任务完整的当前快照 |
| `tasks/update` | 为任务尚未满足的 `inputRequests` 提交 `inputResponses` |
| `tasks/cancel` | 向单个任务表达协作式取消意图 |
| `input_required` | 表示服务器需要客户端输入后才能继续的任务状态 |
| `pollIntervalMs` | 服务器当前建议的两次轮询之间的最短间隔 |
| `ttlMs` | 从任务创建时刻起计算的存续时长 |
| 返回前持久可查（Durable before return） | 将 `taskId` 交给客户端前，必须已能通过它找到任务的规则 |
| 协作式取消（Cooperative cancellation） | `tasks/cancel` 记录取消意图；服务器不保证停止工作 |

## 延伸阅读（Further Reading）

- [任务：MCP 扩展（Tasks）](https://modelcontextprotocol.io/extensions/tasks/overview)
- [SEP-2663：任务扩展（Tasks Extension）](https://modelcontextprotocol.io/seps/2663-tasks-extension)
- [SEP-1686：任务（2025-11-25 实验性版本，历史记录）](https://modelcontextprotocol.io/seps/1686-tasks)
- [MCP 规范 2026-07-28：有状态工具（Stateful Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#stateful-tools)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 4、14 节
- `phases/13-tools-and-protocols/13-mcp-async-tasks`，构建支持重启恢复与共享持久存储的任务工作进程
