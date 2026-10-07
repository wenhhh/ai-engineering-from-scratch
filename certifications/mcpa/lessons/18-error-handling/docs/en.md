# 请求失败的两个通道（Two Ways for a Request to Fail）

> 请求失败时不能随意发明错误表达。MCP 2026-07-28 定义了少量固定错误码，将失败分入两个通道，并明确禁止使用某些编号。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 17 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 区分协议错误与工具执行错误，判断具体失败必须使用哪个通道
- 列出三个 MCP 保留错误码 -32020、-32021、-32022，以及各自携带的数据
- 应用 2026-07-28 错误码分配政策，区分旧版子区间、规范保留子区间，以及应用自定义编号应放置的位置
- 将 JSON-RPC 错误码映射到 Streamable HTTP 服务器必须配套返回的 HTTP 状态
- 解释 2026-07-28 实现为何不能发送 -32002 和 -32042，以及两者分别由什么替代

## 问题（The Problem）

没有认真设计失败处理的服务器，往往一边实现功能一边临时发明错误码：缺少参数用一个随手选的数字，下游超时用另一个，权限问题则变成 message 字段里自创的字符串。这些约定无法可靠互通。另一个团队编写的客户端，不知道某台服务器临时选取的编号意味着什么；两台服务器即使都觉得 -32001 很方便，也可能赋予它完全不同的含义。原文给出了实际背景：2026-07-28 分配政策出现前，仅“资源未找到”一项，官方 MCP SDK 就存在分歧，四个使用 -32002，一个使用 -32602，一个使用 -32603，还有一个使用通用的 0。客户端若要跨服务器可靠识别资源缺失，就需要针对各 SDK 分别处理。

代价最直接地落在最不能凭空猜测的参与方身上：决定下一步行动的模型。如果工具调用失败后变成一个不透明的 JSON-RPC 错误，客户端在它进入模型上下文前就将其吞掉，模型便无从了解原因，可能重复错误调用，也可能放弃只需修正一个参数就能完成的任务。第 17 课的生命周期已说明：校验、能力检查和执行都可能失败，将所有失败混为一谈，会丢掉原本可用于恢复的信息。本课进一步明确准确的编号、各自所属通道，以及哪些编号不能再使用。

## 概念（The Concept）

每个 MCP 失败通过两个通道之一返回。本课强调，选对通道是整个错误模型中最重要、最常考查的区分。

**协议错误（Protocol error）**表示请求本身存在问题，或服务器发生内部故障：方法不存在、指定工具不由该服务器提供、缺少请求必需字段等。它采用标准 JSON-RPC 错误对象，客户端通常自行处理，而不直接作为工具结果展示给模型：

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "error": {
    "code": -32602,
    "message": "Unknown tool: delete_everything"
  }
}
```

**工具执行错误（Tool execution error）**表示工具调用请求本身可被识别，但在工具参数检查或执行时遇到调用方能够处理的问题，例如必需参数缺失或结构错误、下游 API 失败、输入违反业务规则，或句柄过期。它以带有 `isError: true` 的正常 `complete` 结果返回，使模型能够读取内容并据以修正：

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "resolution is required for close_ticket"}],
    "isError": true
  }
}
```

早期规范对两者的说明存在歧义：某个版本将“无效参数”描述为协议错误，却将“无效输入数据”描述为工具执行错误，没有划清边界。SEP-1303 通过将这两类工具输入问题统一归入工具执行错误，消除了这个缺口。缺少工具必需字段、类型错误、数值越界，都使用 `isError: true`，不能用 `-32602`。未知工具仍属于协议错误，因为调整参数无法修复工具本身不存在的问题。

基础协议失败使用标准 JSON-RPC 2.0 编号：`-32700` 表示解析错误，正文不是合法 JSON，因无法读取请求 `id` 而报告 `null`；`-32600` 表示无效请求，JSON 合法但不符合 JSON-RPC 对象结构；`-32601` 表示找不到方法，即服务器不实现这个方法；`-32602` 表示参数无效，包括未知工具、缺少必需 `_meta` 的请求、不存在的资源、无效提示词参数和无效分页游标；`-32603` 表示服务器内部错误。尤其需要记住 `-32601` 与 `-32602` 的区别：`-32601` 针对*方法本身*，`-32602` 针对*请求中的其他无效内容*，包括服务器从未提供的工具名称，但不包括应通过工具执行通道报告的工具输入问题。

