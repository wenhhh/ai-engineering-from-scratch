# 工具原语：执行动作并读取结果（The Tools Primitive: Calling Actions and Reading Their Results）

> 工具调用使用普通请求结构。本课专门讨论结果能携带的内容：文本、图像、音频、资源链接或完整嵌入的资源，以及各自关于受众、优先级和更新时间的提示。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 10 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 读取 `tools/list` 页面的分页与缓存提示，并解释客户端得到的工具列表为何不能取决于发起查询的连接
- 调用工具，并按三个字段拆解 `CallToolResult`：`content`、`structuredContent` 和 `isError`
- 识别工具结果可携带的各类内容块：文本、图像、音频、资源链接和嵌入资源，并说明其自身注解的含义
- 服务器省略注解对象时，应用每项工具注解的默认值，解释这些值为何偏向谨慎
- 跟踪服务器工具列表的变化如何传递给已经打开 `subscriptions/listen` 流的客户端

## 问题（The Problem）

服务器可能只提供一个工具，也可能提供数百个。如果 `tools/list` 每次都用一大块未分页内容返回全部工具，又不说明结果在多长时间内仍然有效，那么每次模型交互都只能在两个不理想的选择之间取舍：无谓地重新获取完整目录，或使用可能已经过时的副本。请求与响应本身无法告诉客户端哪一种选择安全。

调用工具时，同样的问题表现得更明显。工具可能生成一句话、绘制图像，或返回文件的实际字节，单纯的“返回字符串”契约无法准确描述这些情况。如果所有结果被迫使用同一种形态，客户端就得猜测文本究竟供模型读取、供用户查看，还是指向应另行获取的资源；也缺少明确方式，区分调用根本无法执行与工具返回了需要模型理解并修正的问题。

2026-07-28 用相同思路解决这两类问题：让报文结构足够明确，减少客户端猜测。列表携带分页和缓存提示，结果内容逐块声明类型，工具执行失败则通过明确字段表示，无须从返回形态反推。

## 概念（The Concept）

客户端通过 `tools/list` 询问服务器可提供什么。请求可以携带从上一页复制的不透明 `cursor`，第一页省略它。由于 `tools/list` 是可缓存操作，`"complete"` 结果始终包含整数 `ttlMs`，以及取值为 `"public"` 或 `"private"` 的 `cacheScope`。还有更多工具时，结果额外包含 `nextCursor`，客户端不加解读地把这个不透明字符串传回。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resultType": "complete",
    "tools": [
      {"name": "get_readme_link", "description": "Point at the project README instead of inlining it.", "inputSchema": {"type": "object", "additionalProperties": false}}
    ],
    "nextCursor": "",
    "ttlMs": 300000,
    "cacheScope": "public"
  }
}
```

这里故意把 `nextCursor` 设为空字符串：它是合法游标值，并不表示“已经没有下一页”。如果客户端用 `if result.get("nextCursor")` 判断是否继续分页，就会提前一页停止，因为多数语言将空字符串视为假值。正确判断应检查这个键是否存在。分页细节完全由服务器实现决定；客户端解析、解码或递增游标，都是在依赖服务器下一个版本可以随时改变的内部约定。列表内容也遵循相同纪律：工具集合未变且授权相同时，来自三个不相关连接的三次 `tools/list` 应返回相同内容和顺序。只有当前请求的授权改变了调用方可见范围时，工具集合才可以不同，不能取决于连接记住了什么。

调用单个工具使用 `tools/call`，在 `params` 中提供 `name` 和 `arguments`。返回的 `CallToolResult` 包含不能省略的 `content` 列表、可选 `structuredContent` 值和可选 `isError`。结果省略 `isError` 时表示成功，只有 `true` 才表示工具执行工作时遇到问题。工具定义 `outputSchema` 时，将结构化答案放在 `structuredContent` 中，同时在 `content` 的文本块里序列化同一个值，让只读取文本的客户端仍能获得数据。

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "{\"id\": \"TCK-9\", \"title\": \"VPN drops every hour\", \"status\": \"open\"}"}],
    "structuredContent": {"id": "TCK-9", "title": "VPN drops every hour", "status": "open"}
  }
}
```

`content` 采用列表，是因为一次调用可以同时返回多类内容，规范定义了五种内容块。`text` 块携带 `text`；`image` 块携带 base64 编码的 `data` 和 `mimeType`；`audio` 块也使用这两个字段承载音频；`resource_link` 块通过 `uri` 和 `name` 指向资源，不直接嵌入内容，适用于内容较大或模型可能根本无需读取的情况；`resource` 块则直接嵌入资源内容，包括 `uri`、`mimeType`，以及 `text` 或 `blob`。任一内容块都可以携带自己的 `annotations`：`audience` 指定受众为 `user`、`assistant` 或两者；`priority` 为 0 至 1；`lastModified` 记录最后修改时间。这些内容注解与块的其他字段并列，与 `data` 或 `resource` 处于同一级，不能再嵌套一层。尤其要注意，嵌入资源的注解位于 `resource` 对象旁边，而不在该对象内部。

```json
{
  "type": "resource",
  "resource": {"uri": "config://release-desk/thresholds", "mimeType": "application/json", "text": "{\"maxOpenIncidents\": 5}"},
  "annotations": {"audience": ["user", "assistant"], "priority": 0.7, "lastModified": "2026-07-01T00:00:00Z"}
}
```

