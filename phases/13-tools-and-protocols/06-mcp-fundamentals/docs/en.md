# MCP 基础：无状态请求与 JSON-RPC（MCP Fundamentals: Stateless Requests and JSON-RPC）

> 现代 MCP 没有握手，也没有协议会话。每次请求都必须携带足够的元数据，使其能够独立地被理解、授权、路由和重试。

**Type:** Learn
**Languages:** Python
**Prerequisites:** 阶段 13，第 01 至 05 课
**Time:** ~55 分钟

## 学习目标（Learning Objectives）

- 区分 MCP 的服务器原语与客户端功能。
- 为 MCP `2026-07-28` 构建有效的 JSON-RPC 2.0 请求与响应。
- 给每次请求附加协议版本、客户端能力和客户端身份。
- 在没有握手的情况下使用 `server/discover` 并处理 `UnsupportedProtocolVersionError`。
- 跟踪一个独立请求从校验到完整结果的过程。

## 问题（The Problem）

MCP 服务器可能在同一进程或 HTTP 工作进程中，连续收到两个来自不同客户端、具有不同能力的请求。如果服务器记住上一个请求声明的内容，就可能应用错误权限或返回错误的线上传输形态。

MCP `2026-07-28` 消除了这种歧义。协议核心是无状态的（Stateless）。服务器必须根据当前请求决定如何处理当前请求，而不是依赖连接历史。

这改变了心智模型。旧顺序是先连接，再握手，最后执行操作。现代顺序更简单：

1. 客户端发送自描述请求。
2. 服务器校验该请求的版本与能力。
3. 服务器处理方法。
4. 服务器返回带类型的结果或 JSON-RPC 错误。

下一个请求从头重复相同过程。

## 概念（The Concept）

### 服务器原语（Server primitives）

MCP 服务器暴露三种主要原语：

1. **工具（Tools）**是模型控制的动作，通过 `tools/list` 发现，通过 `tools/call` 调用。
2. **资源（Resources）**是由 URI 寻址的数据，通过 `resources/list` 发现，通过 `resources/read` 获取。
3. **提示词（Prompts）**是可复用模板，通过 `prompts/list` 发现，通过 `prompts/get` 渲染。

根目录（Roots）、采样（Sampling）和日志（Logging）为兼容性仍保留在 `2026-07-28` 模式中，但已弃用。新实现应使用显式工具或资源输入替代根目录，使用直接的模型提供商 API 替代采样，使用 stderr 或 OpenTelemetry 记录日志。信息征询（Elicitation）仍可通过多轮往返请求（Multi Round-Trip Requests）使用：服务器返回输入请求，客户端重试原始操作。现代服务器绝不发起独立的 JSON-RPC 请求。

### JSON-RPC 封装（JSON-RPC envelopes）

MCP 使用 JSON-RPC 2.0：

- 请求：`{jsonrpc, id, method, params}`
- 响应：`{jsonrpc, id, result}` 或 `{jsonrpc, id, error}`
- 通知：`{jsonrpc, method, params}`，没有 `id`

请求 `id` 关联一个响应，不会创建协议会话。

### 必需的请求元数据（Required request metadata）

每个现代请求在 `params` 内携带一个 `_meta` 对象：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    }
  }
}
```

协议版本与客户端能力为必填项。客户端身份为推荐项，是客户端自报的展示和调试数据，不是安全凭据。

服务器不得仅从先前请求、stdio 进程、HTTP 连接或传输头推断这些值中的任何一个。

### 完整结果与服务器身份（Complete results and server identity）

每个成功的现代结果都包含 `resultType`，普通最终结果使用 `"complete"`。服务器也应在结果元数据中标明自身身份：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "tools": [],
    "ttlMs": 30000,
    "cacheScope": "public",
    "_meta": {
      "io.modelcontextprotocol/serverInfo": {
        "name": "notes-server",
        "version": "1.0.0"
      }
    }
  }
}
```

`tools/list`、`resources/list`、`prompts/list`、`resources/templates/list`、`resources/read` 和 `server/discover` 是可缓存结果，包含 `ttlMs` 与 `cacheScope`。安全默认值是 `ttlMs: 0` 和 `cacheScope: "private"`。列表项应确定性排序，让等价响应产生稳定缓存键与稳定模型上下文。

### 无握手发现（Discovery without a handshake）

每个现代服务器都必须实现 `server/discover`。客户端可在其他方法之前调用它，获取：

- `supportedVersions`
- 服务器 `capabilities`
- 可选使用 `instructions`
- 结果 `_meta` 中的服务器身份
- 缓存提示

发现有用，但不是门禁。客户端可以先发 `tools/list`，因为该请求已经携带协议版本与能力。

如果请求版本不受支持，服务器返回 JSON-RPC 错误码 `-32022`，附带：

```json
{
  "requested": "2027-01-01",
  "supported": ["2026-07-28"]
}
```

