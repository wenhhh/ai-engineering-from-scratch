# 订阅流：通知、进度与取消（The Subscription Stream: Notifications, Progress, and Cancellation）

> 通知不会收到回复，因此必须自行说明归属：它属于主动打开的长连接订阅流，还是某个仍在等待完成的请求？

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 15 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 区分通知和请求，并解释接收方为何绝不能回答通知
- 打开 subscriptions/listen 流，读取订阅确认，并按 subscriptionId 分流处理其中的通知
- 根据实际传输通道，区分流通知（列表变更、资源更新）和请求范围通知（进度、日志），避免凭猜测归类
- 跟踪进度通知的令牌与总量，并解释 progress 为什么必须持续递增
- 在各类传输上取消请求或订阅，并处理取消与在途消息之间的竞态

## 问题（The Problem）

MCP 的大多数交互是一次请求、一次回复：客户端询问，服务器回答，交互结束。但服务器需要告诉客户端的信息并不都适合这种形式。有些信息需要持续推送，例如工具列表改变、已订阅资源被写入或新增提示词。单次回复无法表达“继续通知我”，因为回复会结束它所属的请求。另一些信息只伴随某次调用：一个耗时三十秒的操作可以报告已完成五分之一，这有助于用户了解进度，但它仍只是计算最终答案期间的过程说明。还有些时候，请求或订阅已经开始，客户端却改变了主意，而协议又没有会话可存放取消标志。第 04 课的无状态核心意味着，服务器不会为某条连接保留隐式的专属协议上下文，因此取消也须采用自包含、按 id 寻址的消息机制。

MCP 用客户端主动打开的 `subscriptions/listen` 流处理持续变更，用与单个请求关联的 `notifications/progress`，以及第 15 课已弃用日志功能中的 `notifications/message`，处理调用过程中的信息。它们都是普通 JSON-RPC 通知：包含 method 和 params，没有 id，也不会得到回复。区别在于所走通道，以及多个交互并行时接收方如何识别各自归属。

## 概念（The Concept）

回顾第 03 课的消息封套：通知是没有 `id` 的 JSON-RPC 消息结构。它不能通过请求 id 充当某个特定请求的结果，接收方也不得为它发送回复。这条规则说明了为什么通知需要两类承载位置。请求响应通道只在该请求仍未结束时存在，因此进度等只与单次调用相关的信息自然由该通道承载。而“工具列表现在变了”这样的持续变更，可能发生在没有任何普通调用进行的时候，无法归属于某次调用。为此，协议需要由专门请求主动打开、刻意保持存续的流。

`subscriptions/listen` 用来打开这条流。客户端发送普通请求，`params.notifications` 是过滤条件：`toolsListChanged`、`promptsListChanged` 和 `resourcesListChanged` 是布尔值，`resourceSubscriptions` 则列出需要监视更新的 URI。服务器绝不能发送客户端没有请求的通知类型；如果根本不支持某一类型，也可以只接受所请求范围的一部分。

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "subscriptions/listen",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    },
    "notifications": {
      "toolsListChanged": true,
      "resourceSubscriptions": ["file:///project/config.json"]
    }
  }
}
```

服务器在该流中发回的第一条消息必须是 `notifications/subscriptions/acknowledged`，早于其他任何消息。它列出服务器实际接受的过滤条件子集，并在 `_meta["io.modelcontextprotocol/subscriptionId"]` 中携带打开此流的 `subscriptions/listen` 请求 id，本例为 `7`。这就是完整的分流识别机制：属于同一订阅流的确认和后续每条通知，都重复相同的订阅 id。客户端无论在同一 stdio 通道打开两个订阅，还是在多个 HTTP 流中维持多个订阅，都通过这个字段区分它们；传输连接与订阅之间不能简单画等号。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {"io.modelcontextprotocol/subscriptionId": 7},
    "notifications": {"toolsListChanged": true, "resourceSubscriptions": ["file:///project/config.json"]}
  }
}
```

确认之后，还有四种通知方法可以在同一流上传递，始终携带相同标记：`notifications/tools/list_changed`、`notifications/prompts/list_changed`、`notifications/resources/list_changed` 和 `notifications/resources/updated`，最后一种包含发生变化的 `uri`。其他类型不属于这个通道。`notifications/progress` 与 `notifications/message` 的范围是请求：它们归属于发起它们的那次调用，不能归到订阅，也绝不能携带订阅 id。进度通知改用 `progressToken` 关联调用，该值由客户端选择，且必须在其活动请求中唯一；还包含 `progress` 数值，即使总量未知，每次通知的进度也必须严格递增。`total` 和供人阅读的 `message` 为可选字段。服务器可自行决定发送频率，也可以不发送，但请求结束后必须停止；双方都应限速，避免淹没通道。第 15 课的已弃用日志通知 `notifications/message`，只允许出现在自身 `_meta` 设置了日志级别的请求上，缺少该键时服务器不能发送它。

取消方式取决于传输。在 Streamable HTTP 上，关闭某个请求的 SSE 响应流本身就是取消信号，无须发送或等待额外通知。stdio 没有独立的每请求流可关闭，因此客户端发送 `notifications/cancelled`，携带目标 `requestId`，以及可选的 `reason`。服务器主动发出 `notifications/cancelled` 只允许用于终止自己正在结束的 `subscriptions/listen` 流，不能有其他用途；因此看到服务器发送这种通知，本身就能帮助判断关闭的是哪类流。

