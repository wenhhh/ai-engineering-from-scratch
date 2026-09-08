# MCP 一致性工程：版本管理、证据与运维（MCP Conformance Engineering: Versioning, Evidence, and Operations）

> 通过一个 SDK 跑通正常路径，并不能证明服务器符合规范。一致性必须体现在报文、版本边界、中间设备路径以及回滚过程中。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13 · 09（传输），阶段 13 · 17（网关），阶段 13 · 30（注册表准入）
**Time:** 约 100 分钟

## 学习目标（Learning Objectives）

- 将 MCP 规范性规则转换为黄金与负向报文记录（Golden and Negative Wire Transcripts）。
- 将严格的 `2026-07-28` 行为与有界旧版回退（Legacy Fallback）分开。
- 区分新增的未知字段与无效的未知 `resultType`。
- 比较原始 JSON-RPC 证据与 SDK 规范化视图。
- 证明经过真实代理边界后的请求头与消息体完整性。
- 用脱敏报文记录、健康状况和回滚证据控制发布准入。

## 问题（The Problem）

客户端通过 SDK 调用 `tools/list` 并拿到了工具，集成测试通过。

这个结果仍未回答重要问题：

- 请求是否携带现代协议要求的每请求元数据？
- `MCP-Protocol-Version`、`Mcp-Method` 和 `Mcp-Name` 是否与 JSON-RPC 消息体一致？
- 线上响应是否包含有效的 `resultType`，还是由 SDK 合成了一个？
- 客户端会保留未来新增的字段吗？
- 已识别的现代协议错误会不会意外触发旧版握手？
- 代理是否保留源站状态和 JSON-RPC 错误？
- 通知序列化器是否发送了被禁止的响应？
- 运维能否在不存储秘密的前提下，证明发布为何被推广或回滚？

一致性（Conformance）是一组可观察的不变量。在生产流量被迫发现问题之前，先构建能捕获这些不变量的测试框架（Harness）。

```figure
mcp-conformance-operations
```

## 从协议代际开始（Start With Version Eras）

MCP `2026-07-28` 使用每个请求自包含的元数据。现代请求携带 `params._meta.io.modelcontextprotocol/protocolVersion` 和 `params._meta.io.modelcontextprotocol/clientCapabilities`。必须使用这些确切的命名空间键；裸露的 `protocolVersion` 或 `clientCapabilities` 别名属于格式错误。如果 HTTP 边界存在镜像路由请求头，其值必须与 JSON-RPC 消息体一致。现代协议的成功结果携带 `resultType`。

截至 `2025-11-25` 的版本使用较早的初始化代际。只有客户端选择该旧代际后，缺少 `resultType` 的旧版结果才能被解释为已完成。

不要创建同时接受两种结构的宽松验证器。使用两个分支：

| 分支 | 进入依据 | 缺少 `resultType` | 初始化 |
|---|---|---|---|
| 现代（Modern） | 成功的 `server/discover` 或已识别的现代响应 | 无效 | 不是默认路径 |
| 旧版（Legacy） | 已配置允许列表，且在现代探测结果不明确后获得有效的旧版 `initialize` 结果 | 解释为已完成 | 该代际要求执行 |

这种分离能防止格式错误的现代对端反而得到更弱的验证。

### 严格模式（Strict mode）

严格模式要求现代行为的证明。成功的 `server/discover` 能证明应走现代分支，已识别的现代 JSON-RPC 错误同样可以。修正请求或停止。绝不能因为服务器返回 `-32020`、`-32021` 或 `-32022` 就降级。

### 回退模式（Fallback mode）

回退模式执行一次有界现代探测。超时、空回复、连接关闭或无法识别的响应，都只能说明结果不明确，不能证明对端是旧版。只有显式配置为兼容或列入兼容允许列表的端点，才能随后接受有界旧版探测；客户端只有验证该探测的 `initialize` 结果和协商出的旧版修订后，才选择旧版分支。

回退不等于“任何错误后都试试旧版”。已识别的现代错误包含有用的修正信息。在它之后降级，可能掩盖请求头不匹配、能力声明缺失或版本不受支持等问题。

