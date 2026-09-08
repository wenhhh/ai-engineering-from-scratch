# 构建 MCP 客户端：发现、路由与双时期回退（Building an MCP Client: Discovery, Routing, and Dual-Era Fallback）

> 现代 MCP 客户端在每次请求中重复契约。最难的兼容性决策，是分清服务器确实很旧，还是现代服务器正在报告可纠正的错误。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13，第 07 课
**Time:** ~85 分钟

## 学习目标（Learning Objectives）

- 用当前元数据构建每个 MCP `2026-07-28` 请求。
- 用 `server/discover` 探测 stdio 服务器，选择双方支持的版本。
- 仅为显式列入允许列表的对端授权有界旧版探测。
- 只有校验了支持修订版的正向 `initialize` 结果后，才接受旧版时期。
- 合并确定性工具列表，不静默覆盖冲突项。
- 将调用路由到工具所属对端，不虚构协议会话。

## 问题（The Problem）

智能体宿主通常会访问多个 MCP 服务器，必须发现各服务器、合并工具目录、解决重名、路由调用，并从传输故障恢复。

`2026-07-28` 修订版让每个请求自包含，因此稳态更简单。兼容性却让启动更微妙。客户端可能遇到：

- 支持首选版本的现代服务器；
- 返回已识别版本或头错误的现代服务器；
- 从未听说 `server/discover` 的旧版服务器；
- 收到 `initialize` 之前保持沉默的旧版服务器。

把所有探测错误都当成旧版很危险。格式错误的现代请求、过载服务器、已死亡进程和旧服务器，都可能产生相同的超时或连接关闭。这些信号有歧义。客户端必须结合显式运维意图和正向协议证据，才能选择旧版时期。

## 概念（The Concept）

### 对端，而非协议会话（A peer, not a protocol session）

为每个服务器进程或端点保存一份传输对端（Peer）记录：

- 传输句柄或发送函数；
- 选定的协议时期与版本；
- 最近发现的服务器能力；
- 最近一次确定性工具列表；
- 用于关联的待处理请求 id；
- 传输健康状态。

这是客户端记账，不是协议会话状态。在现代 MCP 上，服务器仍会在每次请求中收到当前版本与能力。

### 每次从头构建现代请求（Build every modern request from scratch）

```python
def modern_request(request_id, method, params, version, capabilities):
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": {
            **params,
            "_meta": {
                "io.modelcontextprotocol/protocolVersion": version,
                "io.modelcontextprotocol/clientCapabilities": capabilities,
                "io.modelcontextprotocol/clientInfo": CLIENT_INFO,
            },
        },
    }
```

不要只向连接对象附加一次元数据，就假设它已进入线上传输。应给最终序列化请求写入元数据并检查。

### 现代发现（Modern discovery）

`server/discover` 返回支持版本、服务器能力、说明、缓存提示和推荐服务器身份。客户端选择双方支持的最高现代版本。

仅支持现代协议的客户端可以不做发现，但 stdio 推荐做。某些旧版服务器在初始化之前就接受操作，因此先发送 `tools/list` 可能得到含糊的成功结果。`server/discover` 则创建清晰的时期边界。

### stdio 兼容性探测（The stdio compatibility probe）

双时期 stdio 客户端在任何其他请求前，以首选现代元数据发送 `server/discover`。有三类结果：

1. **发现结果（DiscoverResult）。** 服务器是现代的。选择双方支持的版本，继续携带逐请求元数据。
2. **已识别的现代错误（Recognized modern error）。** 服务器是现代的。对于 `-32022`，从 `data.supported` 选择版本，用新请求 id 重试。对于头或能力错误，纠正请求，不发送 `initialize`。
3. **歧义信号（Ambiguous signal）。** 未识别的 JSON-RPC 错误、超时、连接关闭或空响应都不能确定时期。除非这个确切对端已配置旧版兼容，否则失败时关闭（Fail closed）。

已识别的现代协议错误包括：

