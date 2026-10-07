# 同意授权与最小权限（Consent and Least Privilege）

> 工具会改变外部世界时，执行依据不能仅是模型选择了它。需要由用户批准这个具体操作，客户端也应只持有完成该操作所需的访问权限。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 24 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释 MCP 为何不再通过服务器主动推送请求获取批准，以及多轮往返请求（MRTR）如何承载同意授权问题
- 区分逐工具同意与笼统的“信任这台服务器”，解释工具注解如何辅助决策，以及为何不能据此保证执行安全
- 读懂 HTTP 403 insufficient_scope 挑战，将客户端已有权限范围与新要求的权限范围取并集，计算后续申请范围
- 为增量授权循环设置重试上限，让无法获得所需权限的客户端明确失败，避免无限重试
- 解释 tools/list 为何可随调用方获授权限变化，同时对同一授权条件下的相同请求保持稳定

## 问题（The Problem）

具备工具访问能力的智能体，可以删除文件、发送付款、联系客户或撤销账户，这些操作往往难以恢复。工具运行在客户端未必自行编写的服务器上，调用时机由模型选择。两种设计都容易失败：连接服务器时就预先批准全部调用，会让粗心或被攻陷的服务器使用用户权限行动，缺少人工查看即将发生之事的环节；每个调用，包括纯读取操作，都重新弹出确认框，又会让用户疲于点击，最终不再阅读内容，批准退化为机械动作。

MCP 中的正确设计不止是选定一条提示策略。2026-07-28 没有会话，也没有服务器主动发起的请求；服务器不能沿用旧式面向连接的模式，在调用中途直接打断客户端追问。人工批准之下还存在另一道容易混淆的门禁：用户看到确认问题之前，客户端访问令牌就必须具备足够的 OAuth 权限范围。同意授权回答“这个具体操作应不应该发生”，权限范围回答“客户端是否具备尝试这类操作的资格”。只处理其中一层，会留下另一层缺口。

## 概念（The Concept）

### 无会话追问：通过 MRTR 进行信息征询

工具由模型控制，模型决定何时调用。规范不强制具体界面，但明确建议让用户始终能够拒绝调用，应用应展示可用工具、标明执行过程，并在敏感操作前确认。服务器不能主动推送请求，因此需要追问时采用多轮往返模式：用 `resultType: "input_required"` 结果回答 `tools/call`，其中 `inputRequests` 的各项为 `elicitation/create` 请求，必要时再附上 `requestState`，用于将答案绑定回具体调用。客户端收集回答后，用新的 JSON-RPC id 重试相同操作；答案放入键名与服务器要求一致的 `inputResponses`，`requestState` 则逐字节原样回传。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "confirm": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Allow delete_file to run with arguments {\"path\": \"notes.txt\"}?",
          "requestedSchema": {
            "type": "object",
            "properties": {"approved": {"type": "boolean", "title": "Approve this call"}},
            "required": ["approved"]
          }
        }
      }
    },
    "requestState": "eyJ0b29sIjogImRlbGV0ZV9maWxlIn0.9f2c..."
  }
}
```

用户通过三种动作之一作答：`accept`，表单模式下附带符合要求结构的 `content`；`decline`，表示明确拒绝；`cancel`，表示用户离开而未作决定。调用必须在处理这些动作后才决定是否继续，只有有效的 `accept` 才构成同意。客户端若把 `cancel` 混同于 `decline`，或对两者悄悄重试，都是在猜测用户意图。它们均不属于协议错误。本课服务器因未获同意而拒绝执行工具时，使用正常 `tools/call` 结果、`isError: true` 和可供模型阅读的说明，遵循业务拒绝的处理方式，不返回 JSON-RPC 错误，也不发明新的错误码。2026-07-28 的错误表中没有专门的“需要同意”代码。

`requestState` 离开服务器、跨越信任边界再返回后，必须作为可能受攻击者控制的输入处理。如果它影响执行行为，应通过 HMAC 或 AEAD 等方式保护完整性，绑定到最初签发时的具体调用，并限制为单次使用。重试带回一项调用的 `requestState`，却换成另一组参数，意味着用户看过内容之后请求发生变化；捕捉这一点依赖服务器的状态校验，单靠报文形态无法保证。

### 将同意限定到具体工具

用户给予的同意，必须准确限定到获批工具。批准 `delete_file` 不会同时批准 `send_payment`，即使两者位于同一服务器、同一对话，而且只间隔片刻。笼统的“信任这台服务器”会把一次具体、知情的决定扩大成用户从未作出的通用许可。这也是工具 `annotations` 有价值又有限制的地方：`readOnlyHint`、`destructiveHint` 和 `openWorldHint` 可辅助判断何时应提示。纯读取通常可以不再确认；写入、删除、发送或访问开放环境的调用，通常需要确认。但这些都是服务器对自己的声明，规范要求在服务器不可信时将其视为不可信。工具谎称只读，不会因为 `annotations` 如此填写就变得安全。无论客户端如何利用注解设计提示策略，真正记录用户批准了哪个工具、并据此执行门禁的机制，都应由客户端负责。默认值同样重要：`destructiveHint` 与 `openWorldHint` 默认为 true，`readOnlyHint` 默认为 false。完全没有注解的工具，会按可能具有破坏性且面向开放环境处理，体现协议在信息缺失时的保守选择。

### 增量授权：位于更低一层的独立门禁

请求尚未进入同意授权环节，就可能因访问令牌权限范围不足而失败。这属于 OAuth 控制的传输授权层。服务器发现权限不足时返回 `403 Forbidden`，通过 `WWW-Authenticate` 一次列出本操作需要的全部权限范围，避免分多次往返逐个索取：

```http
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
                         scope="payments:write",
                         resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