JSON-RPC 将 `-32000` 到 `-32099` 留给实现定义的服务器错误，2026-07-28 分配政策进一步划分了它。`-32000` 到 `-32019` 属于旧版区间，用于政策出现前由各实现自行选取的编号；新实现不得在其中分配错误码，并应避免使用整个子区间。`-32020` 到 `-32099` 则保留给规范本身，目前仅定义三个编号：

```json
{"code": -32020, "message": "Header mismatch: Mcp-Name header value 'foo' does not match body value 'bar'"}
```

`-32020` 对应 `HeaderMismatch`：HTTP 请求头与正文不一致，或缺少必需请求头。`-32021` 对应 `MissingRequiredClientCapability`：服务器需要当前请求 `clientCapabilities` 未声明的能力，通过 `data.requiredCapabilities` 指出缺失项，与第 07 课的每请求能力协商一致。`-32022` 对应 `UnsupportedProtocolVersion`：服务器不支持请求指定的版本，通过 `data.supported` 列表和 `data.requested` 给出支持版本与请求版本，沿用第 05 课的版本协商结构。规范禁止发送 `-32020` 到 `-32099` 中除这三者之外的任何未定义编号。

有两个编号已明确退役，不能出现在 2026-07-28 响应中。`-32002` 曾用于截至 2025-11-25 的资源未找到场景，SDK 间的不一致使旧建议难以互通，SEP-2164 因而将其替换为 `-32602`。`-32042` 则用于表示需要 URL 模式信息征询，仅存在于 2025-11-25；它没有直接的新错误码替代，因为 URL 模式现在通过普通 MRTR 流程协商，不再使用专门错误。宽容兼容旧版的客户端仍可以接受旧服务器返回的 `-32002`，但 2026-07-28 服务器不得生成它。

如果某个应用错误确实既不适合现有 MCP 编号，也不适合 `isError`，其自定义编号应完全位于 JSON-RPC 保留区间 `-32768` 到 `-32000` 之外。实践中这种情况应很少见：SEP-1303 的目的，正是让实现先考虑 `isError` 工具执行错误，而非轻易创造新数字。

在 Streamable HTTP 上，若干错误码有规定的配套 HTTP 状态。请求头不一致、缺失客户端能力、不支持的版本，以及请求缺少 `_meta`，都对应 `400 Bad Request`：

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/list

