# 构建 MCP 服务器：无状态 Python 与 TypeScript（Building an MCP Server: Stateless Python and TypeScript）

> 现代 MCP 服务器不记住握手。它校验每次请求的元数据，运行一个处理器，返回一个带类型的结果。

**Type:** Build
**Languages:** Python, TypeScript
**Prerequisites:** 阶段 13，第 06 课
**Time:** ~85 分钟

## 学习目标（Learning Objectives）

- 实现 MCP `2026-07-28` 必需的 `server/discover`。
- 在每次请求中校验协议版本和客户端能力。
- 暴露工具、资源和提示词，并对列表进行确定性排序。
- 在正确的结果中返回 `resultType`、服务器身份和缓存提示。
- 用 Python 和 TypeScript，通过换行分隔的 stdio 提供相同无状态契约。

## 问题（The Problem）

服务器在第一条消息后存储客户端能力，很容易构建，却很难运维。同一进程可能先后服务不同客户端，远程请求可能落在不同工作进程。过时的能力声明可能使行为跨越授权边界泄漏。

MCP `2026-07-28` 让每次请求自描述，解决此问题中的协议部分。应用仍可保存持久笔记、作业或显式状态句柄，但不能保存会改变后续请求解码方式的隐藏协议状态。

本课构建两遍笔记服务器。Python 与 TypeScript 版本的协议核心仅使用各自标准库。两者暴露相同方法，强制执行相同的线上传输契约。

## 概念（The Concept）

### 现代分派循环（The modern dispatch loop）

```text
读取一行 JSON-RPC
解析封装
如果是通知，不响应
校验当前请求的 params._meta
按方法路由
用 resultType 和 serverInfo 封装成功结果
写入一行 JSON-RPC 响应
丢弃请求作用域的元数据
```

三条 stdio 规则仍然重要：

- stdout 只写 JSON-RPC 消息，诊断信息发往 stderr。
- 用换行分隔消息，每个响应都刷新缓冲区。
- stdin 到达 EOF 时立即退出。

进程生命周期是传输生命周期，不是现代 MCP 会话。

### 请求校验（Request validation）

每次请求必须包含：

```json
{
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "notes-client",
        "version": "1.0.0"
      }
    }
  }
}
```

前两个字段必需，`clientInfo` 推荐提供。存在身份时校验其形态，但不要把它当作身份认证。

版本不受支持时，返回错误码 `-32022`，附 `requested` 与 `supported`。缺少请求元数据属于无效参数，错误码 `-32602`。绝不用先前调用填补缺失字段。

### 必需的发现功能（Mandatory discovery）

现代服务器必须实现 `server/discover`。完整发现结果包含支持的现代版本、能力、可选说明、缓存提示，以及结果 `_meta` 中的服务器身份：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {"listChanged": false},
    "resources": {"listChanged": false, "subscribe": false},
    "prompts": {"listChanged": false}
  },
  "ttlMs": 3600000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "notes-server",
      "version": "2.0.0"
    }
  }
}
```

发现不会解锁服务器。客户端可以不先发现就调用 `tools/list`，因为 `tools/list` 已经携带相同的请求元数据。

### 工具（Tools）

`tools/list` 返回确定性排序的工具描述符列表。稳定顺序改善响应缓存，也让模型上下文稳定。结果还必须包含 `ttlMs` 与 `cacheScope`。

`tools/call` 返回内容块和 `isError`。协议封装或方法参数无效时，使用 JSON-RPC 错误。有效工具调用已运行、但工具本身失败时，使用 `isError: true`。

工具注解（Annotations）仍是提示，不是强制执行机制：

- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

宿主应将它们用于确认与展示，服务器仍必须执行真实授权。

### 资源（Resources）

`resources/list` 返回稳定 URI 描述符，`resources/read` 返回带类型的内容。两者在 `2026-07-28` 中都可缓存，因此都包含 `ttlMs` 和 `cacheScope`。

用户专属笔记数据使用 `cacheScope: "private"`。共享缓存不得跨授权上下文复用私有响应。

现代变更投递不使用 `resources/subscribe`。客户端打开 `subscriptions/listen`，请求 `resourceSubscriptions` 或列表变更类别。第 10 课构建此流程。

### 提示词（Prompts）

`prompts/list` 可缓存且确定。`prompts/get` 根据参数渲染命名提示词。渲染后的提示词结果是完整结果，但不属于必须带缓存提示的可缓存列表或读取结果。

### 每个成功结果都有类型（Every successful result is typed）

示例为所有成功结果使用同一个包装函数：

```python
def complete(payload):
    return {
        "resultType": "complete",
        **payload,
        "_meta": {SERVER_INFO_KEY: SERVER_INFO},
    }