这样可以防止攻击者、故障或过滤代理通过丢弃现代响应来强迫降级。将端点策略、不明确的现代观察、确切的正向旧版证据和选定代际一起记录。

在每份报文记录旁标明选定代际。缺少这一事实，同一个缺失字段可能在一次测试中看似可接受，在另一次中却无效。

## 构建报文记录语料库（Build a Transcript Corpus）

报文测试用例记录跨越边界的实际内容，而不只是 SDK 调用：

```json
{
  "name": "golden-modern-list",
  "era": "modern",
  "headers": {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/list"
  },
  "request": {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  },
  "responseStatus": 200,
  "responseBody": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "resultType": "complete",
      "tools": []
    }
  }
}
```

保留两类测试用例。

### 黄金报文记录（Golden transcripts）

黄金报文记录证明被接受的行为：

- 元数据与请求头匹配的现代发现或方法请求
- 具备必需字段的完成结果
- 方法可请求更多输入时的 `input_required` 结果
- 仅在相应能力已通告后出现的扩展结果
- 不含 `resultType` 的旧版结果，但仅限已选定的旧版代际
- 不产生 JSON-RPC 响应的通知处理

黄金报文记录应精确，而不是庞大。让易变 ID 和时间戳保持确定性，或在比较前规范化。

### 负向报文记录（Negative transcripts）

负向报文记录证明拒绝行为：

- 请求头与消息体不匹配
- 缺少每请求能力声明
- 请求头与消息体匹配，但协议版本不受支持
- 缺少现代 `resultType`
- 未知或未经通告的 `resultType`
- 响应的 `jsonrpc` 不是 `2.0`，或 ID 的值或 JSON 类型不同
- 响应同时包含 `result` 和 `error`，或两者都没有
- 错误缺少整数 `code` 和字符串 `message`
- 已知协议错误映射到错误的 HTTP 状态
- 为通知发送响应
- JSON-RPC 信封（Envelope）格式错误
- 代理将协议错误归并成通用错误

为每个负向用例断言拒绝边界和稳定错误码。“调用失败了”太弱。代理生成的 500 与源站 `-32020` 都可能看似失败，却向运维传达完全不同的信息。

请求头不匹配用例必须包含服务器实际的 HTTP 400 JSON-RPC 响应，并带匹配的请求 ID 和错误码 `-32020`。本地验证器一旦观察到 `HeaderMismatch`，就必须自动强制验证这些条件，不能把响应验证做成可选测试标志。即使本地拒绝码正确，HTTP 500 且无消息体的用例仍必须失败。如果测试框架在自身请求验证器抛出异常后就停止，它测试的只是自己，不是服务器的线上行为。

官方 MCP conformance 项目可用作外部测试套件和版本化参考。同时保留本地报文记录，它们覆盖通用套件无法了解的代理、SDK、身份验证、扩展和发布路径。

## 请求头值必须匹配 RPC 消息体（Header Values Must Match the RPC Body）

在现代 Streamable HTTP 中，中间设备可以依据镜像请求头路由或执行策略。JSON-RPC 消息体仍是协议事实来源。不匹配是完整性失败，而不是提示你从两者选一个值。

按以下顺序验证：

1. 解析并验证 JSON-RPC 信封和元数据类型。
2. 将 `MCP-Protocol-Version` 与 `params._meta.io.modelcontextprotocol/protocolVersion` 比较。
3. 将 `Mcp-Method` 与 `method` 比较。
4. 方法带有路由名称时，将 `Mcp-Name` 与消息体对应值比较。
5. 确认相等后，再判断匹配的版本与能力集合是否受支持。

这个顺序区分了不匹配 `-32020` 与不支持版本 `-32022`，也阻止网关依据请求头名称授权、源站却执行不同消息体名称的情况。

