# 显式作用范围与无状态信息征询（Explicit Scope and Stateless Elicitation）

> 根目录（Roots）在 MCP 2026-07-28 中已弃用，而且从来不是安全沙箱。把作用范围放入可见工具参数或资源 URI，在服务器授权；只有工具确实需要用户输入时才使用 MRTR。用户看到决策，模型看到句柄，任意服务器实例都能处理重试。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13 · 07（MCP 服务器），阶段 13 · 11（无状态 MRTR）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 用显式工作区参数、资源 URI 或服务器配置替代已弃用根目录。
- 将作用范围提示与授权、路径包含性和操作系统沙箱分开。
- 通过 MRTR `input_required` 结果投递表单模式的 `elicitation/create`。
- 在逐请求客户端能力中公布信息征询支持，拒绝不支持的模式。
- 将 `accept`、`decline` 和 `cancel` 作为不同结果校验。
- 将破坏性确认绑定到已认证主体、原参数、候选集合和过期时间。

## 两个看似相同的问题（Two Problems That Look Similar）

笔记工具收到请求：“删除旧的 TPS 报告。”

服务器必须回答两个不同问题。

1. 此操作可以触及哪个工作区？
2. 三条匹配笔记中，用户指的是哪条？

第一个是作用范围与授权，第二个是交互消歧。混淆会导致危险设计，例如将客户端提供的文件夹当作调用者可删除其中所有内容的证明。

## 根目录是迁移接口（Roots Are a Migration Surface）

早期 MCP 修订版允许客户端公布根目录，列表改变时通知服务器。根目录只是信息性指导：不约束服务器进程可读取什么，不授权调用者，也不创建操作系统沙箱。

MCP 2026-07-28 对新设计弃用 `roots/list` 和 `notifications/roots/list_changed`。优先采用以下显式替代之一：

- 范围随调用变化时，使用 `workspaceUri` 或 `directory` 工具参数。
- 操作已指向资源时，使用资源 URI。
- 一个部署拥有一个固定工作区时，使用服务器配置。
- 必须从技术上禁止代码逃逸时，使用进程沙箱或受限文件系统。

现有 2026-07-28 集成若在弃用窗口仍需 `roots/list`，服务器将其嵌入 MRTR `inputRequests`，不得发送实时反向请求。这是迁移适配器，新处理器应改为接受显式范围。

模型能看到并重复显式句柄。隐藏传输会话范围则更难检查、重放、审计和路由。

### 三层规则（The three-layer rule）

显式 URI 仍不能自我授权。强制执行全部三层：

1. **授权（Authorization）：** 此已认证主体是否有权使用该工作区？
2. **包含性（Containment）：** 规范化目标 URI 是否仍处于已授权工作区边界内？
3. **沙箱（Sandbox）：** 即使服务器被攻陷，操作系统能否阻止逃逸？

可运行服务器保存已授权工作区 URI 的允许列表，规范化百分号编码路径，检查真实路径组件边界，并在删除前立即重新检查包含性。

简单字符串前缀检查是错误的：

```text
allowed:   file:///work/notes
attacker:  file:///work/notes-evil/secret.md
traversal: file:///work/notes/%2e%2e/private.md
```

两条恶意路径都以误导性字符串开头。先规范化，再比较路径组件。生产文件系统服务器还必须防御符号链接竞态和平台专属路径语义。

## 信息征询仍存在，但投递方式改变（Elicitation Still Exists, but Delivery Changed）

信息征询（Elicitation）是当前在 `tools/call`、`prompts/get` 或 `resources/read` 期间收集用户输入的客户端功能。方法名称仍是 `elicitation/create`，改变的是线上传输方向。

2026-07-28 服务器不发送反向 JSON-RPC 请求，而是返回 `InputRequiredResult`：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "delete_choice": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Choose one matching note and confirm deletion.",
          "requestedSchema": {
            "type": "object",
            "properties": {
              "note_id": {
                "type": "string",
                "enum": ["note-3", "note-7", "note-14"]
              },
              "confirm": {"type": "boolean"}
            },
            "required": ["note_id", "confirm"]
          }
        }
      }
    },
    "requestState": "integrity-protected-delete-state"
  }
}
```

宿主渲染表单。用户可接受、明确拒绝或关闭。客户端随后用新 id 重试原 `tools/call`：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "notes_delete",
    "arguments": {
      "workspaceUri": "file:///Users/alice/Documents/Notes",
      "title": "TPS report"
    },
    "inputResponses": {
      "delete_choice": {
        "action": "accept",
        "content": {"note_id": "note-14", "confirm": true}
      }
    },
    "requestState": "integrity-protected-delete-state",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "elicitation": {"form": {}}
      }
    }
  }
}
```

