# MCP 安全：投毒元数据、路由与 MRTR 状态（MCP Security: Poisoned Metadata, Routing, and MRTR State）

> 无状态不等于无需信任。它意味着每个请求都公开服务器和网关独立验证调用所需的证据。

**Type:** Learn
**Languages:** Python
**Prerequisites:** Phase 13 · 07（MCP 服务器），Phase 13 · 08（MCP 客户端）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 将工具描述、注解、客户端信息和服务器信息视为不可信数据。
- 检测元数据投毒、描述符变化和跨服务器名称冲突。
- 验证 2026-07-28 请求元数据和 Streamable HTTP 路由请求头。
- 保护 MRTR `requestState` 免遭篡改，并将确认绑定到精确参数。
- 将授权和速率限制应用于主体，而不是已移除的协议会话。

## 问题（The Problem）

模型阅读工具描述来决定调用什么。路由器读取工具名称来决定将请求发往哪里。用户阅读标签来决定批准什么。一个恶意描述符就能同时攻击三者。

MCP 官方安全指南说得很明确：除非来自可信服务器，否则应将描述和注解视为不可信。即使如此，部署信任也可能变化。服务器更新、被攻陷的软件包、注册表错误或网关合并，都可能改变模型看到的内容。

当前协议也改变了安全边界。2026-07-28 中没有核心握手，也没有传输会话。仅以 `Mcp-Session-Id` 为键管理批准、速率限制或审计历史的安全设计，不是当前协议的设计。

## 概念（The Concept）

### 值得检查的七个攻击面（Seven attack surfaces worth checking）

用具体清单代替含糊的“小心行事”。

1. **元数据投毒（Metadata poisoning）。** 描述包含与声明的工具行为无关的指令。
2. **描述符抽毯式变更（Descriptor rug pull）。** 已批准的名称、描述、模式或注解发生变化。
3. **跨服务器遮蔽（Cross-server shadowing）。** 两个后端暴露相同的非限定工具名，路由却静默选择其中一个。
4. **请求头与正文混淆（Header and body confusion）。** `Mcp-Method` 或 `Mcp-Name` 与 JSON-RPC 请求不一致。
5. **能力提权（Capability escalation）。** 对端声明某项扩展或客户端功能，服务器误把声明当作授权。
6. **MRTR 状态篡改（MRTR state tampering）。** 客户端改变 `requestState`、回答另一个问题，或使用不同参数复用确认。
7. **供应链身份混淆（Supply-chain identity confusion）。** 将熟悉的显示名称当作发布者或服务器身份的证明。

这些攻击面会重叠。哈希固定有助于检测描述符变化，却不能证明最初的描述符安全。静态扫描能捕获明显措辞，却未必识别隐晦指令。命名空间能防止一类冲突，却不能阻止带命名空间的恶意服务器。应叠加这些控制措施。

### 当前请求信封是证据，不是身份（The current request envelope is evidence, not identity）

每个 2026-07-28 请求都包含：

```json
{
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {
      "elicitation": {"form": {}}
    },
    "io.modelcontextprotocol/clientInfo": {
      "name": "security-lab",
      "version": "1.0.0"
    }
  }
}
```

在每个请求上验证版本和能力结构。用能力选择兼容的响应结构。不要把 `clientInfo` 当作已认证主体，它是自行报告的信息。

同样的警告也适用于结果元数据中的 `io.modelcontextprotocol/serverInfo`。它有助于日志和调试，但不是证书、注册表证明或授权决定。

### 在策略之前验证路由（Validate routing before policy）

对于 `tools/call`，Streamable HTTP 包含：

```text
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: notes.export
```

请求头方法必须等于正文方法。请求头名称必须等于 `params.name`。在选择后端、应用基于角色的访问控制（RBAC）或消耗限流令牌之前，用 `-32020` 拒绝不一致。

这一顺序消除了一种常见歧义：一个组件按正文授权，另一个组件却按请求头路由。

线上验证遵循一个精确顺序。验证 JSON-RPC 和元数据类型，比较请求头值与正文，再检查匹配的版本是否受支持。请求头不匹配时返回 HTTP 400 和 `-32020`。若请求头与正文一致但版本不受支持，返回 HTTP 400 和 `-32022`，且 `data` 必须恰为 `{"supported":["2026-07-28"],"requested":"<actual>"}`。未知方法返回 HTTP 404 和 `-32601`。

当契约需要结构化恢复信息时，每个错误对象可包含可选的 `data`。通知没有 `id`，因此绝不接收 JSON-RPC 成功或错误响应。接受的 HTTP 通知返回 202 和空正文。

### 固定整个描述符（Pin the whole descriptor）

仅对描述计算哈希会遗漏模式和注解变化。对用户批准的描述符字段进行规范化并计算哈希：

```python
normalized = json.dumps(tool, sort_keys=True, separators=(",", ":"))
digest = hashlib.sha256(normalized.encode()).hexdigest()
```

将摘要存储在 `notes.export` 这样的限定键下；在这个简化示例之外，还应一并保存发布者证据和批准时间。

每次刷新时：

