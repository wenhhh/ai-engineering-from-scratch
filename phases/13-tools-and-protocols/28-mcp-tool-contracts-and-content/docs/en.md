# MCP 工具契约与内容（MCP Tool Contracts and Content）

> 只有发现、参数、结果、分页和传输元数据对同一契约达成一致，工具才适合安全自动化。

**Type:** Build
**Languages:** Python
**Prerequisites:** Phase 13，第 07、09 和 10 课
**Time:** ~120 分钟

## 学习目标（Learning Objectives）

- 用 JSON Schema 2020-12 定义工具输入输出。
- 验证结构化结果，不假定它们都是 JSON 对象。
- 在文本、图片、音频、资源链接和嵌入资源之间选择。
- 工具进入模型前拒绝不安全 `x-mcp-header` 定义。
- 编码参数请求头值，验证请求头与正文精确一致。
- 不解释游标值，遍历游标分页。
- 对 `completion/complete` 建议设界并授权。

## 问题（The Problem）

调用 Python 函数很容易，通过 AI 宿主调用远程能力却是契约问题。

服务器发布描述符，客户端将其转为模型上下文和 UI。模型创建参数，网关可能根据镜像请求头路由。服务器执行工具，客户端随后决定结果是否足够安全、有效，可以交给模型。

一个薄弱边界会破坏整条链。

考虑五种失败：

- 描述符说结果是对象，服务器却返回数组。
- `nextCursor` 是空字符串时，客户端停止分页。
- 令牌参数被镜像到 HTTP 请求头，对中间层可见。
- Unicode 路由值作为原始请求头发送，网关和源站解释不同字节。
- 补全端点向无权访问的调用方建议生产环境。

更好的提示词修复不了这些失败，需要明确协议和应用契约。

## 契约流水线（The Contract Pipeline）

将每次工具调用视为五道门：

1. **发现（Discover）。** 读取确定性分页工具列表。
2. **准入（Admit）。** 验证每个描述符，应用本地安全策略。
3. **调用（Invoke）。** 验证参数并构建传输元数据。
4. **执行（Execute）。** 运行处理器并正确分类失败。
5. **消费（Consume）。** 模型使用前验证内容块和结构化输出。

```figure
mcp-contract-pipeline
```

宿主拥有准入和消费门槛。服务器不能强迫客户端信任注解、模式或输出。

## JSON Schema 是运行时边界（JSON Schema Is a Runtime Boundary）

MCP `2026-07-28` 中，`inputSchema` 和 `outputSchema` 使用 JSON Schema。缺少 `$schema` 时，默认方言是 2020-12。

输入模式必须是模式对象。无参数工具仍应精确说明接受什么：

```json
{
  "type": "object",
  "additionalProperties": false
}
```

这比接受任意属性的 `{ "type": "object" }` 更严格。

输出模式可选。一旦服务器发布，每个完整工具结果都承诺返回符合模式的 `structuredContent`，包括 `isError: true`。错误标志分类执行结果，不豁免已发布输出契约。客户端应验证结果，不应只信描述符。

### 结构化内容可以是任意 JSON 值（Structured content is any JSON value）

不要将 `structuredContent` 硬编码为字典。它可以是：

- 对象；
- 数组；
- 字符串；
- 数字；
- 布尔值；
- `null`。

此工具返回数组：

```json
{
  "name": "tag_catalog",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "array",
    "items": {"type": "string"}
  }
}
```

其成功结果有效：

```json
{
  "resultType": "complete",
  "content": [
    {
      "type": "text",
      "text": "[\"contracts\", \"mcp\", \"stateless\"]"
    }
  ],
  "structuredContent": ["contracts", "mcp", "stateless"],
  "isError": false
}
```

为兼容，结构化结果还应在文本块包含序列化 JSON。文本不是验证来源，`structuredContent` 才是。

### 小验证器也能教授边界（A small validator still teaches the boundary）

本课为保持 Python 标准库范围，刻意采用 JSON Schema 子集，检查示例工具使用的机制：

- 对象、数组、字符串、整数、数字、布尔和 null 类型；
- 必需属性；
- `additionalProperties: false`；
- 数组项；
- 枚举值；
- 最小字符串长度。

这不替代完整生产验证器。可复用经验是验证位置：发现后验证描述符，执行前验证参数，消费前验证结构化结果。

## 内容块成本不同（Content Blocks Carry Different Costs）

`content` 数组可组合多种内容类型。

