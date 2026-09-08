# MCP 资源与提示词：无状态服务器的可寻址上下文（MCP Resources and Prompts: Addressable Context for Stateless Servers）

> 工具执行操作，资源暴露可寻址内容，提示词打包用户选择的消息模板。好的 MCP 服务器让这些契约彼此分开、可预测。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 13，第 07 课（构建 MCP 服务器），阶段 13，第 09 课（MCP 传输）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 从使用方意图出发，选择工具、资源或提示词。
- 通过必需的 `server/discover` 公布资源和提示词接口。
- 构建确定性的 `resources/list` 与 `prompts/list` 结果。
- 应用 `ttlMs` 与 `cacheScope`，不泄漏用户专属数据。
- 对无效或未知资源 URI 返回 JSON-RPC 错误 `-32602`。
- 打开 `subscriptions/listen` POST 响应流，用订阅 ID 关联每个事件。
- 将资源内容与提示词模板视为不可信服务器输出。

## 从使用方出发（Start With the Consumer）

误用 MCP 最容易的方式是从实现代码出发。因为熟悉函数，就把数据库查询做成工具；因为存储在文件中，就把可复用工作流做成资源；因为宿主可以注入，就把提示词变成隐藏策略。

先问谁选择，以及他们期待什么。

| 原语 | 主要意图 | 选择者 | 典型结果 |
|---|---|---|---|
| 工具（Tool） | 执行操作 | 模型或应用 | 结构化动作结果 |
| 资源（Resource） | 读取 URI 上的内容 | 宿主、应用或用户 | 文本或二进制内容 |
| 提示词（Prompt） | 启动可复用消息工作流 | 用户通过宿主界面 | 一条或多条提示词消息 |

`notes://note-1` 上的笔记是资源，因为它是可寻址内容。`delete_note` 是工具，因为它改变状态。`review_note` 是提示词，因为用户选择了准备好的审阅工作流。

不要只为显得完整就把同一操作暴露为全部三种原语。每增加一种接口，都需要发现、授权、缓存、错误处理、测试和文档。

## 2026-07-28 无状态封装（The 2026-07-28 Stateless Envelope）

本课面向 MCP 协议修订版 `2026-07-28`。该配置没有初始化握手或协议会话。每次请求在保留的 `_meta` 键中携带协议版本和客户端能力。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

服务器必须实现 `server/discover`。其结果公布支持版本、资源和提示词能力、实现身份与缓存提示。客户端可以直接调用其他方法，但发现让它在构建界面前获得一份稳定快照。

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "resources": {"listChanged": true, "subscribe": true},
    "prompts": {"listChanged": true}
  },
  "ttlMs": 3600000,
  "cacheScope": "public"
}
```

普通结果声明 `"resultType": "complete"`。响应 `_meta` 用 `io.modelcontextprotocol/serverInfo` 标识提供服务的实现。这些信息有助于诊断，不是认证身份。携带不受支持修订版的请求返回 `-32022`，附请求修订版和服务器支持修订版。

无状态契约改变设计直觉。列表不能依赖同一连接的先前调用。授权可以改变可见集合，因为凭据是请求输入；连接历史则不能。

## 资源是稳定 URI 契约（Resources Are Stable URI Contracts）

资源是 URI 标识的内容。先设计 URI，再写处理器。

好的 URI 应具有以下性质：

- 足够稳定，可以加入书签或在请求之间传递。
- 命名空间属于服务器领域。
- 独立于进程 ID 或连接。
- 在访问存储前校验。
- 每次读取都授权。

`notes://note-1` 优于 `note-1`，因为命名空间明确。文件服务器可使用 `file://` URI，但仍须在解析符号链接和相对路径段后，检查配置的目录边界。

`resources/list` 返回调用者当前可见的资源。按 URI 等稳定键排序。确定性顺序可防止无谓缓存未命中、快照变化，以及宿主界面在刷新间跳动。

```json
{
  "resultType": "complete",
  "resources": [
    {
      "uri": "notes://note-1",
      "name": "Architecture decision",
      "description": "Why the service uses a stateless boundary",
      "mimeType": "text/markdown"
    }
  ],
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "notes-server",
      "version": "2.0.0"
    }
  }
}
```