- 未知键：隔离，等待审查。
- 相同键、不同摘要：作为抽毯式变更隔离，直到重新批准。
- 重复的非限定名称：要求确定性的命名空间。
- 扫描器命中：阻止并审查完整描述符。

哈希相等证明稳定性，不证明安全性。被投毒的描述符即使被完美固定，仍然有毒。

### 静态扫描是警戒线（Static scanning is a tripwire）

简单模式可以标记角色标签、指令覆盖、隐瞒、秘密访问以及被掩饰的网络目的地。成本足够低，可用于安装时和持续集成（CI）。

它们不是语义证明。安全描述可能在正当警告中包含被标记的措辞；恶意描述也可以避开所有这些措辞。将扫描器输出视为审查证据，而不是自动判定无害的分数。

### 合并前先加命名空间（Namespace before merging）

假设两个服务器都暴露 `search`。绝不能由发现顺序决定谁胜出。

```text
notes.search
issues.search
```

限定名是网关公开名称。单独记录后端映射。稳定名称让批准、审计、哈希固定以及 `Mcp-Name` 路由指向同一个对象。

### 能力是兼容性声明（Capabilities are compatibility declarations）

逐请求的 `clientCapabilities` 告诉服务器，客户端能处理哪些协议功能。它不授予客户端对工具、数据或操作的访问权。

授权仍来自已认证主体与资源策略。顺序是：

1. 认证传输凭据。
2. 验证版本、请求头和请求结构。
3. 检查能力兼容性。
4. 对主体、工具、资源和参数进行授权。
5. 执行或请求用户输入。

### 保护无状态 MRTR 确认（Protect stateless MRTR confirmation）

会产生实际后果的工具可能需要用户确认。当前 MCP 使用多轮往返请求（Multi Round-Trip Requests），而不是服务器到客户端的回调。

首个响应：

```json
{
  "resultType": "input_required",
  "inputRequests": {
    "confirm": {
      "method": "elicitation/create",
      "params": {
        "mode": "form",
        "message": "Export notes to archive?",
        "requestedSchema": {
          "type": "object",
          "properties": {
            "confirm": {"type": "boolean"}
          },
          "required": ["confirm"]
        }
      }
    }
  },
  "requestState": "opaque-integrity-protected-value"
}
```

客户端获取输入，再使用新的 JSON-RPC id 重试原方法：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes.export",
    "arguments": {"query": "private", "destination": "archive"},
    "requestState": "opaque-integrity-protected-value",
    "inputResponses": {
      "confirm": {
        "action": "accept",
        "content": {"confirm": true}
      }
    },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

每个 `inputRequests` 值都是包含 `method` 和 `params` 的完整嵌入请求。其键必须与 `inputResponses` 中的对应条目匹配。表单信息征询（form elicitation）使用以对象为根的 `requestedSchema`；服务器请求表单之前，客户端必须已声明表单征询能力。

当前能力有两种有效的表单声明。`{"elicitation":{}}` 隐式支持表单征询，而 `{"elicitation":{"form":{}}}` 则显式声明。像 `{"elicitation":{"url":{}}}` 这样的仅 URL 声明不支持表单请求。服务器返回 HTTP 400 和 `-32021`，且 `data.requiredCapabilities` 等于 `{"elicitation":{"form":{}}}`。

将 `requestState` 视为恶意输入。对其签名或加密、验证，并绑定到方法、工具、精确参数、用途、到期时间、主体；当重放有风险时，还要绑定一次性随机数（nonce）。本课代码使用 HMAC 和精确参数匹配，让这一边界可见。

随机数账本不能只存在于一个网关对象中。可运行模型注入了有界、按 TTL 清理的重放存储，可供多个网关实例共享。其原子认领是执行边界：只有经过验证的接受或明确的终止拒绝才消耗状态。格式错误的响应或 `cancel` 不执行任何操作，并在到期前仍可重试。生产集群需要在共享持久化存储中实现同样的条件认领。

不要在协议会话中存储隐藏的确认上下文。任意服务器实例都应能验证重试。

### 高风险调用的三取二规则（Rule of two for high-risk calls）

从三个维度分类调用：

- 它消费不可信输入。
- 它可以访问敏感数据。
- 它导致会产生实际后果的外部操作。

一个自动步骤不应同时结合三者。拆分步骤、降低权限，或通过 MRTR 请求明确的用户输入。这是设计启发式规则，不是协议能力。

### 执行前收窄权限（Reduce authority before execution）

仅有无状态并不安全。它移除了隐藏的协议历史，但自包含请求仍可能要求权限过大的处理器泄露数据或进行不可逆变更。安全来自在每个边界收窄权限：

