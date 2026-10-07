# 模型交互流程速查（Model Interaction Flow Trace）

面向 MCPA“架构与组件”领域的一页参考，对齐 MCP 2026-07-28。
实现宿主循环、决定各轮工具调用行为时，可放在手边对照。

## 按顺序执行的五个阶段

| 阶段 | 执行方 | 行为 | 是否进入报文 |
|-------|----------|---------------|-------------------|
| 1. 构建上下文 | 宿主 | 将缓存 tools/list 转为模型视图：name、description、inputSchema、annotations | 否，这是宿主读取已有缓存 |
| 2. 选择并拟定参数 | 模型 | 从当前对话选择工具并构造参数 | 否，这是宿主内部决策 |
| 3. 确认 | 宿主 | 向用户展示拟定输入，破坏性工具发送前须获同意 | 确认本身不进入报文，获准后才发送调用 |
| 4. 调用 | 客户端 | 将获准决策转为 tools/call，并在 params._meta 中携带协议版本和能力 | 是 |
| 5. 回答 | 宿主，再到模型 | 结果内容回到上下文，模型依据工具实际输出回答 | 结果进入 MCP 报文，用户答案不属于 MCP 报文 |

## 模型在调用前后看到什么

调用前，模型只看到 `name`、`description`、`inputSchema`，以及服务器提供时的 `annotations`。
它看不到服务器代码、凭据或注册表元数据。调用后，模型看到 `content`、工具定义 `outputSchema`
时的 `structuredContent`，以及 `isError` 标志。
它不直接看到 HTTP 状态码或请求头等原始传输细节。

## tools/call 的三类结果如何改变循环

| 结果 | resultType | isError | 循环下一步 |
|--------|------------|---------|---------------------------|
| 成功 | complete | false | 将 content 和 structuredContent 交给模型，生成答案 |
| 工具执行错误 | complete | true | 将内容交给模型，修正参数后以新 id 重试，不带 inputResponses |
| 需要更多输入 | input_required | 不出现 | 宿主通过 elicitation/create、sampling/createMessage 或 roots/list 收集答案，以新 id、inputResponses 和原样 requestState 重试 |

JSON-RPC 错误是第四类结果，例如未知工具返回 `-32602`；它不属于 `tools/call` 的正常结果。
这类错误没有让模型仅靠改进工具参数就能解决的信息，因此设计良好的循环不会
原封不动地重发同一个请求。

## 确认门禁

```text
从缓存工具定义读取 annotations
read_only  = annotations.readOnlyHint     （默认 false）
destructive = annotations.destructiveHint （默认 true，仅在非只读时有意义）
门禁触发条件：(not read_only) and destructive
```

完全没有 `annotations` 块的工具，按默认值视为具有破坏性。客户端发送前先向用户展示拟定输入。
如果被拒，客户端不构造调用请求，因此报文中不会出现被拒调用，
只在宿主自身状态中记录说明。

## 实例：来自 code/main.py

- `get_forecast({})` 返回工具执行错误，指出缺少 `city`；重试
  `get_forecast({"city": "Pune"})` 使用新 id 并成功。
- `open_ticket({"title": "..."})` 返回 `input_required`，要求用户确认优先级；重试携带
  `inputResponses` 和服务器提供的原始 `requestState`，客户端不解读它，
  直到此时才创建工单。
- `close_ticket` 没有 `annotations`，因此默认具有破坏性。一项拟定调用获准后发送，
  另一项被拒，从未形成请求。
- 服务器不存在 `archive_ticket`。调用只发送一次，返回 `-32602`，
  不再使用同名同参数原样重试。

## 宿主循环检查清单

- 从缓存且顺序确定的 tools/list 构造模型上下文；不要在各轮间重新排序数组，
  因为模型服务商通常缓存包含该数组的提示词前缀。
- 判断是否需要人工确认时，同时应用注解默认值，
  不能只检查服务器实际填写的字段。
- 敏感调用确认前展示拟定输入，不能只显示工具名称。
- 将 isError true 视为修正后重试的信号，不能仅因此终止整个循环。
- 区分 input_required 与 isError：MRTR 使用新 id、准确回传的 requestState，
  以及按服务器原键组织的 inputResponses。
- JSON-RPC 错误意味着不要继续原样重试该请求，
  并不意味着应向模型完全隐瞒失败。
- 根据工具实际返回的内容回答，不脱离结果自行编造摘要。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5、7、10 节。