- `-32020` 头不匹配（HeaderMismatch）
- `-32021` 缺少所需客户端能力（MissingRequiredClientCapability）
- `-32022` 不支持的协议版本（UnsupportedProtocolVersion）

即使对端在旧版允许列表中，已识别的现代错误仍表明它是现代协议。服务器一旦证明理解现代错误词汇，再发送 `initialize` 就是降级。

不要把 `-32601` 当作正向旧版证据。它只让显式列入允许列表的对端有资格进行一次旧版探测。超时、连接关闭或空响应也遵循同一规则。

### 允许列表是运维意图，不是证据（Allowlisting is operator intent, not evidence）

旧版兼容必须是某个固定对端配置的显式属性：

```python
client.add_server("archive", archive_transport, allow_legacy=True)
```

将选择绑定到配置的命令或端点。不要用通配符，让任意服务器自行选择较弱语义。没有 `allow_legacy=True` 的对端在发现结果含糊后失败，绝不收到 `initialize`。

允许列表授予探测权限，不选择时期。客户端在传输层强制的期限内发送一次 `initialize`，然后要求全部满足：

- JSON-RPC `2.0` 响应，具有匹配的请求 id；
- 恰好一个 `result`，且没有 `error`；
- `protocolVersion` 位于客户端配置的旧版修订集合中；
- 对象值的 `capabilities` 字段；
- `serverInfo` 对象，含非空字符串 `name` 和 `version` 字段。

超时、连接关闭、错误响应、格式错误结果、id 不匹配或不支持的修订版都失败关闭。只有结构有效的正向结果才选择旧版时期。代码向传输适配器传递 `legacy_probe_timeout_ms`；真实 stdio 或 HTTP 适配器必须强制这个期限，不能只是记录。

为传输对端缓存选定时期，不要每次调用前重新探测。

### 旧版是兼容分支（Legacy is a compatibility branch）

有界探测返回有效正向旧版证据后，客户端严格按选中修订版的定义使用旧版：

1. 验证响应封装与关联 id。
2. 验证协商修订版位于配置的旧版集合。
3. 记录已校验能力与服务器身份。
4. 仅在全部检查通过后发送 `notifications/initialized`。
5. 在该传输生命周期内使用旧版请求形态。

此分支用于和已知对端互操作，不是新服务器或新请求的默认设计。传输重启或端点变化时，丢弃对端时期缓存，重新协商。

### 工具发现与缓存（Discovering and caching tools）

为每个活跃对端调用 `tools/list`。现代结果包含 `resultType`、`ttlMs` 和 `cacheScope`。在正确授权上下文内遵守新鲜度提示，到期或收到订阅列表变更事件后重新获取。

客户端必须把旧版服务器缺失的 `resultType` 视为 `"complete"`。不要要求较早协商时期的响应包含现代缓存字段。

服务器应返回确定性排序。客户端也应在合并前排序，避免本地注册表顺序依赖进程启动时序。

### 冲突安全的命名空间合并（Collision-safe namespace merge）

两个服务器可能都暴露 `search`。选择一种声明的策略：

1. **冲突时加前缀（Prefix on collision）。** 保留首个规范名称，后续冲突以 `<server>/<tool>` 暴露。
2. **冲突时拒绝（Reject on collision）。** 不加载重复项，呈现明确配置错误。
3. **静默覆盖（Silent overwrite）。** 绝不使用，它会掩盖模型所选动作由哪个服务器接收。

同时保存规范名称与本地名称。模型看到规范名称，发出的 `tools/call` 使用工具所属服务器声明的本地名称。

### 调用路由（Routing a call）

路由是纯查找：

```text
规范工具名称
  -> 对端名称 + 本地工具名称
  -> 新 JSON-RPC 请求 id
  -> 现代请求元数据或显式旧版形态
  -> 匹配的响应 id
```