1. **类型化动作（Typed verb）。** 暴露一个有界操作，如 `archive_note`，而不是能够表达无关能力的通用 `run` 或 `request` 工具。
2. **经验证的参数（Validated arguments）。** 可行时使用封闭模式，拒绝未知字段，只规范化一次标识符，限制大小，并在策略评估前验证目的地、租户和资源所有权。
3. **当前授权（Current authorization）。** 将已认证主体绑定到精确动作、资源、环境和规范化参数。工具注解和客户端能力不授予这种权限。
4. **与操作绑定的批准（Action-bound approval）。** 对会产生实际后果的调用，将批准绑定到类型化动作和规范化参数的摘要，以及主体、到期时间和一次性策略。任何字段变化都需要新决定。
5. **一等拒绝结果（First-class refusal）。** 将禁止、批准过期、用户拒绝和不安全目的地建模为不执行任何副作用的普通结果。不要把拒绝转成较弱的回退工具。
6. **脱敏审计证据（Redacted audit evidence）。** 记录谁提出请求、使用了哪个获准描述符和策略版本、哪个规范化目标获得授权、决定为何允许或拒绝，以及是否开始执行。存储摘要或脱敏值，而非秘密。

每一步都缩小下一个组件可以做的事情。最终处理器应收到已验证的领域命令，而不是原始模型文本加宽泛凭据。在 MRTR 重试、任务更新或网关转发调用时，重复整条链。先前批准不会把后续请求变成可信会话流量。

### 当前与旧版交互路径（Current and legacy interaction paths）

对于新的 2026-07-28 实现，根目录（Roots）、采样（Sampling）和日志（Logging）已弃用。网关只能把旧请求通道代码保留为受版本门控的兼容路径。

不要围绕逐会话采样限流器构建新防御。应对已认证主体、签发者、资源、工具和时间窗口应用配额。对于当前交互式工作，检查 MRTR 输入请求和响应。

### 无状态传输检查（Stateless transport checks）

- 在单个 POST 端点接受现代 MCP 消息。
- 对现代 GET 和 DELETE 返回 405。
- 不生成或依赖 `Mcp-Session-Id`。
- 不将旧会话和重放请求头作为权限依据。
- 为该 POST 返回 JSON 或请求范围内的 SSE。
- 仅将 `subscriptions/listen` 用于主动启用的长连接变更通知。

```figure
tp-tool-poisoning
```

## 动手实现（Build It）

`code/main.py` 实现小型进程内安全网关模型。它规范化并固定完整工具描述符，报告元数据投毒和遮蔽，验证现代请求信封与路由值，并使用已签名的 `requestState` 和注入的共享重放存储，执行两轮确认导出。

模型从 HTTP 适配器已解析 JSON 正文和路由请求头之后开始。它不验证 `Content-Type` 或 `Accept`。将同一分发器连接到第 09 课的完整 Streamable HTTP 适配器，该适配器要求 `Content-Type: application/json`，且 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/15-mcp-security-tool-poisoning
python3 code/main.py
python3 -m unittest discover code/tests -v
```

示例刻意修改了一个描述符。扫描器和摘要比较产生相互独立的发现。随后的导出演示 `input_required` 响应与无状态重试。

## 实际应用（Use It）

将 `SAFE_TOOLS` 替换成来自你自己已批准服务器的规范化快照。不要将凭据和秘密放入快照。更新摘要之前，审查每个新增或变更的描述符。

在网关中，发现时执行同样检查，并在分发前再次检查。缓存可以减少发现工作，但缓存的批准必须到期，或在描述符变化时失效。

## 交付（Ship It）

本课交付 `outputs/skill-mcp-threat-model.md`。它生成当前协议的威胁模型，覆盖元数据、路由、能力、授权、MRTR、缓存、注册表和兼容边界。

## 练习（Exercises）

1. 将已认证主体和当前授权决定绑定到封装的 MRTR 状态，然后拒绝由不同主体发起的重试。
2. 将内存重放存储替换为持久化条件插入，并证明两个进程不能同时认领一个随机数。
3. 在认领重放状态之后、模拟导出之前注入故障。定义并测试确保恢复安全的事务或幂等规则。
4. 改变工具的 `inputSchema`，但不改变描述。确认完整描述符固定能捕获变化。
5. 添加策略：当 `tools/list` 因主体不同而变化时，拒绝公共缓存。
6. 模拟网关后方的旧服务器。将所有握手和会话行为放在显式的 `2025-11-25` 兼容分支之后。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| 元数据投毒（Metadata poisoning） | 嵌入工具描述符的指令或欺骗性声明 |
| 抽毯式变更（Rug pull） | 对先前已批准描述符的更改 |
| 工具遮蔽（Tool shadowing） | 重复非限定名称造成的路由歧义 |
| 请求头不匹配（Header mismatch） | 路由请求头与 JSON-RPC 正文不一致，错误为 `-32020` |
| 哈希固定（Hash pin） | 完整已批准描述符的摘要 |
| MRTR | 为服务器请求的输入提供的无状态响应与重试模式 |
| `requestState` | 必须作为不可信输入处理的不透明往返值 |
| 能力声明（Capability declaration） | 协议兼容性声明，不是授权 |
| 隐式表单支持（Implicit form support） | 空 `elicitation` 能力对象，等同于支持表单 |
| 限定工具名（Qualified tool name） | 稳定的网关名称，例如 `notes.search` |

## 延伸阅读（Further Reading）

- [MCP 安全与信任指南](https://modelcontextprotocol.io/specification/2026-07-28#security-and-trust--safety)
- [多轮往返请求](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [Streamable HTTP 传输](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [已弃用的功能](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