HTTP 字段名不区分大小写，但值仍区分大小写。查询前规范化请求头名称，并拒绝冲突的重复项。对于不安全、非 ASCII 或带首尾空白的 `Mcp-Name`，比较消息体前先解码确切的 `=?base64?{Base64EncodedValue}?=` UTF-8 哨兵格式（Sentinel）。哨兵不完整、Base64 无效、UTF-8 无效或使用原始不安全值时，以 `-32020` 拒绝。即使消息体包含同样字符，原始首尾空白仍无效，因为此值在传输前必须使用哨兵编码。

中间设备可能在请求到达 MCP 服务器前拒绝格式错误的 HTTP，因此它的失败可能是没有 JSON-RPC 的 HTTP 错误。记录拒绝来自中间设备还是源站。源站 MCP 服务器处理了有效 JSON-RPC 请求时，应使用协议错误契约。

## 未知字段不等于未知结果（Unknown Fields Are Not Unknown Results）

前向兼容（Forward Compatibility）需要两条不同规则。

### 新增的未知字段（Additive unknown fields）

结果对象和 `_meta` 映射可以增加字段。验证器应根据自身角色保留或忽略新增字段，除非该字段违反保留契约。示例在证据中保留完整原始结果，并接受已知结果旁的 `futureHint`。

如果你是透明代理，保留未知字段通常比剥离它更安全。如果你是应用客户端，忽略它可能有效。差异测试仍应揭示 SDK 省略了它，确保这是有意选择的行为。

### 未知的 `resultType`（Unknown resultType）

`resultType` 是判别字段（Discriminator）。现代核心结果使用 `complete` 或 `input_required`。扩展只有在能力已通告时才能添加其他值。例如，任务扩展可在已协商能力的上下文中添加 `task`。

不能安全地把未知或未经通告的判别值当作已完成。客户端不知道自己将丢弃什么生命周期语义，因此应拒绝它。

同一份原始响应可以同时包含可接受的未知字段和不可接受的未知结果类型。两种情况都要测试。

判别字段只是第一层，之后还要验证方法专属载荷。完整的 `tools/list` 结果需要 `tools` 数组，其描述符须有唯一非空名称、有用描述，以及根类型为对象的 `inputSchema`。`task` 结果只对具备任务能力且符合条件的 `tools/call` 有效，并要求 `taskId`、已知状态、创建及更新时间戳、`ttlMs`，以及有效的可选轮询间隔。完整的 `completion/complete` 结果要求 `completion` 对象，其中字符串值不超过 100 个；可选 `total` 须为不小于返回值数量的非负整数；可选 `hasMore` 须为布尔值。`resultType` 拼写正确，并不能让格式错误的载荷符合规范。

## 通知不变量（The Notification Invariant）

JSON-RPC 通知没有 `id`。接收方不得发送 JSON-RPC 成功或错误响应。

对于已接受的 HTTP 通知结构，测试框架预期 HTTP `202` 和空消息体。MCP `2026-07-28` 没有定义通过 Streamable HTTP 从客户端发往服务器的核心通知。示例使用带命名空间的课程扩展通知，只用于测试单向序列化器不变量。不要把它表述为新的核心方法。

测试序列化器，不要只测试处理器。处理器可能返回 `None`，中间件却将其包装成 JSON 成功对象。应捕获最终出站字节。

## 加入 SDK 差异比较（Add an SDK Differential）

SDK 常将线上对象转为方便使用的语言类型。这很有用，但规范化对象无法证明实际接收了什么。

为每个高风险用例捕获：

1. SDK 解码前的原始状态、响应头和响应体。
2. SDK 规范化后的返回值或异常。
3. 选定代际下的预期语义投影（Semantic Projection）。
4. SDK 提升、合成、剥离或更改的字段。

示例比较应用载荷时，允许 SDK 仅移除 `resultType`、`_meta`、`ttlMs` 和 `cacheScope` 等已知线上记账字段。它会报告被丢弃的 `futureHint`，因为这个未知语义字段消失了。

不要假定每个差异都是 SDK 缺陷。目的是让变换可见。明确你的组件是可忽略新增字段的应用端点，还是应保留它的透明中间设备。

对交付的每个 SDK 及其版本执行差异比较。如果两个 SDK 以不同方式规范化同一份报文记录，发布策略应明确哪些行为可以接受，而不是事后挑选最方便的输出。