```

如果上述请求的头部与正文不一致，或正文完全没有 `_meta`，服务器返回 `400`，正文内包含相应 JSON-RPC 错误。未知方法则返回 `404 Not Found`，因为它涉及端点的方法路由。还有一些事件发生在 JSON-RPC 层之外，只通过 HTTP 状态表达，不携带 JSON-RPC 错误：接受通知时返回无正文的 `202 Accepted`；向现代 MCP 端点发送 `GET` 或 `DELETE` 时返回 `405 Method Not Allowed`；bearer 令牌缺失或无效时返回 `401 Unauthorized`；OAuth 权限范围不足时返回 `403 Forbidden`。

最后，一条通常可以严格依赖的规则有一个很窄的例外：错误响应应回传请求的 `id`，但如果 id 根本无法读取，例如正文连 JSON 都无法解析，就返回 `id: null`，因为没有可供回传的 id。

```figure
mcpa-18-error-taxonomy
```

## 交互实验（Interactive Lab）

图中并列展示两个错误通道。左列用小方框列出本课场景涉及的五个协议错误码，由客户端读取并处理。右列只有一张卡片：不同原因的工具级问题都采用相同的 `isError: true` 结构，作为普通内容进入模型上下文。底部虚线区域标出禁用范围：旧版子区间与两个明确退役编号。符合当前版本规范的实现不应生成这些错误；客户端识别历史响应则属于另行处理的向后兼容路径。

## 实践实验（Practice Lab）

`code/main.py` 构建一个包含两个工具的小型服务台服务器，再由客户端依次执行本课场景：正常发现与工具调用、缺少参数、枚举值无效、未知工具、请求未声明所需能力、不支持的协议版本，以及完全缺少 `_meta` 的请求。从仓库根目录运行：

```bash
python3 certifications/mcpa/lessons/18-error-handling/code/main.py
```

先阅读错误码防护函数：`is_forbidden_error_code` 以纯函数实现分配政策，`safe_error` 在构造任何错误响应前都先调用它。服务器的每个错误返回都经过 `safe_error`，因此禁用编号不会意外进入发送路径。报文末尾有两个标记为 `violation` 的条目，展示不符合规范的服务器可能错误返回的旧版“工具调用失败”编号和已退役的资源未找到编号。它们经过包装，明确属于反例，不作为真实协议行为。可以在解释器中调用 `main.safe_error(1, -32050, "made up")`，观察它在构造响应之前抛出 `ForbiddenErrorCode`；再调用 `main.safe_error(1, -32021, "fine")`，这个已定义的保留编号则能够正常构造。

## 交付物（Shipped Artifact）

`outputs/error-code-decision-table.md` 提供四步决策表：选择通道、选择编号、确认未落入禁用清单，最后在确有需要时为应用自定义编号选择正确区间。它还包含 HTTP 状态映射，以及完全不携带 JSON-RPC 错误的传输事件。审阅服务器错误处理时可保持打开参考。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：未知工具返回 `-32602`；未知方法返回 `-32601` 并映射到 HTTP 404；缺失或无效工具参数使用 `isError: true`；请求缺少 `_meta` 时返回 `-32602` 并映射到 HTTP 400；版本不支持时携带 `data.supported` 和 `data.requested`；能力不足时携带 `data.requiredCapabilities`，声明所需能力后调用通过；防护拒绝 `-32001`、`-32002`、`-32042` 和任意未定义的规范保留编号，允许三个已定义编号及保留区间之外的编号；解析失败报告 null id；整份报文除 `violation` 包装外不含禁用编号。仓库的报文检查器直接依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/18-error-handling
```

## 与综合实践的联系（Capstone Connection）

综合实践每次发生失败都会用到本课：工具参数不符合结构定义时必须返回 `isError`，使模型能够修正后继续；遭篡改的 MRTR `requestState` 必须被拒绝，不临时发明新错误码；令牌受众错误必须按照第 23 课所述机制拒绝，不能揉进自创的协议错误。论证失败响应时，应首先说明它属于哪个通道，再依据本课表格选择编号，而非为当前情况随意造一个数字。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 协议错误（Protocol error） | 针对未知方法、未知工具、无效封套或服务器故障等问题的 JSON-RPC 错误对象 |
| 工具执行错误（Tool execution error） | 带有 `isError: true` 的正常 `complete` 结果，内容可供模型读取并修正 |
| 分配政策（Allocation policy） | 2026-07-28 将 `-32000` 到 `-32099` 划分为旧版子区间和规范保留子区间的规则 |
| `HeaderMismatch` | `-32020`，请求头与正文不一致或缺少必需请求头时返回 |
| `MissingRequiredClientCapabilityError` | `-32021`，请求需要其自身 `clientCapabilities` 未声明的能力时返回，并携带 `data.requiredCapabilities` |
| `UnsupportedProtocolVersionError` | `-32022`，请求指定服务器未实现的版本时返回，并携带 `data.supported` 与 `data.requested` |
| 退役编号（Retired code） | 曾由旧版本定义、但 2026-07-28 禁止发送的编号，例如 `-32002` 和 `-32042` |
| `safe_error` | 本课防护函数，在响应构造前拒绝禁用错误码 |

## 延伸阅读（Further Reading）

- [基础协议：错误码（Error Codes）](https://modelcontextprotocol.io/specification/2026-07-28/basic/index#error-codes)
- [工具：错误处理（Error Handling）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling)
- [Streamable HTTP：服务器校验与请求头要求](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#server-validation)
- [SEP-1303：将输入校验错误作为工具执行错误](https://modelcontextprotocol.io/seps/1303-input-validation-errors-as-tool-execution-errors)
- [SEP-2164：统一资源未找到错误码](https://modelcontextprotocol.io/seps/2164-resource-not-found-error)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5 节
