# 无状态协议上的 MCP Apps（MCP Apps on the Stateless Protocol）

> 交互式结果仍然是 MCP 工具与资源的交换。2026-07-28 核心协议让交换自包含，而 Apps 扩展增加了沙箱化浏览器界面。

**Type:** Build
**Languages:** Python
**Prerequisites:** Phase 13 · 07（MCP 服务器），Phase 13 · 10（资源）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 通过 `server/discover` 和逐请求的扩展能力声明 MCP Apps。
- 在调用工具之前，在工具上声明 `ui://` 资源。
- 在 2026-07-28 无状态线上协议中返回完整的工具与资源结果。
- 区分 Apps 的 `ui/initialize` 桥接消息与已移除的 MCP 核心握手。
- 应用来源验证、沙箱隔离、内容安全策略（CSP）和最小权限。

## 问题（The Problem）

文本结果可以描述时间线，却不能提供让用户筛选、检查或执行操作的时间线。

MCP Apps 通过可选扩展解决呈现问题。工具定义指向一个 `ui://` 资源。宿主（host）可以在工具运行之前获取并审查资源，在沙箱化 iframe 中渲染它，并通过 JSON-RPC 桥接机制调解所有应用操作。

核心协议在 2026-07-28 发生了变化。不要把 App 包装在旧的连接生命周期中：

- 核心中没有 `initialize` 请求或 `notifications/initialized` 通知。
- 没有 `Mcp-Session-Id` 请求头。
- 每个请求都在 `params._meta` 中携带协议版本和客户端能力。
- 服务器实现 `server/discover`，让客户端检查版本、核心能力和扩展。
- 每个成功结果都有 `resultType` 判别字段。
- 可流式 HTTP（Streamable HTTP）为每个请求使用一次 POST。现代 GET 和 DELETE 入口返回 405。

Apps 桥接机制仍有一个名为 `ui/initialize` 的方法。它属于 iframe 的 postMessage 方言，不会重新创建 MCP 核心会话。

## 概念（The Concept）

### 两种协议，一个功能（Two protocols, one feature）

明确区分各层：

1. MCP 核心承载 `server/discover`、`tools/list`、`tools/call`、`resources/list` 和 `resources/read`。
2. MCP Apps 扩展声明 UI 并定义 iframe 到宿主的桥接。
3. 浏览器沙箱规则限制 UI 可以访问的内容。