工具所属传输不可用时，不要发送调用。重连或重启传输，再运行发现与 `tools/list`。现代在途请求因传输中断而丢失时，只要操作安全策略允许，可以用新 JSON-RPC id 重试。

### 通知与订阅（Notifications and subscriptions）

现代列表与资源变更仅在客户端打开的 `subscriptions/listen` 流上到达。客户端发送通知过滤器，等待 `notifications/subscriptions/acknowledged`，并用通知元数据中的监听请求 id 关联事件。

断开后，打开新的监听请求并重新获取相关列表或资源。现代流不使用 `Last-Event-ID` 恢复。

### 没有服务器发起的请求（No server-initiated requests）

现代服务器不会通过独立 JSON-RPC 请求调用客户端进行采样、信息征询或根目录获取。它们返回 `input_required`，客户端满足嵌入输入请求后重试原请求。

满足输入时不要阻塞对端的响应读取器。保留关联，并为重试创建新 JSON-RPC id。

```figure
tp-client-merge
```

## 实际应用（Use It）

`code/main.py` 使用进程内对端函数，让协议决策清晰可见。它连接两个现代对端和一个有意列入允许列表的旧版对端，再合并和路由其工具。传输可调用对象接收超时预算，避免兼容分支隐藏无界探测。

```bash
cd code
python3 main.py
python3 -m unittest discover tests -v
```

测试证明普通演示容易遗漏的边界：

- 现代请求重复元数据；
- `-32022` 重试现代发现，不初始化；
- 已识别的现代错误绝不降级，即使对端在允许列表中；
- 未列入允许列表时，超时、连接关闭、空响应和未识别错误不会触发 `initialize`；
- 允许列表中的对端，只有返回有效且受支持的 `initialize` 结果后才成为旧版；
- 格式错误或不支持的旧版结果使对端保持不可用；
- 成功选择的时期在传输生命周期内缓存。

## 交付成果（Ship It）

本课交付 `outputs/skill-mcp-client-harness.md`，搭建现代请求元数据写入、stdio 时期协商、确定性命名空间合并、路由和失败关闭的旧版兼容分支。

## 练习（Exercises）

1. 让假服务器返回没有双方支持版本的 `-32022`。确认客户端失败，而不是发送 `initialize`。
2. 将假旧版服务器列入允许列表，让其有界 `initialize` 探测超时，证明对端仍是 `unknown` 且不可用。
3. 为两个授权上下文添加 `cacheScope: "private"` 工具列表，确认客户端绝不向另一上下文共享某上下文的缓存结果。
4. 将冲突策略改为拒绝，使启动失败，错误中包含两个对端名称。
5. 添加有限的 `subscriptions/listen` 模拟器。流丢失时用新请求 id 重新监听并重新获取工具。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| 对端（Peer） | 一个服务器传输及其发现数据的客户端记录 |
| 协议时期（Protocol era） | 现代逐请求元数据，或旧版初始化语义 |
| 发现探测（Discovery probe） | 用于识别 stdio 时期的初始 `server/discover` |
| 已识别的现代错误（Recognized modern error） | 证明现代行为并禁止旧版回退的错误 |
| 旧版允许列表（Legacy allowlist） | 允许运维配置中固定对端进行一次有界兼容探测 |
| 正向旧版证据（Positive legacy evidence） | 显式支持的旧版修订版所对应的有效、关联匹配的 `initialize` 结果 |
| 合并命名空间（Merged namespace） | 所有活跃对端的规范工具名称 |
| 冲突策略（Collision policy） | 重复工具名的前缀或拒绝规则 |
| 时期缓存（Era cache） | 为一个传输对端保存的选定现代或旧版行为 |
| 传输恢复（Transport recovery） | 重启或重连，重新发现、列举，并用新 id 安全重试 |

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 规范（MCP Specification 2026-07-28）](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP 服务器发现（MCP Server Discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP stdio 传输（MCP stdio Transport）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [MCP 版本管理（MCP Versioning）](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [MCP 工具（MCP Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