`resources/read` 返回一个或多个内容项。未知 URI 不是成功的空读取。当前资源规范将无效或未知资源 URI 归为 JSON-RPC 无效参数，错误码 `-32602`。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32602,
    "message": "Unknown or invalid resource URI",
    "data": {
      "uri": "notes://missing"
    }
  }
}
```

这种区分让客户端将不存在与有效空文档分开，也防止意外回退到更广的查找。

### 资源模板（Resource templates）

资源模板描述一族参数化 URI。列出每个具体项成本高或无界时使用。例如，`notes://projects/{project}/decisions/{decision}` 告诉客户端如何形成有效地址，而不返回每条决策。

模板不弱化校验。解析变量、应用授权、强制长度与字符限制，用带类型参数构造存储查询。绝不把任意 URI 尾部拼接到文件系统路径或数据库语句。

### 内容不是可信指令（Content is not trusted instruction）

资源文本可能包含提示词注入、秘密、误导性命令或格式错误的标记。宿主应保留来源，把资源内容作为数据处理。服务器应限制内容大小，返回准确 MIME 类型，遮蔽调用者无权访问的字段，并避免返回无关记录。

## 提示词是用户控制的模板（Prompts Are User-Controlled Templates）

MCP 提示词面向用户显式选择设计。宿主可将它们显示为斜杠命令、菜单项或工作流按钮，协议不强制某种界面。

对于相同请求授权，`prompts/list` 应具有确定性。每个提示词需要稳定名称、有用描述，以及让宿主能在 `prompts/get` 前收集输入的参数声明。

```json
{
  "resultType": "complete",
  "prompts": [
    {
      "name": "review_note",
      "title": "Review a note",
      "description": "Review one note for a named concern",
      "arguments": [
        {
          "name": "uri",
          "description": "The note resource URI",
          "required": true
        }
      ]
    }
  ],
  "ttlMs": 600000,
  "cacheScope": "public"
}
```

`prompts/get` 将参数解析成消息，不替换宿主系统指令。宿主决定返回消息如何进入模型上下文，并让自己的可信策略保持更高优先级。

在服务器边界校验提示词参数。提示词 URI 应通过与直接资源读取相同的授权检查。不要让提示词成为绕过资源访问的旁路。

## 缓存提示是正确性的一部分（Cache Hints Are Part of Correctness）

`ttlMs` 告诉客户端结果可复用多久，`cacheScope` 描述谁可以共享缓存值。

| 范围 | 含义 | 典型用途 |
|---|---|---|
| `public` | 授权允许时可跨用户复用 | 公开提示词目录 |
| `private` | 绑定到请求用户或凭据上下文 | 用户拥有的笔记内容 |

根据数据变化速率和过时损害选择 TTL。公开提示词目录可能适合五分钟，私有笔记读取可能使用一分钟。

MCP 只定义 `public` 和 `private` 两种 `cacheScope` 值。含秘密或快速变化的结果，返回 `cacheScope: "private"` 配合 `ttlMs: 0`，再在宿主缓存策略中应用更严格的不存储规则。`no-store` 本身不是 MCP `cacheScope` 值。

缓存提示永远不能替代授权。缓存键必须包含所有影响可见性的请求维度，包括租户、用户、权限范围、语言区域与分页游标。共享缓存若无法安全表达这些维度，应使用 `private`、零 TTL 与宿主级不存储策略。

## 订阅使用客户端打开的响应流（Subscriptions Use a Client-Opened Response Stream）

现代订阅模式替代原来的 `resources/subscribe` RPC 和旧 HTTP GET 事件端点。

客户端把 `subscriptions/listen` 作为普通 JSON-RPC 请求发送。在 Streamable HTTP 上，它是一个响应持续打开为 SSE 流的 POST。`notifications` 对象是允许列表，服务器不得投递未请求的通知类型。

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "subscriptions/listen",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "io.modelcontextprotocol/clientInfo": {
        "name": "course-client",
        "version": "1.0.0"
      }
    },
    "notifications": {
      "resourcesListChanged": true,
      "promptsListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

请求 ID 就是订阅 ID。在任何请求的事件之前，服务器发送 `notifications/subscriptions/acknowledged`，其过滤器仅包含服务器接受的子集。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/subscriptions/acknowledged",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "notifications": {
      "resourcesListChanged": true,
      "resourceSubscriptions": [
        "notes://note-1"
      ]
    }
  }
}
```

流上每个后续事件携带相同元数据。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/subscriptionId": 17
    },
    "uri": "notes://note-1"
  }
}
```

通知说明资源发生变化。客户端通过 `resources/read` 重新读取，遵守当前授权，不假设事件包含新文档。

