# 通知路由表（Notification Routing Table）

面向 MCPA“交互与执行”领域的一页参考，对齐 MCP 2026-07-28。

## 两类通道，不可混用

| 通道 | 打开方式 | 每条消息的关联标记 | 通知方法 |
|---|---|---|---|
| 监听流 | 请求 `subscriptions/listen` | `_meta["io.modelcontextprotocol/subscriptionId"]`，等于 listen 请求 id | `notifications/subscriptions/acknowledged`、`notifications/tools/list_changed`、`notifications/prompts/list_changed`、`notifications/resources/list_changed`、`notifications/resources/updated` |
| 请求自己的响应通道 | 普通请求 | 不共享跨请求状态；`progress` 携带 `progressToken`，`message` 要求当前请求自己的 `logLevel` | `notifications/progress`、`notifications/message` |

## 打开与关闭订阅

1. 客户端发送 `subscriptions/listen`，在 `notifications` 中设置过滤条件：布尔值 `toolsListChanged`、`promptsListChanged`、`resourcesListChanged`，以及 URI 列表 `resourceSubscriptions`。
2. 服务器在流中发出的第一条消息是 `notifications/subscriptions/acknowledged`，回传实际批准的子集和等于 listen 请求 id 的订阅 id。在它之前不能发送其他消息。
3. 后续流消息重复相同订阅 id，客户端据此区分共用通道的多个活动订阅。
4. 订阅可以由客户端取消而结束，HTTP 关闭 SSE 流，stdio 发送 `notifications/cancelled`；也可由服务器正常关闭，向原始 listen 请求返回 `complete`，并在 `_meta` 携带订阅 id；传输突然中断则没有任何结束消息。
5. stdio 崩溃或重启后的新进程不记得原订阅，客户端须用新 id 重新发送 `subscriptions/listen`，重建仍需要的每条流。

## 进度

- 客户端通过 `_meta.progressToken` 选择接收进度，令牌为字符串或整数，且在自身活动请求中唯一。
- 即使 `total` 未知，`progress` 也必须随每次通知严格递增；`total` 与 `message` 可选。
- 请求完成后停止通知，双方应限速，避免淹没通道。
- 进度从不携带订阅 id，也不出现在监听流中。

## 按传输方式取消

| 传输 | 客户端如何取消 | 服务器发送什么 |
|---|---|---|
| Streamable HTTP | 关闭请求的 SSE 响应流 | 无须消息，流关闭本身就是取消信号 |
| stdio | 发送 `notifications/cancelled`，携带 `requestId` 和可选 `reason` | 普通请求不需要回复；服务器只可用 `notifications/cancelled` 终止自己正在结束的监听流 |

## 取消与交付之间的正常竞态

取消生效前生成的消息，可能在接收方停止跟踪它之后才到达。双方不应因此将交互判为失败：发送方可能已没有可取消对象，接收方则丢弃已不认识的消息，不再路由到任何位置。

## 考试要点

- 进度及已弃用日志功能的 `message` 通知从不携带订阅 id，订阅流通知则始终携带。
- 服务器主动发送 `notifications/cancelled` 只允许一个用途：终止自己正在结束的订阅流。
- 2026-07-28 没有 `resources/subscribe` 和 `resources/unsubscribe`；通过 `subscriptions/listen` 的 `resourceSubscriptions` 监视资源。
- 关闭 stdio 进程本身不构成逐请求取消消息；stdio 使用显式的 `notifications/cancelled` 指定目标请求。
- 正常关闭结果与传输突然中断是不同信号，只有前者明确说明订阅正常结束。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 8 节。
