# 工具定义中的契约（The Contract Inside a Tool Definition）

> inputSchema 规定了参数必须满足的结构。服务器在运行处理器之前检查参数；即使参数有误，也应返回模型能够读取并据以修正的结果。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 07 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 列出工具定义中除 name 和 description 之外的字段，包括 outputSchema、icons 与 annotations，并说明 inputSchema 绝不能取什么值
- 解释 inputSchema 与 outputSchema 为何默认采用 JSON Schema 2020-12 方言、如何显式声明其他方言，以及 SEP-2106 放宽了哪些关键字限制
- 跟踪 structuredContent 如何满足 outputSchema，并解释服务器为何还应把相同的值序列化到文本内容块中
- 说明工具命名规则，以及聚合多台服务器的宿主为何添加服务器标识前缀，而不依靠 serverInfo 保证唯一性
- 区分未知工具产生的协议错误，与参数不满足模式时带有 isError true 的工具执行错误，并解释为何只有后者能可靠地传递给模型

## 问题（The Problem）

第 07 课的发现过程让客户端了解可用工具，每个工具都有供模型阅读的名称和描述。但描述是自然语言，程序不能拿它直接校验参数对象。“根据 SKU 查找商品”能让读者明白工具用途，却没有说明字段拼写是 sku 还是 productId、类型是字符串还是整数，以及完全省略字段时应怎样处理。

工具定义通过第二部分、更严格的契约弥补这个缺口：inputSchema 是一个 JSON Schema 对象，所有客户端与服务器都能以同样方式解读。它规定处理器获准运行前，参数对象必须满足的结构，远不止是附在代码旁边的文档。无论客户端声称构造参数时有多仔细，符合规范的服务器都必须在每次调用时检查。

正确执行校验还有另一个原因，也是考试重点。模式校验失败与编造的工具名称，表面上都属于“调用没有成功”，但 MCP 2026-07-28 在报文层对两者采用完全不同的处理。混淆它们是实现中的常见错误。本课要纠正的直觉，就是认为任何无效 tools/call 都应返回 JSON-RPC 错误。

## 概念（The Concept）

工具定义包含的内容不止 name、description 和 inputSchema。完整字段包括：name、可选的展示标题 title、description、可选 icons、必需的 inputSchema、可选 outputSchema、可选 annotations，以及可选 _meta。annotations 包括 readOnlyHint、destructiveHint 等提示，除非服务器本身可信，否则这些提示也不可信；阅读完整清单的课程会深入介绍。这里有一条硬规则：inputSchema 必须是合法的 JSON Schema 对象，绝不能为 null。对于无参数工具，建议使用 `{"type": "object", "additionalProperties": false}`，只接受空对象；仅有 `{"type": "object"}` 仍会接受带有未要求属性的对象。