两次调用之间没有协议会话。服务器验证回传状态，按预期模式校验响应，检查选中笔记属于签名候选集，重新授权工作区、重新检查包含性，然后删除。

## 能力协商按请求进行（Capability Negotiation Is Per Request）

支持表单模式信息征询的客户端声明：

```json
{
  "io.modelcontextprotocol/clientCapabilities": {
    "elicitation": {"form": {}}
  }
}
```

空信息征询能力 `"elicitation": {}` 为兼容仍等价于仅支持表单。显式 `"elicitation": {"form": {}}` 也支持表单模式，仅 URL 声明 `"elicitation": {"url": {}}` 则不支持。即使先前请求公布过某模式，服务器也不得嵌入当前请求能力缺失的模式。

每次请求还携带 `io.modelcontextprotocol/protocolVersion`。缺失或非字符串版本返回 `-32602`；不受支持字符串返回 `-32022`，附确切 `supported`、`requested` 数据。缺少信息征询或只支持 URL 时，返回 `-32021`，其 `data.requiredCapabilities` 设为 `{"elicitation":{"form":{}}}`。

没有 JSON-RPC `id` 的封装是通知，处理时不输出 JSON-RPC 成功或错误响应。在 Streamable HTTP 上，接受的通知获得无正文 `202 Accepted`。

应包含 `clientInfo` 用于诊断，但它是自报信息，不能识别用户以供授权。

服务器实现 `server/discover`，以 `resultType: "complete"` 返回 `supportedVersions`、能力、`ttlMs` 与 `cacheScope`。此现代设计不公布根目录。因为公布工具，它还实现必需的 `tools/list`，结果返回确定性 `notes_delete` 描述符、有效对象 `inputSchema`、服务器身份元数据和公开缓存提示。

## 表单模式（Form Mode）

表单模式采用面向可用对话框的受限 JSON Schema。根是对象，属性是扁平原始类型字段或支持的枚举数组。深嵌套对象和通用文档模式不适合确认对话框。

表单模式用于：

- 从多个候选项中选择一个；
- 确认破坏性操作；
- 收集非敏感偏好；
- 获取少数必须由用户而非模型决定的值。

不要用表单模式收集密码、API 密钥、访问令牌或支付凭据。这些秘密会经过 MCP 客户端，可能进入日志或模型上下文。

服务器再次校验返回内容。客户端表单校验改善用户体验，但不建立信任。

## URL 模式（URL Mode）

URL 模式发送安全 Web URL，用于带外交互（Out-of-band interaction）：

```json
{
  "method": "elicitation/create",
  "params": {
    "mode": "url",
    "message": "Connect the report service to continue.",
    "url": "https://mcp.example.com/connect/report-service"
  }
}
```

敏感信息必须直接送到服务器控制的 Web 流程时使用，如第三方授权。客户端展示完整目的地，取得同意后才打开，不得预取 URL。

`accept` 响应表示用户同意打开 URL，不证明外部流程完成。重试时服务器检查自己的状态，完成操作或再返回一个 `input_required` 结果。

URL 信息征询不能替代 MCP 客户端与服务器之间的授权。它用于 MCP 服务器需要代表用户执行的外部交互。服务器必须将浏览器用户绑定到发起 MCP 操作的同一已认证主体。

## 响应分支（Response Branches）

把动作当作产品决策，而非别名：

| 动作 | 含义 | 安全服务器行为 |
|--------|---------|----------------------|
| `accept` | 用户提交了交互 | 校验内容并继续 |
| `decline` | 用户明确拒绝 | 返回完整、非错误的拒绝结果 |
| `cancel` | 用户关闭或无法完成 | 安全停止，允许稍后重试 |

绝不把缺失内容解释为同意，绝不把拒绝变成重复提示循环。

## 保护破坏性 MRTR 状态（Protecting Destructive MRTR State）

候选列表不能只存在于提示词或未签名 Base64 值中，客户端控制所有回传内容。

本课签名的状态载荷包含：

- 已认证主体；
- 原始方法；
- `workspaceUri` 与 `title` 的摘要；
- 表单展示的允许笔记 id；
- 操作阶段；
- 较短过期时间。

修改前服务器还检查实时笔记记录。这能捕获删除竞态，以及表单展示后目标移出工作区的情况。