扩展标识符是 `io.modelcontextprotocol/ui`。双方都必须主动选择启用。客户端在每个请求的能力对象中发送扩展支持声明：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/ui": {}
        }
      },
      "io.modelcontextprotocol/clientInfo": {
        "name": "timeline-host",
        "version": "1.0.0"
      }
    }
  }
}
```

建议使用 `clientInfo` 辅助诊断。这是自行报告的数据，不是授权身份。

### 渲染前先发现（Discover before rendering）

服务器的发现结果声明此扩展：

```json
{
  "resultType": "complete",
  "supportedVersions": ["2026-07-28"],
  "capabilities": {
    "tools": {},
    "resources": {},
    "extensions": {
      "io.modelcontextprotocol/ui": {}
    }
  },
  "ttlMs": 300000,
  "cacheScope": "public",
  "_meta": {
    "io.modelcontextprotocol/serverInfo": {
      "name": "timeline-app-server",
      "version": "2.0.0"
    }
  }
}
```

服务器必须支持发现。客户端不必在每次操作前调用发现，因为每个操作都携带自己的能力。

### 在工具定义上声明 UI（Declare the UI on the tool definition）

现代 Apps 契约在 `tools/list` 中将 UI 绑定到工具：

```json
{
  "name": "notes_timeline",
  "description": "Render a timeline of notes.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  },
  "_meta": {
    "ui": {
      "resourceUri": "ui://notes/timeline.html"
    }
  }
}
```

这些元数据刻意在调用之前提供。宿主可以在结果请求显示 HTML 之前预加载、缓存并进行安全审查。兼容代码可以接受旧的扁平元数据键，但新服务器应输出嵌套的 `_meta.ui.resourceUri` 形式。

当前核心中的 `tools/list` 可缓存。应提供确定性排序、`ttlMs` 和 `cacheScope`。当可见工具随用户或令牌变化时，使用 `private`。

### 返回数据，再由宿主绑定视图（Return data, then let the host bind the view）

工具调用返回普通内容和结构化数据：

```json
{
  "resultType": "complete",
  "content": [
    {"type": "text", "text": "Timeline ready."}
  ],
  "structuredContent": {
    "notes": [
      {"id": "note-1", "title": "Discover", "created": "2026-07-28"}
    ]
  },
  "isError": false
}
```

宿主已经知道哪个视图属于此工具。不要仅为重复 URI 而发明新的内容块。

### 将应用作为资源提供（Serve the app as a resource）

服务器在发现中声明 `resources`，因此还要实现必需的 `resources/list` 操作。其确定性列表条目包含规范 URI、稳定名称、描述和 MIME 类型。与确定性工具列表一样，列表结果包含 `resultType`、服务器身份元数据、`ttlMs` 和 `cacheScope`。

宿主发送 `resources/read`。在 Streamable HTTP 上，请求包含：

```text
POST /mcp
MCP-Protocol-Version: 2026-07-28
Mcp-Method: resources/read
Mcp-Name: ui://notes/timeline.html
```

请求头值与 JSON-RPC 正文必须匹配。不匹配时产生协议错误 `-32020`。

结果包含 HTML 资源和缓存提示：

```json
{
  "resultType": "complete",
  "contents": [
    {
      "uri": "ui://notes/timeline.html",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!doctype html>...",
      "_meta": {
        "ui": {
          "csp": {
            "connectDomains": [],
            "resourceDomains": [],
            "frameDomains": [],
            "baseUriDomains": []
          },
          "permissions": {}
        }
      }
    }
  ],
  "ttlMs": 60000,
  "cacheScope": "public"
}
```

### 将 UI 资源作为可执行内容缓存（Cache UI resources as executable content）

App 资源不能与普通文字等同对待。其缓存条目可以执行桥接代码、渲染工具数据并请求由宿主调解的操作。缓存键应包含规范的 `ui://` URI、获准接入的服务器身份与版本、资源内容摘要，以及当 `cacheScope` 为私有时的授权上下文。绝不能跨主体复用私有 App 资源，因为即使 URI 相同，HTML 或其策略元数据也可能不同。

当 `ttlMs` 到期、工具的 `_meta.ui.resourceUri` 绑定改变、服务器版本或已批准的描述符固定值改变，或已确认的资源变更订阅指明该 URI 时，使条目失效。重新挂载前，重新获取资源并重新进行 CSP 和权限审查。不能仅因为新资源版本尚未加载，就让过期 iframe 保留更宽的权限。

### 在功能策略之前拒绝线上歧义（Reject wire ambiguity before feature policy）

验证顺序是刻意安排的。先验证 JSON-RPC 结构，并要求协议元数据为字符串、客户端能力映射为对象。然后比较路由请求头与正文。最后才决定是否支持匹配的协议版本。这一顺序防止代理和服务器对请求产生不同解释。

| 条件 | HTTP | JSON-RPC 错误 |
|-----------|------|----------------|
| 请求头与正文中的版本、方法或名称不一致 | 400 | `-32020` |
| 请求头与正文一致，但版本不受支持 | 400 | `-32022`，且 `data` 必须恰为 `{"supported":["2026-07-28"],"requested":"<actual>"}` |
| `resources/read` 缺少 Apps 扩展能力 | 400 | `-32021`，包含 `data.requiredCapabilities.extensions.io.modelcontextprotocol/ui` |
| 方法未知 | 404 | `-32601` |

JSON-RPC 通知没有 `id`，因此服务器绝不为它发出 JSON-RPC 响应。接受的 HTTP 通知返回 202 和空正文。错误可以改变 HTTP 状态，但仍不能为通知创建 JSON-RPC 错误正文。