inputSchema 和 outputSchema 都使用 JSON Schema。模式没有 $schema 字段时，默认采用 JSON Schema 2020-12，也可以显式声明不同方言：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {"a": {"type": "number"}},
  "required": ["a"]
}
```

SEP-2106 之前，inputSchema 只允许 type、properties 和 required，使 oneOf 之类组合关键字无法使用。SEP-2106 之后，inputSchema 仍保留 type: object，因为参数始终是对象，但可以使用任意其他 2020-12 关键字。outputSchema 则允许任何合法 JSON Schema，无须限定 type: object，因为工具输出可以是对象、数组或基本值：

```json
{
  "type": "object",
  "oneOf": [
    {"properties": {"id": {"type": "string"}}, "required": ["id"]},
    {"properties": {"name": {"type": "string"}}, "required": ["name"]}
  ]
}
```

允许任意 JSON Schema 后，需要落实两项约束。首先，解析为网络 URI 的 $ref，例如绝对 https 地址，而非 #/$defs/Sku 这样的同文档指针，绝不能被自动解引用。如果校验器遇到每个 $ref 都发起获取，攻击者就能借此让服务器向任意主机发送请求。可以提供显式启用的获取模式，但默认必须关闭，并受允许列表及资源上限约束。其次，anyOf、oneOf、allOf、if/then/else 等组合关键字和 $defs，必须通过深度、子模式数量或时间预算加以限制，防止恶意构造的模式把校验本身变成拒绝服务攻击。

outputSchema 与 structuredContent 共同工作。structuredContent 可以是任意 JSON 值，不局限于对象；只要 outputSchema 允许，记录数组或单个数字都合法。存在 outputSchema 时，服务器必须返回满足它的 structuredContent；为兼容只读取文本的客户端，服务器还应将同一个值序列化到文本内容块中：

```json
{
  "content": [{"type": "text", "text": "{\"sku\": \"SKU-100\", \"priceUsd\": 24.99}"}],
  "structuredContent": {"sku": "SKU-100", "priceUsd": 24.99}
}
```

名称也有规则：长度为 1 至 128 个字符，区分大小写，只使用字母、数字、下划线、连字符和点，并在单台服务器内唯一。宿主聚合多台服务器的工具时，仍可能遇到 search 之类名称冲突，因此要用服务器标识添加前缀，不能依靠 serverInfo.name；规范明确不保证该字段唯一。

现在来看关键纠正：参数未通过 inputSchema 校验，例如缺少必需字段、类型错误、不在枚举范围内，或包含模式禁止的额外属性，都属于工具执行错误。应返回带有 isError: true 和修正说明内容的正常结果，不应包装成 JSON-RPC 错误，尤其不应使用 -32602。协议错误保留给无法通过改进工具参数解决的问题，例如服务器从未发布过的工具名称产生 -32602，或请求本身不符合 CallToolRequest 模式。许多实现曾把模式失败报告为协议错误，因此 SEP-1303 明确了这一区分：客户端只有对工具执行错误才会可靠地向模型展示；将校验失败藏在协议错误里，模型就可能重复同样错误，却无从得知原因。

```figure
mcpa-08-schema-contract
```

## 交互实验（Interactive Lab）

图的左侧放置某个工具的 inputSchema 和 outputSchema，旁边是校验步骤：要么允许调用进入处理器，要么将其拒回。沿两条结果路径观察：模式失败通过一条不到达处理器的虚线路径，生成 isError: true 的结果；校验通过后运行处理器，生成 structuredContent 及相邻的文本镜像。右侧，服务器从未发布的工具名称走另一条独立路径，直接产生协议错误 -32602，因为不存在对应工具，自然也没有模式可以校验。打开 code/main.py 运行，再将每个响应对应到产生它的路径。

```bash
python3 code/main.py
```

按顺序阅读报文：先是一次合法 lookup_product 调用，接着是四种模式校验失败，包括缺少 sku、region 枚举值越界、sku 类型错误，以及包含模式禁止的额外属性。之后分别正确调用无参数工具 server_time，以及给它传入不接受的属性，最后调用一个从未注册的工具。所有模式失败均以 isError: true 的内容返回，只有最后的未知工具名称产生 JSON-RPC 错误。

## 实践实验（Practice Lab）

扩展 code/main.py 中的 build_catalog_server，加入第三个工具 list_regions。其 outputSchema 的根类型为字符串数组，而非对象，对应 SEP-2106 允许数组和基本值 structuredContent 的规则。为它配置推荐的无参数 inputSchema，让处理器返回普通 Python 列表。使用 validate_arguments 确认返回数组相对于新模式没有必需字段或类型错误。本课校验器检查 type、properties、required、enum 和 additionalProperties，生产级 JSON Schema 库会将这一子集扩展到完整的 2020-12 词汇表。然后尝试注册一个 inputSchema 含有网络 $ref 的工具，让引用指向与 attempt_network_ref_registration 中已拒绝目标不同的网络主机；确认它同样在注册阶段被拒绝，早于任何工具调用执行。

## 交付物（Shipped Artifact）

outputs/tool-schema-reference.md 提供一页速查材料，包含工具定义的全部字段、JSON Schema 方言和 $ref 规则、outputSchema 与 structuredContent 的契约、工具命名规则，以及用具体例子对比两个错误通道的表格。查看不熟悉服务器的 tools/list 结果时，可将它放在旁边，快速判断准备发送的调用能否通过校验。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：合法参数生成的 structuredContent 本身也能通过 outputSchema 校验；缺少必需字段、类型错误、枚举违规和禁止的额外属性，都返回 isError: true，而非 JSON-RPC 错误；无参数模式接受空对象，拒绝携带额外属性的对象；未知工具名称产生协议错误，不返回 isError；网络 $ref 在注册时被拒绝；工具命名规则正确接受合法名称并拒绝非法名称。仓库的报文检查器还会依据 2026-07-28 规则验证该记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/08-tool-schemas-and-structured-content
```

## 与综合实践的联系（Capstone Connection）

综合实践评审要求你为所组装生态中的每个工具作出论证。“模式会拦住问题”只有在模式足够精确，且服务器确实把失败作为工具执行错误返回时才成立；如果失败被包装为客户端可能不向模型展示的协议错误，这句话就缺少依据。当综合设计中的工具接受用户构造的输入，或引用共享模式片段时，应重新应用命名规则与 $ref 拒绝策略；决定处理器如何报告发现的问题时，也要重新应用双错误通道的划分。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| inputSchema | 工具定义中必需的 JSON Schema 对象，合法参数对象必须满足它 |
| outputSchema | 可选的 JSON Schema 对象，structuredContent 必须与之符合 |
| structuredContent | 工具结果返回的任意 JSON 值；存在 outputSchema 时，须按其校验 |
| additionalProperties | 设为 false 时拒绝含未声明属性参数对象的模式关键字 |
| $ref | 可指向其他位置的模式关键字；网络 URI 目标不能被自动解引用 |
| 工具执行错误（Tool execution error） | 带有 isError true 的正常结果，报告模式失败等模型能够读取并修正的问题 |
| 协议错误（Protocol error） | 例如 -32602 的 JSON-RPC 错误，报告无法通过调整工具参数解决的问题，如未知工具名称 |
| 工具命名规则（Tool naming rules） | 1 至 128 个字符，区分大小写，只允许字母、数字、下划线、连字符和点，且在单台服务器内唯一 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：工具（Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)，了解本课所述字段、模式规则和错误处理的规范性要求
- [MCP 规范 2026-07-28：JSON Schema 用法（JSON Schema Usage）](https://modelcontextprotocol.io/specification/2026-07-28/basic/index#json-schema-usage)，了解方言与 $ref 解析规则
- [SEP-2106：工具 inputSchema 与 outputSchema 遵循 JSON Schema 2020-12](https://modelcontextprotocol.io/seps/2106-json-schema-2020-12)
- [SEP-1303：将输入校验错误作为工具执行错误](https://modelcontextprotocol.io/seps/1303-input-validation-errors-as-tool-execution-errors)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5、10 节
- `phases/13-tools-and-protocols/05-tool-schema-design`，了解面向模型选择的命名和参数设计
- `phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content`，了解 JSON Schema 的运行时边界与内容块
