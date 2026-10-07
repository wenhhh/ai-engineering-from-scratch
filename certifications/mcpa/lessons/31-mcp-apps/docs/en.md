# 对话中的交互界面（Interactive Interfaces Inside the Conversation）

> 工具结果不必止于文本：服务器可以指向一个小型 HTML 界面，让宿主在当前对话中以沙箱方式渲染。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 30 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 说明交互界面在普通文本与结构化内容之外增加了什么，并识别值得采用它的用例
- 按请求协商 `io.modelcontextprotocol/ui`，跟踪工具 `_meta.ui.resourceUri` 指向的 `ui://` 资源如何通过普通 `resources/read` 获取
- 阅读 UI 资源的 `_meta.ui.csp` 域名列表和 `_meta.ui.permissions` 标志，构建宿主必须执行的内容安全策略，包括严格默认值
- 执行工具的 `visibility` 限制，使智能体工具列表和应用自身的 `tools/call` 各自只能访问允许的工具
- 描述沙箱 iframe、应用与宿主间的桥接，以及应用发起工具调用为何仍须经过同意边界
- 设计回退方案，让具备 UI 的工具也能服务从未声明扩展的宿主

## 问题（The Problem）

回答“按地区显示销售额”的仪表盘工具，可以返回一段数字，也可以返回放在 `structuredContent` 中的小表格。但两者都不能让用户点击地区继续查看、悬停获取精确值，或不请求模型重新调用就切换指标。配置工具面临相似限制：地区、实例规格、是否自动扩缩容等选择，逐轮对话往往比一次性填好具有默认值和校验的表单更慢，也更容易出错。

大多数工具仍适合文本与结构化内容，但仍有两类真实需求：用户需要探索而非仅阅读的结果，以及希望同时看见所有选项的决策。MCP Apps 通过可选扩展补足它，无须新增传输或在 MCP 旁边建立第二套客户端-服务器协议。它复用本路线已经介绍的工具与资源两项原语，再规定宿主如何渲染获取的内容。

## 概念（The Concept）

扩展标识为 `io.modelcontextprotocol/ui`。协商沿用第 30 课的每请求机制：客户端在发送的请求中通过 `io.modelcontextprotocol/clientCapabilities.extensions` 声明支持，服务器在 `server/discover` 返回的 `capabilities.extensions` 中声明自己的支持。声明不依赖之前的任何请求，与协议版本和其他能力一样，每次独立提供。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {"io.modelcontextprotocol/ui": {}}
      }
    }
  }
}
```

服务器在 `capabilities.extensions` 中返回相同标识，并同时声明已有的 `tools` 和 `resources` 能力。这个结果也不取决于调用方声明：`server/discover` 描述服务器能够做什么，客户端与自身支持取交集，才得出实际可用能力。未声明扩展的宿主获得相同发现结果，只是不采用其中自己未实现的部分。

支持 UI 的工具在定义中增加 `_meta.ui.resourceUri`，指向 `ui://` 资源。这是静态工具元数据，属于每个客户端收到的同一 `tools/list` 条目，与工具定义的其他部分一样，不应因询问方不同而随意变化。绑定在调用前就可见，宿主可以提前加载并审阅资源，无须等模型决定调用后才发现。

工具的 `_meta.ui` 还可包含 `visibility` 数组，缺省为 `["model", "app"]`。对 `"model"` 可见的工具供智能体发现和调用，沿用第 11 课的普通路径；对 `"app"` 可见的工具允许已渲染应用通过桥接直接提出调用，无须模型再轮转一轮。两者是宿主针对不同访问路径执行的独立门禁：缺少 `"model"` 时，工具不进入智能体列表；缺少 `"app"` 时，模型仍可见，但宿主拒绝应用发起的 `tools/call`。应用尝试访问其他服务器的 app-only 工具时，直接阻止跨服务器调用。

