# JSON-RPC 消息封套（The JSON-RPC Envelope）

> 即使服务器此前从未与你通信，也必须仅凭当前这条消息判断：你是否期待回答、使用哪个协议版本，以及元数据在哪里结束、工具参数又从哪里开始。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 02 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 将任意一条采用 2026-07-28 版本的线上消息归类为请求、通知、结果响应或错误响应，并说明区分它们的 id 规则
- 解释 resultType 的含义、complete 与 input_required 成为两个核心取值的原因，以及客户端应如何处理无法识别或缺失的取值
- 按照前缀与名称语法校验 `_meta` 键，检查前缀的第二个标签而非第一个，区分 MCP 保留前缀与外观相近的普通前缀
- 列出请求、通知和结果各自携带的保留 `_meta` 键，并说明 OpenTelemetry 跟踪上下文为什么成为前缀规则的例外
- 解释缺少必需 `_meta` 字段的请求为何以 `-32602` 被拒绝，以及 MCP 为何从不把两条消息放在同一个批次中传输

## 问题（The Problem）

第 02 课展示了一个客户端如何发现两个此前从未接触过的服务器，并调用各自的工具。在这段交互之下，还有一个更基础、更明确的问题，考试要求你能够毫不迟疑地回答：面对刚从 stdio 收到、或刚到达 Streamable HTTP POST 请求体中的任意一份 JSON，它究竟是哪类消息？接收方可以对它做出哪些假设？

JSON-RPC 2.0 为 MCP 提供了四种消息形态。由于无状态服务器无法依赖连接级约定，规范对接收方如何区分这些形态作出了严格要求。通信开始时并不存在一个握手过程，预先确定“这条连接使用版本 X”或“这条流只承载客户端 Y 的请求”。每条消息都必须携带足够的身份信息，使接收方在独立处理它时始终得出相同结论，即使处理它的服务器副本与处理上一条消息的副本完全不同。

这种自描述分为两层。外层是消息封套本身：这是期待回复的请求、不需要回复的通知、完成工作的结果，还是表示未能完成的错误？`id` 字段一旦出错，服务器就可能无法区分请求与通知，客户端也可能无法把响应关联回产生它的调用。内层是 `_meta`：请求、通知或结果通过这个属性携带协议级信息，例如请求声明的协议版本，同时避免与应用自己在参数中使用的 `version` 或 `capabilities` 等名称发生冲突。如果 `_meta` 命名不符合规则，服务器自定义字段就可能在没有明显提示的情况下覆盖协议所依赖的字段，或被这些字段覆盖。

## 概念（The Concept）

**四种形态，各有关键规则。** 请求携带 `id`、`method` 和可选的 `params`；id 必须是字符串或整数，不能为 `null`，也不能与发送方仍在等待回复的请求 id 重复。

```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "get_weather", "arguments": {"location": "Pune"}}}
```

通知携带 `method` 和可选的 `params`，但完全不能包含 `id`。无论成功还是失败，接收方都不能发送任何回复。

```json
{"jsonrpc": "2.0", "method": "notifications/progress", "params": {"progressToken": 7, "progress": 1, "total": 2}}
```

结果响应回传请求的 `id`，并携带 `result` 对象。该对象必须包含 `resultType` 字段。

```json
{"jsonrpc": "2.0", "id": 7, "result": {"resultType": "complete", "content": [{"type": "text", "text": "Pune: sunny, 26C"}], "isError": false}}
```

错误响应同样回传请求的 `id`，唯一例外是请求格式损坏到无法解析，以至于根本读不出 id 的情况。它携带一个 `error` 对象，其中包含整数 `code` 和字符串 `message`，还可以附加 `data` 字段。

```json
{"jsonrpc": "2.0", "id": 3, "error": {"code": -32602, "message": "Missing required _meta field(s): io.modelcontextprotocol/protocolVersion"}}
```

**resultType 告诉客户端如何解读后续内容。** `"complete"` 表示结果已经包含最终内容，无须继续操作。`"input_required"` 表示这是 `InputRequiredResult`，多轮往返模式通过这种结构向客户端索取更多信息，原始调用随后才能完成；相关重试机制将在本路线的后续课程中单独讲解。扩展可以注册其他取值，例如用于长时间任务的 `"task"`，但前提是客户端已经声明相应能力。收到无法识别的 resultType 时，客户端必须将结果视为无效，不能猜测其结构。如果对端使用从未发送 resultType 的更早协议版本，客户端则必须把缺失值当作 `"complete"`；这是这条严格规则为向后兼容保留的处理方式。

