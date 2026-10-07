# 模型交互流程（The Model Interaction Flow）

> 工具调用涉及宿主在用户、模型与服务器之间运行的循环。报文只是其中一环，每次循环都会决定模型接下来能看到什么。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 09 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 跟踪完整路径：用户请求、宿主构建模型上下文、选择工具、人工确认门禁、`tools/call`、服务器执行，以及结果返回模型
- 准确说明模型在各轮看到什么：调用前的工具名称、描述和结构定义，调用后的内容或 `isError` 标志
- 应用清单阅读课程中的注解默认值，在破坏性调用进入报文通道前，通过确认门禁向用户展示拟定的工具输入
- 解释确定性的工具顺序如何同时保护客户端自身缓存和模型服务商的提示词缓存
- 根据循环下一步行为，区分 `input_required` 中断、工具执行错误与协议错误

## 问题（The Problem）

前几课介绍了服务器交给客户端的材料：发现结果、工具列表，以及需要审慎阅读的清单。但它们尚未解释，用户输入请求的那一刻究竟会发生什么。`tools/list` 中的工具定义本身不会行动；宿主必须运行一个循环，将它转化为决策、报文调用和答案。跳过这一循环，你仍可能答对消息结构题，却容易错过行为题：客户端是否重试格式错误的调用？敏感操作是否在发送前向用户展示？各轮重新排序工具数组，会不会悄悄破坏模型服务商依赖的缓存？

这个循环中存在两类错误，考试都会涉及。第一类是协议处理错误，例如把原始 JSON-RPC 错误直接交回模型并期待它自行修复，或忘记 `input_required` 结果之后的重试需要新 id，并原样回传 `requestState`。第二类是完全不触及报文的宿主设计错误：省略人工确认、在敏感调用前不展示拟定参数，或者每轮都打乱工具顺序。客户端即使在报文层完全符合规范，也可能把交互循环设计错，因为其中一部分属于规范仅作建议的宿主策略。

## 概念（The Concept）

回顾宿主、客户端与服务器课程中的职责划分：宿主为每台服务器运行一个客户端，并负责与模型对话；客户端只是将决策转换成请求的薄层。本课跟踪的循环分为五个阶段，依次交接。

首先，宿主构建模型上下文。它已经持有发现课程介绍的缓存 `tools/list` 结果，并将每个条目转换为模型能看到的字段：`name`、`description`、`inputSchema`，以及服务器提供时的 `annotations`。工具实现细节不会跨过这条边界。模型看不到服务器代码、凭据或清单中的注册表元数据，只能看到清单阅读课程中同样供评审者检查的这些字段。

第二，模型读取上下文与用户请求，拟定工具名称和参数。本实验用一个小型确定性函数代替大语言模型。此时尚未产生任何报文，只是在宿主内部形成了决策。

第三，客户端发送任何内容之前，宿主执行人工确认门禁。规范建议用户应能够拒绝调用，客户端也应在调用前展示工具输入。是否触发确认，依据清单课程中的注解默认值判断：`readOnlyHint` 默认为 false，`destructiveHint` 默认为 true，因此完全没有 `annotations` 块的工具按默认规则视为具有破坏性，必须先获得同意。如果用户拒绝，循环就在这里结束。客户端甚至不会构造 `tools/call`，因此被拒操作不留下调用报文，只有宿主在自身状态中记录的一条说明。

第四，获准调用变成普通 `tools/call`，与本课程其他请求一样，通过 `params._meta` 携带协议版本和能力。服务器现在可以返回不同结果，各自将循环导向不同分支。

```json
{"jsonrpc": "2.0", "id": 5, "result": {"resultType": "input_required", "inputRequests": {"priority": {"method": "elicitation/create", "params": {"mode": "form", "message": "What priority should this ticket have?", "requestedSchema": {"type": "object", "properties": {"priority": {"type": "string"}}, "required": ["priority"]}}}}, "requestState": "eyJ0aXRsZSI6IlZQTiBkcm9wcyJ9"}}
```

`resultType` 为 `complete` 且 `isError` 为 false，是最直接的路径：模型读取 `content`，以及工具定义 `outputSchema` 时的 `structuredContent`，宿主据此组织答案。`complete` 结果若携带 `isError` true，则是工具执行错误，相当于将集成问题课程中的双错误通道划分应用到循环中：模型读取解释，使用修正参数和新 id 重试，无须 `inputResponses`，因为这是另一次普通调用，并非多轮往返模式。`input_required` 结果才对应多轮往返模式，详见研究简报第 7 节：服务器需要通过 `elicitation/create`、`sampling/createMessage` 或 `roots/list` 获得尚缺的信息；宿主必须收集答案，用新的 JSON-RPC id 重试相同调用，按服务器给定键名提供 `inputResponses`，并逐字节原样回传 `requestState`。客户端不应打开这个字符串解读内容。最后，未知工具产生的 `-32602` 等 JSON-RPC 错误属于协议错误，循环不应原封不动地重试：请求没有变化，结果也不会因此改变。

第五，宿主收到 `complete` 结果，或决定某分支不受支持后，将相关内容放回模型持续累积的上下文。模型据此生成答案，答案应引用工具实际返回的信息，不能脱离结果自行猜测。