### 沙箱是边界，不是信任判决（The sandbox is a boundary, not a trust verdict）

宿主控制 iframe。App 不能直接读取宿主 Cookie、本地存储或页面 DOM。所有特权工作都必须经过桥接。

使用以下默认设置：

- 将所有 CSP 域列表留空，再仅添加 App 必需的来源。`connectDomains` 用于 fetch、XHR 和 WebSocket；`resourceDomains` 用于脚本、样式、图片和字体。
- 可行时将代码和数据打包。
- 除非可见功能需要，否则不请求摄像头、麦克风或位置权限。
- 将 `postMessage` 固定到对端的精确来源，并拒绝所有其他来源的事件。
- 将工具参数、工具结果、资源文本和桥接消息视为不可信输入。
- 将用户同意保留在宿主中。iframe 不能批准自己会产生实际后果的操作。

不要把教程中的固定 `sandbox` 属性复制到每个宿主中。宿主必须根据 App 的来源模型及自身隔离设计选择标志。

允许的域仍是数据外传路径。`connectDomains: ["https://api.example.com"]` 意味着 App 中执行的任何脚本都可以向那里发送获准的数据。精确来源匹配可以防止目的地混淆，但不能决定载荷是否合适。默认保持连接访问为空，避免把持有者令牌（bearer token）放入 iframe，可行时通过宿主代理范围有限的操作，限制请求和响应大小，并审计每个出站请求由哪次用户操作触发。分别处理 `resourceDomains` 与 `connectDomains`；加载字体或脚本的许可不应授予任意上传数据的能力。

### Apps 桥接有自己的生命周期（The Apps bridge has its own lifecycle）

Apps 桥接是运行在 `postMessage` 上的 JSON-RPC 方言。它可以交换 `ui/initialize` 和 `ui/*` 通知，也可以代理外观类似核心方法的调用，例如 `tools/call`。

视图（View）发送带有 `appInfo` 和 `appCapabilities` 对象的 `ui/initialize`。宿主返回自己的能力和宿主上下文。只有收到该响应之后，视图才发送 `ui/notifications/initialized`。宿主必须等待这条 Apps 通知，才能向视图发送消息。

这一局部握手在一个 iframe 与一个宿主框架之间建立桥接。它不协商 MCP 协议版本，不创建服务器状态，也不生成传输会话。注意精确前缀：核心的 `notifications/initialized` 已移除，而 Apps 的 `ui/notifications/initialized` 仍保留。桥接工具调用产生的核心请求是一个新的自包含请求，具有新的 JSON-RPC id 和完整请求元数据。

### 宿主上下文、操作与撤销（Host context, actions, and revocation）

桥接初始化后，宿主仍是权限裁决方。视图只能通过宿主声明的能力请求工具操作、导航、剪贴板使用或其他特权效果。宿主验证类型化请求、当前用户、目标和参数，应用审批策略，并可以拒绝请求。按钮点击和有效桥接消息表达的是意图，两者都不授予权限。

将主题、尺寸和无障碍视为会变化的宿主上下文，而不是一次性的渲染输入：

- 应用宿主提供的颜色和排版令牌，并在主题或对比度偏好变化时作出响应。
- 允许视图报告期望尺寸，但由宿主限制并应用 iframe 尺寸，防止内容逃离布局或创建欺骗性覆盖层。
- 在 iframe 内保留键盘顺序、可见焦点、无障碍名称、屏幕阅读器状态、足够的对比度、缩放及减少动态效果的行为。
- 调整尺寸和重新渲染后，重新测试宿主控件与视图控件之间的焦点转移。

App 打开期间，能力可能因用户切换账户、策略变化、服务器被隔离或宿主缩小同意范围而撤销。在操作时检查能力和授权，而不是仅在 `ui/initialize` 期间检查。撤销时，拒绝待处理的特权调用，停止不再符合策略的网络活动，清除已渲染的敏感状态；当 UI 资源本身不再获准接入时，重新挂载或回退到文本。视图必须将拒绝作为正常结果处理，而不是反复重试直到宿主让步。

