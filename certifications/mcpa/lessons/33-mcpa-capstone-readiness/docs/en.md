# 从头到尾读懂一段 MCP 交互（Reading One MCP Exchange End to End）

> 生产事故不会先说明自己属于哪个 MCPA 领域。它给你一份报文记录，而逐阶段读懂记录，正是本认证考查的综合能力。

**Type:** Capstone
**Languages:** Python
**Prerequisites:** 第 00 至 32 课
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 组合一段 2026-07-28 交互，涵盖带缓存提示的发现、模式校验、MRTR 同意往返、任务、进度通知、OAuth 受众校验和哈希链审计，并解释各阶段防范什么问题
- 直接区分协议错误、工具执行错误及能力缺失错误，并指出各自正确的返回形式与 JSON-RPC 代码
- 跟踪多步交互中跨所有跳保持的 W3C 追踪 ID，包括经 HTTP 和 OAuth 保护的那次调用
- 验证哈希链日志，精确解释局部修改如何影响当前条目与后续链接的校验
- 使用 outputs/ 准备清单，逐目标确认五个考试领域都能对应到本课或前课的具体实践证据

## 问题（The Problem）

值班工程师打开控制台，看见两条矛盾记录：工单说 `checkout-api` 已在生产重启，事故频道却说没有。这种差异不会自报“这是 MRTR 题”或“这是安全治理题”。排查需要从头到尾阅读一次交互：重启请求格式是否正确，服务器是否要求确认，确认状态是否签名且未修改，调用方有没有声明接收该问题的能力，审计日志又是否与这些环节吻合。它们分别涉及 MCP 基础、架构与组件、交互与执行、安全与治理、用例与生态五个领域。较难的考题也如此：给出症状，答案位于时间线某个具体位置。

本课不引入新协议能力，而把第 00-32 课分开讲过的主题组合为真实系统会产生的交付物：对一个 MCP 服务器执行一次事故响应流程，该成功时成功，该拒绝时拒绝，每次拒绝都有原因，并留下可检查的记录。把它视为场景题练习，也视为运维工作的演练：工具调用不默认可信，在报文和策略提供依据前，不假定对端能力。

## 概念（The Concept）

`code/main.py` 在 `incident-console` 服务器上模拟一次事故，各阶段都对应本路线已介绍的知识，现在将它们放在一起观察。

记录从第 04、05 课的版本问题开始。误设为 `2025-11-25` 的客户端调用 `server/discover`，收到 `UnsupportedProtocolVersionError`、`-32022`，`data.supported` 列出实际支持版本。没有握手或会话可替请求记住旧信息；协议版本由每次请求的 `params._meta` 提供，因此修复是用正确版本重新请求。随后 `server/discover` 返回可缓存的 `DiscoverResult`：`supportedVersions`、`capabilities`，其中预先声明 `extensions: {"io.modelcontextprotocol/tasks": {}}`，让客户端知道任务可用；还有 `ttlMs` 与 `cacheScope: "public"`，沿用第 20 课的新鲜度契约。

```json
{
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {"tools": {"listChanged": false}, "extensions": {"io.modelcontextprotocol/tasks": {}}},
    "ttlMs": 600000, "cacheScope": "public"
  }
}
```

`tools/list` 与第一次只读实例健康扫描，共同练习架构和交互流程：每个工具公布的模式是客户端掌握的契约。请求未注册工具时返回 `-32602`，不能用 `-32601`。`-32601` 只表示 JSON-RPC 方法本身未知，本课故意将 `tools/call` 拼成 `tools/execute` 来触发一次。扫描请求设置 `_meta.progressToken`，所以服务器在最终结果前发送若干 `notifications/progress`。它们属于该请求，与订阅无关，请求完成后停止，正对应第 16 课区分的请求通道和 `subscriptions/listen`。

`restart_service` 把三个领域汇在同一工具中。缺少 `environment` 的调用得到带 `isError: true` 的正常结果，模型可以读取并修正；参数未满足工具模式，不意味着 JSON-RPC 请求本身损坏，因此不走协议错误（第 08、18 课）。参数正确但未声明 `elicitation` 的只读控制台收到 `-32021`、`MissingRequiredClientCapability`，指出缺失项，因为服务器不能假定当前请求未声明的能力（第 07 课）。两项检查都通过后才开始 MRTR：返回 `resultType: "input_required"`、含 `elicitation/create` 的 `inputRequests`，以及经 HMAC 签名、绑定主体并单次使用的 `requestState`（第 14、22 课）。重试必须使用全新 JSON-RPC ID，原样回传 `requestState`：