**`_meta` 将协议级信息与应用自己的命名空间分开。** `_meta` 键由可选前缀和名称两部分组成。存在前缀时，它包含一个或多个以点分隔的标签，并以斜杠结尾；每个标签以字母开头，以字母或数字结尾，中间可以包含字母、数字或连字符。名称非空时，必须以字母或数字开头和结尾，中间可以包含字母、数字、连字符、下划线和点。如果前缀的第二个标签为 `modelcontextprotocol` 或 `mcp`，这个前缀就保留给 MCP 使用。这里的“第二个”最容易成为考题陷阱：`io.modelcontextprotocol/protocolVersion` 和 `dev.mcp/anything` 都属于保留键，因为 `modelcontextprotocol` 和 `mcp` 位于第二个位置。`com.example.mcp/scanId` 则不保留，因为它的第二个标签为 `example`，`mcp` 直到第三个位置才出现。同样，`mcp.example/thing` 中的 `mcp` 位于第一个标签，第二个位置没有保留名称，因此也不受这条规则保留。规范鼓励实现为自己的前缀采用反向 DNS 记法，例如使用 `com.example/` 而非 `example.com/`，让命名空间冲突成为可明确判断的设计选择，避免意外碰撞。

**每个请求声明自己的版本和能力；每个结果可以说明由谁作答。** 每个请求都需要关注 `io.modelcontextprotocol/` 下的三个 `_meta` 键：`protocolVersion` 是必需的字符串；`clientCapabilities` 是必需的对象，允许为空；`clientInfo` 是描述客户端名称等信息的 `Implementation`，虽然不是严格必需，但除非客户端被明确配置为省略它，否则预期每个请求都应携带。第四个键 `logLevel` 为单次请求启用已弃用日志功能的通知，后续关于已弃用客户端功能的课程会完整介绍。缺少任一必需字段都会使请求格式无效，符合规范的服务器必须返回 JSON-RPC 错误 `-32602`；使用 HTTP 传输时，还必须返回 `400 Bad Request` 状态。返回结果时，服务器应在结果的 `_meta` 中附加 `io.modelcontextprotocol/serverInfo`，标明生成响应的实现。`clientInfo` 与 `serverInfo` 都由发送方自行报告，协议从不验证它们；这些字段用于展示、日志和调试。服务器或网关若让其中任何一个字段影响授权或路由决策，就混淆了说明性信息与身份凭据。

**还有少量键直接被保留。** 不带前缀的 `progressToken` 用于让请求接收进度通知。经由 `subscriptions/listen` 流交付的每条通知都携带 `io.modelcontextprotocol/subscriptionId`，使客户端能够识别产生通知的订阅；后续通知与订阅课程会完整展开这一机制。`traceparent`、`tracestate` 和 `baggage` 则是前缀规则中有意设置的例外：OpenTelemetry 的跟踪上下文约定要求使用这些确切的裸键名，因此 MCP 直接保留它们，不添加命名空间前缀，以兼容现有跟踪工具。SEP-414 记录了这一选择。

**每次只传输一条消息。** MCP 在 2025-06-18 版本中移除了 JSON-RPC 批处理，此后没有重新引入。在 Streamable HTTP 中，一个 POST 请求体只携带一个请求或一个通知；在 stdio 中，每一条以换行符分隔的记录只携带一条消息。客户端准备好三个请求时，应发送三个 POST 请求体，不能把三者放入同一个数组发送。

```figure
mcpa-03-envelope
```

## 交互实验（Interactive Lab）

图的上半部分并列展示四种消息形态及其关键字段：请求必须有非空 id，通知必须完全没有 id，结果需要 resultType，错误需要 code 和 message。下半部分放大了两个 `_meta` 键，分别以斜杠为界拆成前缀标签与名称。`io.modelcontextprotocol/protocolVersion` 高亮第二个标签 `modelcontextprotocol`，说明它为何被保留。`com.example.mcp/scanId` 也高亮第二个标签，但该标签为 `example`，因此即使后面出现 `mcp`，这个前缀也不保留。并排查看两行高亮内容就能理解陷阱：决定前缀是否属于 MCP 的是标签位置，仅仅出现相同文字还不够。

## 实践实验（Practice Lab）