```

列表、读取与发现处理器增加 `ttlMs` 和 `cacheScope`。集中使用这个包装函数，可防止某个处理器悄然省略现代结果字段。

### 没有服务器发起的请求（No server-initiated requests）

现代服务器可以发送与客户端请求相关的通知，或在客户端打开的 `subscriptions/listen` 流上发送通知，但不能自行发送 JSON-RPC 请求。

处理器需要采样（Sampling）、信息征询（Elicitation）或根目录（Roots）输入时，返回 `input_required` 结果。客户端满足嵌入的输入请求，再以新请求 id 重试原方法。第 11 课介绍这种多轮往返请求（Multi Round-Trip Request）模式。

### 显式旧版兼容（Explicit legacy compatibility）

双时期服务器也可以在清楚隔离的旧版分支实现 `2025-11-25` 握手。存在必需的现代 `_meta` 字段时选择现代行为，收到 `initialize` 时选择旧版行为。

不要把 `2026-07-28` 请求送入旧版握手路径，也不要给旧版初始化结果加上现代 `resultType` 字段。本课代码刻意只支持现代协议，让不变量清晰可见。

```figure
t3-dispatch-loop
```

## 实际应用（Use It）

运行 Python 服务器的有限演示和测试：

```bash
cd code
python3 main.py --demo
python3 -m unittest discover tests -v
```

使用 TypeScript 运行器运行 TypeScript 移植版本：

```bash
npx tsx main.ts --demo
```

演示发送 `server/discover`，列出各原语、调用工具，并展示不支持版本的错误。每个现代请求重复元数据，每个成功结果包含服务器身份。

## 交付成果（Ship It）

本课交付 `outputs/skill-mcp-server-scaffolder.md`。它生成现代服务器方案，包含发现契约、逐请求校验、确定性的可缓存列表，以及可选的隔离旧版适配器。

## 练习（Exercises）

1. 从一个请求移除能力，证明服务器不会复用上个请求的声明。
2. 反转 `TOOLS`、`PROMPTS` 及笔记插入顺序，确认所有列表结果保持稳定。
3. 添加破坏性 `notes_delete` 工具，在执行器内部要求授权检查。`destructiveHint` 仍只作为用户体验提示。
4. 添加 `resources/templates/list`，包含 `ttlMs`、`cacheScope` 和确定性排序。
5. 为 `2025-11-25` 构建独立旧版适配器，增加测试证明现代请求绝不进入其中。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| 无状态服务器（Stateless server） | 从每次请求自身元数据处理请求，不记忆协议会话 |
| `server/discover` | 公布版本与能力的必需现代方法 |
| 完整结果（Complete result） | 带 `resultType: "complete"` 的成功现代结果 |
| 可缓存结果（Cacheable result） | 带 `ttlMs` 与 `cacheScope` 的发现、列表或资源读取结果 |
| 确定性列表（Deterministic list） | 同一逻辑注册表产生相同条目顺序 |
| 服务器身份（Server identity） | 结果 `_meta` 中推荐的 `io.modelcontextprotocol/serverInfo` |
| 工具错误（Tool error） | 有效工具调用返回带 `isError: true` 的内容 |
| 协议错误（Protocol error） | 通过 `error` 返回的无效 JSON-RPC 或 MCP 请求 |

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 规范（MCP Specification 2026-07-28）](https://modelcontextprotocol.io/specification/2026-07-28/)
- [MCP 服务器发现（MCP Server Discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP 工具（MCP Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP 资源（MCP Resources）](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP 提示词（MCP Prompts）](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP stdio 传输（MCP stdio Transport）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