```json
{
  "jsonrpc": "2.0", "id": 10, "method": "tools/call",
  "params": {
    "name": "restart_service",
    "arguments": {"service": "checkout-api", "environment": "production"},
    "inputResponses": {"confirm": {"action": "accept", "content": {"confirmed": true}}},
    "requestState": "eyJwcmluY2lwYWwiOiJhbGljZS1vbmNhbGwi...9f1c2a"
  }
}
```

本课还发送故意破坏的重试：将 `requestState` 签名中的一个字符改掉，并在记录中标为 `violation`，让报文检查器知道这是反例。服务器自己的 HMAC 校验将它拒绝为工具执行错误，文字指出失败原因。这才体现状态保护的含义：不能仅有字段，还需要对篡改作出可检验的拒绝。

`run_full_diagnostics` 展示第 21 课的 tasks 扩展。同一工具根据当前请求是否在 `clientCapabilities.extensions` 声明 `io.modelcontextprotocol/tasks`，采用不同模式。未声明时同步完成，返回普通 `resultType: "complete"`；声明且服务器已在 `server/discover` 表示支持时，立即返回 `resultType: "task"` 和可通过 `tasks/get` 轮询的 `taskId`。查询未知 ID 得到 `-32602`，轮询本身忘记声明扩展则得到 `-32021`。第二个任务通过 `tasks/cancel` 请求协作式取消，先收到确认，随后轮询得到 `cancelled`。不要把它混同于 `notifications/cancelled`；后者用于仍在进行的请求或 `subscriptions/listen` 订阅流，无法代替对持久任务的取消。

`acknowledge_incident` 有意使用不同路径：通过 Streamable HTTP 发送，携带必须与正文一致的 `MCP-Protocol-Version`、`Mcp-Method`、`Mcp-Name`，并使用 OAuth 2.1 保护，而非本地 stdio 示例的环境凭据（第 19、23 课）。为其他资源服务器签发的 bearer 令牌，在进入 JSON-RPC 处理前便以 `401` 拒绝；受众校验是必需条件，不能接受为别处签发的令牌。相同调用使用正确令牌后成功。OAuth 只放在这一路径上：stdio SHOULD NOT 运行 OAuth 流程，把它混入其他调用会模糊授权实际所属层次。

每个阶段都在 `_meta` 中传递 W3C `traceparent`，以同一个追踪 ID 串联、每跳使用新跨度。同时，服务器按决策追加哈希链审计条目，每条哈希覆盖前一条（第 27 课）。若事后只修改某条的版本、结果或其他字段，而未一致重算后续链，`verify()` 会指出首次不匹配的位置，使记录可以被检查，而不只是格式化打印。

> 译注：哈希链的局部完整性校验不等于独立防篡改证明；整链重算及尾部截断仍需外部可信检查点防护。本课为进程内综合模拟，正文中的持久任务、OAuth 和安全控制应结合源码实际范围理解，不能据测试通过认定已完成真实服务部署或安全验收。上方精简 JSON 片段沿用原文，真实发送仍须包含每请求元数据。

```figure
mcpa-33-capstone-flow
```

## 交互实验（Interactive Lab）

图中按发现、模式检查、MRTR 同意、轮询任务和结果展开。下方虚线代表跨跳保留的追踪 ID，小链式方框代表最终验证的审计日志。运行实验并依次对照：

```bash
python3 code/main.py
```

关注业务执行前决定结果的四个时刻：最上方版本未修正时的 `-32022`；缺少 `environment` 的 `isError: true`；控制台未声明 `elicitation` 的 `-32021`；以及检查通过后才出现的 `input_required`。再看末尾审计日志，先由 `verify()` 返回 `True`，原地修改一个条目后，`verify()` 在对应索引失败。改变 `alice` 对 `run_full_diagnostics` 的能力声明，先预测会得到 `resultType: "task"` 还是同步结果，再重跑验证。

## 实践实验（Practice Lab）

从 `code/` 打开 Python 解释器并 `import main`。用 `server = main.build_server()` 创建服务器，再用 `client = main.Client("alice-oncall", server)` 创建客户端。以 `capabilities={}` 调用 `restart_service`，确认收到 `-32021`；添加 `capabilities=main.ELICIT_CAPS` 后，同一调用应返回 `input_required`。取出 `requestState`，像演示一样修改最后一个字符后手工重试，应看到指出签名问题的 `isError`，不能静默成功。最后创建任务并轮询一次，修改 `server.audit.entries` 中某个既有字段，分别在修改前后调用 `server.audit.verify()`。对于这种未重算摘要的单条修改，首次失败索引应正好落在被修改条目。