客户端选择双方支持的现代版本，使用新的 JSON-RPC 请求 id 重试。

### 一次请求的生命周期（One request lifecycle）

按此顺序跟踪现代请求：

1. 解析一个 JSON-RPC 封装。
2. 确认 `jsonrpc` 为 `"2.0"`，存在 `id`，`method` 是字符串，`params` 是对象。
3. 要求 `params._meta` 中存在版本字符串与能力对象；元数据格式错误或缺失时为 `-32602`。
4. 在 HTTP 边界，将版本、方法和适用的名称头与正文比较。不匹配就是 `-32020`，即使两个版本值之一不受支持也如此。
5. 确认相等之后，用 `-32022` 拒绝匹配但不受支持的版本。
6. 检查所需能力，再按 `method` 路由并校验方法专属参数。
7. 在处理器运行之前，认证并授权具体操作。
8. 返回带服务器身份的完整结果。
9. 丢弃请求作用域的协议元数据。

这个顺序防止两个组件把请求理解成不同调用。不能让网关授权 `Mcp-Name: notes.read`，而源站执行 `params.name: notes.delete`。它也让格式错误输入、头混淆、版本协商、能力失败、授权和处理器失败保留为彼此独立的证据。

关闭 stdin 或 HTTP 响应意味着传输活动结束，而不是终止协议会话，因为现代 MCP 没有协议会话。

### 显式旧版兼容（Explicit legacy compatibility）

截至 `2025-11-25` 的版本使用 `initialize`、`notifications/initialized`、连接作用域的能力，以及早期 Streamable HTTP 中可选的协议会话。兼容两个时期的客户端访问旧服务器时，这些行为仍有意义。

把两个时期分开。现代请求通过必需的逐请求元数据识别；旧版连接只能通过文档规定的回退路径选择。不要默认向 `2026-07-28` 服务器发送 `initialize`。

因此，“无状态”的含义取决于协议时期。在 `2026-07-28` 中，它是协议不变量：每个普通请求都可独立解释，不存在 MCP 会话。在截至 `2025-11-25` 的版本中，初始化与协商能力属于连接，所以兼容适配器可以保留该旧版连接状态。双时期实现并非一个宽松的状态机，而是无状态现代核心旁配一个隔离的旧版适配器，并在任何解析器运行之前显式决定选择哪个。

两种含义都不禁止持久应用状态。工作流、任务或草稿可以通过不透明句柄存放在共享存储中。客户端把句柄作为普通输入发送，每个副本认证并授权其使用。协议上下文不得泄漏到该存储中，充当已移除会话的替代品。

```figure
mcp-tool-call
```

## 实际应用（Use It）

`code/main.py` 不使用框架，构建、校验、跟踪并分派现代 MCP 消息。运行：

```bash
python3 code/main.py
python3 -m unittest discover code/tests -v
```

观察输出中的三个不变量：

- 每次请求都重复自己的 `_meta` 字段。
- 每个成功结果都是 `resultType: "complete"`，并包含服务器身份。
- 列表结果确定性排序，带显式缓存提示。

## 交付成果（Ship It）

本课交付 `outputs/skill-mcp-handshake-tracer.md`。历史文件名保持稳定，但交付物现在是无状态请求跟踪器。它独立审计每条消息，仅在确实存在旧版握手流量时才如此标注。

## 练习（Exercises）

1. 将一个请求的协议版本改为 `2027-01-01`。确认错误码为 `-32022`，且数据公布支持的版本。
2. 从第二个请求移除 `io.modelcontextprotocol/clientCapabilities`。确认服务器不复用第一个请求的能力。
3. 反转内存工具注册表。确认 `tools/list` 仍返回同一确定顺序。
4. 将 `cacheScope` 从 `public` 改为 `private`。解释两种情况下哪些授权上下文可以复用响应。
5. 添加可选 `clientInfo` 的省略测试。请求应仍有效，因为客户端身份是推荐项，不是必需项。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| 无状态协议（Stateless protocol） | 每次请求提供解释自身所需的元数据 |
| 请求元数据（Request metadata） | `params._meta` 中的版本、客户端能力与推荐客户端身份 |
| `server/discover` | 提供版本、能力、说明和身份的必需服务器方法 |
| `resultType` | 每个成功现代结果上的判别字段 |
| 可缓存结果（Cacheable result） | 包含必需 `ttlMs` 与 `cacheScope` 提示的结果 |
| 协议时期（Protocol era） | 现代逐请求元数据，或旧版连接作用域初始化 |
| 传输生命周期（Transport lifetime） | 进程、连接或响应流的生命周期，不是协议会话状态 |
| `-32022` | 含请求版本与支持版本的不支持协议版本错误 |

## 延伸阅读（Further Reading）

- [MCP 架构（MCP Architecture）](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [MCP 基础协议（MCP Base Protocol）](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP 服务器发现（MCP Server Discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP 2026-07-28 变更日志（MCP 2026-07-28 Changelog）](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