获取 UI 不需要特殊方法。宿主像读取其他资源一样调用 `resources/read`，返回内容的 `mimeType` 必须精确为 `text/html;profile=mcp-app`。这个 profile 参数将可渲染应用与普通 HTML 页面区分开。仅返回 `text/html` 的资源，即使标记正确也不属于该应用类型；宿主应每次获取时检查 MIME，不能只相信 `ui://` 方案。

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "resultType": "complete",
    "contents": [
      {
        "uri": "ui://dashboard/sales-by-region.html",
        "mimeType": "text/html;profile=mcp-app",
        "text": "<!doctype html>...",
        "_meta": {
          "ui": {
            "csp": {
              "connectDomains": ["https://api.sales-metrics.example"],
              "resourceDomains": ["https://cdn.trusted-charts.example"]
            },
            "permissions": {"camera": {}, "geolocation": {}},
            "prefersBorder": true
          }
        }
      }
    ],
    "ttlMs": 60000,
    "cacheScope": "public"
  }
}
```

资源还在 `_meta.ui` 中携带渲染约束。`csp` 是对象：`connectDomains` 控制 fetch、XHR 和 WebSocket；`resourceDomains` 控制脚本、样式、图片和字体；`frameDomains` 控制嵌套 iframe；`baseUriDomains` 控制文档基础 URI。每个键都可选。宿主 MUST 依据资源声明的域构造 Content Security Policy，MUST NOT 放行资源从未声明的外部域；声明也不等于一定获准，宿主 MAY 按自己的策略进一步收紧。如果完全省略 `csp`，宿主 MUST 使用严格默认值，只允许同源内容以及内联样式和脚本，不允许任何出站连接。缺少 `frameDomains` 时始终采用 `frame-src 'none'`；缺少 `baseUriDomains` 时始终采用 `base-uri 'self'`，无论其他 `csp` 项是否存在。宿主 SHOULD 记录最终构造的 CSP，供后续安全审查。

`permissions` 是另一对象，通过可选空对象标志请求 `camera`、`microphone`、`geolocation` 和 `clipboardWrite`。宿主 MAY 通过 iframe 的 `allow` 属性授予部分能力；应用 SHOULD NOT 假定请求必然获准，应像普通网页面对权限拒绝时一样降级。权限与 MIME 不同：拒绝某项权限，不必阻止整个资源渲染，应用只是在缺少该能力时运行。

渲染后，应用与宿主通过 `postMessage` 传输自己的 JSON-RPC 方言，通信发生在 iframe 与宿主之间，不经过本课程讨论的客户端-服务器连接。部分方法与核心同名，如 `tools/call`；更多方法使用 `ui/` 前缀，例如建立 iframe 与父页面通道的 `ui/initialize`。该本地握手与 2026-07-28 已移除的核心 `initialize` 不同：不建立核心客户端-服务器会话，也不参与本路线第 04 课以来的无状态报文。Web 宿主还 MUST NOT 直接与视图通信，应在宿主和视图之间设置与宿主不同源的沙箱代理，由该代理转发双向桥接消息。

应用可以经桥接请求宿主代为调用工具，但工具的可见范围必须包括 `"app"`。最终决定权仍在宿主：在完成与其他工具调用相同的用户同意流程后，才以新 ID 和完整 `_meta` 转发普通 `tools/call`；宿主也可以拒绝。iframe 只能提出请求，不能自行批准自己的重要操作。

这构成选择嵌入应用而非普通网页链接时的安全理由。正确配置的 iframe 无法直接读取宿主 cookies、本地存储或 DOM，不能在父页面上下文执行脚本或任意导航父页面；有权限的操作都必须经过中介桥接。宿主据此隔离来自未逐行审阅服务器的应用，就像处理不可信工具结果与资源文本时，不让这些内容自行决定模型和用户的行为一样。边界原则仍来自第 22 课。

扩展不应成为工具继续工作的前提。每次 `tools/call` 仍返回有用的 `content` 文本。未声明扩展的宿主不会读取 `ui://` 资源，只按普通工具展示文本，遵守不支持时回退核心行为的规则。

```figure
mcpa-31-app-sandbox
```

## 交互实验（Interactive Lab）

图中同时展示一次工具调用的两个分支。左侧，声明扩展的宿主通过普通 `resources/read` 获取 `_meta.ui.resourceUri`，检查 MIME，以声明域构造并按自身策略收紧 CSP，再渲染到沙箱 iframe。虚线标出应用调用工具仍需经过的同意门禁，它独立于工具可见性限制。右侧，未声明扩展的宿主在普通 `tools/call` 后直接显示同一工具的文本，从不访问 UI 资源。

## 实践实验（Practice Lab）

打开 `code/main.py`。单台服务器将三个工具绑定到同一仪表盘：`sales_by_region` 缺省对模型与应用都可见；`refresh_sales_view` 设置 `visibility: ["app"]`，不进入智能体列表；`export_sales_report` 设置 `visibility: ["model"]`，应用无法直接调用。服务器还暴露四个资源：真实 `ui://` 视图；仅返回普通 `text/html` 的 `legacy-widget`；CSP 声明了宿主策略外域名的 `scripts-widget`；以及完全省略 `csp` 的 `minimal-widget`。

```bash
python3 code/main.py
```