## 交付物（Shipped Artifact）

`outputs/mcpa-readiness-checklist.md` 是本路线的考前准备文档：将 `certifications/mcpa/tracks/mcpa-f.json` 中全部 18 个目标按五个加权领域组织，每项都对应可以实际指出的证据，来自本课记录或首次讲授该主题的前课。刚完成实验时核对一次，考前需要快速回忆时再核对一次。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试直接核查：每个请求都带协议版本和能力 `_meta`；未知工具为 `-32602`，未知方法为 `-32601`；模式错误的 `restart_service` 返回工具执行错误，修正后进入 `input_required`；缺少 `elicitation` 为 `-32021`；接受后的 MRTR 重试使用新 ID 并精确回传 `requestState`；篡改状态被拒绝；只有当前请求声明扩展时 `run_full_diagnostics` 才转为任务；任务可轮询完成或协作取消；`tasks/get` 也执行能力门禁；异受众令牌拒绝而正确令牌通过；含 `traceparent` 的各跳共享追踪 ID；审计链校验通过且局部修改在对应索引被发现；记录不使用旧版方法或退役错误码。仓库报文检查器还会直接按 2026-07-28 规则检查同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/33-mcpa-capstone-readiness
```

## 与综合实践的联系（Capstone Connection）

五个领域现在表现为同一交互中的不同阶段。MCP 基础对应开头版本协商，以及每个请求都不能依赖前次声明的无状态要求。架构与组件对应 `restart_service` 的模式，以及发现 `scan_fleet_health` 所用的 `tools/list`。交互与执行对应有意触发的各种结果：未知工具 `-32602`，未知方法 `-32601`，能力缺失 `-32021`，参数错误 `isError: true`，同意请求 `input_required`，长时间工作 `task`，以及仅发给申请它的请求的进度通知。安全与治理对应 HMAC 签名 `requestState`、在 JSON-RPC 之前拒绝异受众令牌的 OAuth 检查，以及可实际校验的哈希链审计。用例与生态则说明这些机制为何重要：值班控制台、有影响范围的重启工具、需要任务句柄的诊断，以及受授权保护的事故确认，都是走出教学演示后常见的系统需求。

本课之后需要做的是完成准备清单、按官方要求评估考试准备程度，并把这些知识应用到需要负责运维的系统中。此时，交互记录已经不仅是学习用图，而是运行中需要理解和核查的依赖。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 协议错误（Protocol error） | 格式错误或无法解析到目标的 JSON-RPC 请求，例如未知工具 `-32602` 或未知方法 `-32601` |
| 工具执行错误（Tool execution error） | 带 `isError: true` 的正常结果，报告模型可读取并修正的问题，如缺少参数 |
| MissingRequiredClientCapability | `-32021`，请求需要却未声明某项能力，如 `elicitation` |
| MRTR | 多轮往返请求：先返回 `input_required`，再以新 ID、`inputResponses` 和原样 `requestState` 重试 |
| requestState | 随 `input_required` 返回、可被攻击者修改的输入；参与授权时应签名、绑定主体并限制单次使用 |
| 任务扩展（Tasks extension） | `io.modelcontextprotocol/tasks`，双方支持且当前请求声明后，可将 `tools/call` 转为可轮询 `taskId` |
| 规范资源 URI（Canonical resource URI） | 服务器接纳 OAuth 访问令牌前核对的精确受众；为其他受众签发的令牌不能接受 |
| traceparent | `_meta` 中的 W3C 追踪字段，每次交互一个追踪 ID，每跳新跨度 ID |
| 哈希链审计日志（Hash chained audit log） | 每条摘要连接前条的追加记录，可检查未被整体一致重算所掩盖的插入、删除和编辑 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)，本交互依据的完整规范
- [MCP 架构概览](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)，了解记录中的角色
- [相对 2025-11-25 的变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog)，了解无状态核心替换了什么
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 全部章节，本路线依据的协议资料
- `phases/13-tools-and-protocols/23-capstone-tool-ecosystem`，另一种范围的完整工具生态实现
- MCPA 认证页面 training.linuxfoundation.org/certification/model-context-protocol-associate-mcpa，查询官方考试形式、时长及领域权重