多个订阅可以共享一条 stdio 通道，订阅 ID 让客户端能够解复用。在 HTTP 上，关闭响应流就取消订阅。服务器正常结束流时，返回与原请求关联的最终 `resultType: "complete"` 响应。

不要将订阅流当作协议会话。后续读取仍是完整请求，可以到达任意健康服务器实例。

```figure
t3-primitive-sort
```

## 交互实验（Interactive Lab）

用图把项目跟踪器的五项能力分类：事项详情、创建事项、迭代评审模板、项目策略和关闭事项。然后决定哪些列表可公开缓存，哪些读取必须私有，以及哪些资源值得发送更新通知。

每次分类都指出选择者。模型执行动作，用工具；宿主读取 URI 寻址内容，用资源；用户启动准备好的消息工作流，用提示词。

## 实践实验（Practice Lab）

从仓库根目录运行模拟器：

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

按以下顺序检查交互记录：

1. 确认 `server/discover` 公布当前修订版与两种能力。
2. 确认两个列表结果都排序，且使用 `resultType: "complete"`。
3. 确认列表和读取结果都携带经过选择的缓存提示。
4. 将读取 URI 改为 `notes://missing`，观察 `-32602`。
5. 确认订阅确认先于资源事件。
6. 确认事件和正常关闭都携带订阅 ID `5`。

Python 模型不打开真实 HTTP 连接，而是表示 SDK 必须放到请求作用域响应流上的消息。生产中使用官方 SDK 处理分帧与传输。

## 交付物（Shipped Artifact）

`outputs/skill-primitive-splitter.md` 是 MCP 原语选择的可复用设计审查，现在检查确定性发现、缓存范围、无效 URI 行为与现代订阅过滤器。

本课还交付 `assets/primitive-split.svg`，它是原语与订阅边界的静态版本，供离线学习。

## 验证结果（Verify It）

```bash
cd phases/13-tools-and-protocols/10-mcp-resources-and-prompts/code
python3 main.py
python3 -m unittest discover tests -v
```

预期结果：主程序打印 JSON 交互记录，测试命令报告至少十二项测试通过。

## 与综合实践的联系（Capstone Connection）

综合实践服务器在动作之外暴露可寻址知识时，使用此契约。包含一份确定性目录快照、一次已授权资源读取、一次提示词解析、一个无效 URI 用例和一份订阅交互记录。

证据应表明：没有列表依赖连接历史，订阅事件也绝不授予底层资源的访问权限。

## 练习（Exercises）

1. 添加 `notes://projects/{project}/notes/{id}` 资源模板，校验两个变量。
2. 为 `resources/list` 添加分页，保留确定性顺序。
3. 将一个资源改为 `cacheScope: "private"` 配合 `ttlMs: 0`，增加宿主级不存储策略，并解释什么威胁使两项控制都合理。
4. 添加提示词列表变更订阅，证明过滤器省略 `promptsListChanged` 时不发送事件。
5. 创建两个同时存在的订阅，证明每个事件携带正确请求 ID。
6. 为读取处理器添加授权主体，证明缓存条目不能跨主体使用。

## 关键术语（Key Terms）

- **资源（Resource）：** MCP 服务器暴露的 URI 寻址内容。
- **提示词（Prompt）：** MCP 服务器暴露的用户控制消息模板。
- **确定性列表（Deterministic list）：** 对相同请求输入具有稳定成员与顺序的发现结果。
- **`ttlMs`：** 缓存新鲜度时长，单位毫秒。
- **`cacheScope`：** 缓存结果的共享边界。
- **`subscriptions/listen`：** 长期请求，响应流投递显式过滤的通知。
- **订阅 ID（Subscription ID）：** 原始监听请求 ID，在通知元数据中重复。
- **无效参数（Invalid parameters）：** JSON-RPC 错误 `-32602`，用于无效或未知资源 URI。
- **不支持的协议版本（Unsupported protocol version）：** JSON-RPC 错误 `-32022`，包含 `supported` 与 `requested` 修订版。
- **`server/discover`：** 必需服务器方法，返回支持修订版、能力、身份和可选缓存提示。

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 资源（Resources）](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP 2026-07-28 提示词（Prompts）](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)
- [MCP 2026-07-28 订阅（Subscriptions）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/subscriptions)
- [MCP 2026-07-28 缓存（Caching）](https://modelcontextprotocol.io/specification/2026-07-28/basic/utilities/caching)