`HostAppLoader.load` 对同一工具和参数执行两次决策，一次声明扩展、一次不声明。输出可直接比较：`{"mode": "app", ...}` 来自真实模拟的 `resources/read`，包含构造的 `csp` 字符串及仅为所请求权限子集的 `grantedPermissions`；`{"mode": "text", ...}` 不发送该资源请求。`review_app_resource` 和 `build_csp` 单独处理错误及最简资源，说明哪个检查失败、哪个默认值生效。后部的 `request_tool_call_from_app` 展示两道独立门禁：调用 `export_sales_report` 因缺少 `"app"` 可见性，在询问同意前就被拒绝；调用 `refresh_sales_view` 在用户拒绝时不转发，批准后以新 ID 转发。比较同一工具的两个 `tools/call`，确认每个请求都有自己的 `_meta` 和扩展声明，没有跨请求继承。

> 译注：本课 Python 示例构造的是加载与调用决策，没有启动真实浏览器、沙箱代理或 iframe。策略字符串和模拟测试通过，不能证明浏览器隔离、桥接消息来源校验及所有 CSP 指令已在生产宿主中正确执行。

## 交付物（Shipped Artifact）

`outputs/mcp-apps-review-checklist.md` 提供一页审阅清单：渲染 `ui://` 资源前需要确认什么，支持 UI 的工具应保留什么回退，以及各检查结果对应渲染、回退或拒绝的决策表。工具声明 `_meta.ui` 时，可将其放在工具描述旁一起审阅。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证：扩展仅在双方都声明时协商生效；工具 UI 绑定始终出现在 `tools/list` 中；缺省 `visibility` 同时含 `"model"` 和 `"app"`；智能体列表排除 app-only 工具；支持应用的宿主恰好进行一次 `resources/read`；不支持时回退文本并跳过该请求；MIME 错误时即使读取成功也拒绝；CSP 超出宿主策略时指出相关域；`build_csp` 正确组合声明并在省略 `csp` 时采用严格默认值；实际授予权限不超出宿主政策；拒绝的应用调用不进入报文，批准后以新 ID 转发；缺少 `"app"` 可见性时在同意询问前拒绝；未知资源返回协议错误；可缓存结果都包含 `ttlMs` 和 `cacheScope`。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/31-mcp-apps
```

## 与综合实践的联系（Capstone Connection）

综合交互可包含 UI 工具，本课的三个问题仍必须回答：当前请求是否真正协商了扩展，渲染前是否检查精确 MIME，以及应用发起的调用是否仍经过与其他工具相同的同意门禁。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| MCP Apps | 允许工具引用交互 HTML 界面、由宿主渲染的可选扩展 |
| `io.modelcontextprotocol/ui` | 双方用于协商 MCP Apps 的扩展标识 |
| `ui://` | 为应用 UI 资源保留的 URI 方案 |
| `_meta.ui.resourceUri` | 工具定义中指向 `ui://` 资源的字段 |
| `text/html;profile=mcp-app` | 将所获取资源标识为可渲染应用的精确 MIME 类型 |
| `_meta.ui.csp` | 可选域名列表对象，含 `connectDomains`、`resourceDomains`、`frameDomains`、`baseUriDomains`，用于构造 CSP |
| `_meta.ui.permissions` | 可选空对象标志，含 `camera`、`microphone`、`geolocation`、`clipboardWrite`，宿主可按策略授予 |
| `visibility` | 工具 `_meta.ui` 内的数组，缺省 `["model", "app"]`，分别限制智能体列表和应用的 `tools/call` |
| 沙箱 iframe（Sandboxed iframe） | 渲染应用的隔离框架，不直接访问宿主页面 |
| 沙箱代理（Sandbox proxy） | Web 宿主在自身与视图之间 MUST 使用的不同源中介 |
| 应用-宿主桥接（App-to-host bridge） | 通过 `postMessage` 传输的 JSON-RPC 方言，独立于客户端-服务器报文 |
| 文本回退（Text fallback） | UI 工具为不支持扩展的宿主保留的普通 `content` 结果 |

## 延伸阅读（Further Reading）

- [MCP Apps 概览](https://modelcontextprotocol.io/extensions/apps/overview)
- [构建 MCP App](https://modelcontextprotocol.io/extensions/apps/build)
- [SEP-1865：MCP Apps，MCP 的交互用户界面](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
- [MCP Apps 规范，2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 14 节
- `phases/13-tools-and-protocols/14-mcp-apps`，构建同一扩展的完整请求与资源服务器，以及更严格的 Streamable HTTP 适配层
