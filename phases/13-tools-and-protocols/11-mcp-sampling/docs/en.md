# MCP 模型输入：采样迁移与无状态 MRTR（MCP Model Input: Sampling Migration and Stateless MRTR）

> MCP 2026-07-28 对新设计弃用采样（Sampling），并移除服务器到客户端的请求通道。现有工作流若仍需要客户端模型，服务器返回 `input_required` 结果，由客户端携带模型输出重试原请求。推理循环在协议层变得显式、有界且无状态。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13 · 07（MCP 服务器），阶段 13 · 10（资源与提示词）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释 MCP 2026-07-28 为何弃用采样，为新服务器选择默认的直接模型集成。
- 实现通过多轮往返请求（Multi Round-Trip Requests，MRTR）承载 `sampling/createMessage` 的兼容工作流。
- 在每个请求的 `_meta` 对象中加入协议修订版与客户端能力。
- 返回 `resultType: "input_required"`，用新 JSON-RPC id 重试原方法。
- 对 `requestState` 做完整性保护，并绑定主体、方法、参数与过期时间。
- 用能力检查、审批、响应校验与轮次上限约束模型辅助循环。

## 协议之前的决策（The Decision Before the Protocol）

`summarize_repo` 这样的工具需要两类工作：

1. 确定性工作：列出文件、读取允许的文件、校验路径并组装内容。
2. 模型工作：选择代表性文件并综合生成摘要。

现在有两种有效架构。

### 新服务器：直接集成模型提供商（New server: integrate with a model provider directly）

这是当前默认方式。服务器负责模型选择、凭据、预算、重试和可观测性，向 MCP 客户端返回一个普通 `tools/call` 结果。

服务器已经是托管服务，或模型行为可预测性比使用宿主模型更重要时，选择此方案。

### 现有采样工作流：迁移到 MRTR（Existing Sampling workflow: migrate it to MRTR）

采样在弃用窗口内仍存在。面向 2026-07-28 的服务器不能向客户端反向发送实时 `sampling/createMessage` 请求，而是将请求嵌入 `InputRequiredResult`。

只有使用客户端模型和凭据是真实产品需求时，才选此兼容路径。记录移除计划，因为新实现不应采用已弃用采样。

## 无状态契约（The Stateless Contract）

2026 年 7 月协议没有 `initialize` 交换，没有 `notifications/initialized`，没有 `Mcp-Session-Id`。每次请求携带以前存放在握手中的信息：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}},
      "io.modelcontextprotocol/clientInfo": {
        "name": "lesson-client",
        "version": "1.0.0"
      }
    }
  }
}
```

服务器每次请求都校验修订版。缺失或非字符串版本属于无效参数，返回 `-32602`。不受支持的字符串返回 `-32022`，附确切数据 `{"supported":["2026-07-28"],"requested":"<client version>"}`。缺少采样能力返回 `-32021`，其 `data.requiredCapabilities` 设为 `{"sampling":{}}`。

没有 JSON-RPC `id` 的封装是通知。接收者可处理它，但既不输出成功响应，也不输出错误响应。Streamable HTTP 适配器对接受的通知返回无正文 `202 Accepted`。

服务器也实现 `server/discover`，包含确切的 `supportedVersions` 键、能力、`ttlMs` 和 `cacheScope`，让客户端在调用工具前了解并缓存服务器契约。因为发现公布了 `tools`，服务器还实现必需的 `tools/list`。其确定性 `summarize_repo` 描述符包含有效对象 `inputSchema`、`resultType: "complete"`、服务器身份元数据和公开缓存提示。

每个成功现代结果都有判别字段：

- `resultType: "complete"` 表示操作完成。
- `resultType: "input_required"` 表示客户端必须满足嵌入请求并重试。
- 扩展可定义其他结果类型。第 13 课的任务扩展增加 `"task"`。

## 一轮 MRTR（One MRTR Round）

服务器处理请求时无法调用客户端，而是返回以下结果：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "pick_files": {
        "method": "sampling/createMessage",
        "params": {
          "messages": [
            {
              "role": "user",
              "content": {
                "type": "text",
                "text": "Choose three representative files and return a JSON array."
              }
            }
          ],
          "systemPrompt": "Return only the requested value.",
          "modelPreferences": {
            "costPriority": 0.8,
            "intelligencePriority": 0.2
          },
          "maxTokens": 400
        }
      }
    },
    "requestState": "opaque-integrity-protected-value"
  }
}
```