| 类型 | 用途 | 主要边界 |
|------|------------|---------------|
| `text` | 人和模型可读摘要 | 将文本视为不可信输出 |
| `image` | base64 编码视觉证据 | 验证媒体类型和大小 |
| `audio` | base64 编码语音或录音输出 | 验证媒体类型和时长限制 |
| `resource_link` | 客户端稍后可获取的 URI | 后续资源读取重新授权 |
| `resource` | 结果中直接嵌入的数据 | 立即执行载荷和内容限制 |

资源链接不证明该资源出现在 `resources/list`，它只是此次工具调用返回的引用。跟随 URI 时，客户端仍应用资源策略。

嵌入资源避免一次往返，却增大当前响应。大制品或独立变化制品用链接；必须与结果原子同行的小证据用嵌入资源。

本课 `evidence_bundle` 结果包含全部五种类型。客户端接受结果前验证每块。

## `x-mcp-header` 是路由元数据（Routing Metadata）

`inputSchema` 内属性可声明 `x-mcp-header`。通过 Streamable HTTP，客户端将参数镜像到 `Mcp-Param-{name}`。

```json
{
  "region": {
    "type": "string",
    "x-mcp-header": "Region"
  }
}
```

对 `region: "eu-west"`，传输可发出：

```http
Mcp-Param-Region: eu-west
```

注解让负载均衡器、网关或策略引擎无需解析 JSON 正文即可路由，不是放凭据的地方。

协议约束注解：

- 请求头名非空，遵循 HTTP 字段名词法语法；
- 不区分大小写的名称唯一；
- 属性类型是字符串、整数或布尔；
- 不允许 `number`；
- 注解仅出现在 `inputSchema.properties` 的直接成员；
- 整数值在 `-9007199254740991` 到 `9007199254740991` 内。

位置规则是语法性的，失败关闭。遍历整个模式树，不只看验证器碰巧理解的属性。拒绝嵌套对象 `properties`、`oneOf` 分支、`items`、通过 `$ref` 到达的定义，以及任何输出模式下的注解。解析引用不会让被引用节点变成直接顶层属性。

本课添加部署策略：拒绝镜像 `password`、`secret`、`token`、`api_key` 或 `authorization` 等名称的描述符。官方规范建议作者不要镜像敏感参数；客户端可把建议变为硬准入规则。

审计请求头名，不审计值。示例记录 `Mcp-Param-Region`，不让 `eu-west` 进入审计事件。

### 构建 HTTP 请求头前编码值（Encode values before building HTTP headers）

仅当值为非空字符串，全部是 `!` 至 `~` 的可见 ASCII，且不像编码哨兵时，才可作为明文传输。其他情况使用精确形式：

```text
=?base64?{Base64UTF8}?=
```

`Base64UTF8` 是精确 UTF-8 字节的标准 base64。不要先裁剪、规范化或替换值。对 Unicode、空串、空格、制表符、控制字符、CR 或 LF、首尾空白，以及任何以 `=?base64?` 开头的值编码。对看似哨兵的值再次编码，才能让接收端恢复原始字面文本，而非将其解读为传输语法。

布尔值呈现为小写 `true` 或 `false`。整数用十进制，并必须在 JavaScript 安全整数范围内。超出值直接拒绝，而非让中间层舍入。

### 服务器检查镜像副本（The server checks the mirrored copy）

请求头生成只是客户端一半。在 Streamable HTTP 边界，服务器必须：

1. 不区分请求头名大小写，查找已识别 `Mcp-Param-*` 名称；
2. 存在精确 base64 哨兵形式时解码；
3. 将解码文本与对应 JSON 正文参数精确比较；
4. 分发前拒绝缺失、重复、意外、格式错误或不匹配的已识别请求头。

拒绝为 HTTP `400` 加 JSON-RPC 错误码 `-32020`。正文值及其编码请求头形式都不应进入审计，只记录已识别请求头名称和拒绝类别。

`code/main.py` 直接模拟此边界。[第 09 课](../../09-mcp-transports/) 覆盖更广的 Streamable HTTP 验证顺序，包括方法和协议版本一致性。

## 分页游标不透明（Pagination Cursors Are Opaque）

MCP 列表操作使用游标分页。服务器选择页大小和游标格式，客户端只有一个决定：

```python
if result.get("nextCursor") is None:
    break
cursor = result["nextCursor"]
```

不要这样写：

```python
if not result.get("nextCursor"):
    break
```

空字符串是有效游标，真值判断会过早停止。

客户端不得解码、递增游标，不能与先前游标比较顺序，也不能推断页码。服务器可签名游标、绑定目录版本或映射到私有状态，那是服务器实现细节。

示例服务器刻意在第一页后返回 `""`。客户端第二次请求必须发送精确值。追踪如下：

```text
<首次请求不带游标>
<第二次请求带游标 "">
```