另一组注解描述工具本身，而非某次返回内容：`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`，以及展示用的 `title`。它们均不提供保证，除非服务器本身可信，否则客户端必须将其视为不可信提示。服务器完全不提供注解时，客户端仍有默认值可用：`readOnlyHint` false、`destructiveHint` true（只有 `readOnlyHint` false 时有意义）、`idempotentHint` false、`openWorldHint` true。这些值有意采取谨慎立场。没有任何注解的工具，应被视为重复调用可能产生不同影响，因为客户端没有得到足以作出相反判断的信息。

声明 `tools: {listChanged: true}` 的服务器承诺在工具集合变化时发出通知，通知通过特定流交付。客户端用 `subscriptions/listen` 打开该流，在 `params.notifications` 中指定 `toolsListChanged`。返回的第一条消息始终是 `notifications/subscriptions/acknowledged`，回传服务器同意处理的请求类型，并在 `_meta` 中携带 `io.modelcontextprotocol/subscriptionId`，其值与监听请求的 `id` 相同。该流之后的每条 `notifications/tools/list_changed` 都携带相同订阅 id，使同时维护多条流的客户端能够区分来源。通知不携带新工具列表，只说明旧列表已经失效；客户端通过普通 `tools/list` 重新获取。

```figure
mcpa-11-tool-call
```

## 交互实验（Interactive Lab）

图中展示一次 `tools/call` 往返：请求沿一个方向发送，`CallToolResult` 沿相反方向返回；箭头下方列出 `content` 数组能够组合的五种内容块。再往下，同一结果的 `isError` 分为两类：省略或 false 表示成功，true 表示工具遇到模型可以读取并据以采取行动的问题。这一结构适用于各种服务器，无论工具生成文字、绘制徽章，还是返回暂时无人需要读取的文件链接。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构建一个有六个工具的 `release-desk` 服务器：五种内容块各对应一个工具，再加上结构化工单摘要。工具列表每页两个，共三页，中间一页故意以空字符串游标结尾。

```bash
python3 code/main.py
```

将输出页与概念部分对照：前两页均包含客户端不会解读的 `nextCursor`，直到第三页才完全没有 `nextCursor` 键，这才是分页结束的信号。然后找到文件前部的 `render_for_audience`，观察它依据 `render_badge` 在内容块上设置的 `annotations.audience`，在面向 `"assistant"` 的渲染中排除徽章图像，在面向 `"user"` 的渲染中保留。最后查看报文末尾的 `subscriptions/listen` 交互：先收到确认，流存续期间注册第七个工具 `triage_incident` 时，立即收到 `notifications/tools/list_changed`；随后重新遍历 `tools/list`，现在需要第四页才能获取全部工具。在 `build_tool_server` 中加入自己的第八个工具，再次运行，确认分页和 `effective_tool_annotations` 默认值均可自然适用，无须修改客户端代码。

## 交付物（Shipped Artifact）

`outputs/tool-result-anatomy.md` 提供一页参考，覆盖 `tools/list` 的分页与缓存字段、`CallToolResult` 结构、五种内容块及必需字段、工具注解默认值，以及 listChanged 流程概述。最初几次审查真实工具定义时可将它放在手边；每一行都能对应到本课代码实际设置的字段。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证以下主张：各种内容块格式正确；`resource_link` 始终有 `uri` 和 `name`；嵌入资源的 `annotations` 位于 `resource` 对象旁边，而非内部；按受众过滤时确实排除面向其他对象的块；普通成功结果可以不含 `isError`；`tools/list` 正确跨过空字符串游标，不提前结束；无法识别的游标被拒绝；缺少元数据的请求被拒绝；两个独立连接获得相同工具列表；省略的工具注解解析为文档中的默认值；`subscriptions/listen` 在报告任何变更前先发送确认。仓库报文检查器还依据 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/11-the-tools-primitive
```

## 与综合实践的联系（Capstone Connection）

综合实践的长交互会调用工具、按照结构定义验证参数，再把 `isError` 结果反馈给模型以修正重试。无论单独调用还是嵌入长脚本，都按本课的 `CallToolResult` 读取：`content` 进入模型视野，`structuredContent` 便于程序直接读取而无须重新解析文本，`isError` 则标明工具执行中出现的、值得解释给模型的问题，区别于请求层错误。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 工具（Tool） | 服务器按名称提供、由模型选择、以结构定义约束类型的动作 |
| `tools/list` | 分页枚举服务器工具、且结果可缓存的请求 |
| `tools/call` | 根据名称和参数调用单个工具的请求 |
| `CallToolResult` | 工具调用结果结构：`content`、可选 `structuredContent`、可选 `isError` |
| 内容块（Content block） | 工具结果 `content` 列表中的一项：文本、图像、音频、资源链接或嵌入资源 |
| `resource_link` | 通过 URI 指向资源、不直接嵌入内容的块 |
| 内容注解（Content annotations） | 内容块上的 `audience`、`priority` 和 `lastModified`，说明受众、优先级和更新时间 |
| 工具注解（Tool annotations） | `readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint`：关于工具行为的不可信提示 |
| `nextCursor` | 还有后续工具时携带的不透明分页值，应检查键是否存在，不检查真假值 |
| `subscriptions/listen` | 打开流以接收 `notifications/tools/list_changed` 的请求 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：工具（Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 规范 2026-07-28：订阅（Subscriptions）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 规范 2026-07-28：结构定义参考（Schema Reference）](https://modelcontextprotocol.io/specification/2026-07-28/schema)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节
- `phases/13-tools-and-protocols/07-building-an-mcp-server` 和 `phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content`，深入构建工具契约与内容处理