### 回退是契约的一部分（Fallback is part of the contract）

支持 Apps 的服务器仍可服务未声明 UI 扩展的宿主：

- 在 `tools/list` 中返回相同工具，但不含 `_meta.ui`。
- 为 `tools/call` 保留有用的文本结果。
- 以缺少能力错误拒绝对 UI 的 `resources/read`。
- 判断工具是否完成时，绝不假定 iframe 存在。

```figure
t3-ui-sandbox
```

## 动手实现（Build It）

`code/main.py` 无需 SDK，构建了一个小型进程内协议模型。它验证当前请求信封和 Streamable HTTP 路由值，通过 `server/discover` 声明 Apps，列出工具与资源，执行工具，并提供自包含 HTML 资源。

模型接收已解析的正文和路由请求头。它不是完整 HTTP 适配器，不解析 `Content-Type` 或 `Accept`。完整 Streamable HTTP 适配器见第 09 课，它要求 `Content-Type: application/json`，且 `Accept` 值同时包含 `application/json` 和 `text/event-stream`。

运行：

```bash
cd phases/13-tools-and-protocols/14-mcp-apps
python3 code/main.py
python3 -m unittest discover code/tests -v
```

检查输出中的四件事：

1. 每次调用相互独立。
2. 每个请求都具有 `_meta` 能力。
3. `resources/list` 在读取任何资源之前返回稳定描述符。
4. 每个结果都包含 `resultType` 和服务器身份元数据。
5. 不出现核心会话标识符。

## 实际应用（Use It）

从 `server/discover` 开始。确认服务器扩展映射中出现 `io.modelcontextprotocol/ui`。然后调用两次 `tools/list`，一次带 Apps 能力，一次不带。第一个响应声明资源；第二个响应仍是可用的纯文本工具。

读取 `ui://notes/timeline.html`。在 HTML 中搜索 `hostOrigin` 和 `event.origin` 防护检查。这两行是桥接不使用通配符目标的最低限度可见证据。

## 交付（Ship It）

本课交付 `outputs/skill-mcp-apps-spec.md`。在编写框架代码之前，用它审查 App 契约。它要求作者明确当前核心信封、扩展协商、回退、UI 资源、缓存策略、CSP、权限、桥接方法和同意边界。

## 练习（Exercises）

1. 将客户端能力改为空扩展映射。确认 `tools/list` 保留工具但移除 UI 绑定。
2. 发送 `Mcp-Name: ui://notes/other.html`，正文则读取时间线。确认错误为 `-32020`。
3. 将资源改为 `cacheScope: private`。描述支持这一选择的用户特定条件。
4. 将脚本移至 `https://static.example.com/app.js`。把该来源加入 `resourceDomains` 并解释新增的供应链风险。
5. 添加一个 `notes_open` 工具，将按钮点击经由宿主路由。用户批准仍保留在宿主中。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|---------|
| MCP Apps | 用于由 MCP 宿主渲染交互式 HTML 的可选扩展 |
| `io.modelcontextprotocol/ui` | 双方声明的扩展标识符 |
| `ui://` | App UI 模板的资源方案 |
| `text/html;profile=mcp-app` | MCP App HTML 的 MIME 类型 |
| `server/discover` | 当前用于协议与能力发现的 RPC |
| `resources/list` | 服务器声明资源时必须提供的资源列表方法 |
| `resultType` | 现代成功结果必需的判别字段 |
| `ui/initialize` | 首个 Apps 桥接请求，与已移除的核心初始化分离 |
| `ui/notifications/initialized` | 宿主响应后由 Apps 视图发送的就绪通知 |
| 内容安全策略（CSP） | 限制脚本、样式、图片和网络来源的浏览器策略 |
| 文本回退（Text fallback） | 为不支持 Apps 的宿主保留的工具行为 |

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP Apps 概览](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps 构建指南](https://modelcontextprotocol.io/extensions/apps/build)
- [官方扩展支持矩阵](https://modelcontextprotocol.io/extensions/client-matrix)