客户端将原先持有的权限范围与此次挑战要求取并集，不用新集合替换旧集合。按操作进行的增量授权，不应使客户端丢失此前已获得的权限。随后，客户端为并集重新授权并重试。这与首次选择权限范围不同：第一次授权时，初始 `401` 若没有 `scope` 参数，客户端会回退参考受保护资源元数据中的 `scopes_supported`，确定起始申请范围，避免随意申请额外权限。两条规则都要求在需要时申请必要权限，尽量一次完成增量申请，而不反复零散扩大授权。循环还必须有上限：重新授权只尝试少量、有界次数；超过上限后，应将该操作报告为持续性的授权失败，不能无限等待根本无法取得的权限。

### 列表结果也应遵循最小权限

无状态性要求 `tools/list` 不因其他请求的副作用改变，并在相同调用方、相同授权条件下稳定返回同一组工具。但不同调用方可以看到不同结果，因为请求上的权限范围本身是输入，不属于连接记忆。若服务器把所有工具都展示给所有人，再等调用时拒绝不具备权限的工具，就泄露了用户本不应看到的能力及结构，也会诱导模型尝试必然失败的调用。最小权限设计应按当前实际权限过滤 `tools/list`，并标注 `cacheScope: "private"`，避免用 `"public"` 缓存把某个用户可见的工具列表共享给另一个用户。

```figure
mcpa-25-consent-gates
```

## 交互实验（Interactive Lab）

图中跟踪一次 `tools/call` 在执行前可能遇到的两道门禁。先经过授权边界：令牌权限范围不足时，服务器返回 `403` 与所需范围；客户端与已有范围取并集，重新授权后重试。通过这层后才进入同意门禁：工具需要人工决定，但没有对应的具体批准记录时，服务器返回 `input_required`，暂不执行；客户端通过 `elicitation/create` 往返收集答案后再试。两道门禁独立且有顺序：权限充分的客户端仍可能需要人工批准，没有人工同意问题的客户端也可能缺少权限。工具可以受任一道、两道或都不受这两道门禁约束。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构建含四个工具的服务器：`list_files` 只读且局限于封闭环境，直接运行；`search_web` 虽只读，但 openWorldHint 为 true，仍要求用户同意；`delete_file` 具有破坏性，使用小型内存文件系统，便于观察拒绝后文件是否保持不变；`send_payment` 同时具有破坏性并要求 `payments:write`，因此会经过两道门禁。

```bash
python3 code/main.py
```

对照上文阅读记录。先找到 `delete_file` 的 `input_required`，观察 `decline` 使 `notes.txt` 保持原样；随后是新的信息征询，先前拒绝不会被记作批准，直到接受后的重试才删除文件。再找出故意错误的请求：它回传有效 `requestState`，却要求删除与用户看到的不同文件。该项标为 `violation`，因为服务器对 `requestState` 的检查会拦截不匹配，而不盲信重试。另一边，`send_payment` 先收到权限范围挑战，客户端将 `payments:read` 与新要求的 `payments:write` 合并，之后才进入自己的独立同意提示。最后比较只持有 `payments:read` 与同时持有 `payments:write` 时，`tools/list` 返回的内容。

## 交付物（Shipped Artifact）

`outputs/consent-design-checklist.md` 是一页设计评审参考：何时提示、如何限定批准范围、如何构造增量授权挑战，以及应直接拒绝的常见错误模式。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：只读工具无需提示；破坏性工具触发信息征询；拒绝与取消不产生副作用；对一个工具的同意不覆盖其他工具；篡改后的重试被拒，且不消耗合法 `requestState`；已消费状态不能重放；增量授权正确计算权限并集并实施重试上限；`tools/list` 按实际获授权限过滤。仓库的报文检查器还会按照 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/25-consent-and-least-privilege
```

## 与综合实践的联系（Capstone Connection）

综合系统中，每个有副作用的工具都需要针对自身名称的同意决定，不能继承其他工具的批准，也不能仅由服务器注解推定。每个受权限范围约束的工具，都需要取并集的增量授权路径及重试上限。论证调用方能看什么、能做什么时，应同时说明用户明确批准的具体操作和令牌实际授予的范围，并指出失败发生在哪道门禁。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 信息征询（Elicitation） | 服务器索取用户输入的 MRTR 机制，通过 `inputRequests` 内的 `elicitation/create` 项交付 |
| requestState | 服务器签发、重试时必须原样回传的不透明字符串；按不可信输入处理，涉及决策时保护完整性并限制单次使用 |
| 逐工具同意范围（Per-tool consent scoping） | 将批准记录绑定到具体工具名，不扩大到服务器、类别或名称模式 |
| 注解提示（Annotation hint） | 如 `destructiveHint` 的服务器声明，可辅助客户端提示策略，不能视为执行保证 |
| 增量授权（Step-up authorization） | 收到 `403 insufficient_scope` 后，为已有与新增所需 OAuth 权限范围的并集重新授权 |
| 权限范围并集（Scope union） | 合并已有范围与挑战要求，避免重新授权丢失此前许可 |
| 列表结果最小权限（Least privilege in list results） | 按当前授权过滤 `tools/list` 等结果，并使用 `cacheScope: "private"` 缓存 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：工具（Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)，了解用户交互模型与两个工具错误通道
- [MCP 规范 2026-07-28：信息征询（Elicitation）](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)，了解表单模式、URL 模式与三种响应动作
- [MCP 规范 2026-07-28：授权（Authorization）](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)，了解权限范围选择与增量授权流程
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 7、11、12 节
- `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation`，从基本机制逐步构建信息征询