## 捕获代理证据（Capture Proxy Evidence）

生产中的大多数 MCP 故障会跨越多个进程。记录三个视图：

| 视图 | 最少证据 |
|---|---|
| 入站（Ingress） | 请求头、JSON-RPC 消息体、内容类型、通过身份验证的路由、接收时间 |
| 源站（Origin） | 转发的请求头和消息体摘要、源站状态、响应头和响应体 |
| 出站（Egress） | 客户端可见的状态、响应头、消息体和发送时间 |

示例检测两种常见变换：

- 源站 HTTP 400 或 404 JSON-RPC 错误变成通用代理 500
- 出站 JSON-RPC 消息体与源站消息体不同

为内容类型、`Accept`、压缩、请求范围 SSE、缓存头和跟踪关联添加部署专属断言。策略允许时，捕获 TLS 终止的两侧。绝不能仅为了证明路径就记录凭据。

## 在证据离开内存前脱敏（Redact Before Evidence Leaves Memory）

脱敏（Redaction）是一致性运维的一部分，不是事后清理任务。必须在序列化、哈希、日志、测试产物生成或故障上传前执行。

示例将键名做大小写折叠并移除分隔符后匹配，再递归替换 `Authorization`、`Cookie`、`Set-Cookie`、`X-Api-Key`、`accessToken`、`clientSecret`、`registrationAccessToken`、`token`、`password`、`secret` 和 `api_key` 等键下的值。规范化与拒绝列表必须使用同一形式，确保驼峰、连字符、下划线和点分变体无法绕过彼此的策略。生产采集器还应添加方法专属参数策略，因为 `query` 这样看似无害的键仍可能包含个人或受监管数据。

对脱敏后的证据包计算哈希。只有具体调查需要时，才在获准的短期保存系统中保留原始捕获。摘要证明决策依据的是哪份脱敏证据包，并不会泄露被移除的值。

## 将健康与回滚纳入发布关卡（Make Health and Rollback Part of the Gate）

协议一致性是发布的必要条件，但不是充分条件。符合规范的候选版本仍可能超时、泄漏内存或使依赖过载。

发布前定义健康观察窗口：

- 最小样本数
- 最大错误率
- 最大延迟分位数阈值
- 饱和度或资源限制
- 观察时长
- 与获准基线的比较

发布前也要定义回滚证据：

- 确切的先前版本
- 准入证据摘要
- SHA-256 产物和描述符固定值
- 当前注册表状态
- 当前健康结果
- 路由恢复流程
- 由可信发布控制器身份对这些确切字段作出的证明（Attestation）

要求在推广前就验证回滚目标且确认其健康，而不是等候选版本失败后才验证。没有可用恢复路径的成功发布，不具备生产就绪条件。

如果候选版本失败，而回滚目标缺少这些证据，应暂停流量，不要猜测。“回滚到原来那个”不是运维控制。

不要把就绪性简化为真值检查，例如版本非空、`healthy: "yes"` 或任意证据字符串。示例要求精确类型、活动状态、三个 SHA-256 摘要、可信签名者，以及针对完整回滚载荷的有效 HMAC-SHA-256 证明。确定性演示密钥是非秘密的测试数据。生产环境应在发布边界注入受保护密钥、KMS 验证结果或公钥证明验证器。

发布关卡还会拒绝空的报文记录、SDK 差异或代理证据。每个来源都必须携带有效证据摘要。健康窗口通过，无法补上从未被观察的边界。

## 动手实现（Build It）