订阅也可以正常结束。只要流仍存续，其 `subscriptions/listen` 在形式上就一直是未结束的 JSON-RPC 请求。如果服务器主动决定结束订阅，例如准备关闭服务，应在关闭流前，回答最初的请求：返回 `resultType` 为 complete 的结果，并在 `_meta` 中携带相同订阅 id。这样客户端就能区分“订阅正常结束”和“传输突然消失”，后一种情况没有这样的结束消息。取消与交付并行发生，取消生效前刚生成的通知，可能在接收方已经停止跟踪该 id 后才到达。双方应容忍这种竞态，而不把它视为新的错误：发送方可能已经没有活动对象需要取消；接收方则直接丢弃已不认识的消息，不再路由给任何处理器。

无状态性在这里还有一个直接结果。如果 stdio 进程重启，新服务器进程不记得旧进程打开的任何订阅；客户端必须为仍需要的每个订阅使用新 id 重新发送 `subscriptions/listen`。这里没有恢复或重放重启前的消息，因为服务器并未把它们保存在可跨重启继承的协议会话里。

```figure
mcpa-16-subscription-stream
```

## 交互实验（Interactive Lab）

图中客户端和服务器并排排列，沿页面向下展示完整场景。两个 `subscriptions/listen` 请求先后打开，各自首先得到在 `_meta` 中携带本请求 id 的确认，后续通知采用相同标记。因此，即使共用一个通道，“工具及配置”订阅与“仅资源列表”订阅也不会混淆。下方，一次独立的 `tools/call` 在自己的请求与回复之间发送进度更新；三条进度通知都没有订阅 id，因为它们属于调用本身。靠近底部时，客户端取消第二个订阅，但一条此前已在途的更新仍然到达，随后被丢弃，不再交付。先通读整体结构，再跟踪订阅 id 与进度令牌，思考如何据此编写不会混淆通道的代码。

## 实践实验（Practice Lab）

打开 `code/main.py`。`SubscriptionServer` 将每个打开的 `subscriptions/listen` 请求记录为 `Subscription`，其中包含实际批准的通知类型。它通过 `resource_updated`、`list_changed`、`cancel` 和 `close_gracefully` 生成订阅流消息；订阅已关闭或从未获准接收相应类型时，不再发送对应通知。`call_long_job` 回答普通 `tools/call`：如果请求携带 `progressToken`，它会返回一小段进度通知及最终结果，与任何订阅完全分开。`SubscriberClient` 发送 `subscriptions/listen`，记录确认，再通过 `receive_stream` 对后续内容分流；该方法只接受本地仍在跟踪的订阅 id 对应的通知。

```bash
python3 code/main.py
```

将输出报文与概念部分对照。找出两个订阅确认，核实每个订阅 id 都等于产生它的 `subscriptions/listen` 请求 id。找出 `run_build` 调用的三条进度通知，核实它们完全没有 `_meta`。再找出末尾的取消，以及紧接着经过包装的条目：它是发往刚取消订阅的 `resources/updated` 通知，明确标注为故意构造的违规示例，因为客户端应丢弃而不交付它。随后尝试为 `promptsListChanged` 打开第三个订阅，并调用 `list_changed`：结果应为 `None`，因为这个服务器从未声明 prompts 能力，也就不能授予对应通知订阅。

## 交付物（Shipped Artifact）

`outputs/notification-routing-table.md` 提供一页参考，将本课每种通知方法映射到对应通道、必需字段及约束规则：哪四种方法只能出现在监听流中，哪两种属于请求范围、原因是什么，以及客户端在各类传输上如何取消。可将它与后续课程的错误码表放在一起，在需要迅速解读报文通知时参考。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：订阅确认是流中第一条消息，并以 listen 请求 id 作为订阅 id；确认只回传服务器实际批准的通知类型；未请求或未获准的类型不会发送；进度严格递增且不携带订阅 id，真正的订阅流通知则始终携带；取消订阅后服务器不再为其产生新消息；取消生效时已在途的消息被丢弃而不交付；正常关闭结果携带订阅 id，重复关闭不产生额外效果；两个并发订阅按 id 正确分流。仓库的报文检查器还会依据 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/16-notifications-and-subscriptions
```

## 与综合实践的联系（Capstone Connection）

综合实践中的长时间操作需要准确运用本课概念：带进度的调用不因此成为订阅，也可通过缺少 `taskId` 与后续课程的任务扩展区分；监听流中的通知必须按订阅 id 路由。场景在操作进行中取消时，由本课介绍的传输差异决定报文中会出现什么：HTTP 关闭 SSE 流，stdio 发送 `notifications/cancelled`。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 通知（Notification） | 不含 id、不会得到回复的 JSON-RPC 消息 |
| `subscriptions/listen` | 打开长时间通知流的请求 |
| 订阅 id（Subscription id） | listen 请求自身的 id，在该流承载的每条消息中回传 |
| 流通知（Stream notification） | `list_changed` 或 `resources/updated`，只通过监听流交付 |
| 请求范围通知（Request scoped notification） | `progress` 或 `message`，只通过所描述请求的响应通道交付 |
| `progressToken` | 客户端选择、在活动请求中唯一的值，将进度更新关联到一次调用 |
| 正常关闭（Graceful closure） | 原始 listen 请求收到 `complete` 结果，表明流正常结束，可与传输突然中断区分 |
| `notifications/cancelled` | stdio 的取消通知；服务器只可将其用于终止监听流 |

## 延伸阅读（Further Reading）

- [MCP 消息模式](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns)，概览普通请求、MRTR 和订阅通知
- [订阅（Subscriptions）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [进度（Progress）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress)
- [取消（Cancellation）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 8 节
- `phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control`，深入介绍这些消息相关的超时与流量控制