无效游标产生 JSON-RPC 参数无效错误，代码 `-32602`。

## 补全是授权接口面（Completion Is an Authorization Surface）

`completion/complete` 为提示词参数和资源模板参数提供建议。它有助于交互表单，却可能泄露普通列表方法保护的名称。

补全请求指出引用和正在补全的参数：

```json
{
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "deployment_review"
    },
    "argument": {
      "name": "environment",
      "value": "st"
    }
  }
}
```

结果最多返回 100 个值，可报告 `total` 和 `hasMore`。

应用与被引用提示词或资源相同的授权边界。示例分析员收到 `development` 和 `staging`，只有操作员可收到 `production`。

生产补全还需要：

- 输入验证；
- 调用方感知过滤；
- 客户端请求防抖；
- 服务器限流；
- 有界结果数；
- 不暴露敏感建议值的日志。

补全是辅助，不是发现绕过通道。

## 两层错误（Two Error Layers）

分开协议错误和工具执行错误。

MCP 请求无法正确分发时使用 JSON-RPC 错误：

- 未知工具名；
- 请求结构错误；
- 缺少请求元数据；
- 无效游标。

调用到达工具，工具报告可处理失败时，使用带 `isError: true` 的完整结果：

- 报告来源不可用；
- 日期超出支持范围；
- 业务规则拒绝请求操作。

模型常能修复工具执行错误，却不能修复违反自身输出模式的服务器。

工具声明输出模式时，在该模式内建模可处理失败。示例 `route_report` 失败返回请求区域和 `accepted: false`，同时带人类可读错误文本及 `isError: true`。

## 动手实现（Build It）

`code/main.py` 用 Python 标准库构建边界两端。

服务器实现：

- 逐请求 MCP 元数据验证；
- 带工具和补全能力的 `server/discover`；
- 确定性 `tools/list` 分页；
- 四个工具描述符，其中一个必须拒绝；
- 数组结构化输出；
- 当前全部工具内容块类型；
- 解码已识别参数请求头、在不匹配时返回 HTTP `400` 和 JSON-RPC `-32020` 的 Streamable HTTP 一致性门槛；
- 已授权且限流的补全。

客户端实现：

- 描述符准入；
- 全树 `x-mcp-header` 位置验证和敏感字段策略；
- 精确的普通可见 ASCII 或 base64 UTF-8 值编码；
- 跟随空字符串的不透明游标循环；
- 参数和结果验证；
- 内容块验证；
- 只含名称、不含值的请求头审计事件。

刻意不安全的描述符是教学数据，证明一个工具被拒绝不妨碍有效工具加载。