运行仅使用标准库的测试框架：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
```

演示恰好运行十五份黄金和负向报文记录，包括有效和格式错误的补全结果；比较原始结果与 SDK 视图；检查将源站错误归并为通用错误的代理；评估健康状况；验证回滚证据的真实性，并选择该目标。

预期结构：

```json
{
  "transcriptsPassed": 15,
  "transcriptsTotal": 15,
  "sdkDroppedFields": ["futureHint"],
  "proxyIssues": [
    "proxy collapsed a protocol error into HTTP 500",
    "proxy changed the origin JSON-RPC body"
  ],
  "releaseAction": "rollback",
  "evidenceDigest": "..."
}
```

按此顺序阅读 `code/main.py`：

1. `validate_request()` 执行代际专属请求和请求头规则。
2. `validate_result()` 区分旧版缺失判别字段、有效现代值、扩展和未知值。
3. `select_era()` 实现严格与有界回退策略。
4. `run_transcript()` 评估黄金和负向测试用例。
5. `compare_sdk_view()` 揭示规范化差异。
6. `inspect_proxy()` 比较入站、源站和出站证据。
7. `redact()` 在证据哈希前移除明显的秘密。
8. `rollback_evidence_ready()` 验证精确固定字段和可信发布证明。
9. `ReleaseGate.evaluate()` 关联非空的一致性、SDK、代理、健康及回滚证据。

## 实际应用（Use It）

在四个时点运行测试框架：

1. 每次实现变更时，使用进程内测试适配器。
2. 针对构建出的客户端和服务器二进制，通过真实传输运行。
3. 在预发布环境中经过已部署代理或网关运行。
4. 在金丝雀发布（Canary Rollout）期间，结合实时健康与回滚证据运行。

跨层保留相同的稳定用例名称。`negative-header-body-mismatch` 在单元、端到端、代理和金丝雀报告中应表示同一个不变量。边界不同会使证据摘要不同，但要求不应改变。

将测试用例模式存入版本控制，将脱敏运行证据存入发布系统。短期原始捕获只能在事故访问控制下存储。

## 交互实验（Interactive Lab）

### 实验 A：证明代际边界（Lab A: prove the era boundary）

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations/code
python3 -q
```

运行：

```python
from main import *
validate_result({"tools": []}, "legacy")
validate_result({"tools": []}, "modern")
```

旧版调用推断出 `complete`，现代调用抛出 `ProtocolViolation`。现在测试回退：

```python
select_era({"kind": "timeout"}, "fallback")
select_era(
    {"kind": "timeout"},
    "fallback",
    legacy_allowed=True,
    legacy_evidence={"kind": "initialize_success", "protocolVersion": LEGACY_VERSION},
)
select_era({"kind": "jsonrpc_error", "code": -32021}, "fallback")
```

第一次超时会以关闭方式失败，因为沉默不是旧版证据。第二次调用选择旧版，仅因为配置允许且观察到了有效的旧版初始化结果。已识别的能力缺失错误则证明应走现代分支。

### 实验 B：新增字段与判别字段（Lab B: additive field versus discriminator）

```python
validate_result({"resultType": "complete", "tools": [], "futureHint": True}, "modern")
validate_result({"resultType": "future_mode", "tools": []}, "modern")
```

第一个结果保留 `futureHint`。第二个被拒绝，因为生命周期判别值未知。

### 实验 C：检查 SDK 变换（Lab C: inspect an SDK transformation）

```python
compare_sdk_view(
    {"resultType": "complete", "tools": [], "futureHint": {"mode": "new"}},
    {"tools": []},
)
```

决定你的组件可以忽略 `futureHint`，还是必须转发它。将该选择写进发布策略。不要静默抹去差异。

### 实验 D：修复代理（Lab D: repair the proxy）

修改演示交换，使出站保留源站状态和消息体。再次运行 `python3 main.py`。代理问题应消失，但 SDK 差异仍阻止推广。然后在 SDK 视图中加入 `futureHint`，观察所有证据来源都通过时，动作变为 `promote`。

## 实践实验（Practice Lab）

向测试框架添加请求范围的 SSE 报文记录。

要求：

- 捕获响应状态、内容类型、有序 SSE 事件和流终止。
- 证明每个 JSON-RPC 事件都有符合对应代际的有效结果或错误。
- 添加代理先缓冲完整流再转发的负向用例。
- 添加 SSE 事件的 JSON-RPC ID 与请求不同的负向用例。
- 写入证据前对事件数据脱敏。
- 在健康窗口中加入流时长、首事件延迟和事件数。
- 流失败时，让发布关卡只选择有证据支持的回滚目标。