客户端确认支持采样，应用自己的审批和模型策略，取得模型响应，然后发送 JSON-RPC id 不同的新请求：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "summarize_repo",
    "arguments": {"audience": "developer"},
    "inputResponses": {
      "pick_files": {
        "role": "assistant",
        "content": {
          "type": "text",
          "text": "[\"README.md\", \"server.py\", \"docs/intro.md\"]"
        },
        "model": "host-model",
        "stopReason": "endTurn"
      }
    },
    "requestState": "opaque-integrity-protected-value",
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {"sampling": {}}
    }
  }
}
```

重试不是协议会话的继续，而是新请求：重复原方法与参数，只增加当前轮的 `inputResponses`，并逐字节原样回传 `requestState`。

MRTR 只允许用于 `tools/call`、`prompts/get` 和 `resources/read`。服务器不得从无关方法返回 `input_required`。

## 多轮状态（Multi-Round State）

本课需要两次模型调用：

1. `pick_files` 返回 JSON 数组。
2. `summary` 返回最终文字。

每次重试只携带该轮响应，因此服务器把阶段和已校验中间数据放入下一个 `requestState`。

把这个值当成攻击者可控数据。仅签名原始阶段名称不够，应将状态绑定到：

- 已认证主体，而不是自报的 `clientInfo`；
- 原始方法；
- 原始参数摘要；
- 较短过期时间；
- 当前阶段与已校验中间值。

无需保密时使用 HMAC；客户端不得读取状态时，使用认证加密（Authenticated encryption）。签名错误、值过期、主体变化或参数变化，都用 `-32602` 拒绝。

客户端不得解析或修改 `requestState`，唯一职责是在重试时原样回传字符串。

## 模型偏好是提示（Model Preferences Are Hints）

`costPriority`、`speedPriority` 和 `intelligencePriority` 是独立偏好，不是概率分布，无需总和为一。客户端可以忽略，因为模型策略归客户端所有。

维护旧版采样流时，将 `includeContext` 保持为 `"none"`。其他上下文模式会增加泄漏风险，本身也已弃用。在请求中显式传入最少上下文。

## 安全不变量（Safety Invariants）

客户端是嵌入采样请求的信任边界。

- 策略要求审批时，向用户展示服务器要求模型做什么。
- 限制 MRTR 轮数，否则恶意服务器可制造模型费用循环。
- 将采样响应作为文件名、URL 或工具输入前，逐一校验。
- 限制每轮字节数与词元数。
- 拒绝当前客户端能力未声明的输入请求。
- 不让模型输出参与授权决策。
- 记录原始方法和输入请求键，不记录敏感提示词内容。

`clientInfo` 和 `serverInfo` 是展示与诊断元数据，绝不把任何一个当作已认证身份。

```figure
t3-sampling-flip
```

## 动手实现（Build It）

`code/main.py` 不使用第三方包，实现完整两轮流程：

- `server/discover` 返回 `supportedVersions`，公布工具支持并返回缓存提示。
- `tools/list` 返回确定性、可缓存的 `summarize_repo` 描述符，含对象输入模式。
- `tools/call` 校验逐请求元数据。
- 首个结果嵌入用于文件选择的 `sampling/createMessage`。
- 首次重试校验模型结果，再嵌入第二个请求。
- HMAC 保护的 `requestState` 在独立请求间携带阶段。
- 最终结果使用 `resultType: "complete"`。

假宿主模型让示例保持确定性。连接真实宿主时只替换 `fake_host_model`，服务端状态机应保持确定、可测试。

## 实际应用（Use It）

从仓库根目录运行：

```bash
cd phases/13-tools-and-protocols/11-mcp-sampling/code
python3 main.py
python3 -m unittest discover tests -v
```

预期检查点：

- 发现返回带 `ttlMs` 与 `cacheScope` 的完整结果。
- 工具发现返回相同排序描述符，含 `resultType`、服务器身份和缓存提示。
- 缺失能力与不支持版本使用确切的 `-32021`、`-32022` 错误数据。
- 无 id 通知不产生 JSON-RPC 响应。
- 请求 id 为 `[1, 2, 3]`，证明每轮 MRTR 独立。
- 前两个结果为 `input_required`。
- 最终结果为 `complete`，包含选中文件与摘要。
- 重试时改变原参数会使请求状态检查失败。

## 交付成果（Ship It）

`outputs/skill-sampling-loop-designer.md` 现在是迁移规划器。先决定是否移除采样、改用直接模型集成；需要兼容时，生成 MRTR 轮次、状态绑定、能力门禁、预算、校验与移除计划。

## 练习（Exercises）

1. 将文件选择响应改为无效 JSON，确认服务器返回 `-32602`，而不是信任模型输出。
2. 在首次调用与重试间改变 `audience`，解释密封状态为何阻止跨请求复用。
3. 添加第三轮，让宿主评议摘要。将先前摘要放入签名状态，并把完整流程限制为三轮。
4. 用服务器拥有的模型适配器替换假宿主回调，移除采样。列出哪些审批、计费和可观测性职责转移到服务器。
5. 用超过期限一秒的状态值添加过期测试。

## 关键术语（Key Terms）

| 术语 | 在 2026-07-28 中的含义 |
|------|------------------------|
| 采样（Sampling） | 请求客户端模型补全的已弃用功能 |
| 多轮往返请求（MRTR） | 请求期间需要客户端输入时采用的无状态重试模式 |
| `InputRequiredResult` | 带 `resultType: "input_required"` 的结果 |
| `inputRequests` | 服务器分配键的嵌入式信息征询、采样或根目录请求映射 |
| `inputResponses` | 当前轮客户端结果，使用与 `inputRequests` 相同的键 |
| `requestState` | 客户端原样回传、服务器验证的不透明服务器状态 |
| `resultType` | 现代 MCP 结果必需的判别字段 |
| 直接模型集成（Direct model integration） | 需要模型推理的新服务器所推荐的替代方案 |
| 能力门禁（Capability gate） | 阻止发送客户端未公布支持的嵌入请求的规则 |
| 循环预算（Loop budget） | 操作允许的最大轮数、词元、字节、时间和费用 |

## 旧版兼容（Legacy Compatibility）

固定使用 2025-11-25 的客户端仍可通过活跃连接使用旧的服务器发起 `sampling/createMessage` 流程。仅在版本专属适配器保留这种行为，不要将有会话路径作为 2026-07-28 服务器架构。

官方 SDK 可为旧对端转换现代 `input_required` 处理器。这一兼容层是兼容边界，不是添加新会话依赖逻辑的许可。

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [MCP 2026-07-28 变更日志（Changelog）](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP 采样弃用（Sampling deprecation）](https://modelcontextprotocol.io/seps/2577-deprecate-roots-sampling-and-logging)
- [MCP 2026-07-28 服务器发现（Server discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