## 实际应用（Use It）

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/28-mcp-tool-contracts-and-content/code
python3 main.py
python3 -m unittest discover tests -v
```

演示打印获准工具、被拒绝描述符、两次分页请求、结构化数组内容、内容块类型、镜像请求头名称、值是否需编码、HTTP 一致性状态，以及按调用方过滤的补全值。

## 交互实验（Interactive Lab）

打开 `code/main.py` 并找到 `TOOLS`。

1. 将 `tag_catalog.outputSchema.type` 从 `array` 改为 `object`。
2. 运行演示，客户端应拒绝返回数组。
3. 恢复模式。
4. 保持第一页 `nextCursor` 为 `""`，将最后一页改为返回 `nextCursor: None`，而非省略。
5. 运行测试，比较游标追踪。
6. 给字符串属性添加 `x-mcp-header: "Authorization"`。
7. 确认调用前描述符准入拒绝它。
8. 尝试含 Unicode、换行、周围空格和字面文本 `=?base64?SGVsbG8=?=` 的 `region` 值。解码每个请求头，证明原值精确保留。
9. 将注解移到 `oneOf`、`items` 或 `$ref` 定义下。确认即使演示未使用该分支，每个描述符也被拒绝。
10. 移除已识别请求头或改变解码值。确认 HTTP 边界返回状态 `400` 和 JSON-RPC 代码 `-32020`。

重点不是记 JSON 结构，而是观察每道门在所属边界失败。

## 实践实验（Practice Lab）

用 `search_evidence` 工具扩展契约实验。

要求：

1. 输入模式接受 `query`、`limit` 和安全 `region` 路由字段。
2. 输出模式为对象数组，含 `uri`、`title` 和 `score`。
3. 结果包含兼容文本和每项资源链接。
4. 参数拒绝未知属性。
5. 应用验证对 `limit` 设界。
6. 无权访问某 URI 的调用方，不得通过补全或工具输出看到它。
7. 测试包含不合规分数、无效请求头注解和两页列表。
8. 请求头值测试覆盖可见 ASCII、Unicode、控制字符、空白、看似哨兵文本和两个 JavaScript 安全整数边界。
9. HTTP 夹具接受不区分大小写的请求头名，但缺失或不匹配已识别值时返回状态 `400` 和代码 `-32020`。

## 交付物（Shipped Artifact）

`outputs/skill-mcp-contract-reviewer.md` 是扁平可复用审查技能。给它工具描述符、样例结果、分页行为和补全策略，它返回准入决定、结果验证计划、请求头策略和具体失败测试。

## 验证结果（Verify It）

以下陈述成立时本课完成：

- `tools/list` 重复调用返回相同逻辑顺序。
- `nextCursor` 为 `""` 时客户端发第二次请求。
- 排除不安全敏感请求头描述符，其他工具仍可用。
- 数组通过其数组输出模式。
- 对象在同一数组模式下失败。
- 错误结果不能省略或违反已发布输出模式。
- 文本、图片、音频、资源链接和嵌入资源块均通过验证。
- 请求头审计事件有名称、无值。
- 普通可见 ASCII 保持明文；Unicode、控制、填充、空值和看似哨兵值通过精确 base64 UTF-8 编码往返。
- 超出 JavaScript 安全范围的镜像整数被拒绝。
- `oneOf`、`items`、嵌套对象、`$ref` 定义或输出模式下的注解在准入时拒绝。
- 不区分大小写的已识别请求头名，仅当解码值精确匹配正文才通过；缺失或不匹配副本产生 HTTP `400` 和 JSON-RPC `-32020`。
- 分析员补全永不返回 `production`。
- 工具失败使用 `isError: true`；格式错误协议调用使用 JSON-RPC `error`。

## 生产失败模式（Production Failure Modes）

| 失败 | 学习者看到什么 | 正确响应 |
|---------|-----------------------|------------------|
| 客户端假定对象输出 | 有效数组失败或被静默包装 | 按发布模式验证，不限定对象 |
| 空游标视为假 | 最后几页消失 | `nextCursor` 存在且非 null 就继续 |
| 镜像敏感值 | 秘密出现在代理、WAF 或追踪数据 | 拒绝描述符，秘密保留在受保护请求数据 |
| 镜像原始 Unicode 或空白 | 网关和源站不一致，或值被规范化 | 精确 base64 UTF-8 哨兵编码，解码后比较 |
| 注解藏在模式分支 | 客户端准入时遗漏路由元数据 | 遍历全树，仅允许直接顶层属性 |
| 镜像大整数 | JavaScript 中间层舍入路由值 | 拒绝安全整数范围外值 |
| 请求头正文不一致 | 网关路由一个目标，源站执行另一个 | 分发前返回 HTTP `400` 和 JSON-RPC `-32020` |
| 忽略输出模式 | 下游消费损坏结构 | 模型或应用使用前验证 |
| 自动信任资源链接 | 调用方跟随未授权 URI | 每次资源读取重新授权 |
| 补全共享全局建议 | 隐藏租户名泄露 | 按调用方、引用和授权过滤 |
| 工具注解当策略 | 破坏性操作绕过确认 | 在注解外执行授权和批准 |
| 一个坏工具破坏发现 | 整台服务器不可用 | 独立拒绝坏描述符、准入有效工具 |

## 与综合实践的联系（Capstone Connection）

Phase 13 综合项目需要合并多服务器工具的网关。本课提供其准入核心。

用制品评判四项综合项目证据：

- 确定且完整的分页发现；
- 模型公开前的描述符验证；
- 已验证结构化输出加有界内容块；
- 保留授权边界的补全和路由元数据。

不要仅凭成功 `tools/call` 声称网关兼容。捕获描述符、分页追踪、获准工具集、拒绝工具集和一个已验证结果。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| `inputSchema` | 定义接受工具参数的 JSON Schema 对象 |
| `outputSchema` | 定义 `structuredContent` 的可选 JSON Schema |
| `structuredContent` | 工具结果产生的任意 JSON 值 |
| 内容块（Content block） | 类型化文本、图片、音频、资源链接或嵌入资源 |
| `x-mcp-header` | 将原始类型参数镜像到 Streamable HTTP 元数据的模式注解 |
| 不透明游标（Opaque cursor） | 服务器签发、客户端不解释其值的分页令牌 |
| 补全引用（Completion reference） | 正在补全参数的提示词名或资源 URI/模板 |
| 准入（Admission） | 客户端公开或拒绝已发现描述符的决定 |

## 延伸阅读（Further Reading）

- [MCP 工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 补全](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion)
- [MCP 分页](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [MCP Streamable HTTP 参数请求头](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#custom-headers-from-tool-parameters)