对于一次性金融或不可逆动作，仅 HMAC 无法防止有效状态在期限内被重放。应在所有处理器实例共享的重放存储中，将一次性随机数（Nonce）存储并恰好消费一次。本课注入有界、按 TTL 清理的存储，在执行内存删除期间持有其原子认领。生产数据库应在一个事务或等价条件写边界内，将 nonce 认领与修改耦合。

认领 nonce 前先校验交互。格式错误响应或 `cancel` 不执行修改，让状态在过期前仍可重试。显式 `decline` 是终态，因此本课消费 nonce，但不删除任何内容。

```figure
t3-roots-boundary
```

## 动手实现（Build It）

`code/main.py` 演示现代 `notes_delete` 工具：

- `tools/list` 返回确定性、可缓存描述符，包含必需工作区与标题模式。
- 范围是显式 `workspaceUri` 参数。
- 服务器配置为本课主体授权该工作区。
- URI 规范化拒绝前缀混淆和编码穿越。
- 每次破坏性删除都要求表单模式信息征询。
- 信息征询放在 `resultType: "input_required"` 中传送。
- 签名 `requestState` 绑定确切候选列表和原参数。
- 注入的重放存储跨服务器实例拒绝相同的已接受或已拒绝状态。
- 重试采用新请求 id，返回 `resultType: "complete"`。

数据存储在内存中，方便检查协议行为。换成数据库时安全规则相同。

## 实际应用（Use It）

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/code
python3 main.py
python3 -m unittest discover tests -v
```

预期检查点：

- 发现公布工具，不含根目录。
- 工具发现返回 `notes_delete`，含 `resultType`、服务器身份和缓存提示。
- 请求 id `1` 在 `inputRequests.delete_choice` 中返回表单。
- 请求 id `2` 回传签名状态并完成删除。
- 前缀路径和编码穿越路径都无法通过包含性检查。
- 改变标题后不能复用原确认状态。
- 拒绝会让笔记保持不变。
- 共享笔记与重放状态的两个服务器对象不能都执行同一确认。
- 空声明和显式表单声明有效；仅 URL 支持返回确切 `-32021` 表单要求。
- 不支持版本的失败采用确切 `-32022` 数据形态。
- 无 id 通知不产生 JSON-RPC 响应。

## 交付成果（Ship It）

`outputs/skill-elicitation-form-designer.md` 设计显式范围、授权检查、MRTR 表单、响应分支与状态绑定。它拒绝把已弃用根目录当沙箱，或通过表单模式收集秘密。

## 练习（Exercises）

1. 用 SQLite 替换内存重放存储。在一个事务中认领 nonce 并删除笔记，证明两个进程不能都提交。
2. 添加 `url` 能力协商和带外设置流程，让第三方凭据留在 `inputResponses` 之外。
3. 用临时 SQLite 数据库替换内存笔记映射，在修改事务内重新检查授权与包含性。
4. 为真实文件系统实现添加符号链接策略，解释为何仅 URI 词法包含性不能阻止符号链接逃逸。
5. 设计 2025-11-25 适配器，将现代 MRTR 处理器输出映射为旧版服务器发起的信息征询。与当前处理器保持隔离。

## 关键术语（Key Terms）

| 术语 | 在 2026-07-28 中的含义 |
|------|------------------------|
| 根目录（Roots） | 已弃用的信息性工作区提示，不是授权或沙箱 |
| 显式范围（Explicit scope） | 请求参数中可见的工作区、目录或资源句柄 |
| 包含性（Containment） | 保证目标位于边界内的规范化路径组件检查 |
| 信息征询（Elicitation） | MCP 操作期间获取用户输入的客户端功能 |
| 表单模式（Form mode） | 使用受限扁平模式的带内结构化用户输入 |
| URL 模式（URL mode） | 敏感或外部工作流的带外交互 |
| 多轮往返请求（MRTR） | 无状态的需要输入结果，随后是新重试 |
| `requestState` | 原样回传、由服务器校验完整性的不透明状态 |
| 拒绝（Decline） | 用户明确拒绝 |
| 取消（Cancel） | 未批准情况下关闭或未完成交互 |

## 旧版兼容（Legacy Compatibility）

固定在 2025-11-25 的对端仍可存在 `roots/list`、`notifications/roots/list_changed` 和实时服务器发起的 `elicitation/create`。把该适配器标为旧版。不要让旧版根目录列表绕过服务器授权，也不要把协议会话假设带入现代处理器。

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 信息征询（Elicitation）](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [MCP 2026-07-28 多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 根目录弃用（Roots deprecation）](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [MCP 2026-07-28 服务器发现（Server discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