还有一项属性贯穿所有轮次：底层工具集合没有变化时，`tools/list` 每次应返回相同顺序。这会影响实际成本。宿主通常构造一次模型上下文数组，随后跨轮次复用；多数模型服务商会缓存包含该数组的提示词前缀。重新排列数组，即使只是将新发现的工具插在中间而非追加到末尾，也可能使缓存失效，额外词元成本甚至超过工具定义本身。确定性顺序既让客户端能够依赖自己的缓存，也有助于模型服务商逐轮命中提示词缓存。

```figure
mcpa-10-interaction-flow
```

## 交互实验（Interactive Lab）

图中展示一次请求经过全部五个阶段的过程。沿上方一行，从用户提问到宿主构建上下文、模型选择工具，再到确认门禁。门禁后分成两条路径：获准调用继续向右到达服务器；被拒调用直接落入下方虚线框，保留在本地而不发送。服务器下方展开三种结果：完整结果流向答案，工具执行错误和 `input_required` 结果则以虚线回到模型，表示重试。两条重试路径看起来相似，但机制不同：只有 MRTR 分支在采用新 id 的同时，还要原样回传 `requestState`。

## 实践实验（Practice Lab）

打开 `code/main.py`，在本课目录运行：

```bash
python3 code/main.py
```

报文输出包含九对请求与响应。先看前两次 `get_forecast`：模型拟定空参数，服务器返回 `isError: true` 并指出缺失字段；模型随后才补入用户句子中已经给出的城市，再以新 id 调用。接着查看两次 `open_ticket`：第一次已有合法 `title`，仍返回 `input_required`，因为服务器始终要求用户确认优先级，不让模型猜测；重试携带 `inputResponses`，以及服务器交回的、既未读取也未修改的 `requestState` 原字符串。再看输出中的确认门禁部分：`close_ticket` 完全没有 `annotations`，宿主依规范默认值将它视为破坏性，发送前先向用户展示两次拟定调用。其中一张工单获准，调用到达报文通道；另一张因低优先级工单需要第二位评审者而被拒，从未形成 `tools/call`。最后，模型尝试服务器未提供的 `archive_ticket`，收到 `-32602` 后不再原样重试。底部最终答案引用成功调用实际返回的内容，不自行编造摘要。修改 `choose_priority` 或 `approve_close` 后重新运行，观察同一循环中的不同路径。

## 交付物（Shipped Artifact）

`outputs/interaction-flow-trace.md` 提供一页流程记录与决策表：模型在调用前后看到什么，`tools/call` 的三类结果如何改变循环，以及宿主循环的实现检查清单，要求先展示输入再调用，并且不原样重试协议错误。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试检查以下主张：`tools/list` 每次以相同确定性顺序返回定义；交互中每个请求都在 `_meta` 中携带协议版本和能力；缺少 `_meta` 的请求以 `-32602` 被拒；没有 `annotations` 的工具默认具有破坏性并需要确认，明确只读或非破坏性的工具则不需要；确认门禁阻止被拒的 `close_ticket` 进入报文通道，同时允许获准调用发送；`get_forecast` 工具执行错误反馈给模型后，修正调用以新 id 成功；`open_ticket` 的 `input_required` 真正中断循环，直到所需输入得到回答；重试采用新 id 并准确回传 `requestState`；`archive_ticket` 的协议错误不会被原样重试；最终答案引用真实结果内容。仓库报文检查器还依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/10-model-interaction-flow
```

## 与综合实践的联系（Capstone Connection）

综合实践会完整运用这个循环：构建上下文，让模型选择工具，敏感内容发送前先确认，读取返回的各类结果，并依据工具实际内容回答。当综合实践询问为什么某次调用从未发送，或为什么某次重试使用新 id 时，答案来自本课的交互行为，单看报文规则还不够。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 模型上下文（Model context） | 每个工具的 name、description、inputSchema 和 annotations，即模型选择工具前能看到的内容 |
| 确认门禁（Confirmation gate） | 发送敏感调用前向用户展示拟定输入的宿主侧检查，本身不进入协议报文 |
| 工具执行错误（Tool execution error） | isError true 的 complete 结果；模型读取后可使用修正参数和新 id 重试 |
| input_required | MRTR 中断；宿主收集缺失输入，再以新 id 和原样 requestState 重试 |
| 协议错误（Protocol error） | 例如 -32602 的 JSON-RPC 错误，循环不应原封不动地重试请求 |
| 确定性顺序（Deterministic ordering） | tools/list 以稳定顺序返回工具，保护客户端缓存和模型服务商的提示词缓存 |
| requestState | MRTR 重试时由客户端准确回传的不透明字符串，客户端不读取或修改它 |
| 注解默认值（Annotation defaults） | 没有工具注解时采用 readOnlyHint false、destructiveHint true，确认门禁据此判断 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：工具、消息流程与用户交互模型](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 规范 2026-07-28：多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 架构概览](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)
- [MCP 客户端最佳实践：与提示词缓存的交互](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5、7、10 节
- `phases/13-tools-and-protocols/02-function-calling-deep-dive`，深入了解工具调用循环的模型侧行为