打开 `code/main.py`。它没有网络调用，也不使用 SDK，只实现本课介绍的消息结构。`classify_message` 检查原始字典，依据上文的 id 规则返回 `"request"`、`"notification"`、`"result"`、`"error"` 或 `"invalid"`：有 `method` 而没有 `id` 的消息是通知；有 `method` 且 id 合法的消息是请求；有 `method` 但 id 为 `null` 的消息不属于前两者，因此判为无效。`meta_key_status` 接收一个键字符串，应用前缀语法和第二标签规则，返回 `"reserved"`、`"free"` 或 `"invalid"`。

```bash
python3 code/main.py
```

先将输出的分类列表与概念部分对照，再观察 `run_scenario` 演示的短交互：合法的 `tools/call` 请求收到完整结果，`notifications/progress` 通知没有回复，还有三个故意构造的错误。报文检查器将它们识别为违规示例，不当作真实流量，每个示例都标注了错误原因。其中一个通知携带了本不该存在的 id；一个请求的 id 为 `null`；另一个请求完全缺少 `_meta`。最后一种错误后面紧跟符合规范的服务器实际应返回的 `-32602` 响应，由处理合法调用的同一个 `handle_request` 函数生成。把缺失字段从 `protocolVersion` 改为 `clientCapabilities` 后重新运行，观察错误消息如何指出另一个键。

## 交付物（Shipped Artifact）

`outputs/message-shapes-reference.md` 提供一页速查资料，包含四种消息结构、resultType 取值、明确说明第二标签检查的 `_meta` 语法，以及完整保留键表。表中每行都引用研究简报。查看原始 MCP 流量时可将它保持打开，比反复翻查规范更快地回答“这个结构是否合法”和“这个键是否可由我使用”。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的各项主张：四种结构都能正确分类；id 为 null 的请求和携带 id 的通知均被拒绝；缺少 resultType 的结果被标记；`io.modelcontextprotocol/protocolVersion` 与 `dev.mcp/anything` 判为保留，而 `com.example.mcp/anything` 判为可用；四个不带前缀的保留键可以被识别；格式损坏的键名判为无效；请求无论缺少 `protocolVersion` 还是 `clientCapabilities`，都会得到 `-32602`；合法请求正常完成；报文记录中所有未加包装的结果都包含 resultType。仓库的报文检查器还会依据完整的 2026-07-28 规则验证同一记录，包括三个故意违规示例的包装方式：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/03-json-rpc-and-meta
```

## 与综合实践的联系（Capstone Connection）

第 04 课在本课定义的消息封套之上构建无状态模型：每个请求已经通过 `_meta` 携带自己的版本和能力，服务器才可以将其独立处理，无须再从连接推断其他信息。第 18 课的错误分类则假定你已经知道：无效 `_meta` 产生 `-32602`，错误响应的 `data` 字段可省略。综合实践的端到端交互从一个与本课实践实验结构完全相同的请求开始，其中也包含 `_meta`；如果第一个消息封套就不正确，后续路线便无法正常工作。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 请求（Request） | 包含 `id`、`method` 和可选 `params` 的消息；期待恰好一次回复 |
| 通知（Notification） | 包含 `method` 和可选 `params`，但不能有 `id` 的消息；不接收回复 |
| 结果响应（Result response） | 回传请求 id，并携带含 resultType 的 `result` 对象的回复 |
| 错误响应（Error response） | 携带 `error` 对象的回复，其中包含整数 `code` 和字符串 `message` |
| resultType | 标识结果类别的字段：complete、input_required 或某个扩展值 |
| `_meta` | 承载协议级元数据的属性，其键由可选的点分前缀与名称组成 |
| 保留前缀（Reserved prefix） | 第二个点分标签为 `modelcontextprotocol` 或 `mcp` 的 `_meta` 前缀 |
| protocolVersion | 声明请求所用协议版本的必需 `_meta` 字段 |
| clientCapabilities | 声明与当前请求相关能力的必需 `_meta` 字段 |
| 自报字段（Self-reported field） | clientInfo 与 serverInfo：由发送方提供、从未验证的身份信息，不能作为安全信号 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：基础协议（Base Protocol）](https://modelcontextprotocol.io/specification/2026-07-28/basic)，重点阅读消息与 `_meta` 通用字段部分
- [SEP-414：`_meta` 中的 OpenTelemetry 跟踪上下文](https://modelcontextprotocol.io/seps/414-request-meta)
- [TypeScript 模式：所有消息结构的权威定义](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 2、3 节