成功意味着同一个用例能直接运行，也能经代理运行，并由报告指出究竟哪个边界改变了行为。

## 交付物（Shipped Artifact）

本课交付 `outputs/skill-mcp-conformance-release-gate.md`。用它将服务器、客户端、网关或 SDK 变更转为版本化的一致性矩阵和发布决策。该产物要求原始线上证据、负向用例、显式代际选择、SDK 差异、代理证明、脱敏、健康阈值和回滚证据。

## 验证结果（Verify It）

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 所有内置黄金和负向报文记录都达到预期结果
- 现代请求要求确切的命名空间元数据键
- HTTP 请求头名称不区分大小写匹配，且编码后的 `Mcp-Name` 值被精确解码
- 请求头与消息体不匹配时返回现代不匹配错误码
- 响应版本、ID、结果与错误互斥性、错误结构及 HTTP 映射均被验证
- 工具列表、任务和补全的方法专属载荷要求被强制执行
- 每次观察到 `HeaderMismatch` 都要求实际的 HTTP 400 JSON-RPC `-32020` 响应
- 原始 `Mcp-Name` 空白被拒绝，而精确哨兵编码的空白可无损往返
- 缺少 `resultType` 仅在已选定旧版代际时有效
- 新增字段通过原始验证并得以保留，而未知结果类型失败
- 扩展结果类型要求其能力已通告
- 已识别的现代错误绝不触发旧版回退
- 通知不产生 JSON-RPC 响应
- 区分 SDK 移除记账字段与丢失语义字段
- 检测代理对错误的归并，并跨驼峰和分隔符变体递归脱敏凭据
- 推广要求非空的报文记录、SDK、代理证据及健康的运维证据
- 推广和回滚都要求身份已验证、已固定、活动且健康的回滚目标

## 生产故障模式（Production Failure Modes）

| 故障 | 薄弱测试的报告 | 测试框架必须证明什么 |
|---|---|---|
| SDK 合成缺失的判别字段 | “tools/list 通过” | 原始现代结果缺少 `resultType`，因此无效 |
| 客户端在 `-32021` 后降级 | “旧版重试成功” | 已识别的现代错误禁止回退 |
| 将未知结果类型当作已完成 | “响应已解析” | 未通告的生命周期判别值被拒绝 |
| 代理授权一个工具，源站执行另一个 | “请求到达服务器” | 每一跳的 `Mcp-Name` 都等于消息体路由名称 |
| 测试框架在读取服务器响应前抛出异常 | “请求头不匹配测试通过” | HTTP 400 和 JSON-RPC `-32020` 响应已被捕获并验证 |
| 代理将源站 400 转为通用 500 | “上游错误” | 源站与出站状态及 JSON-RPC 消息体被保留 |
| 通知中间件发送 `{result: null}` | “处理器返回了 none” | 最终出站消息体为空，且没有 JSON-RPC 响应 |
| SDK 剥离新增字段 | “类型化对象匹配” | 原始与规范化视图展示确切丢失的字段 |
| 故障产物泄漏持有者令牌 | “调试包已上传” | 哈希、日志或上传前已完成脱敏 |
| 凭据键样式绕过脱敏 | “拒绝列表包含 api_key” | 驼峰和分隔符变体共享同一规范化拒绝列表形式 |
| 金丝雀没有样本却看似健康 | “零错误” | 强制执行最小样本数 |
| 回滚选择未知构建 | “先前部署已恢复” | 目标版本、准入摘要、固定值、状态和健康证据齐全 |

## 运维规则（Operational Rule）

测试你发送的字节、每个中间设备转发的字节、每个 SDK 暴露的语义，以及运维在压力下将使用的证据。兼容性是显式分支，回滚是有证据支持的发布动作。两者都不应是宽松解析器的意外副作用。

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 基础协议（base protocol）](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP 版本协商（version negotiation）](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP 可流式 HTTP（Streamable HTTP）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [官方 MCP 一致性项目（Official MCP conformance project）](https://github.com/modelcontextprotocol/conformance)
